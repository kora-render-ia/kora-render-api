import prisma from '../database/prisma.client';

export class DeviceRepository {
  async findByLicenseAndHash(license_id: number, device_hash: string) {
    return prisma.device.findUnique({
      where: { license_id_device_hash: { license_id, device_hash } },
    });
  }

  async findAllByLicense(license_id: number) {
    return prisma.device.findMany({ where: { license_id }, orderBy: { last_login: 'desc' } });
  }

  async countByLicense(license_id: number) {
    return prisma.device.count({ where: { license_id } });
  }

  async create(data: {
    license_id: number;
    device_hash: string;
    device_name: string;
    operating_system: string;
  }) {
    return prisma.device.create({ data });
  }

  async updateLastLogin(license_id: number, device_hash: string) {
    return prisma.device.update({
      where: { license_id_device_hash: { license_id, device_hash } },
      data: { last_login: new Date() },
    });
  }

  async delete(id: number) {
    return prisma.device.delete({ where: { id } });
  }

  async deleteByLicenseAndId(license_id: number, id: number) {
    return prisma.device.deleteMany({ where: { id, license_id } });
  }
}
