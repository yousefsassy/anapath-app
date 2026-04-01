import { getRequestLogger } from '../utils/logger.js';
import {
  RequestValidationError,
  VALID_EXAM_STATUSES,
  VALID_EXAM_TYPES,
  VALID_PATIENT_SEXES,
  VALIDATION_LIMITS,
  bodyPositiveIntegerField,
  booleanField,
  enumField,
  ensurePlainObject,
  isoDateField,
  positiveIntegerStringField,
  stringArrayField,
  stringField,
  validateDateRangeOrThrow,
  validateUnknownKeys,
} from '../utils/requestValidation.js';

const VALID_INCLUDE_OPTIONS = ['report_summary'];
const VALID_ARCHIVE_SECTIONS = ['all', 'clinical_info', 'macroscopy', 'microscopy', 'conclusion'];

function validateRequest(validationFn) {
  return (req, res, next) => {
    try {
      const validated = validationFn(req);
      req.validated = {
        ...(req.validated || {}),
        ...validated,
      };
      return next();
    } catch (error) {
      if (error instanceof RequestValidationError) {
        const log = getRequestLogger(req);
        log.warn('request_validation_failed', {
          code: error.details?.code || 'invalid_request',
          field: error.details?.field || null,
          location: error.details?.location || null,
        });

        return res.status(400).json({
          success: false,
          message: error.message,
        });
      }

      return next(error);
    }
  };
}

function requireBodyObject(req) {
  return ensurePlainObject(req.body, 'body');
}

function requireQueryObject(req) {
  return ensurePlainObject(req.query, 'query');
}

function requireParamsObject(req) {
  return ensurePlainObject(req.params, 'params');
}

function validateLoginBody(body) {
  validateUnknownKeys(body, ['email', 'password']);

  return {
    email: stringField({
      label: 'adresse e-mail',
      required: true,
      trim: true,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.email,
    })(body.email)?.toLowerCase(),
    password: stringField({
      label: 'mot de passe',
      required: true,
      trim: false,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.password,
    })(body.password),
  };
}

function validatePatientSearchQuery(query) {
  validateUnknownKeys(query, ['first_name', 'last_name', 'phone'], {
    location: 'query',
  });

  const validated = {
    first_name: stringField({
      label: 'first_name',
      location: 'query',
      trim: true,
      maxLength: VALIDATION_LIMITS.patient_name,
    })(query.first_name) || '',
    last_name: stringField({
      label: 'last_name',
      location: 'query',
      trim: true,
      maxLength: VALIDATION_LIMITS.patient_name,
    })(query.last_name) || '',
    phone: stringField({
      label: 'phone',
      location: 'query',
      trim: true,
      maxLength: VALIDATION_LIMITS.phone,
    })(query.phone) || '',
  };

  if (!validated.first_name && !validated.last_name) {
    throw new RequestValidationError('Au moins un champ de recherche est requis.', {
      code: 'missing_search_term',
      field: 'first_name,last_name',
      location: 'query',
    });
  }

  return validated;
}

function validateCreatePatientBody(body) {
  validateUnknownKeys(body, [
    'first_name',
    'last_name',
    'age',
    'sex',
    'phone',
    'birth_date',
    'general_history',
  ]);

  return {
    first_name: stringField({
      label: 'prénom',
      required: true,
      trim: true,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.patient_name,
    })(body.first_name),
    last_name: stringField({
      label: 'nom',
      required: true,
      trim: true,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.patient_name,
    })(body.last_name),
    age: bodyPositiveIntegerField({
      label: 'âge',
      required: true,
      min: 1,
    })(body.age),
    sex: enumField({
      label: 'sexe',
      values: VALID_PATIENT_SEXES,
      required: true,
    })(body.sex === undefined ? undefined : String(body.sex).toUpperCase()),
    phone: stringField({
      label: 'téléphone',
      trim: true,
      maxLength: VALIDATION_LIMITS.phone,
    })(body.phone) || '',
    birth_date: isoDateField({
      label: 'la date de naissance',
      required: true,
    })(body.birth_date),
    general_history: stringField({
      label: 'antécédents',
      trim: false,
      maxLength: VALIDATION_LIMITS.patient_general_history,
    })(body.general_history) || '',
  };
}

