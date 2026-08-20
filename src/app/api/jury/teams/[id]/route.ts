import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'JURY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { id } = await params;

    // 1. Verify jury is assigned to this team
    const assignmentDocId = `${session.userId}_${id}`;
    const assignmentDoc = await adminDb.collection('juryTeamAssignments').doc(assignmentDocId).get();
    
    if (!assignmentDoc.exists) {
      const assignmentSnapshot = await adminDb.collection('juryTeamAssignments')
        .where('juryId', '==', session.userId)
        .where('teamId', '==', id)
        .limit(1)
        .get();

      if (assignmentSnapshot.empty) {
        return NextResponse.json(
          { error: 'Forbidden: You are not assigned to evaluate this team' },
          { status: 403 }
        );
      }
    }

    // 2. Fetch the team and its venue/problem details
    const teamDoc = await adminDb.collection('teams').doc(id).get();
    if (!teamDoc.exists) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }
    const teamData = teamDoc.data()!;

    // Fetch venue details
    let venueName = 'Unknown Venue';
    if (teamData.venueId) {
      const venueDoc = await adminDb.collection('venues').doc(teamData.venueId).get();
      if (venueDoc.exists) {
        venueName = venueDoc.data()?.name || venueName;
      }
    }

    // Fetch problem statement details
    let problemCode = 'N/A';
    let problemTitle = 'N/A';
    let problemDescription = '';
    if (teamData.problemStatementId) {
      const psDoc = await adminDb.collection('problemStatements').doc(teamData.problemStatementId).get();
      if (psDoc.exists) {
        const psData = psDoc.data()!;
        problemCode = psData.code || problemCode;
        problemTitle = psData.title || problemTitle;
        problemDescription = psData.description || problemDescription;
      }
    }

    // 3. Fetch existing evaluation by this jury
    const evaluationDocId = `${id}_${session.userId}`;
    const evaluationDoc = await adminDb.collection('evaluations').doc(evaluationDocId).get();
    let existingEvaluation = null;

    if (evaluationDoc.exists) {
      const evalData = evaluationDoc.data()!;
      let scoresList = evalData.scores || [];
      if (scoresList.length === 0) {
        const scoresSnapshot = await adminDb.collection('evaluations').doc(evaluationDocId).collection('scores').get();
        scoresList = scoresSnapshot.docs.map(doc => ({
          criterionId: doc.data().criterionId,
          score: doc.data().score,
        }));
      }

      existingEvaluation = {
        id: evaluationDocId,
        status: evalData.status,
        totalScore: evalData.totalScore,
        juryComment: evalData.juryComment,
        submittedAt: evalData.submittedAt ? (evalData.submittedAt.toDate ? evalData.submittedAt.toDate() : evalData.submittedAt) : null,
        scores: scoresList,
      };
    }

    // 4. Fetch active criteria
    const criteriaSnapshot = await adminDb.collection('criteria')
      .where('active', '==', true)
      .get();
    
    const criteria = criteriaSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    criteria.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeTotalMaxMarks = criteria.reduce((sum, c) => sum + (c.maxMarks || 0), 0);

    return NextResponse.json({
      team: {
        id,
        teamNumber: teamData.teamNumber || '',
        teamName: teamData.teamName || '',
        venueName,
        problemCode,
        problemTitle,
        problemDescription,
      },
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        maxMarks: c.maxMarks,
        displayOrder: c.displayOrder,
      })),
      maxTotalPossibleMarks: Math.round(activeTotalMaxMarks * 100) / 100,
      existingEvaluation,
    });
  } catch (error) {
    console.error('Error fetching jury team details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
