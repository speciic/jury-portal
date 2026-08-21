import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { adminDb } from './firebase-admin';
import { Request, Response } from 'express';

type Role = 'ADMIN' | 'JURY';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'hackathon-super-secret-jwt-key-2026-production-secure'
);

const COOKIE_NAME = 'hackathon_session';

export interface SessionPayload {
  userId: string;
  username: string;
  name: string;
  role: Role;
  venueId?: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      name: payload.name as string,
      role: payload.role as Role,
      venueId: (payload.venueId as string) || null,
    };
  } catch {
    return null;
  }
}

// In Express, we need req/res to handle cookies
export async function setSessionCookie(res: Response, payload: SessionPayload) {
  const token = await createSessionToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 1000, // 24 hours in ms
  });
}

export async function getSession(req: Request): Promise<SessionPayload | null> {
  const token = req.cookies[COOKIE_NAME];
  if (!token) return null;
  
  const session = await verifySessionToken(token);
  if (!session) return null;

  if (!adminDb) return null;

  let userDoc = await adminDb.collection('users').doc(session.userId).get();
  
  if (!userDoc.exists && session.username) {
    const snapshot = await adminDb.collection('users').where('username', '==', session.username).limit(1).get();
    if (!snapshot.empty) {
      userDoc = snapshot.docs[0];
    }
  }

  if (!userDoc.exists) return null;
  
  const user = { id: userDoc.id, ...userDoc.data() } as any;

  if (user.active === false) return null;

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role || 'JURY',
    venueId: user.venueId || null,
  };
}

export function clearSession(res: Response) {
  res.clearCookie(COOKIE_NAME);
}

export async function requireRole(req: Request, allowedRoles: Role[]): Promise<SessionPayload> {
  const session = await getSession(req);
  if (!session || !allowedRoles.includes(session.role)) {
    throw new Error('Unauthorized');
  }
  return session;
}
