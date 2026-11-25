/**
 * End-to-end (logic-level) tests for the forgot-password flow.
 *
 * These exercise the real server actions with a fake database and a captured
 * Mailgun payload, so the chain that matters is covered:
 *
 *   requestPasswordReset → token stored (hashed) → reset e-mail built and sent
 *   → token extracted from the e-mail → resetPassword → password updated,
 *   token burned, sessions revoked.
 *
 * No real network call and no real database are used.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_RESET_GENERIC_MESSAGE } from "@/lib/password-reset";
import { sha256Hex } from "@/lib/security/tokens";

type TokenRow = {
  id: string;
  userId: string;
  tokenHash: string;
  usedAt: Date | null;
  expiresAt: Date;
};

const h = vi.hoisted(() => ({
  state: {
    userRows: [] as Array<Record<string, unknown>>,
    tokenRows: [] as TokenRow[],
    inserted: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
    deleted: [] as unknown[],
    updated: [] as Array<{ table: unknown; values: Record<string, unknown> }>,
    revokeCalls: [] as string[],
    audit: [] as Array<Record<string, unknown>>,
  },
  emailConfigured: true,
  sendMail: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers(),
  cookies: async () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
}));

vi.mock("@/db", async () => {
  const { passwordResetTokens, users } = await import("@/db/schema");
  const state = h.state;

  /** Mirror the `usedAt IS NULL AND expiresAt > now` filter of the real query. */
  const usableTokens = () =>
    state.tokenRows.filter(
      (row) => !row.usedAt && row.expiresAt.getTime() > Date.now(),
    );

  const tx = {
    update: (table: unknown) => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          state.updated.push({ table, values });
          if (table === passwordResetTokens && values.usedAt !== undefined) {
            for (const row of state.tokenRows) row.usedAt = values.usedAt as Date;
          }
        },
      }),
    }),
    delete: (table: unknown) => ({
      where: async () => {
        state.deleted.push(table);
        if (table === passwordResetTokens) state.tokenRows = [];
      },
    }),
  };

  return {
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: () => ({
            limit: async () => (table === users ? state.userRows : usableTokens()),
          }),
        }),
      }),
      insert: (table: unknown) => ({
        values: async (values: Record<string, unknown>) => {
          state.inserted.push({ table, values });
        },
      }),
      delete: (table: unknown) => ({
        where: async () => {
          state.deleted.push(table);
          if (table === passwordResetTokens) state.tokenRows = [];
        },
      }),
      transaction: async (cb: (t: typeof tx) => Promise<unknown>) => cb(tx),
    },
  };
});

vi.mock("@/lib/email", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/email")>();
  return {
    ...actual,
    isEmailConfigured: () => h.emailConfigured,
    sendMail: h.sendMail,
  };
});

vi.mock("@/lib/audit", () => ({
  logAudit: async (input: Record<string, unknown>) => {
    h.state.audit.push(input);
  },
}));

vi.mock("@/lib/auth", () => ({
  hashPassword: async () => "hashed-new-password",
  revokeUserSessions: async (userId: string) => {
    h.state.revokeCalls.push(userId);
  },
}));

const { requestPasswordReset, resetPassword } = await import(
  "@/actions/password-reset"
);

const VALID_USER = {
  id: "user-1",
  firstName: "Maria",
  lastName: "Santos",
  isActive: true,
  status: "approved",
  isDummy: false,
};

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
};

type SentMail = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

function sentMail(index = 0): SentMail {
  return h.sendMail.mock.calls[index]?.[0] as SentMail;
}

/** Pull the raw token out of the reset link inside the delivered message. */
function tokenFromMail(mail: SentMail): string {
  const match = mail.text.match(/reset-password\?token=([A-Za-z0-9_-]+)/);
  if (!match) throw new Error("reset link missing from e-mail text");
  return match[1];
}

function eligibleTokenRow(token: string): TokenRow {
  return {
    id: "token-1",
    userId: "user-1",
    tokenHash: sha256Hex(token),
    usedAt: null,
    expiresAt: new Date(Date.now() + 30 * 60_000),
  };
}

let emailCounter = 0;
function uniqueEmail(): string {
  emailCounter += 1;
  return `teacher${emailCounter}@school.edu`;
}

