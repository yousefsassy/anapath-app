import { Router } from 'express';
import {
  getPatients,
  createPatient,
  getPatientById,
  getPatientExams,
  updatePatient,
} from '../controllers/patientController.js';

const router = Router();

router.get('/', getPatients);
router.post('/', createPatient);
router.get('/:id/exams', getPatientExams);
router.get('/:id', getPatientById);
router.put('/:id', updatePatient);

export default router;
