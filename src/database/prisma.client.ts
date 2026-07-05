import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.util';

const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prisma.$on('query', (e: any) => {
    logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query');
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
prisma.$on('error', (e: any) => {
  logger.error({ message: e.message }, 'Prisma Error');
});

export default prisma;
