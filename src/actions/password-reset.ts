"use server";

import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword, revokeUserSessions } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { isEmailConfigured, passwordResetEmail, sendMail } from "@/lib/email";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/schemas";
import {
  isValidTokenShape,
  issuePasswordResetToken,
  sha256Hex,
} from "@/lib/security/tokens";
import { fail, ok, sessionMetadata, zodFieldErrors, type ActionState } from "./helpers";

/**
 * Password recovery.
 *
 * - The request endpoint always answers with the SAME generic message, whether
 *   or not the address exists (no account enumeration).
 * - The raw token exists only in the e-mail link; the DB stores a SHA-256 hash.
 * - Tokens are single-use, expire after 30 minutes, and every existing session
 *   is revoked when the password changes.
 */

const GENERIC_REQUEST_MESSAGE =
  "If an account exists for this email, password reset instructions have been sent.";

export type ForgotPasswordState =
  | { ok: true; message: string; devResetUrl?: string }
  | { ok: false; error: string };

export async function requestPasswordReset(
  _prev: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const { ip, userAgent } = await sessionMetadata();
  const limited = rateLimit(`forgot:${ip ?? "local"}`, 5, 15 * 60_000);
  if (!limited.ok) {
    return { ok: false, error: "Too many reset requests. Please try again later." };
  }

  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      ok: false,
      error: zodFieldErrors(parsed.error.issues).email ?? "Enter a valid email address.",
    };
  }
  const email = parsed.data.email.trim().toLowerCase();

  try {
    const rows = await db
      .select({ id: users.id, isActive: users.isActive, status: users.status, isDummy: users.isDummy })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    const user = rows[0];

    // Only real, active, approved accounts receive a reset link; the response
    // is identical in every other case.
    if (user && user.isActive && user.status === "approved" && !user.isDummy) {
      await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
      const issued = issuePasswordResetToken();
      await db.insert(passwordResetTokens).values({
        id: crypto.randomUUID(),
        userId: user.id,
        tokenHash: issued.tokenHash,
        expiresAt: issued.expiresAt,
      });

      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
        process.env.APP_URL?.replace(/\/$/, "") ||
        "http://localhost:3000";
      const resetUrl = `${baseUrl}/reset-password?token=${encodeURIComponent(issued.token)}`;

      if (isEmailConfigured()) {
        await sendMail({ to: email, ...passwordResetEmail(resetUrl) });
      }

      await logAudit({
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "user",
        entityId: user.id,
        ipAddress: ip,
        userAgent,
      });

      // Development fallback: no mail provider configured, so surface the link
      // on the page instead of logging the token. Never in production.
      if (process.env.NODE_ENV !== "production" && !isEmailConfigured()) {
        return { ok: true, message: GENERIC_REQUEST_MESSAGE, devResetUrl: resetUrl };
      }
    } else {
      // Keep timing roughly uniform for unknown addresses.
      await logAudit({
        action: "PASSWORD_RESET_REQUESTED",
        entityType: "user",
        newValues: { outcome: "no-eligible-account" },
        ipAddress: ip,
        userAgent,
      });
    }
  } catch (error) {
    console.error("[requestPasswordReset] failed", error);
    // Still generic: infrastructure errors must not distinguish addresses.
    return { ok: true, message: GENERIC_REQUEST_MESSAGE };
  }

  return { ok: true, message: GENERIC_REQUEST_MESSAGE };
}

/* --------------------------------- reset ---------------------------------- */

export async function resetPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { ip, userAgent } = await sessionMetadata();
  const limited = rateLimit(`reset:${ip ?? "local"}`, 10, 15 * 60_000);
  if (!limited.ok) return fail("Too many attempts. Please try again later.");

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", zodFieldErrors(parsed.error.issues));
  }
  const { token, password } = parsed.data;
  if (!isValidTokenShape(token)) {
    return fail("This reset link is invalid or has expired. Request a new one.");
  }

  try {
    const rows = await db
      .select({
        id: passwordResetTokens.id,
        userId: passwordResetTokens.userId,
        usedAt: passwordResetTokens.usedAt,
        expiresAt: passwordResetTokens.expiresAt,
      })
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.tokenHash, sha256Hex(token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, new Date()),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) {
      return fail("This reset link is invalid or has expired. Request a new one.");
    }

    const targetRows = await db
      .select({ id: users.id, status: users.status, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, row.userId))
      .limit(1);
    const target = targetRows[0];
    if (!target || !target.isActive || target.status !== "approved") {
      return fail("This account cannot reset its password. Contact the administrator.");
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({ passwordHash: await hashPassword(password), updatedAt: new Date() })
        .where(eq(users.id, target.id));
      await tx
        .update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, row.id));
      // Any other outstanding token for this account is now invalid.
      await tx
        .delete(passwordResetTokens)
        .where(
          and(
            eq(passwordResetTokens.userId, target.id),
            ne(passwordResetTokens.id, row.id),
          ),
        );
    });

    // Invalidate every existing session: a stolen cookie cannot survive a
    // password reset.
    await revokeUserSessions(target.id);

    await logAudit({
      userId: target.id,
      action: "PASSWORD_RESET_COMPLETED",
      entityType: "user",
      entityId: target.id,
      ipAddress: ip,
      userAgent,
    });
  } catch (error) {
    console.error("[resetPassword] failed", error);
    return fail("Could not reset the password. Please try again.");
  }

  return ok("Password updated. Sign in with your new password.", "/login?reset=1");
}
