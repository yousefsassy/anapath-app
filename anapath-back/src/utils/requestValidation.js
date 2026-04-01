export const VALID_EXAM_STATUSES = ['registered', 'in_progress', 'completed'];
export const VALID_EXAM_TYPES = ['histology', 'cytology'];
export const VALID_PATIENT_SEXES = ['M', 'F'];

export const VALIDATION_LIMITS = {
  patient_name: 100,
  phone: 50,
  template_name: 120,
  fixed_exam_field: 255,
  patient_general_history: 5000,
  exam_history: 8000,
  diagnosis_keywords_count: 20,
  diagnosis_keyword_length: 64,
  narrative_section: 20000,
  free_text_search: 200,
  email: 255,
  password: 512,
};

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

export class RequestValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'RequestValidationError';
    this.status = 400;
    this.details = details;
  }
}

function fieldPrefix(location) {
  return location === 'query' || location === 'params'
    ? 'Le paramètre'
    : 'Le champ';
}

function fieldReference(label, location) {
  return `${fieldPrefix(location)} ${label}`;
}

function ensureSingleValue(value, label, location) {
  if (!Array.isArray(value)) {
    return value;
  }

  throw new RequestValidationError(
    `${fieldReference(label, location)} ne doit être fourni qu'une seule fois.`,
    {
      code: 'repeated_value',
      field: label,
      location,
    }
  );
}

export function ensurePlainObject(value, location = 'body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new RequestValidationError(
      location === 'body'
        ? 'Le corps de la requête doit être un objet JSON.'
        : 'Les paramètres fournis sont invalides.',
      {
        code: 'invalid_object',
        location,
      }
    );
  }

  return value;
}

function normalizeEmptyNullableValue(value, allowNull) {
  if (!allowNull) {
    return value;
  }

  return value === '' || value === null ? null : value;
}

export function validateUnknownKeys(input, allowedKeys, {
  location = 'body',
  forbiddenKeys = [],
} = {}) {
  const keys = Object.keys(input);

  for (const key of keys) {
    if (forbiddenKeys.includes(key)) {
      throw new RequestValidationError(
        `Le champ ${key} est en lecture seule et ne peut pas être modifié.`,
        {
          code: 'read_only_field',
          field: key,
          location,
        }
      );
    }

    if (!allowedKeys.includes(key)) {
      throw new RequestValidationError(
        `Champ inconnu : ${key}.`,
        {
          code: 'unknown_field',
          field: key,
          location,
        }
      );
    }
  }
}

export function stringField({
  label,
  location = 'body',
  required = false,
  trim = false,
  maxLength,
  allowEmpty = true,
  allowNull = false,
}) {
  return (value) => {
    if (value === undefined) {
      if (!required) {
        return undefined;
      }

      throw new RequestValidationError(
        `${fieldReference(label, location)} est obligatoire.`,
        {
          code: 'required',
          field: label,
          location,
        }
      );
    }

    const singleValue = ensureSingleValue(value, label, location);
    const normalizedNullableValue = normalizeEmptyNullableValue(singleValue, allowNull);

    if (normalizedNullableValue === null) {
      return null;
    }

    if (typeof normalizedNullableValue !== 'string') {
      throw new RequestValidationError(
        `${fieldReference(label, location)} doit être une chaîne de caractères.`,
        {
          code: 'invalid_type',
          field: label,
          location,
        }
      );
    }

    const normalizedValue = trim ? normalizedNullableValue.trim() : normalizedNullableValue;

    if (!allowEmpty && normalizedValue === '') {
      throw new RequestValidationError(
        `${fieldReference(label, location)} ne peut pas être vide.`,
        {
          code: 'empty_string',
          field: label,
          location,
        }
      );
    }

    if (maxLength && normalizedValue.length > maxLength) {
      throw new RequestValidationError(
        `${fieldReference(label, location)} ne doit pas dépasser ${maxLength} caractères.`,
        {
          code: 'too_long',
          field: label,
          location,
        }
      );
    }

    return normalizedValue;
  };
}

export function enumField({
  label,
  values,
  location = 'body',
  required = false,
}) {
  const readString = stringField({
    label,
    location,
    required,
    trim: true,
    allowEmpty: false,
  });

  return (value) => {
    const normalizedValue = readString(value);
    if (normalizedValue === undefined) {
      return undefined;
    }

    if (!values.includes(normalizedValue)) {
      throw new RequestValidationError(
        `${label.charAt(0).toUpperCase() + label.slice(1)} invalide. Valeurs acceptées : ${values.join(', ')}`,
        {
          code: 'invalid_enum',
          field: label,
          location,
        }
      );
    }

    return normalizedValue;
  };
}

