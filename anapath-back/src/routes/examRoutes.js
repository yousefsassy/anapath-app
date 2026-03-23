import { Router } from 'express';
import { getExams, createExam, getExamById, updateExam } from '../controllers/examController.js';

const router = Router();

router.get('/', getExams);
router.post('/', createExam);
router.get('/:id', getExamById);
router.put('/:id', updateExam);

export default router;
