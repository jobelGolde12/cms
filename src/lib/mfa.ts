import { randomBytes } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { mfaChallenges, users } from "@/db/schema";
import {
  MFA_CHALLENGE_COOKIE_NAME,
  MFA_CHALLENGE_TTL_MS,
} from "@/lib/constants";
import { sha256Hex } from "./security/tokens";

/**
 * Server-side MFA challenge management.
 *
 * A challenge is created only AFTER the password has been verified, and it is
 * deliberately NOT a session: `getCurrentUser()` cannot see it. The opaque
 * token lives in an httpOnly cookie; only its hash is stored, the row expires
 * in ten minutes, and it is deleted on success — so a completed challenge
 * cannot be replayed and the client cannot manufacture one.
 */

function cookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure:
      process.env.SESSION_COOKIE_SECURE === "true" ||
      process.env.NODE_ENV === "production",
    expires,
    path: "/",
  };
}

export async function createMfaChallenge(userId: string): Promise<void> {
  // Drop any stale challenges for this account (one active challenge at a time).
  await db.delete(mfaChallenges).where(eq(mfaChallenges.userId, userId));

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MS);

  await db.insert(mfaChallenges).values({
    id: crypto.randomUUID(),
    userId,
    tokenHash: sha256Hex(token),
    expiresAt,
  });

  const store = await cookies();
  store.set(MFA_CHALLENGE_COOKIE_NAME, token, cookieOptions(expiresAt));
}

export type PendingMfaChallenge = {
  challengeId: string;
  attempts: number;
  userId: string;
  email: string;
  isActive: boolean;
  status: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
};

/** Resolve the current challenge from the cookie (null when absent/expired). */
export async function readMfaChallenge(): Promise<PendingMfaChallenge | null> {
  const store = await cookies();
  const raw = store.get(MFA_CHALLENGE_COOKIE_NAME)?.value;
  if (!raw) return null;

  const rows = await db
    .select({
      challengeId: mfaChallenges.id,
      attempts: mfaChallenges.attempts,
      userId: users.id,
      email: users.email,
      isActive: users.isActive,
      status: users.status,
      mfaEnabled: users.mfaEnabled,
      mfaSecret: users.mfaSecret,
    })
    .from(mfaChallenges)
    .innerJoin(users, eq(users.id, mfaChallenges.userId))
    .where(
      and(
        eq(mfaChallenges.tokenHash, sha256Hex(raw)),
        gt(mfaChallenges.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
}

/** Count a wrong second-factor attempt; returns the new attempt count. */
export async function recordMfaFailure(challengeId: string): Promise<number> {
  const rows = await db
    .update(mfaChallenges)
    .set({ attempts: sql`${mfaChallenges.attempts} + 1` })
    .where(eq(mfaChallenges.id, challengeId))
    .returning({ attempts: mfaChallenges.attempts });
  return rows[0]?.attempts ?? 0;
}

/** Discard the challenge (success, too many attempts, or abandoned flow). */
export async function clearMfaChallenge(challengeId?: string): Promise<void> {
  const store = await cookies();
  const raw = store.get(MFA_CHALLENGE_COOKIE_NAME)?.value;
  if (raw) {
    await db
      .delete(mfaChallenges)
      .where(
        challengeId
          ? eq(mfaChallenges.id, challengeId)
          : eq(mfaChallenges.tokenHash, sha256Hex(raw)),
      );
  }
  store.delete(MFA_CHALLENGE_COOKIE_NAME);
}
