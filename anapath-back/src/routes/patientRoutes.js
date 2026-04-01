import { Router } from 'express';
import {
  getPatients,
  createPatient,
  searchPatients,
  getPatientById,
  getPatientExams,
  updatePatient,
} from '../controllers/patientController.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';
import {
  SEARCH_RATE_LIMIT_MAX,
  SEARCH_RATE_LIMIT_WINDOW_MS,
} from '../config/security.js';
import {
  validateCreatePatientRequest,
  validatePatientExamsRequest,
  validatePatientIdRequest,
  validatePatientSearchRequest,
  validateUpdatePatientRequest,
} from '../middlewares/validateRequest.js';

const router = Router();
const searchRateLimiter = createRateLimiter({
  name: 'patient_search',
  max: SEARCH_RATE_LIMIT_MAX,
  windowMs: SEARCH_RATE_LIMIT_WINDOW_MS,
  message: 'Trop de requêtes de recherche. Réessayez dans quelques instants.',
});

router.get('/', getPatients);
router.post('/', validateCreatePatientRequest, createPatient);
router.get('/search', searchRateLimiter, validatePatientSearchRequest, searchPatients);   // must be before /:id
router.get('/:id/exams', validatePatientExamsRequest, getPatientExams);
router.get('/:id', validatePatientIdRequest, getPatientById);
router.put('/:id', validateUpdatePatientRequest, updatePatient);

export default router;
