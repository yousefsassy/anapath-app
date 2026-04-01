import { randomUUID } from 'node:crypto';
import {
  createRequestLogger,
  sanitizeRequestId,
} from '../utils/logger.js';

export function attachRequestMetadata(req, res, next) {
  const incomingRequestId = sanitizeRequestId(req.get('X-Request-Id'));
  const requestId = incomingRequestId || randomUUID();

  req.requestId = requestId;
  req.log = createRequestLogger(req);

  res.setHeader('X-Request-Id', requestId);
  next();
}
