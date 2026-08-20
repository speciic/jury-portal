import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch all teams with venue & evaluations
    const teams = await db.team.findMany({
      include: {
        venue: true,
        evaluations: true,
        assignments: true,
      },
    });

    const totalTeams = teams.length;
    const completedTeams = teams.filter((t) => t.status === 'COMPLETED').length;
    const pendingTeams = totalTeams - completedTeams;

    // Fetch all venues
    const venues = await db.venue.findMany({
      orderBy: { name: 'asc' },
    });

    const venueProgress = venues.map((v) => {
      const vTeams = teams.filter((t) => t.venueId === v.id);
      const totalAssigned = vTeams.length;
      const evaluated = vTeams.filter((t) => t.status === 'COMPLETED').length;
      const pending = totalAssigned - evaluated;
      const completionPercentage =
        totalAssigned > 0 ? Math.round((evaluated / totalAssigned) * 1000) / 10 : 0;

      return {
        id: v.id,
        name: v.name,
        capacity: v.capacity,
        totalAssigned,
        evaluated,
        pending,
        completionPercentage,
      };
    });

    // Top 10 Leaderboard (only completed teams or highest final score)
    const leaderboardTeams = await db.team.findMany({
      where: {
        status: 'COMPLETED',
        finalScore: { not: null },
      },
      include: {
        venue: true,
        problemStatement: true,
      },
      orderBy: [{ finalScore: 'desc' }, { teamNumber: 'asc' }],
      take: 10,
    });

    const top10Leaderboard = leaderboardTeams.map((team, index) => ({
      rank: index + 1,
      id: team.id,
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      venueName: team.venue.name,
      problemCode: team.problemStatement?.code ?? 'N/A',
      finalScore: team.finalScore ?? 0,
    }));

    return NextResponse.json({
      heroMetrics: {
        totalTeams,
        completedTeams,
        pendingTeams,
      },
      venueProgress,
      top10Leaderboard,
    });
  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
