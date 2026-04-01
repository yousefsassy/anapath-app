const DEFAULT_ALLOWED_ORIGINS = [
  process.env.FRONTEND_ORIGIN,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].filter(Boolean);

function parseTrustProxySetting(value) {
  if (value === undefined || value === null) {
    return false;
  }

  const trimmed = String(value).trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.toLowerCase();
  if (['false', '0', 'off', 'no'].includes(normalized)) {
    return false;
  }

  if (['true', '1', 'on', 'yes'].includes(normalized)) {
    return 1;
  }

  const numericValue = Number(trimmed);
  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return trimmed;
}

export const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME || 'anapath_session';

const rawSessionDurationHours = Number(process.env.SESSION_DURATION_HOURS);
export const SESSION_DURATION_HOURS = Number.isFinite(rawSessionDurationHours)
  && rawSessionDurationHours > 0
  ? rawSessionDurationHours
  : 12;
export const SESSION_DURATION_MS =
  SESSION_DURATION_HOURS * 60 * 60 * 1000;

export const SESSION_COOKIE_SECURE =
  process.env.SESSION_COOKIE_SECURE === 'true'
  || (process.env.NODE_ENV !== 'development'
    && process.env.NODE_ENV !== 'test');

export const CORS_ALLOWED_ORIGINS = (
  process.env.CORS_ALLOWED_ORIGINS
    ? process.env.CORS_ALLOWED_ORIGINS.split(',')
    : DEFAULT_ALLOWED_ORIGINS
)
  .map((origin) => origin.trim())
  .filter(Boolean);

export const TRUST_PROXY = parseTrustProxySetting(process.env.TRUST_PROXY);

function readPositiveIntegerEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export const LOGIN_RATE_LIMIT_MAX = readPositiveIntegerEnv(
  'LOGIN_RATE_LIMIT_MAX',
  8
);
export const LOGIN_RATE_LIMIT_WINDOW_MS = readPositiveIntegerEnv(
  'LOGIN_RATE_LIMIT_WINDOW_MS',
  15 * 60 * 1000
);
export const SEARCH_RATE_LIMIT_MAX = readPositiveIntegerEnv(
  'SEARCH_RATE_LIMIT_MAX',
  120
);
export const SEARCH_RATE_LIMIT_WINDOW_MS = readPositiveIntegerEnv(
  'SEARCH_RATE_LIMIT_WINDOW_MS',
  60 * 1000
);
