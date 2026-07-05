import app from './app';
import { config } from './config/env.config';
import { logger } from './utils/logger.util';
import prisma from './database/prisma.client';

async function bootstrap() {
  // Test database connection
  try {
    await prisma.$connect();
    logger.info('Database connected successfully');
  } catch (err) {
    logger.error({ err }, 'Failed to connect to database');
    process.exit(1);
  }

  const server = app.listen(config.app.port, () => {
    logger.info(
      { port: config.app.port, env: config.app.nodeEnv, url: config.app.apiUrl },
      'Kora Render API started'
    );
    logger.info(`Docs available at ${config.app.apiUrl}/docs`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed gracefully');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
