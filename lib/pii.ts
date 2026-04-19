import crypto from "crypto";

const KEY_B64 = process.env.PII_ENCRYPTION_KEY || "";

function getKey(): Buffer {
  if (!KEY_B64) throw new Error("PII_ENCRYPTION_KEY not configured");
  const key = Buffer.from(KEY_B64, "base64");
  if (key.length !== 32) throw new Error(`PII_ENCRYPTION_KEY must be 32 bytes (got ${key.length})`);
  return key;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Output layout: [12-byte IV][16-byte auth tag][ciphertext], base64-encoded.
 * Returns null for null/empty input so DB nullability is preserved.
 */
export function encryptPII(plaintext: string | null | undefined): string | null {
  if (plaintext == null || plaintext === "") return null;
  const key = getKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/**
 * Inverse of encryptPII. Returns null on input null/empty and on decryption
 * failure — decryption must never throw (caller decides fallback).
 */
export function decryptPII(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const key = getKey();
    const buf = Buffer.from(blob, "base64");
    if (buf.length < 12 + 16 + 1) return null;
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return pt.toString("utf8");
  } catch {
    return null;
  }
}

export function isEncryptionConfigured(): boolean {
  return !!KEY_B64 && Buffer.from(KEY_B64, "base64").length === 32;
}
