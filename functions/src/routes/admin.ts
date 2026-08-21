import { Router } from 'express';
import { adminDb } from '../firebase-admin';
import { requireRole, hashPassword } from '../auth';
import { createAuditLog } from '../audit';

export const adminRouter = Router();

adminRouter.get('/juries', async (req, res) => {
  try {
    const session = await requireRole(req, ['ADMIN']);
    if (!adminDb) return res.status(500).json({ error: 'Database not initialized' });

    const search = (req.query.q as string)?.trim().toLowerCase() || '';

    const usersSnap = await adminDb.collection('users').where('role', '==', 'JURY').get();
    let users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    if (search) {
      users = users.filter(u => 
        (u.name && u.name.toLowerCase().includes(search)) || 
        (u.username && u.username.toLowerCase().includes(search))
      );
    }

    const venuesSnap = await adminDb.collection('venues').get();
    const venues = venuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const assignmentsSnap = await adminDb.collection('juryTeamAssignments').get();
    const assignments = assignmentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const evaluationsSnap = await adminDb.collection('evaluations').get();
    const evaluations = evaluationsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

    const formattedJuries = users.map((jury) => {
      const juryAssignments = assignments.filter(a => a.juryId === jury.id);
      const juryEvaluations = evaluations.filter(e => e.juryId === jury.id && e.status === 'SUBMITTED');
      
      const totalAssigned = juryAssignments.length;
      const completed = juryEvaluations.length;
      const pending = totalAssigned - completed;
      const venue = venues.find(v => v.id === jury.venueId);

      return {
        id: jury.id,
        name: jury.name,
        username: jury.username,
        active: jury.active,
        venue: venue ? { id: venue.id, name: venue.name } : null,
        totalAssigned,
        completedEvaluations: completed,
        pendingEvaluations: Math.max(0, pending),
      };
    });

    formattedJuries.sort((a, b) => a.name.localeCompare(b.name));

    return res.json({ juries: formattedJuries });
  } catch (error: any) {
    console.error('Error fetching juries:', error);
    if (error.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

adminRouter.post('/juries', async (req, res) => {
  try {
    const session = await requireRole(req, ['ADMIN']);
    if (!adminDb) return res.status(500).json({ error: 'Database not initialized' });

    const { name, username, password, venueId } = req.body;

    if (!name || !username || !password || !venueId) {
      return res.status(400).json({ error: 'Name, username, password, and venue are required' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existingSnap = await adminDb.collection('users').where('username', '==', cleanUsername).limit(1).get();

    if (!existingSnap.empty) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const passwordHash = await hashPassword(password);

    const newUserRef = await adminDb.collection('users').add({
      name: name.trim(),
      username: cleanUsername,
      passwordHash,
      role: 'JURY',
      venueId,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const venueDoc = await adminDb.collection('venues').doc(venueId).get();
    const venue = venueDoc.exists ? { id: venueDoc.id, name: venueDoc.data()?.name } : null;

    const venueTeamsSnap = await adminDb.collection('teams').where('venueId', '==', venueId).get();
    if (!venueTeamsSnap.empty) {
      const batch = adminDb.batch();
      venueTeamsSnap.docs.forEach(teamDoc => {
        const assignmentRef = adminDb!.collection('juryTeamAssignments').doc();
        batch.set(assignmentRef, {
          juryId: newUserRef.id,
          teamId: teamDoc.id,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
    }

    await createAuditLog({
      userId: session.userId,
      userRole: session.role,
      action: 'CREATE_JURY',
      entity: 'User',
      entityId: newUserRef.id,
      newValue: { name: name.trim(), username: cleanUsername, venueId },
    });

    // Realtime listener in the React app will pick this up via Firestore onSnapshot,
    // so we don't strictly need to emit an SSE here anymore!

    return res.json({
      success: true,
      jury: {
        id: newUserRef.id,
        name: name.trim(),
        username: cleanUsername,
        venue,
      },
    });
  } catch (error: any) {
    console.error('Error creating jury:', error);
    if (error.message === 'Unauthorized') return res.status(401).json({ error: 'Unauthorized' });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
