import { Router } from 'express';
import { getExams, createExam, getExamById } from '../controllers/examController.js';

const router = Router();

router.get('/', getExams);
router.post('/', createExam);
router.get('/:id', getExamById);

export default router;
