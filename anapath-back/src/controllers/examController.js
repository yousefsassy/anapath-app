import {
  findAllExams,
  findExamById,
  createExamWithReport,
  updateExamById,
  clearResultIssuedDateForExam,
  getExamStats,
} from '../db/queries.js';
import {
  VALID_EXAM_STATUSES,
  VALID_EXAM_TYPES,
  buildRequiredFieldsMessage,
  parsePositiveInteger,
  validateDateRange,
  validateOptionalIsoDate,
} from '../utils/requestValidation.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';

const EXAM_FIELD_LABELS = {
  patient_id: 'patient',
  exam_type: "type d'examen",
};

function validateExamPayload(payload) {
  const missingFieldsMessage = buildRequiredFieldsMessage(
    ['patient_id', 'exam_type'],
    payload,
    EXAM_FIELD_LABELS
  );
  if (missingFieldsMessage) {
    return missingFieldsMessage;
  }

  if (!parsePositiveInteger(payload.patient_id)) {
    return 'Identifiant patient invalide.';
  }

  if (!VALID_EXAM_TYPES.includes(payload.exam_type)) {
    return `Type d'examen invalide. Valeurs acceptées : ${VALID_EXAM_TYPES.join(', ')}`;
  }

  if (payload.status !== undefined && !VALID_EXAM_STATUSES.includes(payload.status)) {
    return `Statut invalide. Valeurs acceptées : ${VALID_EXAM_STATUSES.join(', ')}`;
  }

  const requestedDateError = validateOptionalIsoDate(payload.requested_date, 'la date de demande');
  if (requestedDateError) {
    return requestedDateError;
  }

  const registeredDateError = validateOptionalIsoDate(
    payload.registered_date,
    "la date d'enregistrement"
  );
  if (registeredDateError) {
    return registeredDateError;
  }

  const resultIssuedDateError = validateOptionalIsoDate(
    payload.result_issued_date,
    "la date d'émission du résultat"
  );
  if (resultIssuedDateError) {
    return resultIssuedDateError;
  }

  return null;
}

