jest.mock('../database/prisma.client', () => ({
  license: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
  },
  device: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  webhookLog: { create: jest.fn() },
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $on: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-32c';

describe('HotmartService', () => {
  const prisma = require('../database/prisma.client');
  let hotmartService: InstanceType<typeof import('../services/hotmart.service').HotmartService>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { HotmartService } = require('../services/hotmart.service');
    hotmartService = new HotmartService();
  });

  const buyerData = {
    buyer: { email: 'customer@example.com', name: 'Test Customer' },
    purchase: { transaction: 'TXN-12345', approved_date: new Date().toISOString() },
    product: { id: 1, name: 'Kora Render PRO' },
  };

  test('creates license on PURCHASE_APPROVED', async () => {
    prisma.license.findFirst.mockResolvedValue(null); // No existing license
    prisma.license.findUnique.mockResolvedValue(null);
    prisma.license.count.mockResolvedValue(0);
    prisma.license.create.mockResolvedValue({ id: 1, email: 'customer@example.com', plan: 'PRO' });
    prisma.webhookLog.create.mockResolvedValue({});

    const payload = { event: 'PURCHASE_APPROVED', data: buyerData };
    await hotmartService.processWebhook(payload, JSON.stringify(payload));

    expect(prisma.license.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: 'customer@example.com',
          plan: 'PRO',
          hotmart_id: 'TXN-12345',
        }),
      })
    );
  });

  test('blocks license on PURCHASE_REFUNDED', async () => {
    const existingLicense = { id: 5, email: 'customer@example.com', status: 'ACTIVE' };
    prisma.license.findFirst.mockResolvedValue(existingLicense);
    prisma.license.update.mockResolvedValue({ ...existingLicense, status: 'REFUNDED' });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.webhookLog.create.mockResolvedValue({});

    const payload = { event: 'PURCHASE_REFUNDED', data: buyerData };
    await hotmartService.processWebhook(payload, JSON.stringify(payload));

    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'REFUNDED' } })
    );
    expect(prisma.session.updateMany).toHaveBeenCalled();
  });

  test('cancels license on PURCHASE_CANCELED', async () => {
    const existingLicense = { id: 5, email: 'customer@example.com', status: 'ACTIVE' };
    prisma.license.findFirst.mockResolvedValue(existingLicense);
    prisma.license.update.mockResolvedValue({ ...existingLicense, status: 'CANCELED' });
    prisma.session.updateMany.mockResolvedValue({ count: 1 });
    prisma.webhookLog.create.mockResolvedValue({});

    const payload = { event: 'PURCHASE_CANCELED', data: buyerData };
    await hotmartService.processWebhook(payload, JSON.stringify(payload));

    expect(prisma.license.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'CANCELED' } })
    );
  });

  test('skips duplicate purchase (idempotency)', async () => {
    prisma.license.findFirst.mockResolvedValue({ id: 1, hotmart_id: 'TXN-12345' });
    prisma.webhookLog.create.mockResolvedValue({});

    const payload = { event: 'PURCHASE_APPROVED', data: buyerData };
    await hotmartService.processWebhook(payload, JSON.stringify(payload));

    expect(prisma.license.create).not.toHaveBeenCalled();
  });

  test('logs webhook on success', async () => {
    prisma.license.findFirst.mockResolvedValue(null);
    prisma.license.findUnique.mockResolvedValue(null);
    prisma.license.count.mockResolvedValue(0);
    prisma.license.create.mockResolvedValue({ id: 1 });
    prisma.webhookLog.create.mockResolvedValue({});

    const payload = { event: 'PURCHASE_APPROVED', data: buyerData };
    await hotmartService.processWebhook(payload, JSON.stringify(payload));

    expect(prisma.webhookLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'success', event: 'PURCHASE_APPROVED' }) })
    );
  });
});
