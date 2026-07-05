import prisma from '../database/prisma.client';
import { CreateLicenseRequest, UpdateLicenseRequest } from '../types';

// Mirror of the Prisma enum — kept in sync with schema.prisma
type LicenseStatus = 'ACTIVE' | 'BLOCKED' | 'EXPIRED' | 'REFUNDED' | 'CANCELED';

export class LicenseRepository {
  async findByKey(license_key: string) {
    return prisma.license.findUnique({ where: { license_key } });
  }

  async findById(id: number) {
    return prisma.license.findUnique({ where: { id } });
  }

  async findByEmail(email: string) {
    return prisma.license.findMany({ where: { email: { equals: email, mode: 'insensitive' } } });
  }

  async findByHotmartId(hotmart_id: string) {
    return prisma.license.findFirst({ where: { hotmart_id } });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    search?: string;
    status?: LicenseStatus;
  }) {
    const { skip = 0, take = 20, search, status } = params;

    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } },
          { license_key: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({ where, skip, take, orderBy: { created_at: 'desc' } }),
      prisma.license.count({ where }),
    ]);

    return { licenses, total };
  }

  async create(data: CreateLicenseRequest & { license_key: string }) {
    return prisma.license.create({
      data: {
        email: data.email,
        name: data.name,
        license_key: data.license_key,
        plan: data.plan,
        expires_at: new Date(data.expires_at),
        max_devices: data.max_devices ?? 2,
        hotmart_id: data.hotmart_id,
      },
    });
  }

  async update(id: number, data: UpdateLicenseRequest) {
    return prisma.license.update({
      where: { id },
      data: {
        ...(data.status && { status: data.status }),
        ...(data.plan && { plan: data.plan }),
        ...(data.expires_at && { expires_at: new Date(data.expires_at) }),
        ...(data.max_devices !== undefined && { max_devices: data.max_devices }),
      },
    });
  }

  async updateStatus(id: number, status: LicenseStatus) {
    return prisma.license.update({ where: { id }, data: { status } });
  }

  async delete(id: number) {
    return prisma.license.delete({ where: { id } });
  }

  async updateByHotmartId(hotmart_id: string, data: Partial<{ expires_at: Date; status: LicenseStatus }>) {
    return prisma.license.updateMany({ where: { hotmart_id }, data });
  }
}