export function bodyPositiveIntegerField({
  label,
  required = false,
  min = 1,
}) {
  return (value) => {
    if (value === undefined) {
      if (!required) {
        return undefined;
      }

      throw new RequestValidationError(`Le champ ${label} est obligatoire.`, {
        code: 'required',
        field: label,
        location: 'body',
      });
    }

    if (typeof value !== 'number' || !Number.isInteger(value) || value < min) {
      throw new RequestValidationError(
        `Le champ ${label} doit être un nombre entier supérieur ou égal à ${min}.`,
        {
          code: 'invalid_integer',
          field: label,
          location: 'body',
        }
      );
    }

    return value;
  };
}

export function positiveIntegerStringField({
  label,
  location = 'params',
  required = true,
  min = 1,
}) {
  const readValue = stringField({
    label,
    location,
    required,
    trim: true,
    allowEmpty: false,
  });

  return (value) => {
    const normalizedValue = readValue(value);
    if (normalizedValue === undefined) {
      return undefined;
    }

    const parsed = parsePositiveInteger(normalizedValue);
    if (!parsed || parsed < min) {
      throw new RequestValidationError(
        `${fieldReference(label, location)} doit être un entier supérieur ou égal à ${min}.`,
        {
          code: 'invalid_integer',
          field: label,
          location,
        }
      );
    }

    return parsed;
  };
}

export function booleanField({
  label,
  required = false,
}) {
  return (value) => {
    if (value === undefined) {
      if (!required) {
        return undefined;
      }

      throw new RequestValidationError(`Le champ ${label} est obligatoire.`, {
        code: 'required',
        field: label,
        location: 'body',
      });
    }

    if (typeof value !== 'boolean') {
      throw new RequestValidationError(
        `Le champ ${label} doit être un booléen.`,
        {
          code: 'invalid_boolean',
          field: label,
          location: 'body',
        }
      );
    }

    return value;
  };
}

export function isoDateField({
  label,
  location = 'body',
  required = false,
  allowNull = false,
}) {
  return (value) => {
    if (value === undefined) {
      if (!required) {
        return undefined;
      }

      throw new RequestValidationError(`${fieldReference(label, location)} est obligatoire.`, {
        code: 'required',
        field: label,
        location,
      });
    }

    const singleValue = ensureSingleValue(value, label, location);
    const normalizedNullableValue = normalizeEmptyNullableValue(singleValue, allowNull);

    if (normalizedNullableValue === null) {
      return null;
    }

    if (typeof normalizedNullableValue !== 'string' || !isValidIsoDateString(normalizedNullableValue)) {
      throw new RequestValidationError(
        `Date invalide pour ${label}. Utilisez YYYY-MM-DD.`,
        {
          code: 'invalid_date',
          field: label,
          location,
        }
      );
    }

    return normalizedNullableValue;
  };
}

export function stringArrayField({
  label,
  required = false,
  maxItems,
  itemMaxLength,
}) {
  return (value) => {
    if (value === undefined) {
      if (!required) {
        return undefined;
      }

      throw new RequestValidationError(`Le champ ${label} est obligatoire.`, {
        code: 'required',
        field: label,
        location: 'body',
      });
    }

    if (!Array.isArray(value)) {
      throw new RequestValidationError(
        `Le champ ${label} doit être une liste.`,
        {
          code: 'invalid_array',
          field: label,
          location: 'body',
        }
      );
    }

    const normalizedValues = value
      .map((entry, index) => {
        if (typeof entry !== 'string') {
          throw new RequestValidationError(
            `Chaque élément de ${label} doit être une chaîne de caractères.`,
            {
              code: 'invalid_array_item',
              field: `${label}[${index}]`,
              location: 'body',
            }
          );
        }

        const normalizedEntry = entry.trim();
        if (!normalizedEntry) {
          return null;
        }

        if (itemMaxLength && normalizedEntry.length > itemMaxLength) {
          throw new RequestValidationError(
            `Chaque élément de ${label} ne doit pas dépasser ${itemMaxLength} caractères.`,
            {
              code: 'array_item_too_long',
              field: label,
              location: 'body',
            }
          );
        }

        return normalizedEntry;
      })
      .filter(Boolean);

    if (maxItems && normalizedValues.length > maxItems) {
      throw new RequestValidationError(
        `Le champ ${label} ne doit pas contenir plus de ${maxItems} éléments.`,
        {
          code: 'too_many_items',
          field: label,
          location: 'body',
        }
      );
    }

    return normalizedValues;
  };
}

export function validateDateRangeOrThrow(dateFrom, dateTo, location = 'query') {
  const validationError = validateDateRange(dateFrom, dateTo);
  if (!validationError) {
    return;
  }

  throw new RequestValidationError(validationError, {
    code: 'invalid_date_range',
    field: 'date_range',
    location,
  });
}
