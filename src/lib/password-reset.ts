import { PASSWORD_RESET_TTL_MS } from "@/lib/constants";
import { sha256Hex } from "@/lib/security/tokens";

/**
 * Pure helpers for the password-reset flow. Kept free of React / Next.js /
 * database imports so they are trivially unit-testable and reusable by both
 * the server actions and any future callers (background jobs, admin tooling).
 */

/** Identical user-facing response whether or not the address is registered. */
export const PASSWORD_RESET_GENERIC_MESSAGE =
  "If an account exists for this email, password reset instructions have been sent.";

export const RESET_LINK_TTL_MINUTES = Math.round(PASSWORD_RESET_TTL_MS / 60_000);

export type MailDeliveryResult =
  | { delivered: true; providerId?: string }
  | { delivered: false; reason: "not_configured" | "provider_error" | "timeout" };

/**
 * Resolve the public base URL used to build reset links:
 * `https://your-domain.com/reset-password?token=…`.
 *
 * - In production (`NODE_ENV === "production"`) the base URL MUST come from the
 *   environment — never falls back to a hardcoded host. Returns null when unset
 *   so the caller can fail safely instead of mailing an unusable localhost link.
 * - Outside production, `http://localhost:3000` is only a local-development
 *   default and is still overridable through `NEXT_PUBLIC_APP_URL` / `APP_URL`.
 */
export function resolvePasswordResetBaseUrl(
  env: Record<string, string | undefined> = process.env,
): string | null {
  const raw =
    env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "") ||
    env.APP_URL?.trim().replace(/\/+$/, "") ||
    (env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!raw) return null;
  return raw;
}

/** Build the single-use reset URL (`/reset-password?token=…`). Null when no base URL. */
export function buildPasswordResetUrl(token: string, baseUrl: string | null): string | null {
  const base = baseUrl?.replace(/\/+$/, "") ?? "";
  if (!base) return null;
  const url = new URL(`${base}/reset-password`);
  url.searchParams.set("token", token);
  return url.toString();
}

/** Constant-time-safe key used for rate-limit buckets (no plaintext PII keys). */
export function resetRateKey(scope: string, email: string): string {
  const digest = sha256Hex(email.trim().toLowerCase()).slice(0, 32);
  return `${scope}:${digest}`;
}
