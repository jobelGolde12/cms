import { db } from "@/db";
import { auditLogs, notifications } from "@/db/schema";

type AuditInput = {
  userId?: string | null;
  userRole?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  result?: "success" | "denied" | "error";
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
};

/**
 * Append an audit record. Audit logging must never break the primary
 * operation, so failures are logged, not thrown. Users cannot edit or
 * delete these records through the application.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: input.userId ?? null,
      userRole: input.userRole ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      result: input.result ?? "success",
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
      ip: input.ip ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write audit log", error);
  }
}

type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
};

/** Create an in-app notification for a user. Never throws to the caller. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await db.insert(notifications).values({
      id: crypto.randomUUID(),
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    });
  } catch (error) {
    console.error("[notifications] failed to create notification", error);
  }
}
