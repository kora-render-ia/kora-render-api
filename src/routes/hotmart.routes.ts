import { Router, Request, Response, NextFunction } from 'express';
import { HotmartController } from '../controllers/hotmart.controller';

const router = Router();
const controller = new HotmartController();

type H = (req: Request, res: Response, next: NextFunction) => void;

/**
 * @swagger
 * /api/hotmart/webhook:
 *   post:
 *     summary: Hotmart webhook receiver
 *     description: |
 *       Receives event notifications from Hotmart and processes them automatically.
 *
 *       Supported events:
 *       - `PURCHASE_APPROVED` / `PURCHASE_COMPLETE` → Creates a new license
 *       - `SUBSCRIPTION_REACTIVATED` → Renews license expiry by 1 year
 *       - `PURCHASE_REFUNDED` / `PURCHASE_CHARGEBACK` → Blocks license (REFUNDED)
 *       - `PURCHASE_CANCELED` → Cancels license
 *       - `PURCHASE_DELAYED` → Suspends license (payment declined)
 *     tags: [Hotmart]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [event, data]
 *             properties:
 *               event:
 *                 type: string
 *                 example: PURCHASE_APPROVED
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: Webhook processed
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Invalid signature
 */
router.post('/webhook', controller.webhook.bind(controller) as H);

export default router;
