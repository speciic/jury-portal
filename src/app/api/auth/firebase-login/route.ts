import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import { setSessionCookie, SessionPayload } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'ID token is required' }, { status: 400 });
    }

    if (!adminAuth || !adminDb) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

    // Verify the Firebase Auth ID Token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const uid = decodedToken.uid;
    const email = decodedToken.email;

    if (!email) {
      return NextResponse.json({ error: 'No email associated with this token' }, { status: 400 });
    }

    // Check if user exists in the Firestore `users` collection
    const userRef = adminDb.collection('users').doc(uid);
    const userDoc = await userRef.get();

    let userRole = 'JURY';
    let venueId = null;
    let name = decodedToken.name || email.split('@')[0];

    if (!userDoc.exists) {
      // Auto-sync the user to the Firestore users collection
      await userRef.set({
        name,
        username: email,
        role: 'JURY',
        active: true,
        venueId: null, // Admin needs to assign them to a venue later if needed
      });
    } else {
      const data = userDoc.data();
      if (data?.active === false) {
        return NextResponse.json({ error: 'Account is disabled' }, { status: 401 });
      }
      userRole = data?.role || 'JURY';
      venueId = data?.venueId || null;
      name = data?.name || name;
    }

    // Set the session cookie
    const payload: SessionPayload = {
      userId: uid,
      username: email,
      name,
      role: userRole as 'ADMIN' | 'JURY',
      venueId,
    };

    await setSessionCookie(payload);

    return NextResponse.json({
      success: true,
      user: payload,
    });
  } catch (error) {
    console.error('Firebase login error:', error);
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }
}
