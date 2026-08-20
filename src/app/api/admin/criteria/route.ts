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

    const criteria = await db.criterion.findMany({
      orderBy: { displayOrder: 'asc' },
    });

    const activeCriteria = criteria.filter((c) => c.active);
    const totalMaxMarks = activeCriteria.reduce((sum, c) => sum + c.maxMarks, 0);

    return NextResponse.json({
      criteria,
      totalMaxMarks: Math.round(totalMaxMarks * 100) / 100,
    });
  } catch (error) {
    console.error('Error fetching criteria:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, maxMarks, displayOrder } = await request.json();

    if (!name || maxMarks <= 0) {
      return NextResponse.json({ error: 'Criterion name and positive max marks required' }, { status: 400 });
    }

    const count = await db.criterion.count();

    const newCriterion = await db.criterion.create({
      data: {
        name: name.trim(),
        maxMarks: parseFloat(maxMarks),
        displayOrder: displayOrder ? parseInt(displayOrder, 10) : count + 1,
        active: true,
        version: 1,
      },
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_CRITERION',
      entity: 'Criterion',
      entityId: newCriterion.id,
      newValue: { name: newCriterion.name, maxMarks: newCriterion.maxMarks },
    });

    broadcastRealtimeEvent('CRITERIA_UPDATED');

    return NextResponse.json({ success: true, criterion: newCriterion });
  } catch (error) {
    console.error('Error creating criterion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, name, maxMarks, displayOrder, active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Criterion ID is required' }, { status: 400 });
    }

    const existingCriterion = await db.criterion.findUnique({ where: { id } });
    if (!existingCriterion) {
      return NextResponse.json({ error: 'Criterion not found' }, { status: 404 });
    }

    const updatedCriterion = await db.criterion.update({
      where: { id },
      data: {
        name: name ? name.trim() : existingCriterion.name,
        maxMarks: maxMarks !== undefined ? parseFloat(maxMarks) : existingCriterion.maxMarks,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : existingCriterion.displayOrder,
        active: active !== undefined ? Boolean(active) : existingCriterion.active,
        version: existingCriterion.version + 1, // Increment version for snapshot tracking
      },
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_CRITERION',
      entity: 'Criterion',
      entityId: id,
      previousValue: { name: existingCriterion.name, maxMarks: existingCriterion.maxMarks, active: existingCriterion.active },
      newValue: { name: updatedCriterion.name, maxMarks: updatedCriterion.maxMarks, active: updatedCriterion.active },
    });

    broadcastRealtimeEvent('CRITERIA_UPDATED');

    return NextResponse.json({ success: true, criterion: updatedCriterion });
  } catch (error) {
    console.error('Error updating criterion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
