import { LicenseRepository } from '../repositories/license.repository';
import { DeviceRepository } from '../repositories/device.repository';
import { SessionRepository } from '../repositories/session.repository';
import { signToken, verifyToken, decodeToken, getTokenExpiry, JwtPayload } from '../utils/jwt.util';
import { LoginRequest, LicenseStatus } from '../types';
import { logger } from '../utils/logger.util';

export class AuthService {
  private licenseRepo = new LicenseRepository();
  private deviceRepo = new DeviceRepository();
  private sessionRepo = new SessionRepository();

  async login(body: LoginRequest) {
    const { email, license_key, device_hash, device_name, operating_system } = body;

    // 1. Find license
    const license = await this.licenseRepo.findByKey(license_key);

    // 2. Existence check
    if (!license) {
      throw { status: 404, message: 'Licença não encontrada.' };
    }

    // 3. Email match
    if (license.email.toLowerCase() !== email.toLowerCase()) {
      throw { status: 401, message: 'Email não corresponde à licença.' };
    }

    // 4. Status check
    if (license.status === 'BLOCKED') {
      throw { status: 403, message: 'Licença bloqueada. Entre em contato com o suporte.' };
    }
    if (license.status === 'REFUNDED') {
      throw { status: 403, message: 'Licença reembolsada e desativada.' };
    }
    if (license.status === 'CANCELED') {
      throw { status: 403, message: 'Licença cancelada.' };
    }

    // 5. Expiry check
    if (license.status === 'EXPIRED' || license.expires_at < new Date()) {
      throw { status: 403, message: 'Licença expirada. Renove sua assinatura.' };
    }

    // 6. Device check
    const existingDevice = await this.deviceRepo.findByLicenseAndHash(license.id, device_hash);

    if (!existingDevice) {
      const deviceCount = await this.deviceRepo.countByLicense(license.id);
      if (deviceCount >= license.max_devices) {
        throw {
          status: 403,
          message: 'Limite de dispositivos atingido.',
        };
      }
      // 7. Register new device
      await this.deviceRepo.create({ license_id: license.id, device_hash, device_name, operating_system });
      logger.info({ license_id: license.id, device_hash }, 'New device registered');
    } else {
      // Update last login
      await this.deviceRepo.updateLastLogin(license.id, device_hash);
    }

    // 8. Generate JWT
    const { token, jti } = signToken({
      license_id: license.id,
      email: license.email,
      plan: license.plan,
      device_hash,
    });

    // Store session
    await this.sessionRepo.create({
      license_id: license.id,
      token_jti: jti,
      device_hash,
      expires_at: getTokenExpiry(),
    });

    const deviceCount = await this.deviceRepo.countByLicense(license.id);

    // 9. Return response
    return {
      token,
      license: {
        plan: license.plan,
        expires_at: license.expires_at,
        devices: deviceCount,
      },
    };
  }

  async checkSession(token: string) {
    let payload: JwtPayload;

    try {
      payload = verifyToken(token);
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name === 'TokenExpiredError') {
        // Try to refresh using decoded payload
        const decoded = decodeToken(token);
        if (!decoded) throw { status: 401, message: 'Token inválido.' };
        return this.refreshToken(decoded);
      }
      throw { status: 401, message: 'Token inválido.' };
    }

    // Validate session in DB
    const session = await this.sessionRepo.findByJti(payload.jti);
    if (!session || !session.is_valid) {
      throw { status: 401, message: 'Sessão inválida ou encerrada.' };
    }

    // Check license current status
    const license = await this.licenseRepo.findById(payload.license_id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };

    if (license.status === 'BLOCKED') throw { status: 403, message: 'Licença bloqueada.' };
    if (license.status === 'CANCELED') throw { status: 403, message: 'Licença cancelada.' };
    if (license.status === 'REFUNDED') throw { status: 403, message: 'Licença reembolsada.' };
    if (license.expires_at < new Date()) throw { status: 403, message: 'Assinatura vencida.' };

    // Auto-renew token
    const { token: newToken, jti } = signToken({
      license_id: payload.license_id,
      email: payload.email,
      plan: license.plan,
      device_hash: payload.device_hash,
    });

    // Invalidate old session
    await this.sessionRepo.invalidateByJti(payload.jti);

    // Create new session
    await this.sessionRepo.create({
      license_id: license.id,
      token_jti: jti,
      device_hash: payload.device_hash,
      expires_at: getTokenExpiry(),
    });

    return { valid: true, token: newToken };
  }

  private async refreshToken(decoded: JwtPayload) {
    const license = await this.licenseRepo.findById(decoded.license_id);
    if (!license) throw { status: 404, message: 'Licença não encontrada.' };

    if (license.status !== 'ACTIVE') {
      throw { status: 403, message: 'Licença inativa. Faça login novamente.' };
    }
    if (license.expires_at < new Date()) {
      throw { status: 403, message: 'Assinatura vencida.' };
    }

    const { token, jti } = signToken({
      license_id: license.id,
      email: license.email,
      plan: license.plan,
      device_hash: decoded.device_hash,
    });

    await this.sessionRepo.create({
      license_id: license.id,
      token_jti: jti,
      device_hash: decoded.device_hash,
      expires_at: getTokenExpiry(),
    });

    return { valid: true, token };
  }

  async logout(jti: string) {
    await this.sessionRepo.invalidateByJti(jti);
  }
}
