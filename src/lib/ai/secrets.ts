import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

function deriveKey(secret: string) {
  return createHash("sha256").update(`hireops:ai-secrets:v1:${secret}`).digest();
}

function getPrimarySecret(): string {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("Server encryption key (APP_ENCRYPTION_KEY) is not configured [app_secret_decryption_failed]");
  }
  return secret;
}

export function encryptSecret(value: string): string {
  const secret = getPrimarySecret();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), ciphertext.toString("base64")].join(":");
}

export function decryptSecret(value: string): string {
  if (!value || typeof value !== "string" || !value.startsWith("v1:")) {
    throw new Error("Invalid or legacy AI settings format [app_secret_decryption_failed]");
  }

  const [, iv, tag, payload] = value.split(":");
  const ivBuf = Buffer.from(iv, "base64");
  const tagBuf = Buffer.from(tag, "base64");
  const payloadBuf = Buffer.from(payload, "base64");

  // Primary key attempt using APP_ENCRYPTION_KEY
  const primarySecret = process.env.APP_ENCRYPTION_KEY;
  if (primarySecret) {
    try {
      const cipher = createDecipheriv("aes-256-gcm", deriveKey(primarySecret), ivBuf);
      cipher.setAuthTag(tagBuf);
      return Buffer.concat([cipher.update(payloadBuf), cipher.final()]).toString("utf8");
    } catch {
      // Primary decryption failed, try backward-compatible fallback below
    }
  }

  // Fallback key attempt using SUPABASE_SERVICE_ROLE_KEY for backward compatibility
  const fallbackSecret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (fallbackSecret) {
    try {
      const cipher = createDecipheriv("aes-256-gcm", deriveKey(fallbackSecret), ivBuf);
      cipher.setAuthTag(tagBuf);
      return Buffer.concat([cipher.update(payloadBuf), cipher.final()]).toString("utf8");
    } catch {
      // Fallback decryption also failed
    }
  }

  throw new Error("AI secret decryption failed with configured encryption keys [app_secret_decryption_failed]");
}
