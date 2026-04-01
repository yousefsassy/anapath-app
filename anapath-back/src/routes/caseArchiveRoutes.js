import { Router } from 'express';
import {
  getCaseArchivePreview,
  getCaseArchiveSearch,
} from '../controllers/caseArchiveController.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';
import {
  SEARCH_RATE_LIMIT_MAX,
  SEARCH_RATE_LIMIT_WINDOW_MS,
} from '../config/security.js';
import {
  validateArchivePreviewRequest,
  validateArchiveSearchRequest,
} from '../middlewares/validateRequest.js';

const router = Router();
const archiveSearchRateLimiter = createRateLimiter({
  name: 'archive_search',
  max: SEARCH_RATE_LIMIT_MAX,
  windowMs: SEARCH_RATE_LIMIT_WINDOW_MS,
  message:
    "Trop de requêtes vers l'archive. Réessayez dans quelques instants.",
});

router.get('/search', archiveSearchRateLimiter, validateArchiveSearchRequest, getCaseArchiveSearch);
router.get('/:id/preview', validateArchivePreviewRequest, getCaseArchivePreview);

export default router;
