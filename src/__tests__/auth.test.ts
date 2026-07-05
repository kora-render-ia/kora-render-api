import { generateLicenseKey, isValidLicenseKeyFormat } from '../utils/license.util';
import { signToken, verifyToken } from '../utils/jwt.util';

// Mock prisma
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

// Set test JWT secret
process.env.JWT_SECRET = 'test-secret-key-for-unit-tests-32c';
process.env.JWT_EXPIRES_IN = '30d';
process.env.ADMIN_API_KEY = 'test-admin-key';

describe('License Key Utils', () => {
  test('generates license key in correct format', () => {
    const key = generateLicenseKey();
    expect(key).toMatch(/^KR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  test('generates unique keys', () => {
    const keys = new Set(Array.from({ length: 100 }, () => generateLicenseKey()));
    expect(keys.size).toBe(100);
  });

  test('validates correct key format', () => {
    expect(isValidLicenseKeyFormat('KR-ABCD-EFGH-IJKL')).toBe(true);
    expect(isValidLicenseKeyFormat('KR-1234-5678-ABCD')).toBe(true);
  });

  test('rejects invalid key formats', () => {
    expect(isValidLicenseKeyFormat('KR-ABCD-EFGH')).toBe(false);
    expect(isValidLicenseKeyFormat('ABCD-EFGH-IJKL')).toBe(false);
    expect(isValidLicenseKeyFormat('KR-abcd-efgh-ijkl')).toBe(false);
    expect(isValidLicenseKeyFormat('')).toBe(false);
  });
});

describe('JWT Utils', () => {
  const payload = {
    license_id: 1,
    email: 'test@example.com',
    plan: 'PRO',
    device_hash: 'abc123',
  };

  test('signs and verifies token', () => {
    const { token, jti } = signToken(payload);
    expect(token).toBeTruthy();
    expect(jti).toBeTruthy();

    const decoded = verifyToken(token);
    expect(decoded.license_id).toBe(payload.license_id);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.plan).toBe(payload.plan);
    expect(decoded.jti).toBe(jti);
  });

  test('throws on invalid token', () => {
    expect(() => verifyToken('invalid.token.here')).toThrow();
  });

  test('each token has unique jti', () => {
    const { jti: jti1 } = signToken(payload);
    const { jti: jti2 } = signToken(payload);
    expect(jti1).not.toBe(jti2);
  });
});

describe('AuthService', () => {
  const prisma = require('../database/prisma.client');
  let authService: InstanceType<typeof import('../services/auth.service').AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { AuthService } = require('../services/auth.service');
    authService = new AuthService();
  });

  const baseLoginBody = {
    email: 'test@example.com',
    license_key: 'KR-ABCD-EFGH-IJKL',
    device_hash: 'device-hash-abc',
    device_name: 'Test Machine',
    operating_system: 'Windows 11',
  };

  const activeLicense = {
    id: 1,
    email: 'test@example.com',
    license_key: 'KR-ABCD-EFGH-IJKL',
    status: 'ACTIVE',
    plan: 'PRO',
    expires_at: new Date(Date.now() + 86400000 * 365), // 1 year from now
    max_devices: 2,
  };

  test('login succeeds with valid credentials and new device', async () => {
    prisma.license.findUnique.mockResolvedValue(activeLicense);
    prisma.device.findUnique.mockResolvedValue(null);
    prisma.device.count.mockResolvedValue(0);
    prisma.device.create.mockResolvedValue({ id: 1, ...baseLoginBody });
    prisma.session.create.mockResolvedValue({ id: 1 });
    prisma.device.count.mockResolvedValue(1);

    const result = await authService.login(baseLoginBody);

    expect(result.token).toBeTruthy();
    expect(result.license.plan).toBe('PRO');
  });

  test('login fails when license not found', async () => {
    prisma.license.findUnique.mockResolvedValue(null);

    await expect(authService.login(baseLoginBody)).rejects.toMatchObject({
      status: 404,
      message: 'Licença não encontrada.',
    });
  });

  test('login fails when email does not match', async () => {
    prisma.license.findUnique.mockResolvedValue({ ...activeLicense, email: 'other@email.com' });

    await expect(authService.login(baseLoginBody)).rejects.toMatchObject({ status: 401 });
  });

  test('login fails when license is blocked', async () => {
    prisma.license.findUnique.mockResolvedValue({ ...activeLicense, status: 'BLOCKED' });

    await expect(authService.login(baseLoginBody)).rejects.toMatchObject({ status: 403 });
  });

  test('login fails when license is expired', async () => {
    prisma.license.findUnique.mockResolvedValue({
      ...activeLicense,
      expires_at: new Date(Date.now() - 86400000),
    });

    await expect(authService.login(baseLoginBody)).rejects.toMatchObject({ status: 403 });
  });

  test('login fails when device limit is reached', async () => {
    prisma.license.findUnique.mockResolvedValue({ ...activeLicense, max_devices: 2 });
    prisma.device.findUnique.mockResolvedValue(null);
    prisma.device.count.mockResolvedValue(2); // At limit

    await expect(authService.login(baseLoginBody)).rejects.toMatchObject({
      status: 403,
      message: 'Limite de dispositivos atingido.',
    });
  });

  test('login succeeds for known device (no count check)', async () => {
    prisma.license.findUnique.mockResolvedValue(activeLicense);
    prisma.device.findUnique.mockResolvedValue({ id: 1, device_hash: 'device-hash-abc' });
    prisma.device.update.mockResolvedValue({});
    prisma.session.create.mockResolvedValue({ id: 1 });
    prisma.device.count.mockResolvedValue(1);

    const result = await authService.login(baseLoginBody);
    expect(result.token).toBeTruthy();
    // Should not have called device.count for the limit check
    expect(prisma.device.create).not.toHaveBeenCalled();
  });
});
