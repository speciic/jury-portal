import { Router } from 'express';
import { adminDb } from '../firebase-admin';
import { verifyPassword, setSessionCookie, getSession, clearSession } from '../auth';

export const authRouter = Router();

authRouter.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (!adminDb) {
      return res.status(500).json({ error: 'Database not initialized' });
    }

    const cleanUsername = username.trim().toLowerCase();
    
    const usersRef = adminDb.collection('users');
    const snapshot = await usersRef.where('username', '==', cleanUsername).limit(1).get();
    
    let userDoc = snapshot.empty ? null : snapshot.docs[0];

    if (!userDoc) {
      const exactSnapshot = await usersRef.where('username', '==', username.trim()).limit(1).get();
      if (!exactSnapshot.empty) {
        userDoc = exactSnapshot.docs[0];
      }
    }
    
    if (!userDoc) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = { id: userDoc.id, ...userDoc.data() } as any;

    if (user.active === false) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

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

    await setSessionCookie(res, payload);

    return res.json({
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
    return res.status(500).json({ error: 'Internal server error' });
  }
});

authRouter.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ success: true });
});

authRouter.get('/me', async (req, res) => {
  try {
    const session = await getSession(req);
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    return res.json({
      user: {
        id: session.userId,
        name: session.name,
        username: session.username,
        role: session.role,
        venueId: session.venueId || null,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
