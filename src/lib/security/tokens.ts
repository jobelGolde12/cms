import { createHash, randomBytes } from "node:crypto";
import { PASSWORD_RESET_TTL_MS } from "@/lib/constants";

/**
 * Opaque single-use tokens (password reset). The raw token only ever exists in
 * the e-mail link / request; the database stores its SHA-256 hash, so a
 * database leak cannot be replayed against the reset endpoint.
 */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export type IssuedToken = {
  token: string;
  tokenHash: string;
  expiresAt: Date;
};

export function issuePasswordResetToken(
  ttlMs: number = PASSWORD_RESET_TTL_MS,
): IssuedToken {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: sha256Hex(token),
    expiresAt: new Date(Date.now() + ttlMs),
  };
}

/** Reject malformed/oversized tokens before touching the database. */
export function isValidTokenShape(raw: string): boolean {
  return /^[A-Za-z0-9_-]{20,128}$/.test(raw);
}

/** A reset token is usable only while unused and unexpired. */
export function isResetTokenUsable(
  row: { usedAt: Date | null; expiresAt: Date } | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!row) return false;
  if (row.usedAt) return false;
  return row.expiresAt.getTime() > now.getTime();
}
