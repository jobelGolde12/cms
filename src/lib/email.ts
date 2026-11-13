import { PASSWORD_RESET_TTL_MS, SCHOOL } from "@/lib/constants";
import { RESET_LINK_TTL_MINUTES, type MailDeliveryResult } from "@/lib/password-reset";

/**
 * Transactional e-mail delivery — Mailgun.
 *
 * SERVER-ONLY: the API key never leaves the server and is never exposed to the
 * browser (no `NEXT_PUBLIC_` prefix, no client import of this module). The
 * adapter uses Mailgun's HTTPS API directly (no SDK dependency) so the reset
 * flow has no extra bundle surface.
 *
 * Required configuration (see `.env.example`):
 *   MAILGUN_API_KEY     private API key — NEVER logged
 *   MAILGUN_DOMAIN      verified sending domain (e.g. mg.example.org)
 *   MAILGUN_FROM_EMAIL  sender address on that domain
 * Optional:
 *   MAILGUN_FROM_NAME   display name of the sender
 *   MAILGUN_REGION      "eu" to use the EU endpoint (default: US)
 *
 * When the configuration is incomplete `isEmailConfigured()` returns false and
 * `sendMail()` fails safely with `reason: "not_configured"` — no fake success.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailResult = MailDeliveryResult;

/** Network timeout for the Mailgun request (ms). */
const MAILGUN_TIMEOUT_MS = 20_000;

type MailgunConfig = {
  apiKey: string;
  domain: string;
  fromEmail: string;
  fromName: string;
  endpoint: string;
};

/**
 * Resolve the Mailgun configuration from the environment. Returns null unless
 * every required value is present (the key is never logged or serialized).
 */
export function getMailgunConfig(
  env: Record<string, string | undefined> = process.env,
): MailgunConfig | null {
  const apiKey = env.MAILGUN_API_KEY?.trim();
  const domain = env.MAILGUN_DOMAIN?.trim();
  const fromEmail = env.MAILGUN_FROM_EMAIL?.trim();
  if (!apiKey || !domain || !fromEmail) return null;

  const fromName =
    env.MAILGUN_FROM_NAME?.trim() || `${SCHOOL.name} Records Management System`;
  const region = env.MAILGUN_REGION?.trim().toLowerCase();
  const host = region === "eu" ? "api.eu.mailgun.net" : "api.mailgun.net";

  return {
    apiKey,
    domain,
    fromEmail,
    fromName,
    endpoint: `https://${host}/v3/${encodeURIComponent(domain)}/messages`,
  };
}

/** True only when Mailgun has everything it needs to attempt delivery. */
export function isEmailConfigured(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return getMailgunConfig(env) !== null;
}

function formatFrom(config: MailgunConfig): string {
  // Quote the display name so commas in the department name cannot break the
  // RFC 5322 address list. The address itself comes from validated config.
  return `${config.fromName.replace(/"/g, "")} <${config.fromEmail}>`;
}

/**
 * Submit a message to Mailgun. Server-side only.
 *
 * Returns a discriminated result — the caller must NOT treat "request accepted"
 * as "email delivered". Provider failures are logged with safe diagnostics
 * (status + Mailgun message field, never the API key or recipient address).
 */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const config = getMailgunConfig();
  if (!config) {
    console.warn("[email] Mailgun is not configured — password-reset email was not sent");
    return { delivered: false, reason: "not_configured" };
  }

  const body = new URLSearchParams();
  body.set("from", formatFrom(config));
  body.set("to", message.to);
  body.set("subject", message.subject);
  body.set("text", message.text);
  body.set("html", message.html);
  body.set("h:Reply-To", config.fromEmail);

  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        // Mailgun uses HTTP Basic auth with the literal user "api".
        Authorization: `Basic ${Buffer.from(`api:${config.apiKey}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(MAILGUN_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Read only Mailgun's human-readable message field; never the raw body
      // (it may echo the recipient address).
      const detail = await readSafeProviderMessage(response);
      console.error("[email] Mailgun rejected the message", {
        status: response.status,
        detail,
      });
      return { delivered: false, reason: "provider_error" };
    }

    const payload = (await response.json().catch(() => null)) as
      | { id?: string }
      | null;
    console.info("[email] Mailgun accepted the message", {
      providerId: payload?.id ?? null,
    });
    return { delivered: true, providerId: payload?.id };
  } catch (error) {
    const timedOut =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    console.error("[email] Mailgun request failed", {
      reason: timedOut ? "timeout" : "network",
    });
    return {
      delivered: false,
      reason: timedOut ? "timeout" : "provider_error",
    };
  }
}

