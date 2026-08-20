import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const cleanUsername = username.trim();
    let user = await db.user.findUnique({
      where: { username: cleanUsername.toLowerCase() },
      include: { venue: true },
    });

    if (!user) {
      user = await db.user.findUnique({
        where: { username: cleanUsername },
        include: { venue: true },
      });
    }

    if (!user || !user.active) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const payload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      venueId: user.venueId,
    };

    await setSessionCookie(payload);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        venue: user.venue ? { id: user.venue.id, name: user.venue.name } : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
