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
    deleteMany: jest.fn(),
  },
  session: {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  webhookLog: { create: jest.fn() },
  $on: jest.fn(),
}));

process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-32c';

describe('LicenseService', () => {
  const prisma = require('../database/prisma.client');
  let licenseService: InstanceType<typeof import('../services/license.service').LicenseService>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { LicenseService } = require('../services/license.service');
    licenseService = new LicenseService();
  });

  test('creates license with unique key', async () => {
    prisma.license.findUnique.mockResolvedValue(null); // Key is unique
    prisma.license.create.mockResolvedValue({
      id: 1,
      email: 'test@example.com',
      name: 'Test',
      plan: 'PRO',
      license_key: 'KR-ABCD-EFGH-IJKL',
    });

    const result = await licenseService.createLicense({
      email: 'test@example.com',
      name: 'Test',
      plan: 'PRO',
      expires_at: '2027-12-31',
    });

    expect(result.email).toBe('test@example.com');
    expect(prisma.license.create).toHaveBeenCalledTimes(1);
  });

  test('blocks license and invalidates sessions', async () => {
    const license = { id: 1, status: 'ACTIVE' };
    prisma.license.findUnique.mockResolvedValue(license);
    prisma.session.updateMany.mockResolvedValue({ count: 2 });
    prisma.license.update.mockResolvedValue({ ...license, status: 'BLOCKED' });

    await licenseService.blockLicense(1);

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { license_id: 1 },
      data: { is_valid: false },
    });
    expect(prisma.license.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'BLOCKED' },
    });
  });

  test('unblocks license', async () => {
    prisma.license.findUnique.mockResolvedValue({ id: 1, status: 'BLOCKED' });
    prisma.license.update.mockResolvedValue({ id: 1, status: 'ACTIVE' });

    await licenseService.unblockLicense(1);

    expect(prisma.license.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'ACTIVE' },
    });
  });

  test('throws 404 when license not found', async () => {
    prisma.license.findUnique.mockResolvedValue(null);

    await expect(licenseService.getLicenseById(999)).rejects.toMatchObject({
      status: 404,
      message: 'Licença não encontrada.',
    });
  });

  test('removes device from license', async () => {
    prisma.license.findUnique.mockResolvedValue({ id: 1 });
    prisma.device.deleteMany.mockResolvedValue({ count: 1 });

    await licenseService.removeDevice(1, 5);

    expect(prisma.device.deleteMany).toHaveBeenCalledWith({
      where: { id: 5, license_id: 1 },
    });
  });

  test('throws 404 when device not found for removal', async () => {
    prisma.license.findUnique.mockResolvedValue({ id: 1 });
    prisma.device.deleteMany.mockResolvedValue({ count: 0 });

    await expect(licenseService.removeDevice(1, 999)).rejects.toMatchObject({
      status: 404,
      message: 'Dispositivo não encontrado.',
    });
  });

  test('paginates license list correctly', async () => {
    prisma.license.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    prisma.license.count.mockResolvedValue(50);

    const result = await licenseService.listLicenses({ page: 2, limit: 10 });

    expect(result.page).toBe(2);
    expect(result.limit).toBe(10);
    expect(result.total).toBe(50);
    expect(result.pages).toBe(5);
  });
});