beforeEach(() => {
  h.state.userRows = [];
  h.state.tokenRows = [];
  h.state.inserted = [];
  h.state.deleted = [];
  h.state.updated = [];
  h.state.revokeCalls = [];
  h.state.audit = [];
  h.emailConfigured = true;
  h.sendMail.mockReset();
  h.sendMail.mockResolvedValue({ delivered: true, providerId: "<msg@mg>" });
  process.env.NEXT_PUBLIC_APP_URL = "https://records.example.org";
  delete process.env.APP_URL;
});

describe("forgot password — e-mail delivery", () => {
  it("sends a reset e-mail to the normalized address with a valid hashed link", async () => {
    const email = uniqueEmail();
    h.state.userRows = [VALID_USER];

    const result = await requestPasswordReset(
      { ok: false, error: "" },
      form({ email: email.toUpperCase() }),
    );

    expect(result).toEqual({
      ok: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    });
    expect(h.sendMail).toHaveBeenCalledTimes(1);

    const mail = sentMail();
    expect(mail.to).toBe(email);
    expect(mail.subject).toMatch(/reset/i);
    expect(mail.text).toContain("expires in 30 minutes");

    const token = tokenFromMail(mail);
    expect(mail.html).toContain(
      `https://records.example.org/reset-password?token=${token}`,
    );

    // Only the SHA-256 hash is stored; the raw token is never persisted.
    const inserted = h.state.inserted.find(
      (row) => row.values.tokenHash !== undefined,
    );
    expect(inserted).toBeDefined();
    expect(inserted?.values.tokenHash).toBe(sha256Hex(token));
    expect(inserted?.values.tokenHash).not.toContain(token);

    const expiresAt = inserted?.values.expiresAt as Date;
    const ttlMinutes = (expiresAt.getTime() - Date.now()) / 60_000;
    expect(ttlMinutes).toBeGreaterThan(29);
    expect(ttlMinutes).toBeLessThanOrEqual(30);

    expect(
      h.state.audit.some((row) => row.action === "PASSWORD_RESET_REQUESTED"),
    ).toBe(true);
  });

  it("returns a working dev link only when no mail provider is configured", async () => {
    const email = uniqueEmail();
    h.state.userRows = [VALID_USER];
    h.emailConfigured = false;

    const result = await requestPasswordReset(
      { ok: false, error: "" },
      form({ email }),
    );

    expect(result.ok).toBe(true);
    expect(h.sendMail).not.toHaveBeenCalled();
    const devResetUrl = (result as { devResetUrl?: string }).devResetUrl;
    expect(devResetUrl).toBeTruthy();
    expect(devResetUrl).toMatch(
      /^https:\/\/records\.example\.org\/reset-password\?token=[A-Za-z0-9_-]+$/,
    );

    const token = new URL(devResetUrl as string).searchParams.get("token");
    expect(token).toBeTruthy();
    expect(sha256Hex(token as string)).toBe(
      h.state.inserted[0]?.values.tokenHash,
    );
  });

  it("never reveals whether an account exists and sends nothing for ineligible accounts", async () => {
    const cases: Array<Record<string, unknown> | null> = [
      null, // unknown address
      { ...VALID_USER, id: "dummy", isDummy: true },
      { ...VALID_USER, id: "inactive", isActive: false },
      { ...VALID_USER, id: "pending", status: "pending" },
    ];

    for (const userRow of cases) {
      h.state.userRows = userRow ? [userRow] : [];

      const result = await requestPasswordReset(
        { ok: false, error: "" },
        form({ email: uniqueEmail() }),
      );

      expect(result).toEqual({
        ok: true,
        message: PASSWORD_RESET_GENERIC_MESSAGE,
      });
    }

    expect(h.sendMail).not.toHaveBeenCalled();
    expect(h.state.inserted).toHaveLength(0);
  });

  it("does not fake delivery when the provider fails", async () => {
    const email = uniqueEmail();
    h.state.userRows = [VALID_USER];
    h.sendMail.mockResolvedValue({
      delivered: false,
      reason: "provider_error",
    });
    vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await requestPasswordReset(
      { ok: false, error: "" },
      form({ email }),
    );

    expect(result).toEqual({
      ok: true,
      message: PASSWORD_RESET_GENERIC_MESSAGE,
    });
    expect((result as { devResetUrl?: string }).devResetUrl).toBeUndefined();
    // The token is still stored so the user can retry / an admin can retrigger.
    expect(h.state.inserted).toHaveLength(1);
  });

  it("rejects malformed addresses before doing any work", async () => {
    const result = await requestPasswordReset(
      { ok: false, error: "" },
      form({ email: "not-an-email" }),
    );

    expect(result.ok).toBe(false);
    expect(h.sendMail).not.toHaveBeenCalled();
    expect(h.state.inserted).toHaveLength(0);
  });
});

