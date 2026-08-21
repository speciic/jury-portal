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

    const teamsSnap = await adminDb.collection('teams').get();
    const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const venuesSnap = await adminDb.collection('venues').get();
    const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const psSnap = await adminDb.collection('problemStatements').get();
    const problemStatements = psSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const evaluationsSnap = await adminDb.collection('evaluations').get();
    const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const completedTeams = teams.filter(t => t.status === 'COMPLETED' && t.finalScore !== null && t.finalScore !== undefined);
    completedTeams.sort((a, b) => {
      if (b.finalScore !== a.finalScore) {
        return b.finalScore - a.finalScore;
      }
      return (a.teamNumber || '').localeCompare(b.teamNumber || '');
    });

    const pendingTeams = teams.filter(t => t.status !== 'COMPLETED');
    pendingTeams.sort((a, b) => (a.teamNumber || '').localeCompare(b.teamNumber || ''));

    const rankedLeaderboard = completedTeams.map((team, index) => {
      const venue = venues.find(v => v.id === team.venueId);
      const ps = problemStatements.find(p => p.id === team.problemStatementId);
      const teamEvaluations = evaluations.filter(e => e.teamId === team.id && e.status === 'SUBMITTED');

      return {
        rank: index + 1,
        id: team.id,
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        venueName: venue ? venue.name : 'Unknown',
        problemCode: ps ? ps.code : 'N/A',
        problemTitle: ps ? ps.title : 'N/A',
        finalScore: team.finalScore ?? 0,
        status: team.status,
        juryEvaluationsCount: teamEvaluations.length,
      };
    });

    const unrankedPending = pendingTeams.map((team) => {
      const venue = venues.find(v => v.id === team.venueId);
      const ps = problemStatements.find(p => p.id === team.problemStatementId);

      return {
        rank: null,
        id: team.id,
        teamNumber: team.teamNumber,
        teamName: team.teamName,
        venueName: venue ? venue.name : 'Unknown',
        problemCode: ps ? ps.code : 'N/A',
        problemTitle: ps ? ps.title : 'N/A',
        finalScore: null,
        status: team.status || 'PENDING',
      };
    });

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
