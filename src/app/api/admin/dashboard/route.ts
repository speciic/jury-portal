import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Fetch all venues
    const venuesSnapshot = await adminDb.collection('venues').get();
    const venues = venuesSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as any[];
    venues.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

    // Fetch all teams
    const teamsSnapshot = await adminDb.collection('teams').get();
    const teams = teamsSnapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as any[];

    // Fetch all problem statements
    const psSnapshot = await adminDb.collection('problemStatements').get();
    const problemStatements = psSnapshot.docs.reduce((acc: Record<string, any>, doc: any) => {
      acc[doc.id] = { id: doc.id, ...doc.data() };
      return acc;
    }, {} as Record<string, any>);

    const totalTeams = teams.length;
    const completedTeams = teams.filter((t) => t.status === 'COMPLETED').length;
    const pendingTeams = totalTeams - completedTeams;

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
        capacity: v.capacity || 50,
        totalAssigned,
        evaluated,
        pending,
        completionPercentage,
      };
    });

    // Top 10 Leaderboard
    const leaderboardTeams = teams
      .filter((t) => t.status === 'COMPLETED' && t.finalScore !== null && t.finalScore !== undefined)
      .sort((a, b) => {
        if (b.finalScore !== a.finalScore) {
          return b.finalScore - a.finalScore;
        }
        return (a.teamNumber || '').localeCompare(b.teamNumber || '');
      })
      .slice(0, 10);

    const top10Leaderboard = leaderboardTeams.map((team, index) => {
      const venue = venues.find(v => v.id === team.venueId);
      const ps = team.problemStatementId ? problemStatements[team.problemStatementId] : null;

      return {
        rank: index + 1,
        id: team.id,
        teamNumber: team.teamNumber || '',
        teamName: team.teamName || '',
        venueName: venue ? venue.name : 'Unknown Venue',
        problemCode: ps ? ps.code : 'N/A',
        finalScore: team.finalScore ?? 0,
      };
    });

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
