import { describe, expect, it, beforeEach } from "vitest";
import {
  buildPasswordResetUrl,
  resetRateKey,
  resolvePasswordResetBaseUrl,
} from "@/lib/password-reset";
import { rateLimit } from "@/lib/rate-limit";

describe("resolvePasswordResetBaseUrl", () => {
  it("prefers NEXT_PUBLIC_APP_URL and strips trailing slashes", () => {
    expect(
      resolvePasswordResetBaseUrl({
        NEXT_PUBLIC_APP_URL: "https://records.example.org///",
        NODE_ENV: "production",
      }),
    ).toBe("https://records.example.org");
  });

  it("falls back to APP_URL", () => {
    expect(
      resolvePasswordResetBaseUrl({
        APP_URL: "https://app.example.org",
        NODE_ENV: "production",
      }),
    ).toBe("https://app.example.org");
  });

  it("never invents a host in production", () => {
    expect(resolvePasswordResetBaseUrl({ NODE_ENV: "production" })).toBeNull();
  });

  it("defaults to localhost only outside production", () => {
    expect(resolvePasswordResetBaseUrl({ NODE_ENV: "development" })).toBe(
      "http://localhost:3000",
    );
  });
});

describe("buildPasswordResetUrl", () => {
  it("builds an encoded reset URL", () => {
    expect(buildPasswordResetUrl("abc-_123", "https://school.example.org/")).toBe(
      "https://school.example.org/reset-password?token=abc-_123",
    );
  });

  it("encodes tokens with reserved characters", () => {
    expect(buildPasswordResetUrl("a+b/c=d", "https://school.example.org")).toBe(
      "https://school.example.org/reset-password?token=a%2Bb%2Fc%3Dd",
    );
  });

  it("returns null without a base URL", () => {
    expect(buildPasswordResetUrl("token", null)).toBeNull();
    expect(buildPasswordResetUrl("token", "")).toBeNull();
  });
});

describe("resetRateKey", () => {
  it("never embeds the plaintext address", () => {
    const key = resetRateKey("forgot-email", "Teacher@School.edu");
    expect(key.startsWith("forgot-email:")).toBe(true);
    expect(key.toLowerCase()).not.toContain("teacher@school.edu");
  });

  it("is stable and case-insensitive", () => {
    expect(resetRateKey("forgot-email", " ADmin@school.edu ")).toBe(
      resetRateKey("forgot-email", "admin@school.edu"),
    );
  });

  it("separates scopes", () => {
    expect(resetRateKey("forgot-email", "a@b.co")).not.toBe(
      resetRateKey("reset", "a@b.co"),
    );
  });
});

describe("rateLimit", () => {
  beforeEach(() => {
    // Distinct keys per test keep the in-memory buckets independent.
  });

  it("allows requests up to the limit and then blocks", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      expect(rateLimit(key, 3, 60_000).ok).toBe(true);
    }
    const blocked = rateLimit(key, 3, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
