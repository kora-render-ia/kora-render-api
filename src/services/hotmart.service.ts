import crypto from 'crypto';
import { LicenseRepository } from '../repositories/license.repository';
import { SessionRepository } from '../repositories/session.repository';
import { WebhookLogRepository } from '../repositories/webhook-log.repository';
import { LicenseService } from './license.service';
import { HotmartWebhookPayload, LicenseStatus } from '../types';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

// Hotmart event types
const HOTMART_EVENTS = {
  PURCHASE_APPROVED: 'PURCHASE_APPROVED',
  PURCHASE_COMPLETE: 'PURCHASE_COMPLETE',
  SUBSCRIPTION_REACTIVATED: 'SUBSCRIPTION_REACTIVATED',
  PURCHASE_REFUNDED: 'PURCHASE_REFUNDED',
  PURCHASE_CHARGEBACK: 'PURCHASE_CHARGEBACK',
  PURCHASE_CANCELED: 'PURCHASE_CANCELED',
  PURCHASE_PROTEST: 'PURCHASE_PROTEST',
  PURCHASE_DELAYED: 'PURCHASE_DELAYED',
  SWITCH_PLAN: 'SWITCH_PLAN',
} as const;

// Plan mapping from Hotmart product name to internal plan
function mapPlanName(productName: string): string {
  const upper = productName.toUpperCase();
  if (upper.includes('PRO')) return 'PRO';
  if (upper.includes('STUDIO')) return 'STUDIO';
  return 'BASIC';
}

function getMaxDevicesForPlan(plan: string): number {
  switch (plan) {
    case 'PRO': return 2;
    case 'STUDIO': return 5;
    default: return 1;
  }
}

function getExpiryDate(months = 12): Date {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date;
}

export class HotmartService {
  private licenseRepo = new LicenseRepository();
  private sessionRepo = new SessionRepository();
  private webhookLogRepo = new WebhookLogRepository();
  private licenseService = new LicenseService();

