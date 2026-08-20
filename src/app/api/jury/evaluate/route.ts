import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'JURY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { teamId, scores, juryComment } = await request.json();

    if (!teamId || !scores || typeof scores !== 'object') {
      return NextResponse.json({ error: 'Team ID and scores are required' }, { status: 400 });
    }

    // 1. Verify jury is assigned to team
    const assignmentDocId = `${session.userId}_${teamId}`;
    const assignmentDoc = await adminDb.collection('juryTeamAssignments').doc(assignmentDocId).get();
    
    if (!assignmentDoc.exists) {
      const assignmentSnapshot = await adminDb.collection('juryTeamAssignments')
        .where('juryId', '==', session.userId)
        .where('teamId', '==', teamId)
        .limit(1)
        .get();

      if (assignmentSnapshot.empty) {
        return NextResponse.json(
          { error: 'Forbidden: You are not assigned to evaluate this team' },
          { status: 403 }
        );
      }
    }

    // 2. Verify submission lock state
    const evaluationDocId = `${teamId}_${session.userId}`;
    const evaluationDoc = await adminDb.collection('evaluations').doc(evaluationDocId).get();

    if (evaluationDoc.exists && evaluationDoc.data()?.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Evaluation is already submitted and locked. Contact admin to unlock.' },
        { status: 400 }
      );
    }

    // 3. Fetch active criteria
    const criteriaSnapshot = await adminDb.collection('criteria')
      .where('active', '==', true)
      .get();
    
    const criteria = criteriaSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as any[];

    if (criteria.length === 0) {
      return NextResponse.json({ error: 'No active evaluation criteria found' }, { status: 400 });
    }

    // 4. Validate every mark server-side
    let calculatedTotalScore = 0;
    const validatedScoreRecords: {
      criterionId: string;
      criterionName: string;
      criterionMaxMarks: number;
      score: number;
    }[] = [];

    for (const crit of criteria) {
      const markRaw = scores[crit.id];
      if (markRaw === undefined || markRaw === null || markRaw === '') {
        return NextResponse.json(
          { error: `Missing score for criterion: ${crit.name}` },
          { status: 400 }
        );
      }

      const markNum = parseFloat(markRaw);

      if (isNaN(markNum) || markNum < 0 || markNum > crit.maxMarks) {
        return NextResponse.json(
          {
            error: `Invalid mark for "${crit.name}". Must be between 0 and ${crit.maxMarks}. Received: ${markRaw}`,
          },
          { status: 400 }
        );
      }

      const roundedScore = Math.round(markNum * 100) / 100;
      calculatedTotalScore += roundedScore;

      validatedScoreRecords.push({
        criterionId: crit.id,
        criterionName: crit.name,
        criterionMaxMarks: crit.maxMarks,
        score: roundedScore,
      });
    }

    calculatedTotalScore = Math.round(calculatedTotalScore * 100) / 100;

    // 5. Save to Firestore
    const evalRef = adminDb.collection('evaluations').doc(evaluationDocId);
    
    await evalRef.set({
      teamId,
      juryId: session.userId,
      status: 'SUBMITTED',
      criteriaVersion: 1,
      totalScore: calculatedTotalScore,
      juryComment: juryComment ? juryComment.trim() : null,
      submittedAt: new Date(),
      scores: validatedScoreRecords,
      unlockedAt: null,
      unlockedReason: null,
      unlockedByUserId: null,
    });

    const scoresBatch = adminDb.batch();
    const scoresColRef = evalRef.collection('scores');
    
    const oldScoresSnap = await scoresColRef.get();
    oldScoresSnap.docs.forEach(doc => {
      scoresBatch.delete(doc.ref);
    });

    validatedScoreRecords.forEach(rec => {
      const newScoreRef = scoresColRef.doc(rec.criterionId);
      scoresBatch.set(newScoreRef, rec);
    });
    await scoresBatch.commit();

    // 6. Check if all assigned juries for this team have submitted
    const allAssignmentsSnap = await adminDb.collection('juryTeamAssignments')
      .where('teamId', '==', teamId)
      .get();
    
    const submittedEvaluationsSnap = await adminDb.collection('evaluations')
      .where('teamId', '==', teamId)
      .where('status', '==', 'SUBMITTED')
      .get();

    const allAssignments = allAssignmentsSnap.docs.map(doc => doc.data());
    const submittedEvaluations = submittedEvaluationsSnap.docs.map(doc => doc.data());

    const isFullyCompleted =
      allAssignments.length > 0 && submittedEvaluations.length >= allAssignments.length;

    let finalAvgScore: number | null = null;
    if (isFullyCompleted) {
      const sumTotals = submittedEvaluations.reduce((sum, e) => sum + e.totalScore, 0);
      finalAvgScore = Math.round((sumTotals / submittedEvaluations.length) * 100) / 100;

      await adminDb.collection('teams').doc(teamId).update({
        status: 'COMPLETED',
        finalScore: finalAvgScore,
      });
    }

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'SUBMIT_EVALUATION',
      entity: 'Evaluation',
      entityId: evaluationDocId,
      newValue: { totalScore: calculatedTotalScore, isFullyCompleted },
    });

    broadcastRealtimeEvent('EVALUATION_SUBMITTED', {
      teamId,
      juryId: session.userId,
      totalScore: calculatedTotalScore,
      isFullyCompleted,
      finalScore: finalAvgScore,
    });

    return NextResponse.json({
      success: true,
      totalScore: calculatedTotalScore,
      isFullyCompleted,
      finalScore: finalAvgScore,
    });
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
