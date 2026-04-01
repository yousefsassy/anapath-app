import { getRequestLogger, serializeError } from '../utils/logger.js';

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.originalUrl}`,
  });
}

export function errorHandler(err, req, res, next) {
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const message = status >= 500
    ? 'Erreur interne du serveur.'
    : err?.message || 'Requête impossible.';
  const log = getRequestLogger(req);

  log.error('request_failed', {
    status,
    error: serializeError(err),
  });

  res.status(status).json({
    success: false,
    message,
  });
}
