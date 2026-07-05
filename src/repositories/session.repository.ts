import prisma from '../database/prisma.client';

export class SessionRepository {
  async create(data: {
    license_id: number;
    token_jti: string;
    device_hash: string;
    expires_at: Date;
  }) {
    return prisma.session.create({ data });
  }

  async findByJti(token_jti: string) {
    return prisma.session.findUnique({ where: { token_jti } });
  }

  async invalidateByJti(token_jti: string) {
    return prisma.session.update({ where: { token_jti }, data: { is_valid: false } });
  }

  async invalidateAllByLicense(license_id: number) {
    return prisma.session.updateMany({ where: { license_id }, data: { is_valid: false } });
  }

  async cleanup() {
    return prisma.session.deleteMany({ where: { expires_at: { lt: new Date() } } });
  }
}
