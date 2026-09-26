import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { children, qrVerifications } from "@/db/schema";
import { randomToken } from "./utils";

export const QR_TOKEN_BYTES = 24;
export const QR_TOKEN_TTL_DAYS = 365; // tokens last a year by default

/**
 * QR tokens are opaque random references. The QR payload never contains the
 * child's name, birth date, address, disability data or any other personal
 * information — the backend resolves the token to authorized fields only.
 */

/** Issue a new active verification token for a child record. */
export async function createQrToken(
  childId: string,
  verifiedBy: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
  ttlDays = QR_TOKEN_TTL_DAYS,
): Promise<string> {
  const token = randomToken(QR_TOKEN_BYTES);
  await db.insert(qrVerifications).values({
    id: crypto.randomUUID(),
    childId,
    verificationToken: token,
    verifiedBy,
    verificationType: "generate",
    result: "valid",
    verifiedAt: new Date(),
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });
  return token;
}

/**
 * The most recent valid (generated, not revoked/expired) token for a child.
 * A token is revoked by a later `revoke` event row for the same token.
 */
export async function currentQrToken(
  childId: string,
): Promise<{ token: string; verifiedAt: Date } | null> {
  const rows = await db
    .select({
      token: qrVerifications.verificationToken,
      type: qrVerifications.verificationType,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .where(eq(qrVerifications.childId, childId))
    .orderBy(desc(qrVerifications.verifiedAt));

  // Newest event per token decides its state.
  const state = new Map<string, { revoked: boolean; at: Date }>();
  for (const row of rows) {
    if (!state.has(row.token)) {
      state.set(row.token, { revoked: row.type === "revoke", at: row.verifiedAt });
    }
  }

  for (const [token, s] of state) {
    if (!s.revoked) return { token, verifiedAt: s.at };
  }
  return null;
}

/**
 * Resolve a public QR token to its child. Returns null for unknown or
 * revoked tokens. Expiry checks are surfaced via `expired` so the public
 * page can show a friendly message.
 */
export async function resolveQrToken(
  token: string,
): Promise<{ childId: string; tokenId: string; expired: boolean } | null> {
  const rows = await db
    .select({
      id: qrVerifications.id,
      childId: qrVerifications.childId,
      type: qrVerifications.verificationType,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .where(eq(qrVerifications.verificationToken, token))
    .orderBy(desc(qrVerifications.verifiedAt))
    .limit(1);

  const row = rows[0];
  if (!row || row.type === "revoke") return null;

  const expired = row.verifiedAt.getTime() + QR_TOKEN_TTL_DAYS * 86400_000 < Date.now();
  return { childId: row.childId, tokenId: row.id, expired };
}

/** Record a public verification (scan) event against the token. */
export async function registerQrScan(
  token: string,
  meta: { ipAddress?: string | null; userAgent?: string | null; expired?: boolean } = {},
): Promise<void> {
  // Find the child this token belongs to (token is unique across events).
  const rows = await db
    .select({ childId: qrVerifications.childId })
    .from(qrVerifications)
    .where(eq(qrVerifications.verificationToken, token))
    .limit(1);
  const childId = rows[0]?.childId;
  if (!childId) return;

  await db.insert(qrVerifications).values({
    id: crypto.randomUUID(),
    childId,
    verificationToken: token,
    verificationType: "scan",
    result: meta.expired ? "expired" : "valid",
    verifiedAt: new Date(),
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });
}

/** Revoke all active tokens of a child (e.g. on record edit / data dispute). */
export async function deactivateChildTokens(
  childId: string,
  revokedBy: string,
): Promise<void> {
  // Active tokens = tokens whose newest event is a "generate".
  const latest = await db
    .select({
      token: qrVerifications.verificationToken,
      type: qrVerifications.verificationType,
      verifiedAt: qrVerifications.verifiedAt,
      id: qrVerifications.id,
    })
    .from(qrVerifications)
    .where(eq(qrVerifications.childId, childId))
    .orderBy(desc(qrVerifications.verifiedAt));

  const state = new Map<string, boolean>(); // token → revoked
  for (const row of latest) {
    if (!state.has(row.token)) state.set(row.token, row.type === "revoke");
  }

  const activeTokens = [...state.entries()].filter(([, revoked]) => !revoked).map(([t]) => t);
  if (activeTokens.length === 0) return;

  await db.insert(qrVerifications).values(
    activeTokens.map((token) => ({
      id: crypto.randomUUID(),
      childId,
      verificationToken: token,
      verifiedBy: revokedBy,
      verificationType: "revoke" as const,
      result: "revoked" as const,
      verifiedAt: new Date(),
    })),
  );
}

/** Count of scan events for a child (for the profile page). */
export async function countQrScans(childId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(qrVerifications)
    .where(and(eq(qrVerifications.childId, childId), eq(qrVerifications.verificationType, "scan")));
  return rows[0]?.n ?? 0;
}