function validatePatientIdParams(params) {
  return {
    id: positiveIntegerStringField({
      label: 'identifiant patient',
      location: 'params',
    })(params.id),
  };
}

function validatePatientExamsQuery(query) {
  validateUnknownKeys(query, ['include'], {
    location: 'query',
  });

  const include = enumField({
    label: 'include',
    values: VALID_INCLUDE_OPTIONS,
    location: 'query',
    required: false,
  })(query.include);

  return { include };
}

function validateUpdatePatientBody(body) {
  validateUnknownKeys(body, [
    'first_name',
    'last_name',
    'age',
    'sex',
    'phone',
    'general_history',
  ], {
    forbiddenKeys: ['id', 'laboratory_id', 'birth_date', 'created_at', 'updated_at'],
  });

  const validated = {
    first_name: stringField({
      label: 'prénom',
      trim: true,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.patient_name,
    })(body.first_name),
    last_name: stringField({
      label: 'nom',
      trim: true,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.patient_name,
    })(body.last_name),
    age: body.age === undefined
      ? undefined
      : bodyPositiveIntegerField({
        label: 'âge',
        min: 1,
      })(body.age),
    sex: body.sex === undefined
      ? undefined
      : enumField({
        label: 'sexe',
        values: VALID_PATIENT_SEXES,
      })(String(body.sex).toUpperCase()),
    phone: stringField({
      label: 'téléphone',
      trim: true,
      maxLength: VALIDATION_LIMITS.phone,
    })(body.phone),
    general_history: stringField({
      label: 'antécédents',
      trim: false,
      maxLength: VALIDATION_LIMITS.patient_general_history,
    })(body.general_history),
  };

  if (Object.values(validated).every((value) => value === undefined)) {
    throw new RequestValidationError(
      'Aucun champ modifiable fourni pour la mise à jour.',
      {
        code: 'empty_update',
        field: 'body',
        location: 'body',
      }
    );
  }

  return validated;
}

function validateExamListQuery(query) {
  validateUnknownKeys(query, ['status', 'exam_type', 'search', 'date_from', 'date_to', 'keyword'], {
    location: 'query',
  });

  const validated = {
    status: enumField({
      label: 'statut',
      values: VALID_EXAM_STATUSES,
      location: 'query',
    })(query.status),
    exam_type: enumField({
      label: "type d'examen",
      values: VALID_EXAM_TYPES,
      location: 'query',
    })(query.exam_type),
    search: stringField({
      label: 'recherche',
      location: 'query',
      trim: true,
      maxLength: VALIDATION_LIMITS.free_text_search,
    })(query.search),
    date_from: isoDateField({
      label: 'la date de début',
      location: 'query',
      allowNull: false,
    })(query.date_from),
    date_to: isoDateField({
      label: 'la date de fin',
      location: 'query',
      allowNull: false,
    })(query.date_to),
    keyword: stringField({
      label: 'mot-clé diagnostique',
      location: 'query',
      trim: true,
      maxLength: VALIDATION_LIMITS.free_text_search,
    })(query.keyword),
  };

  validateDateRangeOrThrow(validated.date_from, validated.date_to, 'query');
  return validated;
}

