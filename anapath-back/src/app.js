import express from 'express';
import cors from 'cors';
import routes from './routes/index.js';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler.js';
import { attachRequestMetadata } from './middlewares/requestMetadata.js';
import {
  CORS_ALLOWED_ORIGINS,
  TRUST_PROXY,
} from './config/security.js';
import { logger } from './utils/logger.js';

const app = express();

app.set('trust proxy', TRUST_PROXY);
app.use(attachRequestMetadata);

app.use(cors((req, callback) => {
  const origin = req.get('Origin');

  if (!origin || CORS_ALLOWED_ORIGINS.length === 0 || CORS_ALLOWED_ORIGINS.includes(origin)) {
    callback(null, {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    });
    return;
  }

  req.log.warn('cors_rejected', {
    origin,
  });

  const error = new Error('Origine non autorisée par CORS.');
  error.status = 403;
  callback(error);
}));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, private');
  next();
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Anapath backend is running',
  });
});

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

logger.info('security_runtime_config', {
  trust_proxy: TRUST_PROXY,
  cors_allowed_origins: CORS_ALLOWED_ORIGINS,
});

export default app;
