import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'JURY') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim().toLowerCase() || '';

    // 1. Fetch jury details from Firestore
    const userDoc = await adminDb.collection('users').doc(session.userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }
    const userData = userDoc.data()!;

    // Fetch venue if assigned
    let venueName = 'Assigned Venue';
    if (userData.venueId) {
      const venueDoc = await adminDb.collection('venues').doc(userData.venueId).get();
      if (venueDoc.exists) {
        venueName = venueDoc.data()?.name || venueName;
      }
    }

    // 2. Fetch assignments for this jury
    const assignmentsSnapshot = await adminDb.collection('juryTeamAssignments')
      .where('juryId', '==', session.userId)
      .get();
    
    const assignedTeamIds = assignmentsSnapshot.docs.map(doc => doc.data().teamId as string);

    if (assignedTeamIds.length === 0) {
      return NextResponse.json({
        jury: {
          id: session.userId,
          name: userData.name || userData.username,
          username: userData.username,
          venueName,
        },
        teams: [],
      });
    }

    // 3. Fetch all venues, problem statements, and evaluations to optimize joins in memory
    const [venuesSnapshot, psSnapshot, evaluationsSnapshot] = await Promise.all([
      adminDb.collection('venues').get(),
      adminDb.collection('problemStatements').get(),
      adminDb.collection('evaluations').where('juryId', '==', session.userId).get(),
    ]);

    const venuesMap = new Map(venuesSnapshot.docs.map(doc => [doc.id, doc.data()]));
    const psMap = new Map(psSnapshot.docs.map(doc => [doc.id, doc.data()]));
    const evaluationsMap = new Map(evaluationsSnapshot.docs.map(doc => [doc.data().teamId as string, doc.data()]));

    // 4. Fetch the teams
    const teamDocs: any[] = [];
    const chunks = [];
    for (let i = 0; i < assignedTeamIds.length; i += 30) {
      chunks.push(assignedTeamIds.slice(i, i + 30));
    }

    const db = adminDb;
    await Promise.all(
      chunks.map(async (chunk) => {
        const snap = await db.collection('teams')
          .where('__name__', 'in', chunk)
          .get();
        teamDocs.push(...snap.docs);
      })
    );

    // Map and filter
    const assignedTeams = teamDocs
      .map((doc) => {
        const teamData = doc.data();
        const teamId = doc.id;
        const venue = venuesMap.get(teamData.venueId);
        const ps = teamData.problemStatementId ? psMap.get(teamData.problemStatementId) : null;
        const evaluation = evaluationsMap.get(teamId);

        return {
          id: teamId,
          teamNumber: teamData.teamNumber || '',
          teamName: teamData.teamName || '',
          venueName: venue?.name || 'Unknown Venue',
          problemCode: ps?.code ?? 'N/A',
          problemTitle: ps?.title ?? 'N/A',
          evaluationStatus: evaluation ? evaluation.status : 'PENDING',
          totalScore: evaluation && evaluation.status === 'SUBMITTED' ? evaluation.totalScore : null,
        };
      })
      .filter((team) => {
        if (!search) return true;
        return (
          team.teamNumber.toLowerCase().includes(search) ||
          team.teamName.toLowerCase().includes(search)
        );
      });

    // Sort by teamNumber
    assignedTeams.sort((a, b) => a.teamNumber.localeCompare(b.teamNumber));

    return NextResponse.json({
      jury: {
        id: session.userId,
        name: userData.name || userData.username,
        username: userData.username,
        venueName,
      },
      teams: assignedTeams,
    });
  } catch (error) {
    console.error('Error fetching jury teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
