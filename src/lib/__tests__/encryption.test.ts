import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  decryptString,
  encryptString,
  isEncrypted,
  resetEncryptionKeyCache,
} from "@/lib/security/encryption";

const ORIGINAL_KEY = process.env.ENCRYPTION_KEY;

beforeAll(() => {
  process.env.ENCRYPTION_KEY = "test-only-encryption-key-0123456789abcdef";
  resetEncryptionKeyCache();
});

afterAll(() => {
  process.env.ENCRYPTION_KEY = ORIGINAL_KEY;
  resetEncryptionKeyCache();
});

describe("encryption at rest", () => {
  it("round-trips sensitive text", () => {
    const plain = "Student disclosed a medical condition — confidential.";
    const cipher = encryptString(plain);
    expect(cipher).not.toContain(plain);
    expect(isEncrypted(cipher)).toBe(true);
    expect(decryptString(cipher)).toBe(plain);
  });

  it("uses a fresh IV for every value", () => {
    const a = encryptString("same plaintext");
    const b = encryptString("same plaintext");
    expect(a).not.toBe(b);
    expect(decryptString(a)).toBe("same plaintext");
    expect(decryptString(b)).toBe("same plaintext");
  });

  it("detects tampering with the ciphertext", () => {
    const cipher = encryptString("tamper-evident record");
    const parts = cipher.split(":");
    // Flip a character in the ciphertext payload.
    const data = parts[4];
    const mutated = data[0] === "A" ? `B${data.slice(1)}` : `A${data.slice(1)}`;
    const tampered = [...parts.slice(0, 4), mutated].join(":");
    expect(() => decryptString(tampered)).toThrow(/integrity/);
  });

  it("detects a tampered authentication tag", () => {
    const cipher = encryptString("tag protected");
    const parts = cipher.split(":");
    parts[3] = parts[3][0] === "A" ? `B${parts[3].slice(1)}` : `A${parts[3].slice(1)}`;
    expect(() => decryptString(parts.join(":"))).toThrow(/integrity/);
  });

  it("passes legacy plaintext through unchanged (pre-migration rows)", () => {
    expect(decryptString("legacy plaintext")).toBe("legacy plaintext");
    expect(isEncrypted("legacy plaintext")).toBe(false);
  });

  it("never double-encrypts and keeps empty strings empty", () => {
    const once = encryptString("value");
    expect(encryptString(once)).toBe(once);
    expect(encryptString("")).toBe("");
    expect(decryptString("")).toBe("");
  });
});
