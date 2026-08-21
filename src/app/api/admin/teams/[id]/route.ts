import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
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

    const teamDoc = await adminDb.collection('teams').doc(id).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    const teamData = teamDoc.data() as any;

    let venue: any = null;
    if (teamData.venueId) {
      const venueDoc = await adminDb.collection('venues').doc(teamData.venueId).get();
      if (venueDoc.exists) venue = { id: venueDoc.id, ...venueDoc.data() };
    }

    let problemStatement: any = null;
    if (teamData.problemStatementId) {
      const psDoc = await adminDb.collection('problemStatements').doc(teamData.problemStatementId).get();
      if (psDoc.exists) problemStatement = { id: psDoc.id, ...psDoc.data() };
    }

    const criteriaSnap = await adminDb.collection('criteria').where('active', '==', true).get();
    const criteria = criteriaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any)).sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const assignmentsSnap = await adminDb.collection('juryTeamAssignments').where('teamId', '==', id).get();
    const juryIds = assignmentsSnap.docs.map(doc => doc.data().juryId);

    let assignedJuries: any[] = [];
    if (juryIds.length > 0) {
      const juriesSnap = await adminDb.collection('users').get();
      assignedJuries = juriesSnap.docs.filter(doc => juryIds.includes(doc.id)).map(doc => ({ id: doc.id, ...doc.data() }));
    }

    const evaluationsSnap = await adminDb.collection('evaluations').where('teamId', '==', id).get();
    const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const criteriaBreakdown = criteria.map((crit) => {
      const juryScores: Record<string, number | null> = {};
      let totalScoresForCrit = 0;
      let countScoresForCrit = 0;

      assignedJuries.forEach((jury) => {
        const evaluation = evaluations.find((e) => e.juryId === jury.id && e.status === 'SUBMITTED');
        if (evaluation && evaluation.scores) {
          const scoreRec = evaluation.scores.find((s: any) => s.criterionId === crit.id || s.criterionName === crit.name);
          if (scoreRec) {
            juryScores[jury.id] = scoreRec.score;
            totalScoresForCrit += scoreRec.score;
            countScoresForCrit += 1;
          } else {
            juryScores[jury.id] = null;
          }
        } else {
          juryScores[jury.id] = null;
        }
      });

      const averageScore = countScoresForCrit > 0
        ? Math.round((totalScoresForCrit / countScoresForCrit) * 100) / 100
        : null;

      return {
        criterionId: crit.id,
        criterionName: crit.name,
        maxMarks: crit.maxMarks,
        juryScores,
        averageScore,
      };
    });

    const juryTotals = assignedJuries.map((jury) => {
      const evaluation = evaluations.find((e) => e.juryId === jury.id);
      return {
        juryId: jury.id,
        juryName: jury.name,
        totalScore: evaluation?.status === 'SUBMITTED' ? evaluation.totalScore : null,
        status: evaluation ? evaluation.status : 'PENDING',
        submittedAt: evaluation?.submittedAt ?? null,
        juryComment: evaluation?.juryComment ?? null,
        evaluationId: evaluation?.id ?? null,
      };
    });

    return NextResponse.json({
      team: {
        id,
        teamNumber: teamData.teamNumber,
        teamName: teamData.teamName,
        status: teamData.status || 'PENDING',
        finalScore: teamData.finalScore || null,
        venue: venue ? { id: venue.id, name: venue.name, capacity: venue.capacity } : null,
        problemStatement: problemStatement
          ? { id: problemStatement.id, code: problemStatement.code, title: problemStatement.title, description: problemStatement.description }
          : null,
      },
      assignedJuries: assignedJuries.map((j) => ({ id: j.id, name: j.name, username: j.username })),
      criteriaBreakdown,
      juryTotals,
    });
  } catch (error) {
    console.error('Error fetching team details:', error);
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
    const { teamNumber, teamName, venueId, problemStatementId } = await request.json();

    const teamRef = adminDb.collection('teams').doc(id);
    const existingTeamDoc = await teamRef.get();
    if (!existingTeamDoc.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    const existingTeam = existingTeamDoc.data() as any;

    const updateData: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (teamNumber) updateData.teamNumber = teamNumber.trim().toUpperCase();
    if (teamName) updateData.teamName = teamName.trim();
    if (venueId !== undefined) updateData.venueId = venueId;
    if (problemStatementId !== undefined) updateData.problemStatementId = problemStatementId;

    await teamRef.update(updateData);

    const updatedTeam = { ...existingTeam, ...updateData };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_TEAM',
      entity: 'Team',
      entityId: id,
      previousValue: JSON.stringify({ teamNumber: existingTeam.teamNumber, teamName: existingTeam.teamName }),
      newValue: JSON.stringify({ teamNumber: updatedTeam.teamNumber, teamName: updatedTeam.teamName }),
    });

    broadcastRealtimeEvent('TEAM_UPDATED', { teamId: id });

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
