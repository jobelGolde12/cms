import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

/**
 * Encryption-at-rest for sensitive records (health, guidance, employee 201).
 *
 * AES-256-GCM with a random 96-bit IV per value and an authentication tag, so
 * tampering is detected on read. The key is derived from the server-only
 * ENCRYPTION_KEY environment variable and NEVER reaches the browser.
 *
 * Format: `enc:v1:<iv-b64url>:<tag-b64url>:<ciphertext-b64url>`
 *
 * Plaintext values that predate the encryption rollout are passed through
 * unchanged on read (so an un-migrated row cannot break the UI), and are
 * reported by `isEncrypted()` for the backfill script. Anything that carries
 * the encrypted prefix but fails authentication THROWS — a value that was
 * tampered with must never be silently shown as plaintext.
 */
const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;
/** Domain-separation salt for passphrase-style keys. */
const KDF_SALT = "sms:encryption:v1";
/**
 * Development-only fallback. Production refuses to start encrypting without a
 * configured key, so this value can never protect real deployment data.
 */
const DEV_FALLBACK_SECRET = "sms-local-development-encryption-key-do-not-use";

let cachedKey: Buffer | null = null;
let warnedAboutFallback = false;

function decodeConfiguredKey(raw: string): Buffer | null {
  const trimmed = raw.trim();
  // 64 hex characters = 32 raw bytes.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) return Buffer.from(trimmed, "hex");
  // Base64 of exactly 32 bytes.
  try {
    const decoded = Buffer.from(trimmed, "base64");
    if (decoded.length === KEY_BYTES) return decoded;
  } catch {
    // Fall through to passphrase derivation.
  }
  return null;
}

function resolveKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (raw && raw.trim().length > 0) {
    const direct = decodeConfiguredKey(raw);
    cachedKey = direct ?? scryptSync(raw, KDF_SALT, KEY_BYTES);
    return cachedKey;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ENCRYPTION_KEY is not configured. Sensitive records cannot be encrypted or decrypted.",
    );
  }

  if (!warnedAboutFallback) {
    warnedAboutFallback = true;
    console.warn(
      "[encryption] ENCRYPTION_KEY is not set — using the local development key. Configure ENCRYPTION_KEY before handling real data.",
    );
  }
  cachedKey = scryptSync(DEV_FALLBACK_SECRET, KDF_SALT, KEY_BYTES);
  return cachedKey;
}

/** True when a stored value is already encrypted by this module. */
export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(PREFIX);
}

/** Encrypt a UTF-8 string. Empty strings are stored as-is (no information). */
export function encryptString(plain: string): string {
  if (plain.length === 0) return plain;
  if (isEncrypted(plain)) return plain; // never double-encrypt

  const key = resolveKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

/**
 * Decrypt a stored value. Legacy plaintext is returned untouched; a value with
 * the encryption prefix that fails authentication throws (tamper detection).
 */
export function decryptString(stored: string): string {
  if (stored.length === 0) return stored;
  if (!isEncrypted(stored)) return stored; // legacy plaintext row

  const rest = stored.slice(PREFIX.length);
  const [ivPart, tagPart, dataPart] = rest.split(":");
  if (!ivPart || !tagPart || dataPart === undefined) {
    throw new Error("Encrypted value is malformed or has been tampered with.");
  }

  try {
    const key = resolveKey();
    const decipher = createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(ivPart, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plain = Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64url")),
      decipher.final(),
    ]);
    return plain.toString("utf8");
  } catch (error) {
    // Never include the value itself in the error/log.
    console.error("[encryption] authenticated decryption failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
    throw new Error("Encrypted value failed its integrity check.");
  }
}

/** Test-only: forget the cached key after changing ENCRYPTION_KEY. */
export function resetEncryptionKeyCache(): void {
  cachedKey = null;
  warnedAboutFallback = false;
}
