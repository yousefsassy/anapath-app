import { Router } from 'express';
import {
  getSession,
  login,
  logout,
} from '../controllers/authController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { createRateLimiter } from '../middlewares/rateLimit.js';
import {
  LOGIN_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
} from '../config/security.js';
import { validateLoginRequest } from '../middlewares/validateRequest.js';

const router = Router();

const loginRateLimiter = createRateLimiter({
  name: 'login',
  max: LOGIN_RATE_LIMIT_MAX,
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  message:
    "Trop de tentatives de connexion. Réessayez dans quelques minutes.",
  keyGenerator(req) {
    const email = String(req.body?.email || '').trim().toLowerCase();
    return `${req.ip || 'unknown'}:${email || 'anonymous'}`;
  },
});

router.post('/login', loginRateLimiter, validateLoginRequest, login);
router.get('/session', requireAuth, getSession);
router.post('/logout', logout);

export default router;
