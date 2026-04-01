import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);

const PASSWORD_HASH_PREFIX = 'scrypt';
const PASSWORD_KEY_LENGTH = 64;
const PASSWORD_SALT_BYTES = 16;
const MIN_BOOTSTRAP_PASSWORD_LENGTH = 12;
const DENYLISTED_PASSWORDS = new Set([
  'admin123',
  'password',
  'password123',
  'changeme',
  'changeme123',
  'anapath',
  'anapath123',
  'defaultadmin',
]);

function normalizePassword(value) {
  return String(value ?? '');
}

export function isSupportedPasswordHash(storedHash) {
  return typeof storedHash === 'string'
    && storedHash.startsWith(`${PASSWORD_HASH_PREFIX}$`);
}

export async function createPasswordHash(password) {
  const normalizedPassword = normalizePassword(password);
  const salt = randomBytes(PASSWORD_SALT_BYTES).toString('hex');
  const derivedKey = await scrypt(
    normalizedPassword,
    salt,
    PASSWORD_KEY_LENGTH
  );

  return `${PASSWORD_HASH_PREFIX}$${salt}$${Buffer.from(derivedKey).toString('hex')}`;
}

export async function verifyPassword(password, storedHash) {
  if (!isSupportedPasswordHash(storedHash)) {
    return false;
  }

  const [, saltHex, hashHex] = storedHash.split('$');
  if (!saltHex || !hashHex) {
    return false;
  }

  const expectedHash = Buffer.from(hashHex, 'hex');
  const derivedKey = Buffer.from(
    await scrypt(normalizePassword(password), saltHex, expectedHash.length)
  );

  return (
    expectedHash.length === derivedKey.length
    && timingSafeEqual(expectedHash, derivedKey)
  );
}

export function validateBootstrapPassword(password) {
  const normalizedPassword = normalizePassword(password);
  const loweredPassword = normalizedPassword.trim().toLowerCase();

  if (normalizedPassword.length < MIN_BOOTSTRAP_PASSWORD_LENGTH) {
    return `Le mot de passe administrateur doit contenir au moins ${MIN_BOOTSTRAP_PASSWORD_LENGTH} caractères.`;
  }

  if (DENYLISTED_PASSWORDS.has(loweredPassword)) {
    return 'Le mot de passe administrateur choisi est trop faible.';
  }

  return null;
}
