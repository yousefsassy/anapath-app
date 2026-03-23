import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import authRoutes from './authRoutes.js';
import patientRoutes from './patientRoutes.js';
import examRoutes from './examRoutes.js';
import reportRoutes from './reportRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/patients', patientRoutes);
router.use('/exams', examRoutes);
router.use('/reports', reportRoutes);

export default router;
