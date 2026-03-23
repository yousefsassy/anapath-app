import { Router } from 'express';
import { getReportByExamId, updateReportByExamId } from '../controllers/reportController.js';

const router = Router();

router.get('/:examId', getReportByExamId);
router.put('/:examId', updateReportByExamId);

export default router;
