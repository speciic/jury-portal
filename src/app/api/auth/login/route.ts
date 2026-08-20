import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyPassword, setSessionCookie } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    const cleanUsername = username.trim().toLowerCase();
    
    // Query users collection
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('username', '==', cleanUsername).limit(1).get();
    
    // Fallback to exact match if not found (previous logic)
    let userDoc = snapshot.empty ? null : snapshot.docs[0];

    if (!userDoc) {
      const exactSnapshot = await usersRef.where('username', '==', username.trim()).limit(1).get();
      if (!exactSnapshot.empty) {
        userDoc = exactSnapshot.docs[0];
      }
    }
    
    if (!userDoc) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const user = { id: userDoc.id, ...userDoc.data() } as any;

    if (user.active === false) { // Default to true if not set
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Fetch venue if applicable
    let venue: any = null;
    if (user.venueId) {
      const venueDoc = await adminDb.collection('venues').doc(user.venueId).get();
      if (venueDoc.exists) {
        venue = { id: venueDoc.id, ...venueDoc.data() };
      }
    }

    const payload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role || 'JURY',
      venueId: user.venueId || null,
    };

    await setSessionCookie(payload);

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role || 'JURY',
        venue: venue ? { id: venue.id, name: venue.name } : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
