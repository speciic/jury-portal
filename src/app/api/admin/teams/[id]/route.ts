import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

    const { id } = await params;

    const team = await db.team.findUnique({
      where: { id },
      include: {
        venue: true,
        problemStatement: true,
        assignments: {
          include: { jury: true },
        },
        evaluations: {
          include: {
            jury: true,
            scores: true,
            unlockedByUser: { select: { name: true } },
          },
        },
      },
    });

    if (!team) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    // Active or historical criteria list
    const criteria = await db.criterion.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });

    // Build Jury List for this team
    const assignedJuries = team.assignments.map((a) => a.jury);

    // Build Criteria Breakdown Matrix
    const criteriaBreakdown = criteria.map((crit) => {
      const juryScores: Record<string, number | null> = {};
      let totalScoresForCrit = 0;
      let countScoresForCrit = 0;

      assignedJuries.forEach((jury) => {
        const evaluation = team.evaluations.find((e) => e.juryId === jury.id && e.status === 'SUBMITTED');
        if (evaluation) {
          const scoreRec = evaluation.scores.find((s) => s.criterionId === crit.id || s.criterionName === crit.name);
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

    // Jury Totals
    const juryTotals = assignedJuries.map((jury) => {
      const evaluation = team.evaluations.find((e) => e.juryId === jury.id);
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
        id: team.id,
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        status: team.status,
        finalScore: team.finalScore,
        venue: { id: team.venue.id, name: team.venue.name, capacity: team.venue.capacity },
        problemStatement: team.problemStatement
          ? { id: team.problemStatement.id, code: team.problemStatement.code, title: team.problemStatement.title, description: team.problemStatement.description }
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

    const { id } = await params;
    const { teamNumber, teamName, venueId, problemStatementId } = await request.json();

    const existingTeam = await db.team.findUnique({ where: { id } });
    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    const updatedTeam = await db.team.update({
      where: { id },
      data: {
        teamNumber: teamNumber ? teamNumber.trim().toUpperCase() : existingTeam.teamNumber,
        teamName: teamName ? teamName.trim() : existingTeam.teamName,
        venueId: venueId || existingTeam.venueId,
        problemStatementId: problemStatementId ?? existingTeam.problemStatementId,
      },
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_TEAM',
      entity: 'Team',
      entityId: id,
      previousValue: { teamNumber: existingTeam.teamNumber, teamName: existingTeam.teamName },
      newValue: { teamNumber: updatedTeam.teamNumber, teamName: updatedTeam.teamName },
    });

    broadcastRealtimeEvent('TEAM_UPDATED', { teamId: id });

    return NextResponse.json({ success: true, team: updatedTeam });
  } catch (error) {
    console.error('Error updating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
