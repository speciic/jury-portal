import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const completedTeams = await db.team.findMany({
      where: {
        status: 'COMPLETED',
        finalScore: { not: null },
      },
      include: {
        venue: true,
        problemStatement: true,
        evaluations: {
          select: {
            id: true,
            totalScore: true,
            jury: { select: { name: true } },
          },
        },
      },
      orderBy: [{ finalScore: 'desc' }, { teamNumber: 'asc' }],
    });

    const pendingTeams = await db.team.findMany({
      where: {
        status: 'PENDING',
      },
      include: {
        venue: true,
        problemStatement: true,
      },
      orderBy: { teamNumber: 'asc' },
    });

    const rankedLeaderboard = completedTeams.map((team, index) => ({
      rank: index + 1,
      id: team.id,
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      venueName: team.venue.name,
      problemCode: team.problemStatement?.code ?? 'N/A',
      problemTitle: team.problemStatement?.title ?? 'N/A',
      finalScore: team.finalScore ?? 0,
      status: team.status,
      juryEvaluationsCount: team.evaluations.length,
    }));

    const unrankedPending = pendingTeams.map((team) => ({
      rank: null,
      id: team.id,
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      venueName: team.venue.name,
      problemCode: team.problemStatement?.code ?? 'N/A',
      problemTitle: team.problemStatement?.title ?? 'N/A',
      finalScore: null,
      status: team.status,
    }));

    return NextResponse.json({
      leaderboard: [...rankedLeaderboard, ...unrankedPending],
      completedCount: completedTeams.length,
      pendingCount: pendingTeams.length,
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
