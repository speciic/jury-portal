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

    const criteriaSnap = await adminDb.collection('criteria').get();
    const criteria = criteriaSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
    
    criteria.sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));

    const activeCriteria = criteria.filter((c) => c.active);
    const totalMaxMarks = activeCriteria.reduce((sum, c) => sum + (c.maxMarks || 0), 0);

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
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { name, maxMarks, displayOrder } = await request.json();

    if (!name || maxMarks <= 0) {
      return NextResponse.json({ error: 'Criterion name and positive max marks required' }, { status: 400 });
    }

    const snapshot = await adminDb.collection('criteria').get();
    const count = snapshot.size;

    const newCriterionRef = await adminDb.collection('criteria').add({
      name: name.trim(),
      maxMarks: parseFloat(maxMarks),
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : count + 1,
      active: true,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const newCriterion = {
      id: newCriterionRef.id,
      name: name.trim(),
      maxMarks: parseFloat(maxMarks),
      displayOrder: displayOrder ? parseInt(displayOrder, 10) : count + 1,
      active: true,
      version: 1,
    };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_CRITERION',
      entity: 'Criterion',
      entityId: newCriterion.id,
      newValue: JSON.stringify({ name: newCriterion.name, maxMarks: newCriterion.maxMarks }),
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
    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const { id, name, maxMarks, displayOrder, active } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Criterion ID is required' }, { status: 400 });
    }

    const critRef = adminDb.collection('criteria').doc(id);
    const existingCritDoc = await critRef.get();
    if (!existingCritDoc.exists) {
      return NextResponse.json({ error: 'Criterion not found' }, { status: 404 });
    }
    const existingCriterion = existingCritDoc.data() as any;

    const updateData: Record<string, any> = {
      updatedAt: new Date().toISOString(),
      version: (existingCriterion.version || 1) + 1
    };

    if (name) updateData.name = name.trim();
    if (maxMarks !== undefined) updateData.maxMarks = parseFloat(maxMarks);
    if (displayOrder !== undefined) updateData.displayOrder = parseInt(displayOrder, 10);
    if (active !== undefined) updateData.active = Boolean(active);

    await critRef.update(updateData);

    const updatedCriterion = { ...existingCriterion, ...updateData };

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'UPDATE_CRITERION',
      entity: 'Criterion',
      entityId: id,
      previousValue: JSON.stringify({ name: existingCriterion.name, maxMarks: existingCriterion.maxMarks, active: existingCriterion.active }),
      newValue: JSON.stringify({ name: updatedCriterion.name, maxMarks: updatedCriterion.maxMarks, active: updatedCriterion.active }),
    });

    broadcastRealtimeEvent('CRITERIA_UPDATED');

    return NextResponse.json({ success: true, criterion: updatedCriterion });
  } catch (error) {
    console.error('Error updating criterion:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
