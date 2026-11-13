# Password Reset — Mailgun Delivery

Self-service password recovery for the Records Management System. The reset link
is generated and stored server-side and delivered by **Mailgun**; the browser
never talks to Mailgun and never sees a credential.

## Flow

```text
/forgot-password form
        ↓  server action requestPasswordReset (src/actions/password-reset.ts)
IP + per-address rate limit (src/lib/rate-limit.ts)
        ↓
users lookup — only active, approved, non-dummy accounts are eligible
        ↓
passwordResetTokens row: SHA-256 token hash + expires_at (30 min)
        ↓  src/lib/email.ts → Mailgun HTTPS API
recipient inbox → /reset-password?token=…
        ↓  server page validates the token before rendering the form
resetPassword action: update password, mark token used, revoke sessions
        ↓
/login
```

## Why reset mail was not arriving

The reset request, token storage and reset page already existed, but delivery
was wired to a Resend adapter (`RESEND_API_KEY` / `EMAIL_FROM`) that is no longer
part of the codebase, and `src/lib/email.ts` was not imported by any flow. With
no provider configured, `sendMail()` returned `{ delivered: false, reason:
"not_configured" }`; the service action logged it and still answered with the
generic success message, so the UI looked correct while nothing was mailed.
Secondary defects: the forgot-password and reset-password pages did not compile
(`Logo` referenced without import; missing `firstName`/`lastName` in the users
query), and only the IP was rate limited (one address could be spammed from
rotating IPs).

## Environment variables

Set these in the hosting environment (and in `.env.local` for development).
Never commit real values and never prefix them with `NEXT_PUBLIC_`.

| Variable | Required | Purpose |
| --- | --- | --- |
| `MAILGUN_API_KEY` | Yes | Private API key (`key-…`). Used only for HTTP Basic auth. |
| `MAILGUN_DOMAIN` | Yes | Verified sending domain, e.g. `mg.example.org`. Not a URL. |
| `MAILGUN_FROM_EMAIL` | Yes | Sender mailbox on that domain, e.g. `no-reply@mg.example.org`. |
| `MAILGUN_FROM_NAME` | No | Display name. Defaults to the school name. |
| `MAILGUN_REGION` | No | `eu` for EU accounts; defaults to the US endpoint. |
| `NEXT_PUBLIC_APP_URL` | Yes in production | Public base URL for reset links (`https://…`). |

`APP_URL` is accepted as a fallback for the base URL. In production the base URL
must be configured — there is no localhost fallback; outside production
`http://localhost:3000` is used when nothing is set.

## Mailgun setup

1. Create a Mailgun account and add the sending domain (Sending → Domains).
2. Add the DNS records Mailgun shows: SPF (TXT), DKIM (TXT) and tracking CNAMEs.
   Add a DMARC record (`v=DMARC1; p=none; rua=mailto:…`) at your DNS provider.
3. Wait for the domain to show **Verified**.
4. Create a private API key (Settings → API keys) and note the region (US/EU).
5. Set `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM_EMAIL`, optionally
   `MAILGUN_FROM_NAME` / `MAILGUN_REGION`, plus `NEXT_PUBLIC_APP_URL`.
6. Redeploy/restart so the server picks up the new environment.
7. Request a reset from `/forgot-password` for a real approved account and
   confirm the message appears in Mailgun → Sending → Logs.
8. If it was accepted by Mailgun but not delivered, read the Mailgun log entry:
   the usual causes are unverified domain, wrong region, suppression/bounce
   lists, or a sender address outside the verified domain.

> Mailgun's US sandbox domain only delivers to addresses you have explicitly
> authorized. Production use requires a verified custom domain.

## Behaviour without configuration

`isEmailConfigured()` returns false and `sendMail()` returns
`{ delivered: false, reason: "not_configured" }` — no fake success, and the
provider key is never logged. In development the reset link is returned to the
page (`devResetUrl`) so the flow stays testable without a provider; that branch
is disabled in production.

## Security properties

- Tokens: 32 random bytes (`crypto.randomBytes`, base64url); only the SHA-256
  hash is stored. Single-use, 30-minute TTL, all older tokens deleted on request
  and on successful reset.
- Account enumeration: identical generic response for unknown, inactive,
  pending, rejected and dummy accounts; audit-log rows never reveal the outcome
  to the caller.
- Rate limits: 5 requests / 15 min per IP and 3 / 15 min per address (hashed
  key), 10 reset submissions / 15 min per IP.
- Password change revokes every session and applies the project's bcrypt
  hashing policy (10+ chars, letter and number).
- Logs contain provider status and reason codes only — never tokens, passwords,
  API keys or recipient addresses.

## Troubleshooting checklist

| Symptom | Check |
| --- | --- |
| `Mailgun is not configured` in server logs | The three required variables are set in the running environment. |
| `Mailgun rejected the message` with 401/403 | API key valid, correct region endpoint, domain belongs to the key's account. |
| 404 domain not found | `MAILGUN_DOMAIN` is the sending domain, not the API URL. |
| Accepted but not delivered | Mailgun logs, suppression list, SPF/DKIM/DMARC, spam folder. |
| Reset link points at localhost | `NEXT_PUBLIC_APP_URL` missing in production. |
| Link says no longer valid | Token expired (30 min) or a newer request superseded it. |

The reset URL is `{NEXT_PUBLIC_APP_URL}/reset-password?token=…`; the token is
never written to logs.
