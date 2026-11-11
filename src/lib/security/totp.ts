import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) with SHA-1 / 6 digits / 30-second steps — the standard
 * authenticator-app profile. Implemented directly on Node's crypto primitives
 * (HMAC-SHA1 + RFC 4648 base32); no custom cryptography.
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_SECONDS = 30;
const TOTP_DIGITS = 6;

export const TOTP_ISSUER = "Sta. Magdalena NHS Records";

/* ------------------------------- base32 ---------------------------------- */

export function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[=\s-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/* --------------------------------- TOTP ---------------------------------- */

/** New random 160-bit TOTP secret (base32, what authenticator apps accept). */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

/** Current TOTP code for a secret (exported for tests / diagnostics only). */
export function totpCode(secret: string, atMs: number = Date.now()): string {
  return hotp(secret, Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS));
}

/**
 * Verify a 6-digit code, tolerating one 30-second step of clock drift in each
 * direction. Comparison is constant-time. Never throws on malformed input.
 */
export function verifyTotp(
  secret: string,
  token: string,
  atMs: number = Date.now(),
  window = 1,
): boolean {
  const candidate = token.replace(/\s/g, "");
  if (!/^\d{6}$/.test(candidate)) return false;
  let decoded: Buffer;
  try {
    base32Decode(secret);
    decoded = Buffer.from(candidate);
  } catch {
    return false;
  }
  const counter = Math.floor(atMs / 1000 / TOTP_PERIOD_SECONDS);
  for (let offset = -window; offset <= window; offset += 1) {
    if (counter + offset < 0) continue;
    const expected = Buffer.from(hotp(secret, counter + offset));
    if (expected.length === decoded.length && timingSafeEqual(expected, decoded)) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI used to render the enrollment QR code. */
export function totpUri(secret: string, accountEmail: string): string {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${accountEmail}`);
  const params = new URLSearchParams({
    secret,
    issuer: TOTP_ISSUER,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

/* ----------------------------- recovery codes ----------------------------- */

/** Unambiguous alphabet (no 0/O/1/I) for hand-typed recovery codes. */
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const RECOVERY_CODE_COUNT = 10;

function randomRecoveryChunk(length: number): string {
  const bytes = randomBytes(length);
  let out = "";
  for (const byte of bytes) out += RECOVERY_ALPHABET[byte % RECOVERY_ALPHABET.length];
  return out;
}

/** Generate the one-time plaintext codes shown to the user exactly once. */
export function generateRecoveryCodes(count = RECOVERY_CODE_COUNT): string[] {
  return Array.from(
    { length: count },
    () => `${randomRecoveryChunk(4)}-${randomRecoveryChunk(4)}`,
  );
}

/** Normalize user input (case/format-insensitive) for hashing/lookup. */
export function normalizeRecoveryCode(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Recovery codes are stored as SHA-256 hashes — never in plaintext. */
export function hashRecoveryCode(raw: string): string {
  return createHash("sha256").update(normalizeRecoveryCode(raw)).digest("hex");
}
