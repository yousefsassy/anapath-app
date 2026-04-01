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
import {
  buildRequiredFieldsMessage,
  parsePositiveInteger,
  validateOptionalIsoDate,
} from '../utils/requestValidation.js';

const PATIENT_FIELD_LABELS = {
  first_name: 'prénom',
  last_name: 'nom',
  age: 'âge',
  sex: 'sexe',
  birth_date: 'date de naissance',
};

function validatePatientPayload(payload) {
  const requiredFields = ['first_name', 'last_name', 'age', 'sex', 'birth_date'];
  const missingFieldsMessage = buildRequiredFieldsMessage(
    requiredFields,
    payload,
    PATIENT_FIELD_LABELS
  );

  if (missingFieldsMessage) {
    return missingFieldsMessage;
  }

  if (!Number.isInteger(Number(payload.age)) || Number(payload.age) <= 0) {
    return "L'âge doit être un nombre entier supérieur à 0.";
  }

  if (!['M', 'F'].includes(String(payload.sex).toUpperCase())) {
    return 'Le sexe est invalide. Valeurs acceptées : M ou F.';
  }

  const birthDateError = validateOptionalIsoDate(payload.birth_date, 'la date de naissance');
  if (birthDateError) {
    return birthDateError;
  }

  return null;
}

export async function searchPatients(req, res, next) {
  try {
    const { first_name = '', last_name = '', phone = '' } = req.query;
    const labId = resolveLaboratoryId(req);

    if (!first_name.trim() && !last_name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Au moins un champ de recherche est requis.',
      });
    }

    const patients = await searchPatientsByName(labId, first_name.trim(), last_name.trim(), phone);
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
    const error = validatePatientPayload(req.body);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const newPatient = await insertPatient({
      laboratory_id: labId,
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
    const patientId = parsePositiveInteger(req.params.id);
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Identifiant patient invalide.' });
    }

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
    const patientId = parsePositiveInteger(req.params.id);
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Identifiant patient invalide.' });
    }

    const patient = await findPatientById(patientId, labId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient introuvable.' });
    }

    const includeReportSummary = req.query.include === 'report_summary';
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

const EDITABLE_FIELDS = [
  'first_name',
  'last_name',
  'age',
  'sex',
  'phone',
  'general_history',
];

const READ_ONLY_FIELDS = [
  'id',
  'laboratory_id',
  'birth_date',
  'created_at',
  'updated_at',
];

export async function updatePatient(req, res, next) {
  try {
    const labId = resolveLaboratoryId(req);
    const patientId = parsePositiveInteger(req.params.id);
    if (!patientId) {
      return res.status(400).json({ success: false, message: 'Identifiant patient invalide.' });
    }

    const patient = await findPatientById(patientId, labId);

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient introuvable.' });
    }

    const forbiddenField = READ_ONLY_FIELDS.find((field) => req.body[field] !== undefined);
    if (forbiddenField) {
      return res.status(400).json({
        success: false,
        message: `Le champ ${forbiddenField} est en lecture seule et ne peut pas être modifié.`,
      });
    }

    if (
      req.body.age !== undefined &&
      (!Number.isInteger(Number(req.body.age)) || Number(req.body.age) <= 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "L'âge doit être un nombre entier supérieur à 0.",
      });
    }

    if (req.body.sex !== undefined && !['M', 'F'].includes(String(req.body.sex).toUpperCase())) {
      return res.status(400).json({
        success: false,
        message: 'Le sexe est invalide. Valeurs acceptées : M ou F.',
      });
    }

    const updatePayload = Object.fromEntries(
      EDITABLE_FIELDS
        .filter((field) => req.body[field] !== undefined)
        .map((field) => [field, field === 'sex' ? String(req.body[field]).toUpperCase() : req.body[field]])
    );

    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Aucun champ modifiable fourni pour la mise à jour.',
      });
    }

    if (updatePayload.age !== undefined) {
      updatePayload.age = Number(updatePayload.age);
    }

    const updatedPatient = await updatePatientById(patientId, updatePayload);

    return res.status(200).json({
      success: true,
      message: 'Patient mis à jour.',
      data: updatedPatient,
    });
  } catch (error) {
    return next(error);
  }
}
