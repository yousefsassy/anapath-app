import {
  findAllExams,
  findExamById,
  createExamWithReport,
  updateExamById,
  clearResultIssuedDateForExam,
} from '../db/queries.js';

function validateExamPayload(payload) {
  const requiredFields = ['patient_id', 'exam_type'];
  const missingFields = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }

  if (!['cytology', 'histology'].includes(payload.exam_type)) {
    return 'exam_type must be cytology or histology';
  }

  return null;
}

const VALID_STATUSES = ['registered', 'in_progress', 'completed'];
const VALID_EXAM_TYPES = ['histology', 'cytology'];

export async function getExams(req, res, next) {
  try {
    if (req.query.status && !VALID_STATUSES.includes(req.query.status)) {
      return res.status(400).json({
        success: false,
        message: `Statut invalide. Valeurs acceptées : ${VALID_STATUSES.join(', ')}`,
      });
    }
    if (req.query.exam_type && !VALID_EXAM_TYPES.includes(req.query.exam_type)) {
      return res.status(400).json({
        success: false,
        message: `Type d'examen invalide. Valeurs acceptées : ${VALID_EXAM_TYPES.join(', ')}`,
      });
    }
    const filters = {
      ...(req.query.status ? { status: req.query.status } : {}),
      ...(req.query.exam_type ? { exam_type: req.query.exam_type } : {}),
      ...(req.query.search?.trim() ? { search: req.query.search.trim() } : {}),
    };
    const exams = await findAllExams(filters);
    return res.status(200).json({ success: true, data: exams });
  } catch (error) {
    return next(error);
  }
}

export async function createExam(req, res, next) {
  try {
    const error = validateExamPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const result = await createExamWithReport({
      laboratory_id: Number(req.body.laboratory_id) || 1,
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
    });

    if (result.error === 'PATIENT_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Patient not found for this exam',
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Exam created successfully',
      data: result.exam,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getExamById(req, res, next) {
  try {
    const examId = Number(req.params.id);
    const exam = await findExamById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
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
];

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
    const examId = Number(req.params.id);
    const exam = await findExamById(examId);

    if (!exam) {
      return res.status(404).json({ success: false, message: 'Exam not found' });
    }

    const forbiddenField = READ_ONLY_FIELDS.find((field) => req.body[field] !== undefined);
    if (forbiddenField) {
      return res.status(400).json({
        success: false,
        message: `${forbiddenField} is read-only and cannot be updated`,
      });
    }

    if (req.body.exam_type !== undefined && !['cytology', 'histology'].includes(req.body.exam_type)) {
      return res.status(400).json({ success: false, message: 'exam_type must be cytology or histology' });
    }

    const updatePayload = Object.fromEntries(
      EDITABLE_FIELDS
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, req.body[field]])
    );

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No editable fields provided for update',
      });
    }

    // Auto-set result_issued_date when transitioning to completed, if not already set
    if (
      updatePayload.status === 'completed' &&
      !exam.result_issued_date &&
      !updatePayload.result_issued_date
    ) {
      updatePayload.result_issued_date = new Date().toISOString().slice(0, 10);
    }

    let updatedExam = await updateExamById(examId, updatePayload);

    // On reopen: clear result_issued_date only when transitioning completed → in_progress
    if (updatePayload.status === 'in_progress' && exam.status === 'completed') {
      updatedExam = await clearResultIssuedDateForExam(examId);
    }

    return res.status(200).json({
      success: true,
      message: 'Exam updated successfully',
      data: updatedExam,
    });
  } catch (error) {
    return next(error);
  }
}