/** Extract Mailgun's `message` field without leaking the response body. */
async function readSafeProviderMessage(response: Response): Promise<string | null> {
  try {
    const payload = (await response.json()) as { message?: unknown };
    return typeof payload?.message === "string"
      ? payload.message.slice(0, 300)
      : null;
  } catch {
    return null;
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/**
 * Professional, email-client-safe password-reset message.
 *
 * Uses table-based layout and inline styles only (Gmail/Outlook strip <style>
 * blocks and modern layout CSS), a hidden preheader, a bulletproof text link
 * fallback and a plain-text alternative for clients that prefer it.
 */
export function passwordResetEmail(
  resetUrl: string,
  options: { fullName?: string; expiresInMinutes?: number } = {},
): Omit<MailMessage, "to"> {
  const minutes = options.expiresInMinutes ?? RESET_LINK_TTL_MINUTES;
  const safeUrl = escapeHtml(resetUrl);
  const safeName = options.fullName ? escapeHtml(options.fullName) : "";
  const greeting = safeName ? `Hello ${safeName},` : "Hello,";
  const school = escapeHtml(SCHOOL.name);
  const location = escapeHtml(`${SCHOOL.address}`);

  const text = [
    school,
    "Records Management System",
    "",
    greeting,
    "",
    "We received a request to reset the password associated with your school account.",
    "",
    "Reset your password using the secure link below:",
    resetUrl,
    "",
    `This link expires in ${minutes} minutes and can be used only once.`,
    "",
    "If you did not request a password reset, you can safely ignore this email — your password will not be changed.",
    "",
    "For your security, never share this link with anyone.",
    "",
    "This is an automated message. Please do not reply.",
    "",
    `© ${SCHOOL.name}`,
    location,
  ].join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="x-apple-disable-message-reformatting" />
    <title>Reset your password</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F7FC;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">
      Reset your Records Management System password. This link expires in ${minutes} minutes.
    </div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7FC;margin:0;padding:0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border:1px solid #DCE4F0;border-radius:8px;">
            <tr>
              <td style="padding:28px 32px 8px 32px;font-family:${FONT_STACK};">
                <p style="margin:0 0 4px 0;font-size:11px;line-height:16px;text-transform:uppercase;letter-spacing:0.08em;color:#64748B;font-weight:700;">
                  Republic of the Philippines
                </p>
                <p style="margin:0;font-size:14px;line-height:20px;color:#14295F;font-weight:700;">
                  ${school}
                </p>
                <p style="margin:2px 0 0 0;font-size:12px;line-height:18px;color:#64748B;">
                  Records Management System
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px 0 32px;font-family:${FONT_STACK};">
                <h1 style="margin:0 0 12px 0;font-size:22px;line-height:30px;color:#07163E;font-weight:700;">
                  Reset your password
                </h1>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:22px;color:#263449;">
                  ${greeting}
                </p>
                <p style="margin:0 0 24px 0;font-size:14px;line-height:22px;color:#263449;">
                  We received a request to reset the password associated with your school account. Click the button below to choose a new password.
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" bgcolor="#315EF7" style="border-radius:6px;">
                      <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 28px;font-family:${FONT_STACK};font-size:14px;line-height:20px;font-weight:700;color:#FFFFFF;text-decoration:none;border-radius:6px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;font-family:${FONT_STACK};">
                <p style="margin:0 0 8px 0;font-size:13px;line-height:20px;color:#263449;">
                  This link will expire in <strong>${minutes} minutes</strong> and can be used only once.
                </p>
                <p style="margin:0 0 24px 0;font-size:12px;line-height:19px;color:#64748B;word-break:break-all;">
                  If the button does not work, copy and paste this address into your browser:<br />
                  <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:#315EF7;text-decoration:underline;">${safeUrl}</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F4F7FC;border:1px solid #DCE4F0;border-radius:6px;">
                  <tr>
                    <td style="padding:14px 16px;font-family:${FONT_STACK};">
                      <p style="margin:0 0 6px 0;font-size:12px;line-height:18px;color:#263449;font-weight:700;">
                        Security notice
                      </p>
                      <p style="margin:0;font-size:12px;line-height:18px;color:#64748B;">
                        If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged. For your security, do not share this link with anyone.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 28px 32px;font-family:${FONT_STACK};">
                <p style="margin:0;border-top:1px solid #E8EDF5;padding-top:16px;font-size:11px;line-height:17px;color:#7B879B;">
                  This is an automated message from the ${school} Records Management System. Please do not reply.<br />
                  ${location}
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    subject: "Reset your Records Management System password",
    text,
    html,
  };
}

/** Lifetime shown in the email; exported for tests. */
export const PASSWORD_RESET_EMAIL_TTL_MINUTES = Math.round(
  PASSWORD_RESET_TTL_MS / 60_000,
);
