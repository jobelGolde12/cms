import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { qrTokens } from "@/db/schema";
import { randomToken } from "./utils";

export const QR_TOKEN_BYTES = 24;
export const QR_TOKEN_TTL_DAYS = 365; // tokens last a year by default

/** Create an active QR verification token for a child record. */
export async function createQrToken(
  childId: string,
  createdBy: string,
  ttlDays = QR_TOKEN_TTL_DAYS,
): Promise<string> {
  const token = randomToken(QR_TOKEN_BYTES);
  const expiresAt = new Date(Date.now() + ttlDays * 86400_000);

  await db.insert(qrTokens).values({
    id: crypto.randomUUID(),
    childId,
    token,
    isActive: true,
    createdBy,
    expiresAt,
  });

  return token;
}

/** Most recent active token for a child, if any. */
export async function currentQrToken(
  childId: string,
): Promise<{ token: string; expiresAt: Date | null } | null> {
  const rows = await db
    .select({ token: qrTokens.token, expiresAt: qrTokens.expiresAt })
    .from(qrTokens)
    .where(and(eq(qrTokens.childId, childId), eq(qrTokens.isActive, true)))
    .orderBy(desc(qrTokens.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve a public QR token to its child when active and unexpired.
 * Returns null for unknown, deactivated or expired tokens.
 */
export async function resolveQrToken(
  token: string,
): Promise<{ childId: string; tokenId: string } | null> {
  const rows = await db
    .select({
      childId: qrTokens.childId,
      tokenId: qrTokens.id,
      isActive: qrTokens.isActive,
      expiresAt: qrTokens.expiresAt,
    })
    .from(qrTokens)
    .where(eq(qrTokens.token, token))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isActive) return null;
  if (row.expiresAt && row.expiresAt.getTime() < Date.now()) return null;

  return { childId: row.childId, tokenId: row.tokenId };
}

/** Record a successful public verification (scan counter + timestamp). */
export async function registerQrScan(tokenId: string): Promise<void> {
  await db
    .update(qrTokens)
    .set({ scanCount: sql`${qrTokens.scanCount} + 1`, lastScannedAt: new Date() })
    .where(eq(qrTokens.id, tokenId));
}

/** Deactivate all tokens of a child (e.g. on record edit / data dispute). */
export async function deactivateChildTokens(childId: string): Promise<void> {
  await db
    .update(qrTokens)
    .set({ isActive: false })
    .where(and(eq(qrTokens.childId, childId), eq(qrTokens.isActive, true)));
}