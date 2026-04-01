import { getRequestLogger } from '../utils/logger.js';

function getClientIp(req) {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

export function createRateLimiter({
  name = 'generic',
  max,
  windowMs,
  message,
  keyGenerator,
}) {
  const entries = new Map();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(req) : getClientIp(req);
    const existingEntry = entries.get(key);

    if (!existingEntry || existingEntry.resetAt <= now) {
      entries.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return next();
    }

    if (existingEntry.count >= max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((existingEntry.resetAt - now) / 1000)
      );
      const log = getRequestLogger(req);

      log.warn('rate_limit_hit', {
        limiter: name,
        retry_after_seconds: retryAfterSeconds,
        max_requests: max,
        window_ms: windowMs,
      });

      res.setHeader('Retry-After', String(retryAfterSeconds));
      return res.status(429).json({
        success: false,
        message,
      });
    }

    existingEntry.count += 1;
    return next();
  };
}
