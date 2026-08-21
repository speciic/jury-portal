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

    const logsSnap = await adminDb.collection('auditLogs')
      .orderBy('timestamp', 'desc')
      .limit(100)
      .get();
      
    const logs = logsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const userIds = [...new Set(logs.map(log => log.userId))].filter(Boolean);
    let usersMap: Record<string, any> = {};

    if (userIds.length > 0) {
      const usersSnap = await adminDb.collection('users').get();
      usersSnap.docs.forEach(doc => {
        if (userIds.includes(doc.id)) {
          usersMap[doc.id] = { name: doc.data().name, username: doc.data().username };
        }
      });
    }

    const formattedLogs = logs.map(log => ({
      ...log,
      user: usersMap[log.userId] || null
    }));

    return NextResponse.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
