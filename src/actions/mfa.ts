"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { db } from "@/db";
import { mfaRecoveryCodes, users } from "@/db/schema";
import {
  createSession,
  getAuthorizedUser,
  verifyPassword,
} from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { clearMfaChallenge, readMfaChallenge, recordMfaFailure } from "@/lib/mfa";
import { rateLimit } from "@/lib/rate-limit";
import { MFA_MAX_ATTEMPTS } from "@/lib/constants";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotp,
  totpUri,
} from "@/lib/security/totp";
import { fail, ok, sessionMetadata, type ActionState } from "./helpers";

/* ------------------------------- enrollment ------------------------------ */

export type MfaSetupState =
  | { ok: true; message?: string; secret?: string; uri?: string; qrDataUrl?: string; recoveryCodes?: string[] }
  | { ok: false; error: string };

/**
 * Start enrollment: generate a secret, persist it (encrypted by the schema's
 * column type) and return the otpauth URI + QR image for the authenticator
 * app. MFA stays DISABLED until a valid code is verified.
 */
export async function beginMfaSetup(): Promise<MfaSetupState> {
  const user = await getAuthorizedUser("dashboard.view");
  if (!user) return { ok: false, error: "You must be signed in." };

  const rows = await db
    .select({ mfaEnabled: users.mfaEnabled })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (rows[0]?.mfaEnabled) {
    return { ok: false, error: "Two-factor authentication is already enabled." };
  }

  const secret = generateTotpSecret();
  const uri = totpUri(secret, user.email);
  const qrDataUrl = await QRCode.toDataURL(uri, { margin: 1, width: 220 });

  await db
    .update(users)
    .set({ mfaSecret: secret, mfaEnabled: false, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const { ip, userAgent } = await sessionMetadata();
  await logAudit({
    userId: user.id,
    action: "MFA_SETUP_STARTED",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  return { ok: true, secret, uri, qrDataUrl };
}

/** Finish enrollment: the code must verify before MFA is switched on. */
export async function confirmMfaSetup(
  _prev: MfaSetupState,
  formData: FormData,
): Promise<MfaSetupState> {
  const user = await getAuthorizedUser("dashboard.view");
  if (!user) return { ok: false, error: "You must be signed in." };

  const code = String(formData.get("code") ?? "").trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, error: "Enter the 6-digit code from your authenticator app." };
  }

  const rows = await db
    .select({ mfaEnabled: users.mfaEnabled, mfaSecret: users.mfaSecret })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const current = rows[0];
  if (!current?.mfaSecret) {
    return { ok: false, error: "Start the setup again — no pending secret was found." };
  }
  if (current.mfaEnabled) {
    return { ok: false, error: "Two-factor authentication is already enabled." };
  }
  if (!verifyTotp(current.mfaSecret, code)) {
    return { ok: false, error: "That code is not valid. Check the time on your device and try again." };
  }

  const codes = generateRecoveryCodes();
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ mfaEnabled: true, mfaEnrolledAt: now, updatedAt: now })
      .where(eq(users.id, user.id));
    await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id));
    await tx.insert(mfaRecoveryCodes).values(
      codes.map((codeValue) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        codeHash: hashRecoveryCode(codeValue),
      })),
    );
  });

  const { ip, userAgent } = await sessionMetadata();
  await logAudit({
    userId: user.id,
    action: "MFA_ENABLED",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/settings/mfa");
  return {
    ok: true,
    message: "Two-factor authentication is enabled. Save your recovery codes now — they are shown only once.",
    recoveryCodes: codes,
  };
}

/** Disable MFA — requires the current password AND a valid authenticator code. */
export async function disableMfa(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await getAuthorizedUser("dashboard.view");
  if (!user) return fail("You must be signed in.");

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const current = rows[0];
  if (!current) return fail("Account not found.");
  if (!current.mfaEnabled) return fail("Two-factor authentication is not enabled.");

  if (!(await verifyPassword(password, current.passwordHash))) {
    return fail("Your password is incorrect.");
  }
  if (!current.mfaSecret || !verifyTotp(current.mfaSecret, code)) {
    return fail("Enter a valid code from your authenticator app.");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({ mfaEnabled: false, mfaSecret: null, mfaEnrolledAt: null, updatedAt: new Date() })
      .where(eq(users.id, user.id));
    await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id));
  });

  const { ip, userAgent } = await sessionMetadata();
  await logAudit({
    userId: user.id,
    action: "MFA_DISABLED",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  revalidatePath("/settings/mfa");
  return ok("Two-factor authentication was disabled.");
}

/** Regenerate recovery codes (old codes are invalidated immediately). */
export async function regenerateRecoveryCodes(
  _prev: MfaSetupState,
  formData: FormData,
): Promise<MfaSetupState> {
  const user = await getAuthorizedUser("dashboard.view");
  if (!user) return { ok: false, error: "You must be signed in." };

  const password = String(formData.get("password") ?? "");
  const code = String(formData.get("code") ?? "").trim();

  const rows = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  const current = rows[0];
  if (!current?.mfaEnabled || !current.mfaSecret) {
    return { ok: false, error: "Two-factor authentication is not enabled." };
  }
  if (!(await verifyPassword(password, current.passwordHash))) {
    return { ok: false, error: "Your password is incorrect." };
  }
  if (!verifyTotp(current.mfaSecret, code)) {
    return { ok: false, error: "Enter a valid code from your authenticator app." };
  }

  const codes = generateRecoveryCodes();
  await db.transaction(async (tx) => {
    await tx.delete(mfaRecoveryCodes).where(eq(mfaRecoveryCodes.userId, user.id));
    await tx.insert(mfaRecoveryCodes).values(
      codes.map((codeValue) => ({
        id: crypto.randomUUID(),
        userId: user.id,
        codeHash: hashRecoveryCode(codeValue),
      })),
    );
  });

  const { ip, userAgent } = await sessionMetadata();
  await logAudit({
    userId: user.id,
    action: "MFA_RECOVERY_CODES_REGENERATED",
    entityType: "user",
    entityId: user.id,
    ipAddress: ip,
    userAgent,
  });

  return { ok: true, message: "New recovery codes generated. Previous codes no longer work.", recoveryCodes: codes };
}

/* ------------------------------ login challenge -------------------------- */

/**
 * Verify the second factor for the pending challenge. A session is created
 * ONLY here, after the code (or an unused recovery code) is accepted.
 */
export async function verifyMfaLogin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip, userAgent } = await sessionMetadata();
  const limited = rateLimit(`mfa:${ip ?? "local"}`, 12, 60_000);
  if (!limited.ok) {
    return fail("Too many attempts. Please wait a minute and try again.");
  }

  const challenge = await readMfaChallenge();
  if (!challenge) {
    return fail("Your sign-in challenge has expired or is invalid. Please sign in again.");
  }
  if (challenge.attempts >= MFA_MAX_ATTEMPTS) {
    await clearMfaChallenge(challenge.challengeId);
    return fail("Too many incorrect codes. Please sign in again.");
  }
  if (!challenge.isActive || challenge.status !== "approved" || !challenge.mfaEnabled || !challenge.mfaSecret) {
    await clearMfaChallenge(challenge.challengeId);
    return fail("This account can no longer complete sign-in. Contact the administrator.");
  }

  const raw = String(formData.get("code") ?? "").trim();
  let verified = false;

  if (/^\d{6}$/.test(raw)) {
    verified = verifyTotp(challenge.mfaSecret, raw);
  } else if (raw.length > 0) {
    // Single-use recovery code: claim it atomically so two concurrent requests
    // cannot both consume the same code.
    const codeHash = hashRecoveryCode(raw);
    const claimed = await db
      .update(mfaRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(mfaRecoveryCodes.userId, challenge.userId),
          eq(mfaRecoveryCodes.codeHash, codeHash),
          isNull(mfaRecoveryCodes.usedAt),
        ),
      )
      .returning({ id: mfaRecoveryCodes.id });
    verified = claimed.length === 1;
  }

  if (!verified) {
    const attempts = await recordMfaFailure(challenge.challengeId);
    await logAudit({
      userId: challenge.userId,
      action: "MFA_CHALLENGE_FAILED",
      entityType: "session",
      newValues: { attempts },
      ipAddress: ip,
      userAgent,
    });
    if (attempts >= MFA_MAX_ATTEMPTS) {
      await clearMfaChallenge(challenge.challengeId);
      return fail("Too many incorrect codes. Please sign in again.");
    }
    return fail(`That code is not valid. ${MFA_MAX_ATTEMPTS - attempts} attempt(s) remaining.`);
  }

  await clearMfaChallenge(challenge.challengeId);
  await createSession(challenge.userId, { ip, userAgent });
  await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, challenge.userId));
  await logAudit({
    userId: challenge.userId,
    action: "LOGIN_MFA_VERIFIED",
    entityType: "session",
    ipAddress: ip,
    userAgent,
  });

  redirect("/dashboard");
}

/** Abandon the pending challenge (used by the "cancel" button). */
export async function cancelMfaLogin(): Promise<void> {
  await clearMfaChallenge();
  redirect("/login");
}