function validateExamBody(body, { requirePatientId }) {
  validateUnknownKeys(body, [
    'patient_id',
    'exam_type',
    'clinic_name',
    'requesting_doctor',
    'requested_date',
    'registered_date',
    'result_issued_date',
    'sample_nature',
    'exam_history',
    'diagnosis_keywords',
    'status',
    'urgent',
  ], {
    forbiddenKeys: ['id', 'exam_number', 'laboratory_id', 'created_at', 'updated_at'],
  });

  const validated = {
    patient_id: requirePatientId
      ? bodyPositiveIntegerField({
        label: 'identifiant patient',
        required: true,
        min: 1,
      })(body.patient_id)
      : undefined,
    exam_type: enumField({
      label: "type d'examen",
      values: VALID_EXAM_TYPES,
      required: requirePatientId,
    })(body.exam_type),
    clinic_name: stringField({
      label: 'clinique',
      trim: true,
      maxLength: VALIDATION_LIMITS.fixed_exam_field,
    })(body.clinic_name),
    requesting_doctor: stringField({
      label: 'médecin demandeur',
      trim: true,
      maxLength: VALIDATION_LIMITS.fixed_exam_field,
    })(body.requesting_doctor),
    requested_date: isoDateField({
      label: 'la date de demande',
      allowNull: true,
    })(body.requested_date),
    registered_date: isoDateField({
      label: "la date d'enregistrement",
      allowNull: true,
    })(body.registered_date),
    result_issued_date: isoDateField({
      label: "la date d'émission du résultat",
      allowNull: true,
    })(body.result_issued_date),
    sample_nature: stringField({
      label: 'nature du prélèvement',
      trim: true,
      maxLength: VALIDATION_LIMITS.fixed_exam_field,
    })(body.sample_nature),
    exam_history: stringField({
      label: 'renseignement clinique',
      trim: false,
      maxLength: VALIDATION_LIMITS.exam_history,
    })(body.exam_history),
    diagnosis_keywords: stringArrayField({
      label: 'mots-clés diagnostiques',
      maxItems: VALIDATION_LIMITS.diagnosis_keywords_count,
      itemMaxLength: VALIDATION_LIMITS.diagnosis_keyword_length,
    })(body.diagnosis_keywords),
    status: enumField({
      label: 'statut',
      values: VALID_EXAM_STATUSES,
    })(body.status),
    urgent: booleanField({
      label: 'urgent',
    })(body.urgent),
  };

  if (!requirePatientId && Object.values(validated).every((value) => value === undefined)) {
    throw new RequestValidationError(
      'Aucun champ modifiable fourni pour la mise à jour.',
      {
        code: 'empty_update',
        field: 'body',
        location: 'body',
      }
    );
  }

  return validated;
}

