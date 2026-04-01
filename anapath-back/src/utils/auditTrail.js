import { redactForLogs } from './logger.js';

function normalizeAuditValue(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return value;
}

export function buildAuditRequestContext(req, overrides = {}) {
  return {
    laboratoryId: normalizeAuditValue(
      overrides.laboratoryId ?? req?.auth?.laboratoryId
    ),
    userId: normalizeAuditValue(
      overrides.userId ?? req?.auth?.userId
    ),
    sessionId: normalizeAuditValue(
      overrides.sessionId ?? req?.auth?.sessionId
    ),
    requestId: normalizeAuditValue(req?.requestId),
    ipAddress: normalizeAuditValue(req?.ip ?? req?.socket?.remoteAddress),
    userAgent: normalizeAuditValue(
      req?.get?.('User-Agent') ?? req?.headers?.['user-agent']
    ),
  };
}

export function sanitizeAuditMetadata(metadata = {}) {
  const sanitized = redactForLogs(metadata);

  if (!sanitized || typeof sanitized !== 'object' || Array.isArray(sanitized)) {
    return {};
  }

  return sanitized;
}

export function createReportSnapshotPayload(report) {
  return {
    clinical_info: String(report?.clinical_info || ''),
    macroscopy: String(report?.macroscopy || ''),
    microscopy: String(report?.microscopy || ''),
    conclusion: String(report?.conclusion || ''),
  };
}

export function reportSnapshotChanged(report, revision) {
  if (!revision) {
    return true;
  }

  const current = createReportSnapshotPayload(report);

  return (
    current.clinical_info !== String(revision.clinical_info || '')
    || current.macroscopy !== String(revision.macroscopy || '')
    || current.microscopy !== String(revision.microscopy || '')
    || current.conclusion !== String(revision.conclusion || '')
  );
}
