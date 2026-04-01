import { Router } from 'express';
import {
  getCaseArchivePreview,
  getCaseArchiveSearch,
} from '../controllers/caseArchiveController.js';

const router = Router();

router.get('/search', getCaseArchiveSearch);
router.get('/:id/preview', getCaseArchivePreview);

export default router;