export async function getStats(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const raw = await getExamStats(labId);
    return res.json({
      success: true,
      data: {
        registered_count:     parseInt(raw.registered_count, 10),
        in_progress_count:    parseInt(raw.in_progress_count, 10),
        completed_this_month: parseInt(raw.completed_this_month, 10),
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExams(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    if (req.query.status && !VALID_EXAM_STATUSES.includes(req.query.status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs acceptées : ${VALID_EXAM_STATUSES.join(', ')}`,
      });
    }
    if (req.query.exam_type && !VALID_EXAM_TYPES.includes(req.query.exam_type)) {
      return res.status(400).json({
        success: false,
        message: `Type d'examen invalide. Valeurs acceptées : ${VALID_EXAM_TYPES.join(', ')}`,
      });
    }
    const dateRangeError = validateDateRange(req.query.date_from, req.query.date_to);
    if (dateRangeError) {
      return res.status(400).json({
        success: false,
        message: dateRangeError,
      });
    }
    const filters = {
      ...(req.query.status ? { status: req.query.status } : {}),
      ...(req.query.exam_type ? { exam_type: req.query.exam_type } : {}),
      ...(req.query.search?.trim() ? { search: req.query.search.trim() } : {}),
      ...(req.query.date_from ? { date_from: req.query.date_from } : {}),
      ...(req.query.date_to ? { date_to: req.query.date_to } : {}),
      ...(req.query.keyword?.trim() ? { keyword: req.query.keyword.trim() } : {}),
    };
    const exams = await findAllExams(filters, labId);
    return res.status(200).json({ success: true, data: exams });
  } catch (error) {
    return next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const error = validateExamPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const result = await createExamWithReport({
      laboratory_id: labId,
      patient_id: Number(req.body.patient_id),
      exam_type: req.body.exam_type,
      clinic_name: req.body.clinic_name || '',
      requesting_doctor: req.body.requesting_doctor || '',
      requested_date: req.body.requested_date || null,
      registered_date: req.body.registered_date || new Date().toISOString().slice(0, 10),
      result_issued_date: req.body.result_issued_date || null,
      sample_nature: req.body.sample_nature || '',
      exam_history: req.body.exam_history || '',
      diagnosis_keywords: Array.isArray(req.body.diagnosis_keywords)
        ? req.body.diagnosis_keywords
        : [],
      status: req.body.status || 'registered',
      urgent: toBoolean(req.body.urgent),
    });

    if (result.error === 'PATIENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Patient introuvable pour ce prélèvement.',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Prélèvement créé.',
      data: result.exam,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExamById(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = parsePositiveInteger(req.params.id);
    if (!examId) {
      return res.status(400).json({ success: false, message: 'Identifiant prélèvement invalide.' });
    }

    const exam = await findExamById(examId, labId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    return res.status(200).json({ success: true, data: exam });
  } catch (error) {
    return next(error);
  }
}

const EDITABLE_FIELDS = [
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
];

// Robustly coerce a request body value to boolean.
// Accepts true, 1, 'true', '1' as true; everything else as false.
function toBoolean(value) {
  return value === true || value === 1 || value === 'true' || value === '1';
}

const READ_ONLY_FIELDS = [
  'id',
  'patient_id',
  'exam_number',
  'laboratory_id',
  'created_at',
  'updated_at',
];

export async function updateExam(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const examId = parsePositiveInteger(req.params.id);
    if (!examId) {
      return res.status(400).json({ success: false, message: 'Identifiant prélèvement invalide.' });
    }

    const exam = await findExamById(examId, labId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Prélèvement introuvable.' });
    }

    const updateKeys = Object.keys(req.body).filter((field) => req.body[field] !== undefined);

    if (
      exam.status === 'completed' &&
      !(updateKeys.length === 1 && req.body.status === 'in_progress')
    ) {
      return res.status(403).json({
        success: false,
        message: 'Ce prélèvement est déjà validé. Rouvrez le dossier avant toute correction.',
      });
    }

    const forbiddenField = READ_ONLY_FIELDS.find((field) => req.body[field] !== undefined);
    if (forbiddenField) {
      return res.status(400).json({
        success: false,
        message: `Le champ ${forbiddenField} est en lecture seule et ne peut pas être modifié.`,
      });
    }

    if (req.body.exam_type !== undefined && !VALID_EXAM_TYPES.includes(req.body.exam_type)) {
      return res.status(400).json({
        success: false,
        message: `Type d'examen invalide. Valeurs acceptées : ${VALID_EXAM_TYPES.join(', ')}`,
      });
    }

    if (req.body.status !== undefined && !VALID_EXAM_STATUSES.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs acceptées : ${VALID_EXAM_STATUSES.join(', ')}`,
      });
    }

    const requestedDateError = validateOptionalIsoDate(req.body.requested_date, 'la date de demande');
    if (requestedDateError) {
      return res.status(400).json({ success: false, message: requestedDateError });
    }

    const registeredDateError = validateOptionalIsoDate(
      req.body.registered_date,
      "la date d'enregistrement"
    );
    if (registeredDateError) {
      return res.status(400).json({ success: false, message: registeredDateError });
    }

    const resultIssuedDateError = validateOptionalIsoDate(
      req.body.result_issued_date,
      "la date d'émission du résultat"
    );
    if (resultIssuedDateError) {
      return res.status(400).json({ success: false, message: resultIssuedDateError });
    }

    const updatePayload = Object.fromEntries(
      EDITABLE_FIELDS
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]])
    );

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ modifiable fourni pour la mise à jour.',
      });
    }

    if ('urgent' in updatePayload) {
      updatePayload.urgent = toBoolean(updatePayload.urgent);
    }

    // Auto-set result_issued_date when transitioning to completed, if not already set
    if (
      updatePayload.status === 'completed' &&
      !exam.result_issued_date &&
      !updatePayload.result_issued_date
    ) {
      updatePayload.result_issued_date = new Date().toISOString().slice(0, 10);
    }

    let updatedExam = await updateExamById(examId, labId, updatePayload);

    // On reopen: clear result_issued_date only when transitioning completed → in_progress
    if (updatePayload.status === 'in_progress' && exam.status === 'completed') {
      updatedExam = await clearResultIssuedDateForExam(examId, labId);
    }

    return res.status(200).json({
      success: true,
      message: 'Prélèvement mis à jour.',
      data: updatedExam,
    });
  } catch (error) {
    return next(error);
  }
}