  validateSignature(rawBody: string, signature: string): boolean {
    if (!config.hotmart.webhookSecret) return true; // Skip in dev if not configured
    const expected = crypto
      .createHmac('sha256', config.hotmart.webhookSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  }

  async processWebhook(payload: HotmartWebhookPayload, rawBody: string) {
    const { event, data } = payload;
    logger.info({ event }, 'Processing Hotmart webhook');

    try {
      await this.handleEvent(event, data);
      await this.webhookLogRepo.create({ event, payload: payload as object, status: 'success' });
    } catch (err) {
      const error = err as Error;
      logger.error({ event, error: error.message }, 'Webhook processing error');
      await this.webhookLogRepo.create({
        event,
        payload: payload as object,
        status: 'error',
        error: error.message,
      });
      throw err;
    }
  }

  private async handleEvent(event: string, data: HotmartWebhookPayload['data']) {
    switch (event) {
      case HOTMART_EVENTS.PURCHASE_APPROVED:
      case HOTMART_EVENTS.PURCHASE_COMPLETE:
        await this.handlePurchaseApproved(data);
        break;

      case HOTMART_EVENTS.SUBSCRIPTION_REACTIVATED:
        await this.handleRenewal(data);
        break;

      case HOTMART_EVENTS.PURCHASE_REFUNDED:
      case HOTMART_EVENTS.PURCHASE_CHARGEBACK:
      case HOTMART_EVENTS.PURCHASE_PROTEST:
        await this.handleRefundOrChargeback(data);
        break;

      case HOTMART_EVENTS.PURCHASE_CANCELED:
        await this.handleCancellation(data);
        break;

      case HOTMART_EVENTS.PURCHASE_DELAYED:
        await this.handlePaymentDeclined(data);
        break;

      default:
        logger.warn({ event }, 'Unhandled Hotmart event');
    }
  }

  private async handlePurchaseApproved(data: HotmartWebhookPayload['data']) {
    const email = data.buyer?.email;
    const name = data.buyer?.name ?? 'Cliente';
    const hotmartId = data.purchase?.transaction;
    const productName = data.product?.name ?? 'BASIC';

    if (!email || !hotmartId) {
      throw new Error('Missing buyer email or transaction ID in webhook payload');
    }

    const plan = mapPlanName(productName);

    // Check if license already exists for this transaction (idempotency)
    const existing = await this.licenseRepo.findByHotmartId(hotmartId);
    if (existing) {
      logger.info({ hotmartId }, 'License already exists for this transaction, skipping');
      return;
    }

    await this.licenseService.createLicense({
      email,
      name,
      plan,
      expires_at: getExpiryDate(12).toISOString(),
      max_devices: getMaxDevicesForPlan(plan),
      hotmart_id: hotmartId,
    });

    logger.info({ email, plan, hotmartId }, 'License created from Hotmart purchase');
  }

  private async handleRenewal(data: HotmartWebhookPayload['data']) {
    const hotmartId = data.purchase?.transaction;
    if (!hotmartId) throw new Error('Missing transaction ID');

    const license = await this.licenseRepo.findByHotmartId(hotmartId);
    if (!license) {
      // First purchase might have different transaction ID - try by email
      const email = data.buyer?.email;
      if (email) {
        const licenses = await this.licenseRepo.findByEmail(email);
        if (licenses.length > 0) {
          const targetLicense = licenses[0];
          const newExpiry = new Date(targetLicense.expires_at);
          newExpiry.setFullYear(newExpiry.getFullYear() + 1);
          await this.licenseRepo.update(targetLicense.id, {
            expires_at: newExpiry.toISOString(),
            status: 'ACTIVE',
          });
          logger.info({ license_id: targetLicense.id }, 'License renewed');
          return;
        }
      }
      throw new Error(`No license found for renewal, transaction: ${hotmartId}`);
    }

    const newExpiry = new Date(license.expires_at);
    newExpiry.setFullYear(newExpiry.getFullYear() + 1);

    await this.licenseRepo.update(license.id, {
      expires_at: newExpiry.toISOString(),
      status: 'ACTIVE',
    });

    logger.info({ license_id: license.id }, 'License renewed');
  }

  private async handleRefundOrChargeback(data: HotmartWebhookPayload['data']) {
    const hotmartId = data.purchase?.transaction;
    const email = data.buyer?.email;

    let license = hotmartId ? await this.licenseRepo.findByHotmartId(hotmartId) : null;

    if (!license && email) {
      const licenses = await this.licenseRepo.findByEmail(email);
      if (licenses.length > 0) license = licenses[0];
    }

    if (!license) {
      logger.warn({ hotmartId, email }, 'License not found for refund/chargeback');
      return;
    }

    await this.licenseRepo.updateStatus(license.id, 'REFUNDED');
    await this.sessionRepo.invalidateAllByLicense(license.id);
    logger.info({ license_id: license.id }, 'License refunded and blocked');
  }

  private async handleCancellation(data: HotmartWebhookPayload['data']) {
    const hotmartId = data.purchase?.transaction;
    const email = data.buyer?.email;

    let license = hotmartId ? await this.licenseRepo.findByHotmartId(hotmartId) : null;

    if (!license && email) {
      const licenses = await this.licenseRepo.findByEmail(email);
      if (licenses.length > 0) license = licenses[0];
    }

    if (!license) {
      logger.warn({ hotmartId, email }, 'License not found for cancellation');
      return;
    }

    await this.licenseRepo.updateStatus(license.id, 'CANCELED');
    await this.sessionRepo.invalidateAllByLicense(license.id);
    logger.info({ license_id: license.id }, 'License canceled');
  }

  private async handlePaymentDeclined(data: HotmartWebhookPayload['data']) {
    const email = data.buyer?.email;
    if (!email) return;

    const licenses = await this.licenseRepo.findByEmail(email);
    for (const license of licenses) {
      if (license.status === 'ACTIVE') {
        await this.licenseRepo.updateStatus(license.id, 'BLOCKED');
        await this.sessionRepo.invalidateAllByLicense(license.id);
        logger.info({ license_id: license.id }, 'License suspended due to payment decline');
      }
    }
  }
}
