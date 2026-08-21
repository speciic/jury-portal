import { adminDb } from './firebase-admin';

export interface AuditLogOptions {
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}

export async function createAuditLog(options: AuditLogOptions) {
  try {
    if (!adminDb) return;
    
    await adminDb.collection('auditLogs').add({
      userId: options.userId ?? null,
      userRole: options.userRole ?? null,
      action: options.action,
      entity: options.entity,
      entityId: options.entityId ?? null,
      previousValue: options.previousValue
        ? JSON.stringify(options.previousValue)
        : null,
      newValue: options.newValue ? JSON.stringify(options.newValue) : null,
      reason: options.reason ?? null,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
