import {
  findAllExams,
  findExamById,
  createExamWithReport,
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

export async function getExams(req, res, next) {
  try {
    const exams = await findAllExams();
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
