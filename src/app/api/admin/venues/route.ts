import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { getSession } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { broadcastRealtimeEvent } from '@/lib/realtime';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const venuesSnap = await adminDb.collection('venues').orderBy('name', 'asc').get();
    const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const usersSnap = await adminDb.collection('users').where('role', '==', 'JURY').where('active', '==', true).get();
    const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const teamsSnap = await adminDb.collection('teams').get();
    const teams = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const formattedVenues = venues.map((venue) => {
      const venueTeams = teams.filter(t => t.venueId === venue.id);
      const teamsCount = venueTeams.length;
      const completedCount = venueTeams.filter((t) => t.status === 'COMPLETED').length;
      const pendingCount = teamsCount - completedCount;
      const venueJuries = users.filter(u => u.venueId === venue.id);

      return {
        id: venue.id,
        name: venue.name,
        capacity: venue.capacity,
        juriesCount: venueJuries.length,
        juries: venueJuries.map((j) => ({ id: j.id, name: j.name })),
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
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { name, capacity } = await request.json();

    if (!name || !capacity || capacity <= 0) {
      return NextResponse.json(
        { error: 'Valid venue name and positive capacity are required' },
        { status: 400 }
      );
    }

    const existingSnap = await adminDb.collection('venues').where('name', '==', name.trim()).limit(1).get();

    if (!existingSnap.empty) {
      return NextResponse.json({ error: 'Venue name already exists' }, { status: 400 });
    }

    const newVenueRef = await adminDb.collection('venues').add({
      name: name.trim(),
      capacity: parseInt(capacity, 10),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const newVenue = { id: newVenueRef.id, name: name.trim(), capacity: parseInt(capacity, 10) };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_VENUE',
      entity: 'Venue',
      entityId: newVenue.id,
      newValue: JSON.stringify({ name: newVenue.name, capacity: newVenue.capacity }),
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
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { id, name, capacity } = await request.json();

    if (!id || !name || !capacity) {
      return NextResponse.json({ error: 'ID, name and capacity required' }, { status: 400 });
    }

    const venueRef = adminDb.collection('venues').doc(id);
    const existingVenueDoc = await venueRef.get();
    if (!existingVenueDoc.exists) {
      return NextResponse.json({ error: 'Venue not found' }, { status: 404 });
    }
    const existingVenue = existingVenueDoc.data() as any;

    await venueRef.update({
      name: name.trim(),
      capacity: parseInt(capacity, 10),
      updatedAt: new Date().toISOString(),
    });

    const updatedVenue = { id, name: name.trim(), capacity: parseInt(capacity, 10) };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_VENUE',
      entity: 'Venue',
      entityId: id,
      previousValue: JSON.stringify({ name: existingVenue.name, capacity: existingVenue.capacity }),
      newValue: JSON.stringify({ name: updatedVenue.name, capacity: updatedVenue.capacity }),
    });

    broadcastRealtimeEvent('VENUE_UPDATED', { venueId: id });

    return NextResponse.json({ success: true, venue: updatedVenue });
  } catch (error) {
    console.error('Error updating venue:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
