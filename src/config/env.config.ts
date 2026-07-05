import dotenv from 'dotenv';
dotenv.config();

export const config = {
  app: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    apiUrl: process.env.API_URL || 'http://localhost:3000',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '30d',
  },
  admin: {
    apiKey: process.env.ADMIN_API_KEY || '',
  },
  hotmart: {
    webhookSecret: process.env.HOTMART_WEBHOOK_SECRET || '',
    token: process.env.HOTMART_TOKEN || '',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  },
};
