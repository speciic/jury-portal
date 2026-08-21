import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession, hashPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { id } = await params;

    const juryDoc = await adminDb.collection('users').doc(id).get();
    if (!juryDoc.exists) {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }
    const juryData = juryDoc.data() as any;

    if (juryData.role !== 'JURY') {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }

    let venue = null;
    if (juryData.venueId) {
      const venueDoc = await adminDb.collection('venues').doc(juryData.venueId).get();
      if (venueDoc.exists) {
        venue = { id: venueDoc.id, name: venueDoc.data()?.name };
      }
    }

    const assignmentsSnap = await adminDb.collection('juryTeamAssignments').where('juryId', '==', id).get();
    const teamIds = assignmentsSnap.docs.map(doc => doc.data().teamId);

    const evaluatedTeams = [];
    
    if (teamIds.length > 0) {
      const evaluationsSnap = await adminDb.collection('evaluations').where('juryId', '==', id).get();
      const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const teamsSnap = await adminDb.collection('teams').get(); // Get all to filter in memory for those teamIds
      const teams = teamsSnap.docs.filter(doc => teamIds.includes(doc.id)).map(doc => ({ id: doc.id, ...doc.data() } as any));

      for (const assignment of assignmentsSnap.docs) {
        const teamId = assignment.data().teamId;
        const team = teams.find(t => t.id === teamId);
        if (!team) continue;

        const evaluation = evaluations.find(e => e.teamId === teamId);
        
        evaluatedTeams.push({
          teamId: team.id,
          teamNumber: team.teamNumber,
          teamName: team.teamName,
          status: evaluation ? evaluation.status : 'PENDING',
          totalScore: evaluation ? evaluation.totalScore : null,
          submittedAt: evaluation ? evaluation.submittedAt : null,
        });
      }
    }

    return NextResponse.json({
      jury: {
        id,
        name: juryData.name,
        username: juryData.username,
        active: juryData.active,
        venue,
      },
      evaluatedTeams,
    });
  } catch (error) {
    console.error('Error fetching jury details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { id } = await params;
    const { name, username, newPassword, venueId, active } = await request.json();

    const userRef = adminDb.collection('users').doc(id);
    const existingJuryDoc = await userRef.get();
    if (!existingJuryDoc.exists) {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }
    const existingJury = existingJuryDoc.data() as any;

    if (existingJury.role !== 'JURY') {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (name) updateData.name = name.trim();
    if (username) updateData.username = username.trim().toLowerCase();
    if (venueId !== undefined) updateData.venueId = venueId;
    if (typeof active === 'boolean') updateData.active = active;

    if (newPassword && newPassword.trim().length > 0) {
      updateData.passwordHash = await hashPassword(newPassword.trim());
      await createAuditLog({
        userId: session.userId,
        userRole: session.role,
        action: 'RESET_JURY_PASSWORD',
        entity: 'User',
        entityId: id,
        reason: 'Admin initiated password reset',
      });
    }

    await userRef.update(updateData);

    const updatedJury = { ...existingJury, ...updateData };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_JURY',
      entity: 'User',
      entityId: id,
      newValue: JSON.stringify({ name: updatedJury.name, venueId: updatedJury.venueId, active: updatedJury.active }),
    });

    broadcastRealtimeEvent('JURY_UPDATED', { juryId: id });

    return NextResponse.json({ success: true, jury: updatedJury });
  } catch (error) {
    console.error('Error updating jury:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
