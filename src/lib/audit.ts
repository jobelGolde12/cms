import { db } from "@/db";
import { auditLogs, notifications } from "@/db/schema";

type AuditInput = {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

/**
 * Append an audit record. Audit logging must never break the primary
 * operation, so failures are logged, not thrown. There is no application
 * path that edits or deletes these rows (append-only by design).
 *
 * Keep `oldValues`/`newValues` minimal — never include password hashes or
 * other secrets.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: input.userId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      oldValuesJson: input.oldValues ? JSON.stringify(input.oldValues) : null,
      newValuesJson: input.newValues ? JSON.stringify(input.newValues) : null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  message?: string | null;
  link?: string | null;
};

/**
 * Create an in-app notification for a user. Never throws to the caller.
 * Keep `message` free of unnecessary sensitive child information.
 */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      message: input.message ?? null,
      link: input.link ?? null,
    });
  } catch (error) {
    console.error("[notifications] failed to create notification", error);
  }
}
