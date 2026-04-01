import { Router } from 'express';
import {
  getTemplates,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from '../controllers/reportTemplateController.js';
import {
  validateCreateTemplateRequest,
  validateTemplateDeleteRequest,
  validateTemplateUpdateRequest,
} from '../middlewares/validateRequest.js';

const router = Router();

router.get('/', getTemplates);
router.post('/', validateCreateTemplateRequest, createTemplateHandler);
router.put('/:id', validateTemplateUpdateRequest, updateTemplateHandler);
router.delete('/:id', validateTemplateDeleteRequest, deleteTemplateHandler);

export default router;
