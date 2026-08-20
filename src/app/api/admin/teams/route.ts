import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q')?.trim() || '';

    const teams = await db.team.findMany({
      where: search
        ? {
            OR: [
              { teamNumber: { contains: search } },
              { teamName: { contains: search } },
            ],
          }
        : undefined,
      include: {
        venue: true,
        problemStatement: true,
        evaluations: {
          include: { jury: true },
        },
        assignments: {
          include: { jury: true },
        },
      },
      orderBy: { teamNumber: 'asc' },
    });

    const formattedTeams = teams.map((team) => ({
      id: team.id,
      teamNumber: team.teamNumber,
      teamName: team.teamName,
      status: team.status,
      finalScore: team.finalScore,
      venue: { id: team.venue.id, name: team.venue.name },
      problemStatement: team.problemStatement
        ? { id: team.problemStatement.id, code: team.problemStatement.code, title: team.problemStatement.title }
        : null,
      assignedJuriesCount: team.assignments.length,
      submittedEvaluationsCount: team.evaluations.filter((e) => e.status === 'SUBMITTED').length,
    }));

    return NextResponse.json({ teams: formattedTeams });
  } catch (error) {
    console.error('Error fetching teams:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { teamNumber, teamName, venueId, problemStatementId, juryIds } = await request.json();

    if (!teamNumber || !teamName || !venueId) {
      return NextResponse.json(
        { error: 'Team number, team name, and venue are required' },
        { status: 400 }
      );
    }

    const existingTeam = await db.team.findUnique({
      where: { teamNumber: teamNumber.trim().toUpperCase() },
    });

    if (existingTeam) {
      return NextResponse.json({ error: 'Team number already exists' }, { status: 400 });
    }

    // Create team
    const newTeam = await db.team.create({
      data: {
        teamNumber: teamNumber.trim().toUpperCase(),
        teamName: teamName.trim(),
        venueId,
        problemStatementId: problemStatementId || null,
        status: 'PENDING',
      },
      include: {
        venue: true,
      },
    });

    // Determine assigned juries: explicit juryIds or auto-assign venue juries
    let targetJuryIds: string[] = Array.isArray(juryIds) && juryIds.length > 0 ? juryIds : [];
    if (targetJuryIds.length === 0) {
      const venueJuries = await db.user.findMany({
        where: { venueId, role: 'JURY', active: true },
        select: { id: true },
      });
      targetJuryIds = venueJuries.map((j) => j.id);
    }

    // Create assignments
    for (const jId of targetJuryIds) {
      await db.juryTeamAssignment.create({
        data: {
          teamId: newTeam.id,
          juryId: jId,
        },
      });
    }

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_TEAM',
      entity: 'Team',
      entityId: newTeam.id,
      newValue: { teamNumber: newTeam.teamNumber, teamName: newTeam.teamName, venueId },
    });

    broadcastRealtimeEvent('TEAM_ADDED', { teamId: newTeam.id, teamNumber: newTeam.teamNumber });

    return NextResponse.json({ success: true, team: newTeam });
  } catch (error) {
    console.error('Error creating team:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
