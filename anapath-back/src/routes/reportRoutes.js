import { Router } from 'express';
import {
  getReportByExamId,
  getReportRevisionById,
  getReportRevisionsByExamId,
  restoreReportRevisionById,
  updateReportByExamId,
} from '../controllers/reportController.js';
import {
  validateReportReadRequest,
  validateReportRevisionDetailRequest,
  validateReportRevisionListRequest,
  validateReportRevisionRestoreRequest,
  validateReportUpdateRequest,
} from '../middlewares/validateRequest.js';

const router = Router();

router.get('/:examId/revisions', validateReportRevisionListRequest, getReportRevisionsByExamId);
router.get('/:examId/revisions/:revisionId', validateReportRevisionDetailRequest, getReportRevisionById);
router.post('/:examId/revisions/:revisionId/restore', validateReportRevisionRestoreRequest, restoreReportRevisionById);
router.get('/:examId', validateReportReadRequest, getReportByExamId);
router.put('/:examId', validateReportUpdateRequest, updateReportByExamId);

export default router;
