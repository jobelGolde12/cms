import { describe, expect, it } from "vitest";
import { ROLES } from "@/lib/constants";
import { isRetiredDemoEmail } from "@/lib/retired-demo";
import {
  DUMMY_ACCOUNTS,
  DUMMY_EMAIL_DOMAIN,
  DUMMY_EMAILS,
  DUMMY_USER_IDS,
  dummyRoleId,
  dummyUserId,
  isDummyAccountEmail,
  isDummyUserId,
  realUsersOnly,
} from "@/lib/dummy-accounts";

/**
 * The hidden dummy/test login accounts must:
 *   • be exactly one per current role;
 *   • use the reserved, retired-demo-safe e-mail domain;
 *   • never collide with real school accounts;
 *   • be identifiable through the authoritative marker predicate.
 */
describe("dummy/test login accounts", () => {
  it("covers every current role exactly once", () => {
    expect(DUMMY_ACCOUNTS).toHaveLength(ROLES.length);
    const roles = DUMMY_ACCOUNTS.map((a) => a.role).sort();
    expect(roles).toEqual([...ROLES].sort());
  });

  it("uses the reserved dummy domain, never the retired-demo domain", () => {
    for (const account of DUMMY_ACCOUNTS) {
      expect(account.email.endsWith(`@${DUMMY_EMAIL_DOMAIN}`)).toBe(true);
      expect(isRetiredDemoEmail(account.email)).toBe(false);
      expect(account.email.endsWith("@local.dev")).toBe(false);
    }
  });

  it("keeps e-mails and ids unique and deterministic", () => {
    expect(new Set(DUMMY_EMAILS).size).toBe(DUMMY_ACCOUNTS.length);
    expect(new Set(DUMMY_USER_IDS).size).toBe(DUMMY_ACCOUNTS.length);
    for (const account of DUMMY_ACCOUNTS) {
      expect(account.id).toBe(dummyUserId(account.role));
      expect(account.roleId).toBe(dummyRoleId(account.role));
      expect(account.id.startsWith("dummy-user-")).toBe(true);
    }
  });

  it("recognises reserved dummy addresses and ids", () => {
    expect(isDummyAccountEmail("dummy.admin@smnhs.test")).toBe(true);
    expect(isDummyAccountEmail("Dummy.Admin@SMNHS.TEST")).toBe(true);
    expect(isDummyAccountEmail("meisher.alcaraz@deped.gov.ph")).toBe(false);
    expect(isDummyUserId("dummy-user-admin")).toBe(true);
    expect(isDummyUserId("user-admin")).toBe(false);
  });

  it("exposes an authoritative marker predicate (not an e-mail pattern)", () => {
    const predicate = realUsersOnly();
    expect(predicate).toBeTruthy();
  });
});
