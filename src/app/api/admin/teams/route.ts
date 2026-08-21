import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
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

    const teamsSnap = await adminDb.collection('teams').get();
    let teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (search) {
      teams = teams.filter(t => 
        (t.teamNumber && t.teamNumber.toLowerCase().includes(search)) ||
        (t.teamName && t.teamName.toLowerCase().includes(search))
      );
    }

    const venuesSnap = await adminDb.collection('venues').get();
    const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const psSnap = await adminDb.collection('problemStatements').get();
    const problemStatements = psSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const evalSnap = await adminDb.collection('evaluations').get();
    const evaluations = evalSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const assignmentsSnap = await adminDb.collection('juryTeamAssignments').get();
    const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const formattedTeams = teams.map((team) => {
      const venue = venues.find(v => v.id === team.venueId);
      const ps = problemStatements.find(p => p.id === team.problemStatementId);
      const teamEvaluations = evaluations.filter(e => e.teamId === team.id);
      const teamAssignments = assignments.filter(a => a.teamId === team.id);

      return {
        id: team.id,
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        status: team.status || 'PENDING',
        finalScore: team.finalScore || null,
        venue: venue ? { id: venue.id, name: venue.name } : { id: team.venueId, name: 'Unknown' },
        problemStatement: ps
          ? { id: ps.id, code: ps.code, title: ps.title }
          : null,
        assignedJuriesCount: teamAssignments.length,
        submittedEvaluationsCount: teamEvaluations.filter((e) => e.status === 'SUBMITTED').length,
      };
    });

    formattedTeams.sort((a, b) => a.teamNumber.localeCompare(b.teamNumber));

    return NextResponse.json({ teams: formattedTeams });
  } catch (error) {
    console.error('Error fetching teams:', error);
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

    const { teamNumber, teamName, venueId, problemStatementId, juryIds } = await request.json();

    if (!teamNumber || !teamName || !venueId) {
      return NextResponse.json(
        { error: 'Team number, team name, and venue are required' },
        { status: 400 }
      );
    }

    const cleanTeamNumber = teamNumber.trim().toUpperCase();
    const existingSnap = await adminDb.collection('teams').where('teamNumber', '==', cleanTeamNumber).limit(1).get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Team number already exists' }, { status: 400 });
    }

    const newTeamRef = await adminDb.collection('teams').add({
      teamNumber: cleanTeamNumber,
      teamName: teamName.trim(),
      venueId,
      problemStatementId: problemStatementId || null,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    let targetJuryIds: string[] = Array.isArray(juryIds) && juryIds.length > 0 ? juryIds : [];
    if (targetJuryIds.length === 0) {
      const venueJuriesSnap = await adminDb.collection('users').where('venueId', '==', venueId).where('role', '==', 'JURY').where('active', '==', true).get();
      targetJuryIds = venueJuriesSnap.docs.map(doc => doc.id);
    }

    if (targetJuryIds.length > 0) {
      const batch = adminDb.batch();
      for (const jId of targetJuryIds) {
        const assignmentRef = adminDb.collection('juryTeamAssignments').doc();
        batch.set(assignmentRef, {
          teamId: newTeamRef.id,
          juryId: jId,
          createdAt: new Date().toISOString(),
        });
      }
      await batch.commit();
    }

    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    const venue = venueDoc.exists ? { id: venueDoc.id, ...venueDoc.data() } : null;

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_TEAM',
      entity: 'Team',
      entityId: newTeamRef.id,
      newValue: JSON.stringify({ teamNumber: cleanTeamNumber, teamName: teamName.trim(), venueId }),
    });

    broadcastRealtimeEvent('TEAM_ADDED', { teamId: newTeamRef.id, teamNumber: cleanTeamNumber });

    return NextResponse.json({ success: true, team: { id: newTeamRef.id, teamNumber: cleanTeamNumber, teamName: teamName.trim(), venueId, problemStatementId, status: 'PENDING', venue } });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
