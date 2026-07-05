import pino from 'pino';
import { config } from '../config/env.config';

export const logger = pino({
  level: config.app.nodeEnv === 'production' ? 'info' : 'debug',
  transport:
    config.app.nodeEnv !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  redact: ['password', 'license_key', 'token', 'jwt'],
});
