import { Router } from 'express';
import { getReportByExamId, updateReportByExamId } from '../controllers/reportController.js';
import {
  validateReportReadRequest,
  validateReportUpdateRequest,
} from '../middlewares/validateRequest.js';

const router = Router();

router.get('/:examId', validateReportReadRequest, getReportByExamId);
router.put('/:examId', validateReportUpdateRequest, updateReportByExamId);

export default router;
