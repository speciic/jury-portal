"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.createSessionToken = createSessionToken;
exports.verifySessionToken = verifySessionToken;
exports.setSessionCookie = setSessionCookie;
exports.getSession = getSession;
exports.clearSession = clearSession;
exports.requireRole = requireRole;
const jose_1 = require("jose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const firebase_admin_1 = require("./firebase-admin");
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'hackathon-super-secret-jwt-key-2026-production-secure');
const COOKIE_NAME = 'hackathon_session';
async function hashPassword(password) {
    return await bcryptjs_1.default.hash(password, 10);
}
async function verifyPassword(password, hash) {
    return await bcryptjs_1.default.compare(password, hash);
}
async function createSessionToken(payload) {
    return await new jose_1.SignJWT(Object.assign({}, payload))
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setExpirationTime('24h')
        .sign(JWT_SECRET);
}
async function verifySessionToken(token) {
    try {
        const { payload } = await (0, jose_1.jwtVerify)(token, JWT_SECRET);
        return {
            userId: payload.userId,
            username: payload.username,
            name: payload.name,
            role: payload.role,
            venueId: payload.venueId || null,
        };
    }
    catch (_a) {
        return null;
    }
}
// In Express, we need req/res to handle cookies
async function setSessionCookie(res, payload) {
    const token = await createSessionToken(payload);
    res.cookie(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 1000, // 24 hours in ms
    });
}
async function getSession(req) {
    const token = req.cookies[COOKIE_NAME];
    if (!token)
        return null;
    const session = await verifySessionToken(token);
    if (!session)
        return null;
    if (!firebase_admin_1.adminDb)
        return null;
    let userDoc = await firebase_admin_1.adminDb.collection('users').doc(session.userId).get();
    if (!userDoc.exists && session.username) {
        const snapshot = await firebase_admin_1.adminDb.collection('users').where('username', '==', session.username).limit(1).get();
        if (!snapshot.empty) {
            userDoc = snapshot.docs[0];
        }
    }
    if (!userDoc.exists)
        return null;
    const user = Object.assign({ id: userDoc.id }, userDoc.data());
    if (user.active === false)
        return null;
    return {
        userId: user.id,
        username: user.username,
        name: user.name,
        role: user.role || 'JURY',
        venueId: user.venueId || null,
    };
}
function clearSession(res) {
    res.clearCookie(COOKIE_NAME);
}
async function requireRole(req, allowedRoles) {
    const session = await getSession(req);
    if (!session || !allowedRoles.includes(session.role)) {
        throw new Error('Unauthorized');
    }
    return session;
}
//# sourceMappingURL=auth.js.map