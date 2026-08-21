import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { evaluationId, reason } = await request.json();

    if (!evaluationId || !reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: 'Evaluation ID and unlock reason are required' },
        { status: 400 }
      );
    }

    const evalRef = adminDb.collection('evaluations').doc(evaluationId);
    const evalDoc = await evalRef.get();
    
    if (!evalDoc.exists) {
      return NextResponse.json({ error: 'Evaluation not found' }, { status: 404 });
    }
    const evaluation = evalDoc.data() as any;

    const teamRef = adminDb.collection('teams').doc(evaluation.teamId);

    const batch = adminDb.batch();

    batch.update(evalRef, {
      status: 'UNLOCKED',
      unlockedAt: new Date().toISOString(),
      unlockedReason: reason.trim(),
      unlockedByUserId: session.userId,
    });

    batch.update(teamRef, {
      status: 'PENDING',
      finalScore: null,
    });

    await batch.commit();

    const unlockedEvaluation = {
      ...evaluation,
      id: evaluationId,
      status: 'UNLOCKED',
      unlockedAt: new Date().toISOString(),
      unlockedReason: reason.trim(),
      unlockedByUserId: session.userId,
    };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UNLOCK_EVALUATION',
      entity: 'Evaluation',
      entityId: evaluationId,
      previousValue: JSON.stringify({ status: evaluation.status, totalScore: evaluation.totalScore }),
      newValue: JSON.stringify({ status: 'UNLOCKED' }),
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
