import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'JURY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim() || '';

    // Fetch jury details including venue
    const juryUser = await db.user.findUnique({
      where: { id: session.userId },
      include: { venue: true },
    });

    if (!juryUser) {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }

    // Fetch ONLY teams explicitly assigned to this jury
    const assignments = await db.juryTeamAssignment.findMany({
      where: {
        juryId: session.userId,
        team: search
          ? {
              OR: [
                { teamNumber: { contains: search } },
                { teamName: { contains: search } },
              ],
            }
          : undefined,
      },
      include: {
        team: {
          include: {
            venue: true,
            problemStatement: true,
            evaluations: {
              where: { juryId: session.userId },
            },
          },
        },
      },
      orderBy: { team: { teamNumber: 'asc' } },
    });

    const assignedTeams = assignments.map((assignment) => {
      const team = assignment.team;
      const juryEvaluation = team.evaluations[0];

      return {
        id: team.id,
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        venueName: team.venue.name,
        problemCode: team.problemStatement?.code ?? 'N/A',
        problemTitle: team.problemStatement?.title ?? 'N/A',
        evaluationStatus: juryEvaluation ? juryEvaluation.status : 'PENDING',
        totalScore: juryEvaluation && juryEvaluation.status === 'SUBMITTED' ? juryEvaluation.totalScore : null,
      };
    });

    return NextResponse.json({
      jury: {
        id: juryUser.id,
        name: juryUser.name,
        username: juryUser.username,
        venueName: juryUser.venue?.name ?? 'Assigned Venue',
      },
      teams: assignedTeams,
    });
  } catch (error) {
    console.error('Error fetching jury teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
