import { Router } from 'express';
import { getExams, getStats, createExam, getExamById, updateExam } from '../controllers/examController.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';
import {
  SEARCH_RATE_LIMIT_MAX,
  SEARCH_RATE_LIMIT_WINDOW_MS,
} from '../config/security.js';
import {
  validateCreateExamRequest,
  validateExamIdRequest,
  validateExamListRequest,
  validateUpdateExamRequest,
} from '../middlewares/validateRequest.js';

const router = Router();
const examListRateLimiter = createRateLimiter({
  name: 'exam_list',
  max: SEARCH_RATE_LIMIT_MAX,
  windowMs: SEARCH_RATE_LIMIT_WINDOW_MS,
  message: 'Trop de requêtes de consultation. Réessayez dans quelques instants.',
});

router.get('/stats', getStats);
router.get('/', examListRateLimiter, validateExamListRequest, getExams);
router.post('/', validateCreateExamRequest, createExam);
router.get('/:id', validateExamIdRequest, getExamById);
router.put('/:id', validateUpdateExamRequest, updateExam);

export default router;
