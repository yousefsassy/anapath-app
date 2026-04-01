const SENSITIVE_KEY_PATTERN = /authorization|cookie|password|secret|token|session/i;
const PHI_KEY_PATTERN = /^(q|search|keyword|first_name|last_name|phone|birth_date|general_history|clinical_info|macroscopy|microscopy|conclusion|exam_history|sample_nature|diagnosis_keywords)$/i;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,100}$/;
const REDACTED_VALUE = '[REDACTED]';
const MAX_LOG_STRING_LENGTH = 300;

function truncateLogString(value) {
  if (typeof value !== 'string') {
    return value;
  }

  if (value.length <= MAX_LOG_STRING_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_LOG_STRING_LENGTH)}…`;
}

function shouldRedactKey(key) {
  return SENSITIVE_KEY_PATTERN.test(key) || PHI_KEY_PATTERN.test(key);
}

export function redactForLogs(value, key = '') {
  if (key && shouldRedactKey(key)) {
    return REDACTED_VALUE;
  }

  if (value instanceof Error) {
    return serializeError(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactForLogs(entry, key));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        redactForLogs(entryValue, entryKey),
      ])
    );
  }

  return truncateLogString(value);
}

export function sanitizeRequestId(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!SAFE_REQUEST_ID_PATTERN.test(trimmed)) {
    return null;
  }

  return trimmed;
}

export function serializeError(error) {
  if (!(error instanceof Error)) {
    return redactForLogs(error);
  }

  const payload = {
    name: error.name,
    message: truncateLogString(error.message),
  };

  if (process.env.NODE_ENV !== 'production' && error.stack) {
    payload.stack = truncateLogString(error.stack);
  }

  return payload;
}

function emitLog(level, event, metadata = {}) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...redactForLogs(metadata),
  };

  const line = JSON.stringify(payload);
  if (level === 'error') {
    console.error(line);
    return;
  }

  if (level === 'warn') {
    console.warn(line);
    return;
  }

  console.log(line);
}

function buildRequestMetadata(req) {
  return {
    request_id: req.requestId || null,
    method: req.method,
    path: req.originalUrl || req.url,
    ip: req.ip || req.socket?.remoteAddress || null,
    user_id: req.auth?.userId ?? null,
    laboratory_id: req.auth?.laboratoryId ?? null,
  };
}

export const logger = {
  info(event, metadata = {}) {
    emitLog('info', event, metadata);
  },
  warn(event, metadata = {}) {
    emitLog('warn', event, metadata);
  },
  error(event, metadata = {}) {
    emitLog('error', event, metadata);
  },
};

export function createRequestLogger(req) {
  return {
    info(event, metadata = {}) {
      emitLog('info', event, {
        ...buildRequestMetadata(req),
        ...metadata,
      });
    },
    warn(event, metadata = {}) {
      emitLog('warn', event, {
        ...buildRequestMetadata(req),
        ...metadata,
      });
    },
    error(event, metadata = {}) {
      emitLog('error', event, {
        ...buildRequestMetadata(req),
        ...metadata,
      });
    },
  };
}

export function getRequestLogger(req) {
  return req?.log || logger;
}
