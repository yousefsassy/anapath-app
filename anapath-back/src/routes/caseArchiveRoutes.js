import { Router } from 'express';
import { getCaseArchiveSearch } from '../controllers/caseArchiveController.js';

const router = Router();

router.get('/search', getCaseArchiveSearch);

export default router;
