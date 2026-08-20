import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
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

    const jury = await db.user.findUnique({
      where: { id },
      include: {
        venue: true,
        assignments: {
          include: {
            team: {
              include: {
                evaluations: {
                  where: { juryId: id },
                },
              },
            },
          },
        },
      },
    });

    if (!jury || jury.role !== 'JURY') {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }

    const evaluatedTeams = jury.assignments.map((assignment) => {
      const evaluation = assignment.team.evaluations[0];
      return {
        teamId: assignment.team.id,
        teamNumber: assignment.team.teamNumber,
        teamName: assignment.team.teamName,
        status: evaluation ? evaluation.status : 'PENDING',
        totalScore: evaluation ? evaluation.totalScore : null,
        submittedAt: evaluation ? evaluation.submittedAt : null,
      };
    });

    return NextResponse.json({
      jury: {
        id: jury.id,
        name: jury.name,
        username: jury.username,
        active: jury.active,
        venue: jury.venue ? { id: jury.venue.id, name: jury.venue.name } : null,
      },
      evaluatedTeams,
    });
  } catch (error) {
    console.error('Error fetching jury details:', error);
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
    const { name, username, newPassword, venueId, active } = await request.json();

    const existingJury = await db.user.findUnique({ where: { id } });
    if (!existingJury || existingJury.role !== 'JURY') {
      return NextResponse.json({ error: 'Jury not found' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name) updateData.name = name.trim();
    if (username) updateData.username = username.trim().toLowerCase();
    if (venueId) updateData.venueId = venueId;
    if (typeof active === 'boolean') updateData.active = active;

    if (newPassword && newPassword.trim().length > 0) {
      updateData.passwordHash = await hashPassword(newPassword.trim());
      await createAuditLog({
        userId: session.userId,
        userRole: session.role,
        action: 'RESET_JURY_PASSWORD',
        entity: 'User',
        entityId: id,
        reason: 'Admin initiated password reset',
      });
    }

    const updatedJury = await db.user.update({
      where: { id },
      data: updateData,
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_JURY',
      entity: 'User',
      entityId: id,
      newValue: { name: updatedJury.name, venueId: updatedJury.venueId, active: updatedJury.active },
    });

    broadcastRealtimeEvent('JURY_UPDATED', { juryId: id });

    return NextResponse.json({ success: true, jury: updatedJury });
  } catch (error) {
    console.error('Error updating jury:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
