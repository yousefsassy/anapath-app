import { createHash, randomBytes } from 'node:crypto';
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_SECURE,
} from '../config/security.js';

function parseCookieHeader(cookieHeader) {
  if (!cookieHeader) {
    return {};
  }

  return cookieHeader.split(';').reduce((accumulator, part) => {
    const [rawKey, ...rawValueParts] = part.trim().split('=');
    if (!rawKey) {
      return accumulator;
    }

    accumulator[rawKey] = decodeURIComponent(rawValueParts.join('='));
    return accumulator;
  }, {});
}

function getCookieOptions(expiresAt) {
  return {
    httpOnly: true,
    sameSite: 'strict',
    secure: SESSION_COOKIE_SECURE,
    path: '/',
    expires: expiresAt,
  };
}

export function generateSessionToken() {
  return randomBytes(32).toString('hex');
}

export function hashSessionToken(token) {
  return createHash('sha256').update(String(token)).digest('hex');
}

export function readSessionTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

export function setSessionCookie(res, token, expiresAt) {
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions(expiresAt));
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, getCookieOptions(new Date(0)));
}
