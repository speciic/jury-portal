import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim().toLowerCase() || '';

    const usersSnap = await adminDb.collection('users').where('role', '==', 'JURY').get();
    let users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (search) {
      users = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(search)) || 
        (u.username && u.username.toLowerCase().includes(search))
      );
    }

    const venuesSnap = await adminDb.collection('venues').get();
    const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const assignmentsSnap = await adminDb.collection('juryTeamAssignments').get();
    const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const evaluationsSnap = await adminDb.collection('evaluations').get();
    const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const formattedJuries = users.map((jury) => {
      const juryAssignments = assignments.filter(a => a.juryId === jury.id);
      const juryEvaluations = evaluations.filter(e => e.juryId === jury.id && e.status === 'SUBMITTED');
      
      const totalAssigned = juryAssignments.length;
      const completed = juryEvaluations.length;
      const pending = totalAssigned - completed;
      const venue = venues.find(v => v.id === jury.venueId);

      return {
        id: jury.id,
        name: jury.name,
        username: jury.username,
        active: jury.active,
        venue: venue ? { id: venue.id, name: venue.name } : null,
        totalAssigned,
        completedEvaluations: completed,
        pendingEvaluations: Math.max(0, pending),
      };
    });

    formattedJuries.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({ juries: formattedJuries });
  } catch (error) {
    console.error('Error fetching juries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { name, username, password, venueId } = await request.json();

    if (!name || !username || !password || !venueId) {
      return NextResponse.json(
        { error: 'Name, username, password, and venue are required' },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const existingSnap = await adminDb.collection('users').where('username', '==', cleanUsername).limit(1).get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newUserRef = await adminDb.collection('users').add({
      name: name.trim(),
      username: cleanUsername,
      passwordHash,
      role: 'JURY',
      venueId,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    const venue = venueDoc.exists ? { id: venueDoc.id, name: venueDoc.data()?.name } : null;

    // Auto-assign existing teams in venue to this jury
    const venueTeamsSnap = await adminDb!.collection('teams').where('venueId', '==', venueId).get();
    if (!venueTeamsSnap.empty) {
      const batch = adminDb!.batch();
      venueTeamsSnap.docs.forEach(teamDoc => {
        const assignmentRef = adminDb!.collection('juryTeamAssignments').doc();
        batch.set(assignmentRef, {
          juryId: newUserRef.id,
          teamId: teamDoc.id,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_JURY',
      entity: 'User',
      entityId: newUserRef.id,
      newValue: JSON.stringify({ name: name.trim(), username: cleanUsername, venueId }),
    });

    broadcastRealtimeEvent('JURY_UPDATED', { juryId: newUserRef.id });

    return NextResponse.json({
      success: true,
      jury: {
        id: newUserRef.id,
        name: name.trim(),
        username: cleanUsername,
        venue,
      },
    });
  } catch (error) {
    console.error('Error creating jury:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
