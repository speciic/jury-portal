import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { db } from './db';
import { Role } from '@prisma/client';

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

export async function setSessionCookie(payload: SessionPayload) {
  const token = await createSessionToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await verifySessionToken(token);
  if (!session) return null;

  // Verify active user in DB
  let user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, active: true, role: true, venueId: true, name: true, username: true },
  });

  if (!user && session.username) {
    user = await db.user.findUnique({
      where: { username: session.username },
      select: { id: true, active: true, role: true, venueId: true, name: true, username: true },
    });
  }

  if (!user || !user.active) return null;

  return {
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    venueId: user.venueId,
  };
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireRole(allowedRoles: Role[]): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !allowedRoles.includes(session.role)) {
    throw new Error('Unauthorized');
  }
  return session;
}
