import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const venues = await db.venue.findMany({
      include: {
        users: { where: { role: 'JURY', active: true } },
        teams: {
          include: {
            evaluations: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const formattedVenues = venues.map((venue) => {
      const teamsCount = venue.teams.length;
      const completedCount = venue.teams.filter((t) => t.status === 'COMPLETED').length;
      const pendingCount = teamsCount - completedCount;

      return {
        id: venue.id,
        name: venue.name,
        capacity: venue.capacity,
        juriesCount: venue.users.length,
        juries: venue.users.map((j) => ({ id: j.id, name: j.name })),
        teamsAssigned: teamsCount,
        completedEvaluations: completedCount,
        pendingEvaluations: pendingCount,
      };
    });

    return NextResponse.json({ venues: formattedVenues });
  } catch (error) {
    console.error('Error fetching venues:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, capacity } = await request.json();

    if (!name || !capacity || capacity <= 0) {
      return NextResponse.json(
        { error: 'Valid venue name and positive capacity are required' },
        { status: 400 }
      );
    }

    const existingVenue = await db.venue.findUnique({
      where: { name: name.trim() },
    });

    if (existingVenue) {
      return NextResponse.json({ error: 'Venue name already exists' }, { status: 400 });
    }

    const newVenue = await db.venue.create({
      data: {
        name: name.trim(),
        capacity: parseInt(capacity, 10),
      },
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_VENUE',
      entity: 'Venue',
      entityId: newVenue.id,
      newValue: { name: newVenue.name, capacity: newVenue.capacity },
    });

    broadcastRealtimeEvent('VENUE_UPDATED', { venueId: newVenue.id });

    return NextResponse.json({ success: true, venue: newVenue });
  } catch (error) {
    console.error('Error creating venue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, capacity } = await request.json();

    if (!id || !name || !capacity) {
      return NextResponse.json({ error: 'ID, name and capacity required' }, { status: 400 });
    }

    const existingVenue = await db.venue.findUnique({ where: { id } });
    if (!existingVenue) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }

    const updatedVenue = await db.venue.update({
      where: { id },
      data: {
        name: name.trim(),
        capacity: parseInt(capacity, 10),
      },
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_VENUE',
      entity: 'Venue',
      entityId: id,
      previousValue: { name: existingVenue.name, capacity: existingVenue.capacity },
      newValue: { name: updatedVenue.name, capacity: updatedVenue.capacity },
    });

    broadcastRealtimeEvent('VENUE_UPDATED', { venueId: id });

    return NextResponse.json({ success: true, venue: updatedVenue });
  } catch (error) {
    console.error('Error updating venue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
