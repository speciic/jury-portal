import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
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

    const juries = await db.user.findMany({
      where: {
        role: 'JURY',
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { username: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        venue: true,
        assignments: {
          include: {
            team: {
              include: {
                evaluations: true,
              },
            },
          },
        },
        evaluations: true,
      },
      orderBy: { name: 'asc' },
    });

    const formattedJuries = juries.map((jury) => {
      const totalAssigned = jury.assignments.length;
      const completed = jury.evaluations.filter((e) => e.status === 'SUBMITTED').length;
      const pending = totalAssigned - completed;

      return {
        id: jury.id,
        name: jury.name,
        username: jury.username,
        active: jury.active,
        venue: jury.venue ? { id: jury.venue.id, name: jury.venue.name } : null,
        totalAssigned,
        completedEvaluations: completed,
        pendingEvaluations: Math.max(0, pending),
      };
    });

    return NextResponse.json({ juries: formattedJuries });
  } catch (error) {
    console.error('Error fetching juries:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, username, password, venueId } = await request.json();

    if (!name || !username || !password || !venueId) {
      return NextResponse.json(
        { error: 'Name, username, password, and venue are required' },
        { status: 400 }
      );
    }

    const existingUser = await db.user.findUnique({
      where: { username: username.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);

    const newJury = await db.user.create({
      data: {
        name: name.trim(),
        username: username.trim().toLowerCase(),
        passwordHash,
        role: 'JURY',
        venueId,
        active: true,
      },
      include: { venue: true },
    });

    // Auto-assign existing teams in venue to this jury
    const venueTeams = await db.team.findMany({ where: { venueId }, select: { id: true } });
    for (const team of venueTeams) {
      await db.juryTeamAssignment.create({
        data: {
          juryId: newJury.id,
          teamId: team.id,
        },
      });
    }

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_JURY',
      entity: 'User',
      entityId: newJury.id,
      newValue: { name: newJury.name, username: newJury.username, venueId },
    });

    broadcastRealtimeEvent('JURY_UPDATED', { juryId: newJury.id });

    return NextResponse.json({
      success: true,
      jury: {
        id: newJury.id,
        name: newJury.name,
        username: newJury.username,
        venue: newJury.venue ? { id: newJury.venue.id, name: newJury.venue.name } : null,
      },
    });
  } catch (error) {
    console.error('Error creating jury:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
