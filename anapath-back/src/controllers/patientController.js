import {
  findAllPatients,
  findPatientById,
  insertPatient,
  findExamsByPatientId,
  findExamsByPatientIdWithReportSummary,
  updatePatientById,
  searchPatientsByName,
} from '../db/queries.js';
import { resolveLaboratoryId } from '../utils/requestContext.js';

const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'age',
  'sex',
  'phone',
  'general_history',
];

export async function searchPatients(req, res, next) {
  try {
    const { first_name = '', last_name = '', phone = '' } = req.validated?.query ?? req.query;
    const labId = resolveLaboratoryId(req);

    const patients = await searchPatientsByName(labId, first_name, last_name, phone);
    return res.status(200).json({ success: true, data: patients });
  } catch (error) {
    return next(error);
  }
}

export async function getPatients(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const patients = await findAllPatients(labId);
    return res.status(200).json({ success: true, data: patients });
  } catch (error) {
    return next(error);
  }
}

export async function createPatient(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const body = req.validated?.body ?? req.body;

    const newPatient = await insertPatient({
      laboratory_id: labId,
      first_name: body.first_name,
      last_name: body.last_name,
      age: body.age,
      sex: body.sex,
      phone: body.phone,
      birth_date: body.birth_date,
      general_history: body.general_history,
    });

    return res.status(201).json({
      success: true,
      message: 'Patient créé.',
      data: newPatient,
    });
  } catch (error) {
    return next(error);
  }
}

export async function getPatientById(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const patientId = req.validated?.params?.id;
    const patient = await findPatientById(patientId, labId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient introuvable.' });
    }

    return res.status(200).json({ success: true, data: patient });
  } catch (error) {
    return next(error);
  }
}

export async function getPatientExams(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const patientId = req.validated?.params?.id;
    const patient = await findPatientById(patientId, labId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient introuvable.' });
    }

    const includeReportSummary = req.validated?.query?.include === 'report_summary';
    const patientExams = includeReportSummary
      ? await findExamsByPatientIdWithReportSummary(patientId, labId)
      : await findExamsByPatientId(patientId, labId);

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

export async function updatePatient(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const patientId = req.validated?.params?.id;
    const body = req.validated?.body ?? req.body;

    const patient = await findPatientById(patientId, labId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient introuvable.' });
    }

    const updatePayload = Object.fromEntries(
      EDITABLE_FIELDS
        .filter((field) => body[field] !== undefined)
        .map((field) => [field, body[field]])
    );

    const updatedPatient = await updatePatientById(patientId, labId, updatePayload);

    return res.status(200).json({
      success: true,
      message: 'Patient mis à jour.',
      data: updatedPatient,
    });
  } catch (error) {
    return next(error);
  }
}
