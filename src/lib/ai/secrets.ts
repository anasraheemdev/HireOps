import 'server-only';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
function key() {
  const secret = process.env.APP_ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error('Server encryption key is not configured');
  return createHash('sha256').update(`hireops:ai-secrets:v1:${secret}`).digest();
}
export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return ['v1', iv.toString('base64'), cipher.getAuthTag().toString('base64'), ciphertext.toString('base64')].join(':');
}
export function decryptSecret(value: string) {
  if (!value.startsWith('v1:')) throw new Error('Legacy AI settings must be saved again by an administrator');
  const [,iv,tag,payload] = value.split(':');
  const cipher = createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'base64'));
  cipher.setAuthTag(Buffer.from(tag,'base64'));
  return Buffer.concat([cipher.update(Buffer.from(payload,'base64')),cipher.final()]).toString('utf8');
}
