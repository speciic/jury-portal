import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSession, hashPassword, verifyPassword } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.trim().length === 0) {
      return NextResponse.json({ error: 'New password is required' }, { status: 400 });
    }

    if (newPassword.trim().length < 4) {
      return NextResponse.json(
        { error: 'New password must be at least 4 characters long' },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Optional current password check if provided
    if (currentPassword) {
      const isValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
      }
    }

    const passwordHash = await hashPassword(newPassword.trim());

    await db.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    });

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CHANGE_PASSWORD',
      entity: 'User',
      entityId: session.userId,
      reason: 'User changed account password',
    });

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
