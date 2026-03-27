import { Router } from 'express';
import {
  getTemplates,
  createTemplateHandler,
  updateTemplateHandler,
  deleteTemplateHandler,
} from '../controllers/reportTemplateController.js';

const router = Router();

router.get('/', getTemplates);
router.post('/', createTemplateHandler);
router.put('/:id', updateTemplateHandler);
router.delete('/:id', deleteTemplateHandler);

export default router;