describe("forgot password — the e-mailed link resets the password", () => {
  it("accepts the token from the delivered e-mail and updates the password", async () => {
    const email = uniqueEmail();
    h.state.userRows = [VALID_USER];

    await requestPasswordReset({ ok: false, error: "" }, form({ email }));
    const token = tokenFromMail(sentMail());
    h.state.tokenRows = [eligibleTokenRow(token)];

    const result = await resetPassword(
      { ok: false, error: "" },
      form({ token, password: "N3wPassw0rd!", confirmPassword: "N3wPassw0rd!" }),
    );

    expect(result).toEqual({
      ok: true,
      message: "Password updated. Sign in with your new password.",
      redirectTo: "/login?reset=1",
    });

    const passwordUpdate = h.state.updated.find(
      (row) => row.values.passwordHash !== undefined,
    );
    expect(passwordUpdate?.values.passwordHash).toBe("hashed-new-password");
    expect(h.state.revokeCalls).toEqual(["user-1"]);
    expect(
      h.state.audit.some((row) => row.action === "PASSWORD_RESET_COMPLETED"),
    ).toBe(true);
  });

  it("burns the token so the same link cannot be used twice", async () => {
    const email = uniqueEmail();
    h.state.userRows = [VALID_USER];

    await requestPasswordReset({ ok: false, error: "" }, form({ email }));
    const token = tokenFromMail(sentMail());
    h.state.tokenRows = [eligibleTokenRow(token)];

    const first = await resetPassword(
      { ok: false, error: "" },
      form({ token, password: "N3wPassw0rd!", confirmPassword: "N3wPassw0rd!" }),
    );
    const second = await resetPassword(
      { ok: false, error: "" },
      form({ token, password: "An0therPassw0rd!", confirmPassword: "An0therPassw0rd!" }),
    );

    expect(first.ok).toBe(true);
    expect(second).toEqual({
      ok: false,
      error: "This reset link is invalid or has expired. Request a new one.",
    });
    // Only one password change and one session revocation happened.
    expect(
      h.state.updated.filter((row) => row.values.passwordHash !== undefined),
    ).toHaveLength(1);
    expect(h.state.revokeCalls).toHaveLength(1);
  });

  it("rejects an expired token without changing anything", async () => {
    h.state.userRows = [VALID_USER];
    h.state.tokenRows = [
      { ...eligibleTokenRow("expired-token-value-1234567890"), expiresAt: new Date(Date.now() - 1) },
    ];
    const token = "expired-token-value-1234567890";

    const result = await resetPassword(
      { ok: false, error: "" },
      form({ token, password: "N3wPassw0rd!", confirmPassword: "N3wPassw0rd!" }),
    );

    expect(result).toEqual({
      ok: false,
      error: "This reset link is invalid or has expired. Request a new one.",
    });
    expect(h.state.updated).toHaveLength(0);
    expect(h.state.revokeCalls).toHaveLength(0);
  });

  it("refuses to reset an account that is no longer approved", async () => {
    h.state.userRows = [{ ...VALID_USER, status: "rejected" }];
    h.state.tokenRows = [eligibleTokenRow("still-valid-token-1234567890")];

    const result = await resetPassword(
      { ok: false, error: "" },
      form({
        token: "still-valid-token-1234567890",
        password: "N3wPassw0rd!",
        confirmPassword: "N3wPassw0rd!",
      }),
    );

    expect(result.ok).toBe(false);
    expect(h.state.updated).toHaveLength(0);
    expect(h.state.revokeCalls).toHaveLength(0);
  });
});
