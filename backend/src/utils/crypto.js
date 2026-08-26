import crypto from 'crypto';
import { env } from '../config/env.js';

const TOKEN_ALGORITHM = 'HS256';
const SECRET_ALGORITHM = 'aes-256-gcm';

function base64Url(input) {
  return Buffer.from(input).toString('base64url');
}

function parseDuration(value) {
  const match = String(value).match(/^(\d+)([smhd])$/);
  if (!match) return 24 * 60 * 60;
  const amount = Number(match[1]);
  const unit = match[2];
  return amount * ({ s: 1, m: 60, h: 3600, d: 86400 }[unit]);
}

export function signToken(payload, expiresIn = env.jwtExpiresIn) {
  const header = { alg: TOKEN_ALGORITHM, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + parseDuration(expiresIn) };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(body))}`;
  const signature = crypto.createHmac('sha256', env.jwtSecret).update(unsigned).digest('base64url');
  return `${unsigned}.${signature}`;
}

export function verifyToken(token) {
  try {
    const [encodedHeader, encodedPayload, signature] = String(token || '').split('.');
    if (!encodedHeader || !encodedPayload || !signature) return null;
    const unsigned = `${encodedHeader}.${encodedPayload}`;
    const expected = crypto.createHmac('sha256', env.jwtSecret).update(unsigned).digest('base64url');
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (signatureBuffer.length !== expectedBuffer.length) return null;
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const key = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString('hex'));
    });
  });
  return `scrypt:${salt}:${key}`;
}

export async function verifyPassword(password, stored) {
  const [algorithm, salt, expected] = String(stored || '').split(':');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const actual = await new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey.toString('hex'));
    });
  });
  return crypto.timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}

function encryptionKey() {
  return crypto.createHash('sha256').update(env.encryptionKey).digest();
}

export function encryptSecret(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(SECRET_ALGORITHM, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(value) {
  const [iv, tag, encrypted] = String(value || '').split('.');
  if (!iv || !tag || !encrypted) return null;
  const decipher = crypto.createDecipheriv(SECRET_ALGORITHM, encryptionKey(), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
