import { Request, Response, NextFunction } from 'express';
import { LicenseService } from '../services/license.service';
import { respondSuccess } from '../utils/response.util';
import { LicenseStatus } from '../types';

const licenseService = new LicenseService();

export class LicenseController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { page, limit, search, status } = req.query;
      const result = await licenseService.listLicenses({
        page: page ? parseInt(page as string) : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        search: search as string | undefined,
        status: status as LicenseStatus | undefined,
      });
      respondSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = await licenseService.getLicenseById(parseInt(req.params.id));
      respondSuccess(res, license);
    } catch (err) {
      next(err);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = await licenseService.createLicense(req.body);
      respondSuccess(res, license, 201);
    } catch (err) {
      next(err);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = await licenseService.updateLicense(parseInt(req.params.id), req.body);
      respondSuccess(res, license);
    } catch (err) {
      next(err);
    }
  }

  async block(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = await licenseService.blockLicense(parseInt(req.params.id));
      respondSuccess(res, license);
    } catch (err) {
      next(err);
    }
  }

  async unblock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const license = await licenseService.unblockLicense(parseInt(req.params.id));
      respondSuccess(res, license);
    } catch (err) {
      next(err);
    }
  }

  async remove(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await licenseService.deleteLicense(parseInt(req.params.id));
      respondSuccess(res, { message: 'Licença excluída com sucesso.' });
    } catch (err) {
      next(err);
    }
  }

  async listDevices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const devices = await licenseService.listDevices(parseInt(req.params.id));
      respondSuccess(res, devices);
    } catch (err) {
      next(err);
    }
  }

  async removeDevice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await licenseService.removeDevice(parseInt(req.params.id), parseInt(req.params.deviceId));
      respondSuccess(res, { message: 'Dispositivo removido com sucesso.' });
    } catch (err) {
      next(err);
    }
  }
}
