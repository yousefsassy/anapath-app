export const VALID_EXAM_STATUSES = ['registered', 'in_progress', 'completed'];
export const VALID_EXAM_TYPES = ['histology', 'cytology'];

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function parsePositiveInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isValidIsoDateString(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) {
    return false;
  }

  const [year, month, day] = value.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

export function validateDateRange(dateFrom, dateTo) {
  if (dateFrom && !isValidIsoDateString(dateFrom)) {
    return 'Format de date invalide. Utilisez YYYY-MM-DD.';
  }

  if (dateTo && !isValidIsoDateString(dateTo)) {
    return 'Format de date invalide. Utilisez YYYY-MM-DD.';
  }

  if (dateFrom && dateTo && dateFrom > dateTo) {
    return 'La date de début doit être antérieure ou égale à la date de fin.';
  }

  return null;
}

export function validateOptionalIsoDate(value, fieldLabel) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  return isValidIsoDateString(String(value))
    ? null
    : `Date invalide pour ${fieldLabel}. Utilisez YYYY-MM-DD.`;
}

export function buildRequiredFieldsMessage(requiredFields, payload, fieldLabels) {
  const missingFields = requiredFields.filter(
    (field) => payload[field] === undefined || payload[field] === null || payload[field] === ''
  );

  if (missingFields.length === 0) {
    return null;
  }

  const labels = missingFields.map((field) => fieldLabels[field] ?? field);
  return `Champs obligatoires : ${labels.join(', ')}.`;
}
