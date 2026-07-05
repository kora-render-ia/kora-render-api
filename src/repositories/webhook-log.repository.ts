import prisma from '../database/prisma.client';

export class WebhookLogRepository {
  async create(data: { event: string; payload: object; status: 'success' | 'error'; error?: string }) {
    return prisma.webhookLog.create({ data });
  }
}
