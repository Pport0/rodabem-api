import * as crypto from 'crypto';

const algorithm = 'aes-256-cbc';
const secretKey = process.env.CRYPTO_SECRET || 'default_secret_key_32_chars!!';
const ivLength = 16;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(ivLength);
  const cipher = crypto.createCipheriv(
    algorithm,
    Buffer.from(secretKey.padEnd(32, '0')).slice(0, 32),
    iv,
  );

  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts.shift()!, 'hex');
  const encryptedText = Buffer.from(parts.join(':'), 'hex');

  const decipher = crypto.createDecipheriv(
    algorithm,
    Buffer.from(secretKey.padEnd(32, '0')).slice(0, 32),
    iv,
  );

  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}