function validateReportBody(body) {
  validateUnknownKeys(body, ['clinical_info', 'macroscopy', 'microscopy', 'conclusion']);

  const validated = {
    clinical_info: stringField({
      label: 'renseignement clinique',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.clinical_info),
    macroscopy: stringField({
      label: 'macroscopie',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.macroscopy),
    microscopy: stringField({
      label: 'microscopie',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.microscopy),
    conclusion: stringField({
      label: 'conclusion',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.conclusion),
  };

  if (Object.values(validated).every((value) => value === undefined)) {
    throw new RequestValidationError(
      'Aucun champ de compte rendu fourni pour la mise à jour.',
      {
        code: 'empty_update',
        field: 'body',
        location: 'body',
      }
    );
  }

  return validated;
}

function validateTemplateBody(body) {
  validateUnknownKeys(body, ['name', 'clinical_info', 'macroscopy', 'microscopy', 'conclusion']);

  const validated = {
    name: stringField({
      label: 'nom du modèle',
      required: true,
      trim: true,
      allowEmpty: false,
      maxLength: VALIDATION_LIMITS.template_name,
    })(body.name),
    clinical_info: stringField({
      label: 'renseignement clinique',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.clinical_info) || '',
    macroscopy: stringField({
      label: 'macroscopie',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.macroscopy) || '',
    microscopy: stringField({
      label: 'microscopie',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.microscopy) || '',
    conclusion: stringField({
      label: 'conclusion',
      trim: false,
      maxLength: VALIDATION_LIMITS.narrative_section,
    })(body.conclusion) || '',
  };

  const hasContent = [
    validated.clinical_info,
    validated.macroscopy,
    validated.microscopy,
    validated.conclusion,
  ].some((value) => value.trim());

  if (!hasContent) {
    throw new RequestValidationError(
      'Le modèle doit contenir au moins un champ non vide.',
      {
        code: 'template_empty',
        field: 'template',
        location: 'body',
      }
    );
  }

  return validated;
}

function validateArchiveSearchQuery(query) {
  validateUnknownKeys(query, ['q', 'section', 'exam_type', 'date_from', 'date_to', 'source_exam_id', 'limit'], {
    location: 'query',
  });

  const validated = {
    q: stringField({
      label: 'texte de recherche',
      location: 'query',
      trim: true,
      maxLength: VALIDATION_LIMITS.free_text_search,
    })(query.q) || '',
    section: enumField({
      label: 'section',
      values: VALID_ARCHIVE_SECTIONS,
      location: 'query',
    })(query.section) || 'all',
    exam_type: enumField({
      label: "type d'examen",
      values: VALID_EXAM_TYPES,
      location: 'query',
    })(query.exam_type),
    date_from: isoDateField({
      label: 'la date de début',
      location: 'query',
    })(query.date_from),
    date_to: isoDateField({
      label: 'la date de fin',
      location: 'query',
    })(query.date_to),
    source_exam_id: positiveIntegerStringField({
      label: 'identifiant du prélèvement source',
      location: 'query',
      required: false,
    })(query.source_exam_id),
    limit: positiveIntegerStringField({
      label: 'limite',
      location: 'query',
      required: false,
      min: 1,
    })(query.limit),
  };

  if (validated.limit !== undefined && validated.limit > 50) {
    throw new RequestValidationError(
      'Limite invalide. Utilisez un entier compris entre 1 et 50.',
      {
        code: 'invalid_limit',
        field: 'limit',
        location: 'query',
      }
    );
  }

  validateDateRangeOrThrow(validated.date_from, validated.date_to, 'query');
  return {
    ...validated,
    limit: validated.limit ?? 20,
  };
}

export const validateLoginRequest = validateRequest((req) => ({
  body: validateLoginBody(requireBodyObject(req)),
}));

export const validatePatientSearchRequest = validateRequest((req) => ({
  query: validatePatientSearchQuery(requireQueryObject(req)),
}));

export const validateCreatePatientRequest = validateRequest((req) => ({
  body: validateCreatePatientBody(requireBodyObject(req)),
}));

export const validatePatientIdRequest = validateRequest((req) => ({
  params: validatePatientIdParams(requireParamsObject(req)),
}));

export const validatePatientExamsRequest = validateRequest((req) => ({
  params: validatePatientIdParams(requireParamsObject(req)),
  query: validatePatientExamsQuery(requireQueryObject(req)),
}));

export const validateUpdatePatientRequest = validateRequest((req) => ({
  params: validatePatientIdParams(requireParamsObject(req)),
  body: validateUpdatePatientBody(requireBodyObject(req)),
}));

export const validateExamListRequest = validateRequest((req) => ({
  query: validateExamListQuery(requireQueryObject(req)),
}));

export const validateCreateExamRequest = validateRequest((req) => ({
  body: validateExamBody(requireBodyObject(req), { requirePatientId: true }),
}));

export const validateExamIdRequest = validateRequest((req) => ({
  params: {
    id: positiveIntegerStringField({
      label: 'identifiant prélèvement',
      location: 'params',
    })(requireParamsObject(req).id),
  },
}));

export const validateUpdateExamRequest = validateRequest((req) => ({
  params: {
    id: positiveIntegerStringField({
      label: 'identifiant prélèvement',
      location: 'params',
    })(requireParamsObject(req).id),
  },
  body: validateExamBody(requireBodyObject(req), { requirePatientId: false }),
}));

export const validateReportReadRequest = validateRequest((req) => ({
  params: {
    examId: positiveIntegerStringField({
      label: 'identifiant prélèvement',
      location: 'params',
    })(requireParamsObject(req).examId),
  },
}));

export const validateReportUpdateRequest = validateRequest((req) => ({
  params: {
    examId: positiveIntegerStringField({
      label: 'identifiant prélèvement',
      location: 'params',
    })(requireParamsObject(req).examId),
  },
  body: validateReportBody(requireBodyObject(req)),
}));

export const validateTemplateReadRequest = validateRequest((req) => ({
  query: {},
}));

export const validateCreateTemplateRequest = validateRequest((req) => ({
  body: validateTemplateBody(requireBodyObject(req)),
}));

export const validateTemplateUpdateRequest = validateRequest((req) => ({
  params: {
    id: positiveIntegerStringField({
      label: 'identifiant du modèle',
      location: 'params',
    })(requireParamsObject(req).id),
  },
  body: validateTemplateBody(requireBodyObject(req)),
}));

export const validateTemplateDeleteRequest = validateRequest((req) => ({
  params: {
    id: positiveIntegerStringField({
      label: 'identifiant du modèle',
      location: 'params',
    })(requireParamsObject(req).id),
  },
}));

export const validateArchiveSearchRequest = validateRequest((req) => ({
  query: validateArchiveSearchQuery(requireQueryObject(req)),
}));

export const validateArchivePreviewRequest = validateRequest((req) => ({
  params: {
    id: positiveIntegerStringField({
      label: 'identifiant du cas archive',
      location: 'params',
    })(requireParamsObject(req).id),
  },
}));
