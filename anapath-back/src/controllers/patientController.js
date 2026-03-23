import {
  findAllPatients,
  findPatientById,
  insertPatient,
  findExamsByPatientId,
} from '../db/queries.js';

function validatePatientPayload(payload) {
  const requiredFields = ['first_name', 'last_name', 'age', 'sex'];
  const missingFields = requiredFields.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');

  if (missingFields.length > 0) {
    return `Missing required fields: ${missingFields.join(', ')}`;
  }

  if (!Number.isInteger(Number(payload.age)) || Number(payload.age) < 0) {
    return 'age must be a valid positive number';
  }

  if (!['M', 'F'].includes(String(payload.sex).toUpperCase())) {
    return 'sex must be M or F';
  }

  return null;
}

export async function getPatients(req, res, next) {
  try {
    const patients = await findAllPatients();
    return res.status(200).json({ success: true, data: patients });
  } catch (error) {
    return next(error);
  }
}

export async function createPatient(req, res, next) {
  try {
    const error = validatePatientPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const newPatient = await insertPatient({
      laboratory_id: Number(req.body.laboratory_id) || 1,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      age: Number(req.body.age),
      sex: String(req.body.sex).toUpperCase(),
      phone: req.body.phone || '',
      birth_date: req.body.birth_date || null,
      general_history: req.body.general_history || '',
    });

    return res.status(201).json({
      success: true,
      message: 'Patient created successfully',
      data: newPatient,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPatientById(req, res, next) {
  try {
    const patientId = Number(req.params.id);
    const patient = await findPatientById(patientId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    return res.status(200).json({ success: true, data: patient });
  } catch (error) {
    return next(error);
  }
}

export async function getPatientExams(req, res, next) {
  try {
    const patientId = Number(req.params.id);
    const patient = await findPatientById(patientId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    const patientExams = await findExamsByPatientId(patientId);

    return res.status(200).json({
      success: true,
      data: {
        patient,
        exams: patientExams,
        count: patientExams.length,
      },
    });
  } catch (error) {
    return next(error);
  }
}
