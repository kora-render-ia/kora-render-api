import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';

import { config } from './config/env.config';
import { swaggerSpec } from './config/swagger.config';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger } from './utils/logger.util';

import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import hotmartRoutes from './routes/hotmart.routes';

const app = express();

// Trust proxy (needed when behind nginx/load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — restrict in production
app.use(
  cors({
    origin: config.app.nodeEnv === 'production' ? ['https://korarender.com', 'https://admin.korarender.com.br'] : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-key', 'x-hotmart-signature'],
  })
);

// Compression
app.use(compression());

// Body parsing — captura rawBody durante o próprio parse (necessário para
// validar assinatura/hottok do webhook do Hotmart sem ler o stream 2x)
app.use(
  express.json({
    limit: '1mb',
    verify: (req: Request & { rawBody?: string }, _res, buf) => {
      req.rawBody = buf.toString('utf8');
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Global rate limit
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Muitas requisições. Tente novamente mais tarde.' },
});
app.use('/api/', globalLimiter);

// Strict rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Muitas tentativas de login. Aguarde 15 minutos.' },
});
app.use('/api/auth/login', authLimiter);

// Swagger docs
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customSiteTitle: 'Kora Render API' }));
app.get('/docs.json', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hotmart', hotmartRoutes);

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;