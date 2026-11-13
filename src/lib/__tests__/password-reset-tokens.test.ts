import { describe, expect, it } from "vitest";
import {
  isResetTokenUsable,
  isValidTokenShape,
  issuePasswordResetToken,
  sha256Hex,
} from "@/lib/security/tokens";
import { PASSWORD_RESET_TTL_MS } from "@/lib/constants";

describe("password reset tokens", () => {
  it("hashes deterministically with SHA-256", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
    expect(sha256Hex("abc")).toBe(sha256Hex("abc"));
    expect(sha256Hex("abc")).not.toBe(sha256Hex("abd"));
  });

  it("issues unpredictable, sufficiently long tokens", () => {
    const issued = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      const { token } = issuePasswordResetToken();
      expect(token).toMatch(/^[A-Za-z0-9_-]{40,}$/);
      expect(isValidTokenShape(token)).toBe(true);
      issued.add(token);
    }
    expect(issued.size).toBe(100);
  });

  it("stores only the hash of the raw token", () => {
    const { token, tokenHash } = issuePasswordResetToken();
    expect(tokenHash).toBe(sha256Hex(token));
    expect(tokenHash).not.toContain(token);
  });

  it("expires after the configured TTL", () => {
    const now = Date.now();
    const { expiresAt } = issuePasswordResetToken();
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(now + PASSWORD_RESET_TTL_MS);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(now + PASSWORD_RESET_TTL_MS + 5_000);
  });

  it("rejects malformed or overlong token shapes", () => {
    expect(isValidTokenShape("")).toBe(false);
    expect(isValidTokenShape("short")).toBe(false);
    expect(isValidTokenShape("a".repeat(129))).toBe(false);
    expect(isValidTokenShape("has space in it has space")).toBe(false);
    expect(isValidTokenShape("a".repeat(43))).toBe(true);
  });

  it("accepts a token only while unused and unexpired", () => {
    const now = new Date("2026-11-13T10:00:00Z");
    const expiresAt = new Date("2026-11-13T10:30:00Z");
    expect(isResetTokenUsable({ usedAt: null, expiresAt }, now)).toBe(true);
    expect(isResetTokenUsable({ usedAt: now, expiresAt }, now)).toBe(false);
    expect(
      isResetTokenUsable(
        { usedAt: null, expiresAt: new Date("2026-11-13T09:59:59Z") },
        now,
      ),
    ).toBe(false);
    expect(isResetTokenUsable(null, now)).toBe(false);
  });
});
