import { LicenseStatus } from '../types';
import { LicenseRepository } from '../repositories/license.repository';
import { DeviceRepository } from '../repositories/device.repository';
import { SessionRepository } from '../repositories/session.repository';
import { generateLicenseKey } from '../utils/license.util';
import { CreateLicenseRequest, UpdateLicenseRequest } from '../types';

export class LicenseService {
  private licenseRepo = new LicenseRepository();
  private deviceRepo = new DeviceRepository();
  private sessionRepo = new SessionRepository();

  async listLicenses(params: { page?: number; limit?: number; search?: string; status?: LicenseStatus }) {
    const page = params.page ?? 1;
    const limit = Math.min(params.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const { licenses, total } = await this.licenseRepo.findAll({
      skip,
      take: limit,
      search: params.search,
      status: params.status,
    });

    return { licenses, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async getLicenseById(id: number) {
    const license = await this.licenseRepo.findById(id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    return license;
  }

  async createLicense(data: CreateLicenseRequest) {
    // Generate unique key with collision check
    let license_key: string;
    let attempt = 0;
    do {
      license_key = generateLicenseKey();
      attempt++;
      if (attempt > 10) throw { status: 500, message: 'Erro ao gerar chave de licença única.' };
    } while (await this.licenseRepo.findByKey(license_key));

    return this.licenseRepo.create({ ...data, license_key });
  }

  async updateLicense(id: number, data: UpdateLicenseRequest) {
    const license = await this.licenseRepo.findById(id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    return this.licenseRepo.update(id, data);
  }

  async blockLicense(id: number) {
    const license = await this.licenseRepo.findById(id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    await this.sessionRepo.invalidateAllByLicense(id);
    return this.licenseRepo.updateStatus(id, 'BLOCKED');
  }

  async unblockLicense(id: number) {
    const license = await this.licenseRepo.findById(id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    return this.licenseRepo.updateStatus(id, 'ACTIVE');
  }

  async deleteLicense(id: number) {
    const license = await this.licenseRepo.findById(id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    return this.licenseRepo.delete(id);
  }

  async listDevices(license_id: number) {
    const license = await this.licenseRepo.findById(license_id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    return this.deviceRepo.findAllByLicense(license_id);
  }

  async removeDevice(license_id: number, device_id: number) {
    const license = await this.licenseRepo.findById(license_id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };
    const result = await this.deviceRepo.deleteByLicenseAndId(license_id, device_id);
    if (result.count === 0) throw { status: 404, message: 'Dispositivo não encontrado.' };
    return result;
  }
}
