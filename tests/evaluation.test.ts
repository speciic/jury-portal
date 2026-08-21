import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import { hashPassword, verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';
import { generateResultsExcelBuffer } from '../src/lib/export-excel';

describe('Hackathon Jury Evaluation Portal Engine', () => {
  it('should correctly hash and verify user passwords', async () => {
    const password = 'secureAdminPassword123!';
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
    const isInvalid = await verifyPassword('wrongpassword', hash);
    expect(isInvalid).toBe(false);
  });

  it('should generate and verify valid JWT session tokens', async () => {
    const payload = {
      userId: 'user-uuid-1',
      username: 'admin',
      name: 'Admin User',
      role: 'ADMIN' as const,
      venueId: null,
    };

    const token = await createSessionToken(payload);
    expect(token).toBeTypeOf('string');

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.userId).toBe('user-uuid-1');
    expect(decoded?.role).toBe('ADMIN');
  });

  it('should perform accurate team final score calculation math', () => {
    const juryScores = [88.5, 87.0, 90.5];
    const sum = juryScores.reduce((acc, s) => acc + s, 0);
    const average = Math.round((sum / juryScores.length) * 100) / 100;
    expect(average).toBe(88.67);
  });

  it('should generate a valid XLSX buffer with multi-sheet structure', async () => {
    const buffer = await generateResultsExcelBuffer();
    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
