import { Router } from 'express';
import { getExams, getStats, createExam, getExamById, updateExam } from '../controllers/examController.js';

const router = Router();

router.get('/stats', getStats);
router.get('/', getExams);
router.post('/', createExam);
router.get('/:id', getExamById);
router.put('/:id', updateExam);

export default router;
