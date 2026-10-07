import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { qrVerifications } from "@/db/schema";
import { randomToken } from "./utils";

export const QR_TOKEN_BYTES = 24;
export const QR_TOKEN_TTL_DAYS = 365; // tokens last a year by default

/**
 * QR tokens are opaque random references. The QR payload never contains the
 * student's name, birth date, address, disability data or any other personal
 * information — the backend resolves the token to authorized fields only.
 */

/** Issue a new active verification token for a student record. */
export async function createQrToken(
  studentId: string,
  verifiedBy: string,
  meta: { ipAddress?: string | null; userAgent?: string | null } = {},
): Promise<string> {
  const token = randomToken(QR_TOKEN_BYTES);
  await db.insert(qrVerifications).values({
    id: crypto.randomUUID(),
    studentId,
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
 * The most recent valid (generated, not revoked/expired) token for a student.
 * A token is revoked by a later `revoke` event row for the same token.
 */
export async function currentQrToken(
  studentId: string,
): Promise<{ token: string; verifiedAt: Date } | null> {
  const rows = await db
    .select({
      token: qrVerifications.verificationToken,
      type: qrVerifications.verificationType,
      verifiedAt: qrVerifications.verifiedAt,
    })
    .from(qrVerifications)
    .where(eq(qrVerifications.studentId, studentId))
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
 * Resolve a public QR token to its student. Returns null for unknown or
 * revoked tokens. Expiry checks are surfaced via `expired` so the public
 * page can show a friendly message.
 */
export async function resolveQrToken(
  token: string,
): Promise<{ studentId: string; tokenId: string; expired: boolean } | null> {
  const rows = await db
    .select({
      id: qrVerifications.id,
      studentId: qrVerifications.studentId,
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
  return { studentId: row.studentId, tokenId: row.id, expired };
}

/** Record a public verification (scan) event against the token. */
export async function registerQrScan(
  token: string,
  meta: { ipAddress?: string | null; userAgent?: string | null; expired?: boolean } = {},
): Promise<void> {
  // Find the student this token belongs to (token is unique across events).
  const rows = await db
    .select({ studentId: qrVerifications.studentId })
    .from(qrVerifications)
    .where(eq(qrVerifications.verificationToken, token))
    .limit(1);
  const studentId = rows[0]?.studentId;
  if (!studentId) return;

  await db.insert(qrVerifications).values({
    id: crypto.randomUUID(),
    studentId,
    verificationToken: token,
    verificationType: "scan",
    result: meta.expired ? "expired" : "valid",
    verifiedAt: new Date(),
    ipAddress: meta.ipAddress ?? null,
    userAgent: meta.userAgent ?? null,
  });
}

/** Revoke all active tokens of a student (e.g. on record edit / data dispute). */
export async function deactivateStudentTokens(
  studentId: string,
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
    .where(eq(qrVerifications.studentId, studentId))
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
      studentId,
      verificationToken: token,
      verifiedBy: revokedBy,
      verificationType: "revoke" as const,
      result: "revoked" as const,
      verifiedAt: new Date(),
    })),
  );
}

/** Count of scan events for a student (for the profile page). */
export async function countQrScans(studentId: string): Promise<number> {
  const rows = await db
    .select({ n: sql<number>`count(*)` })
    .from(qrVerifications)
    .where(and(eq(qrVerifications.studentId, studentId), eq(qrVerifications.verificationType, "scan")));
  return rows[0]?.n ?? 0;
}
