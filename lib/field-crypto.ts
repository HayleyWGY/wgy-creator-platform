import crypto from "crypto";

/**
 * Field-level encryption for sensitive creator PII (dateOfBirth, address,
 * contactNumber, gender). AES-256-GCM — authenticated encryption, so
 * tampered ciphertext fails loudly instead of decrypting to garbage.
 *
 * Values are stored as `enc:v1:<iv>:<authTag>:<ciphertext>` (base64 parts).
 * decryptField() passes through anything without that prefix unchanged, so
 * legacy plaintext rows keep working until the one-off migration script
 * (scripts/encrypt-sensitive-fields.js) has encrypted them.
 *
 * The key lives in FIELD_ENCRYPTION_KEY (base64, 32 bytes) — env only,
 * never in the database. Losing the key means losing the encrypted data,
 * so it must also be saved in a password manager, not just Vercel.
 */

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const raw = process.env.FIELD_ENCRYPTION_KEY;
  if (!raw) throw new Error("FIELD_ENCRYPTION_KEY is not set");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("FIELD_ENCRYPTION_KEY must be 32 bytes (base64)");
  return key;
}

export function encryptField(plaintext: string | null | undefined): string | null {
  if (plaintext === null || plaintext === undefined || plaintext === "") return null;
  if (plaintext.startsWith(PREFIX)) return plaintext; // already encrypted

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext.toString("base64")}`;
}

export function decryptField(stored: string | null | undefined): string | null {
  if (stored === null || stored === undefined || stored === "") return null;
  if (!stored.startsWith(PREFIX)) return stored; // legacy plaintext row

  const [ivB64, tagB64, dataB64] = stored.slice(PREFIX.length).split(":");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
