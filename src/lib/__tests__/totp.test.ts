import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  normalizeRecoveryCode,
  totpCode,
  totpUri,
  verifyTotp,
} from "@/lib/security/totp";

// RFC 6238 test key: ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("base32", () => {
  it("encodes and decodes symmetrically", () => {
    const bytes = Buffer.from("authenticator-secret");
    expect(base32Decode(base32Encode(bytes)).toString()).toBe("authenticator-secret");
  });

  it("rejects invalid characters", () => {
    expect(() => base32Decode("NOT!BASE32")).toThrow();
  });
});

describe("TOTP (RFC 6238)", () => {
  it("matches the RFC vector truncated to six digits", () => {
    // RFC 6238 appendix B: T=59 → 94287082, T=1111111109 → 07081804.
    expect(totpCode(RFC_SECRET, 59_000)).toBe("287082");
    expect(totpCode(RFC_SECRET, 1_111_111_109_000)).toBe("081804");
  });

  it("accepts the current code within the drift window", () => {
    const now = 1_700_000_000_000;
    const code = totpCode(RFC_SECRET, now);
    expect(verifyTotp(RFC_SECRET, code, now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, now + 30_000)).toBe(true);
    expect(verifyTotp(RFC_SECRET, code, now + 120_000)).toBe(false);
  });

  it("rejects malformed codes without throwing", () => {
    expect(verifyTotp(RFC_SECRET, "abcdef")).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345")).toBe(false);
    expect(verifyTotp("not base32!", "123456")).toBe(false);
  });

  it("generates unique 160-bit secrets and a valid otpauth URI", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
    expect(base32Decode(a).length).toBe(20);
    const uri = totpUri(a, "user@deped.gov.ph");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain(`secret=${a}`);
    expect(uri).toContain("issuer=");
  });
});

describe("recovery codes", () => {
  it("generates ten unambiguous single-use codes", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const code of codes) expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it("hashes case- and format-insensitively (no plaintext storage)", () => {
    const [code] = generateRecoveryCodes(1);
    const spaced = code.toLowerCase().replace("-", " ");
    expect(normalizeRecoveryCode(spaced)).toBe(normalizeRecoveryCode(code));
    expect(hashRecoveryCode(spaced)).toBe(hashRecoveryCode(code));
    expect(hashRecoveryCode(code)).not.toContain(normalizeRecoveryCode(code));
  });
});
