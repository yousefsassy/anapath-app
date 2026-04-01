import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import examRoutes from './examRoutes.js';
import reportRoutes from './reportRoutes.js';
import reportTemplateRoutes from './reportTemplateRoutes.js';
import caseArchiveRoutes from './caseArchiveRoutes.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { attachDbPolicyContext } from '../middlewares/dbPolicyContext.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

router.use(requireAuth);
router.use(attachDbPolicyContext);
router.use('/patients', patientRoutes);
router.use('/exams', examRoutes);
router.use('/reports', reportRoutes);
router.use('/report-templates', reportTemplateRoutes);
router.use('/case-archive', caseArchiveRoutes);

export default router;
