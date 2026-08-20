import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { evaluationId, reason } = await request.json();

    if (!evaluationId || !reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Evaluation ID and unlock reason are required' },
        { status: 400 }
      );
    }

    const evaluation = await db.evaluation.findUnique({
      where: { id: evaluationId },
      include: { team: true, jury: true },
    });

    if (!evaluation) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }

    // Unlock evaluation and set team back to pending
    const unlockedEvaluation = await db.$transaction(async (tx) => {
      const updatedEval = await tx.evaluation.update({
        where: { id: evaluationId },
        data: {
          status: 'UNLOCKED',
          unlockedAt: new Date(),
          unlockedReason: reason.trim(),
          unlockedByUserId: session.userId,
        },
      });

      // Update team status to PENDING and clear finalScore until all evaluations are resubmitted
      await tx.team.update({
        where: { id: evaluation.teamId },
        data: {
          status: 'PENDING',
          finalScore: null,
        },
      });

      return updatedEval;
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UNLOCK_EVALUATION',
      entity: 'Evaluation',
      entityId: evaluationId,
      previousValue: { status: evaluation.status, totalScore: evaluation.totalScore },
      newValue: { status: 'UNLOCKED' },
      reason: reason.trim(),
    });

    broadcastRealtimeEvent('EVALUATION_UNLOCKED', {
      evaluationId,
      teamId: evaluation.teamId,
      juryId: evaluation.juryId,
    });

    return NextResponse.json({ success: true, evaluation: unlockedEvaluation });
  } catch (error) {
    console.error('Error unlocking evaluation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
