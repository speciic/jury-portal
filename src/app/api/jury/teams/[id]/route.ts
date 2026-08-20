import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
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

    const { id } = await params;

    // Verify jury is assigned to this team
    const assignment = await db.juryTeamAssignment.findUnique({
      where: {
        juryId_teamId: {
          juryId: session.userId,
          teamId: id,
        },
      },
      include: {
        team: {
          include: {
            venue: true,
            problemStatement: true,
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json(
        { error: 'Forbidden: You are not assigned to evaluate this team' },
        { status: 403 }
      );
    }

    const team = assignment.team;

    // Fetch existing evaluation by this jury
    const existingEvaluation = await db.evaluation.findUnique({
      where: {
        teamId_juryId: {
          teamId: id,
          juryId: session.userId,
        },
      },
      include: {
        scores: true,
      },
    });

    // Fetch active criteria
    const criteria = await db.criterion.findMany({
      where: { active: true },
      orderBy: { displayOrder: 'asc' },
    });

    const activeTotalMaxMarks = criteria.reduce((sum, c) => sum + c.maxMarks, 0);

    return NextResponse.json({
      team: {
        id: team.id,
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        venueName: team.venue.name,
        problemCode: team.problemStatement?.code ?? 'N/A',
        problemTitle: team.problemStatement?.title ?? 'N/A',
        problemDescription: team.problemStatement?.description ?? '',
      },
      criteria: criteria.map((c) => ({
        id: c.id,
        name: c.name,
        maxMarks: c.maxMarks,
        displayOrder: c.displayOrder,
      })),
      maxTotalPossibleMarks: Math.round(activeTotalMaxMarks * 100) / 100,
      existingEvaluation: existingEvaluation
        ? {
            id: existingEvaluation.id,
            status: existingEvaluation.status,
            totalScore: existingEvaluation.totalScore,
            juryComment: existingEvaluation.juryComment,
            submittedAt: existingEvaluation.submittedAt,
            scores: existingEvaluation.scores.map((s) => ({
              criterionId: s.criterionId,
              score: s.score,
            })),
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching jury team details:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
