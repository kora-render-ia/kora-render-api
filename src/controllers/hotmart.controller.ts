import { Request, Response, NextFunction } from 'express';
import { HotmartService } from '../services/hotmart.service';
import { respondSuccess, respondError } from '../utils/response.util';
import { HotmartWebhookPayload } from '../types';
import { logger } from '../utils/logger.util';

const hotmartService = new HotmartService();

export class HotmartController {
  async webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const signature = req.headers['x-hotmart-signature'] as string;
      const rawBody = (req as Request & { rawBody?: string }).rawBody || JSON.stringify(req.body);

      // Validate signature if provided
      if (signature && !hotmartService.validateSignature(rawBody, signature)) {
        logger.warn({ signature }, 'Invalid Hotmart webhook signature');
        respondError(res, 'Assinatura do webhook inválida.', 401);
        return;
      }

      const payload = req.body as HotmartWebhookPayload;

      if (!payload.event || !payload.data) {
        respondError(res, 'Payload do webhook inválido.', 400);
        return;
      }

      await hotmartService.processWebhook(payload, rawBody);
      respondSuccess(res, { message: 'Webhook processado com sucesso.' });
    } catch (err) {
      next(err);
    }
  }
}
