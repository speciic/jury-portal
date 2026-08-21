"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const firebase_admin_1 = require("../firebase-admin");
const auth_1 = require("../auth");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        if (!firebase_admin_1.adminDb) {
            return res.status(500).json({ error: 'Database not initialized' });
        }
        const cleanUsername = username.trim().toLowerCase();
        const usersRef = firebase_admin_1.adminDb.collection('users');
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
        const user = Object.assign({ id: userDoc.id }, userDoc.data());
        if (user.active === false) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        const isValid = await (0, auth_1.verifyPassword)(password, user.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        let venue = null;
        if (user.venueId) {
            const venueDoc = await firebase_admin_1.adminDb.collection('venues').doc(user.venueId).get();
            if (venueDoc.exists) {
                venue = Object.assign({ id: venueDoc.id }, venueDoc.data());
            }
        }
        const payload = {
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role || 'JURY',
            venueId: user.venueId || null,
        };
        await (0, auth_1.setSessionCookie)(res, payload);
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
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.authRouter.post('/logout', (req, res) => {
    (0, auth_1.clearSession)(res);
    res.json({ success: true });
});
exports.authRouter.get('/me', async (req, res) => {
    try {
        const session = await (0, auth_1.getSession)(req);
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
    }
    catch (error) {
        console.error('Me error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
//# sourceMappingURL=auth.js.map