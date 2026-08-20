import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'JURY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamId, scores, juryComment } = await request.json();

    if (!teamId || !scores || typeof scores !== 'object') {
      return NextResponse.json({ error: 'Team ID and scores are required' }, { status: 400 });
    }

    // 1. Verify jury is assigned to team
    const assignment = await db.juryTeamAssignment.findUnique({
      where: {
        juryId_teamId: {
          juryId: session.userId,
          teamId,
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to evaluate this team' },
        { status: 403 }
      );
    }

    // 2. Verify submission lock state
    const existingEvaluation = await db.evaluation.findUnique({
      where: {
        teamId_juryId: {
          teamId,
          juryId: session.userId,
        },
      },
    });

    if (existingEvaluation && existingEvaluation.status === 'SUBMITTED') {
      return NextResponse.json(
        { error: 'Evaluation is already submitted and locked. Contact admin to unlock.' },
        { status: 400 }
      );
    }

    // 3. Fetch active criteria
    const criteria = await db.criterion.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });

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

    // 5. Run Database Transaction
    const result = await db.$transaction(async (tx) => {
      // Upsert evaluation record
      const evaluation = await tx.evaluation.upsert({
        where: {
          teamId_juryId: {
            teamId,
            juryId: session.userId,
          },
        },
        create: {
          teamId,
          juryId: session.userId,
          status: 'SUBMITTED',
          criteriaVersion: 1,
          totalScore: calculatedTotalScore,
          juryComment: juryComment ? juryComment.trim() : null,
          submittedAt: new Date(),
        },
        update: {
          status: 'SUBMITTED',
          totalScore: calculatedTotalScore,
          juryComment: juryComment ? juryComment.trim() : null,
          submittedAt: new Date(),
          unlockedAt: null,
          unlockedReason: null,
          unlockedByUserId: null,
        },
      });

      // Clear existing score snapshots and insert updated snapshots
      await tx.evaluationScore.deleteMany({
        where: { evaluationId: evaluation.id },
      });

      for (const rec of validatedScoreRecords) {
        await tx.evaluationScore.create({
          data: {
            evaluationId: evaluation.id,
            criterionId: rec.criterionId,
            criterionName: rec.criterionName,
            criterionMaxMarks: rec.criterionMaxMarks,
            score: rec.score,
          },
        });
      }

      // Check if all assigned juries for this team have submitted
      const allAssignments = await tx.juryTeamAssignment.findMany({
        where: { teamId },
      });

      const submittedEvaluations = await tx.evaluation.findMany({
        where: {
          teamId,
          status: 'SUBMITTED',
        },
      });

      const isFullyCompleted =
        allAssignments.length > 0 && submittedEvaluations.length >= allAssignments.length;

      let finalAvgScore: number | null = null;
      if (isFullyCompleted) {
        const sumTotals = submittedEvaluations.reduce((sum, e) => sum + e.totalScore, 0);
        finalAvgScore = Math.round((sumTotals / submittedEvaluations.length) * 100) / 100;

        await tx.team.update({
          where: { id: teamId },
          data: {
            status: 'COMPLETED',
            finalScore: finalAvgScore,
          },
        });
      }

      return { evaluation, isFullyCompleted, finalAvgScore };
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'SUBMIT_EVALUATION',
      entity: 'Evaluation',
      entityId: result.evaluation.id,
      newValue: { totalScore: calculatedTotalScore, isFullyCompleted: result.isFullyCompleted },
    });

    broadcastRealtimeEvent('EVALUATION_SUBMITTED', {
      teamId,
      juryId: session.userId,
      totalScore: calculatedTotalScore,
      isFullyCompleted: result.isFullyCompleted,
      finalScore: result.finalAvgScore,
    });

    return NextResponse.json({
      success: true,
      totalScore: calculatedTotalScore,
      isFullyCompleted: result.isFullyCompleted,
      finalScore: result.finalAvgScore,
    });
  } catch (error) {
    console.error('Error submitting evaluation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
