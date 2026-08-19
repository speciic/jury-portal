import { db } from './db';

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
    await db.auditLog.create({
      data: {
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
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
