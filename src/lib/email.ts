/**
 * Transactional e-mail delivery.
 *
 * The project had no mail provider configured; this adapter uses Resend (a
 * plain HTTPS API, no SDK dependency) when RESEND_API_KEY + EMAIL_FROM are
 * set. Without a provider the reset flow stays functional in development by
 * returning the reset URL to the server-rendered page only (never logged and
 * never shown in production), and the caller shows the generic
 * "if an account exists…" response either way.
 */

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type MailResult =
  | { delivered: true }
  | { delivered: false; reason: "not_configured" | "provider_error" };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) return { delivered: false, reason: "not_configured" };

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html,
      }),
    });
    if (!response.ok) {
      // Status only — never the provider response body (may echo the address).
      console.error("[email] provider rejected the message", {
        status: response.status,
      });
      return { delivered: false, reason: "provider_error" };
    }
    return { delivered: true };
  } catch (error) {
    console.error("[email] delivery failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { delivered: false, reason: "provider_error" };
  }
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function passwordResetEmail(resetUrl: string): Omit<MailMessage, "to"> {
  const safeUrl = escapeHtml(resetUrl);
  return {
    subject: "Reset your Records Management System password",
    text: [
      "A password reset was requested for your account.",
      "",
      `Open this link within 30 minutes to choose a new password: ${resetUrl}`,
      "",
      "If you did not request this, ignore this message — your password is unchanged.",
    ].join("\n"),
    html: `<p>A password reset was requested for your account.</p>
<p><a href="${safeUrl}">Choose a new password</a> (valid for 30 minutes).</p>
<p>If you did not request this, ignore this message — your password is unchanged.</p>`,
  };
}
