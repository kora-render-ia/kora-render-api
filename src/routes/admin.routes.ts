import { Router, Request, Response, NextFunction } from 'express';
import { LicenseController } from '../controllers/license.controller';
import { adminMiddleware } from '../middleware/auth.middleware';
import {
  createLicenseValidation,
  updateLicenseValidation,
  idParamValidation,
  listQueryValidation,
  validate,
} from '../middleware/validation.middleware';
import { param } from 'express-validator';

const router = Router();
const controller = new LicenseController();

type H = (req: Request, res: Response, next: NextFunction) => void;

// All admin routes require admin API key
router.use(adminMiddleware);

/**
 * @swagger
 * /api/admin/licenses:
 *   get:
 *     summary: List all licenses
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by email, name, or license key
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, BLOCKED, EXPIRED, REFUNDED, CANCELED] }
 *     responses:
 *       200:
 *         description: Paginated list of licenses
 */
router.get('/licenses', listQueryValidation, validate, controller.list.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses/{id}:
 *   get:
 *     summary: Get license by ID
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: License details
 *       404:
 *         description: Not found
 */
router.get('/licenses/:id', idParamValidation, validate, controller.getById.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses:
 *   post:
 *     summary: Create license manually
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, name, plan, expires_at]
 *             properties:
 *               email: { type: string, format: email }
 *               name: { type: string }
 *               plan: { type: string, enum: [BASIC, PRO, STUDIO] }
 *               expires_at: { type: string, format: date-time }
 *               max_devices: { type: integer, default: 2 }
 *     responses:
 *       201:
 *         description: License created
 */
router.post('/licenses', createLicenseValidation, validate, controller.create.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses/{id}:
 *   put:
 *     summary: Update license (plan, status, expiry, max_devices)
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 */
router.put(
  '/licenses/:id',
  idParamValidation,
  updateLicenseValidation,
  validate,
  controller.update.bind(controller) as H,
);

/**
 * @swagger
 * /api/admin/licenses/{id}/block:
 *   post:
 *     summary: Block a license and invalidate all its sessions
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 */
router.post('/licenses/:id/block', idParamValidation, validate, controller.block.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses/{id}/unblock:
 *   post:
 *     summary: Unblock a license (set to ACTIVE)
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 */
router.post('/licenses/:id/unblock', idParamValidation, validate, controller.unblock.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses/{id}:
 *   delete:
 *     summary: Delete a license permanently
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 */
router.delete('/licenses/:id', idParamValidation, validate, controller.remove.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses/{id}/devices:
 *   get:
 *     summary: List all devices for a license
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 */
router.get('/licenses/:id/devices', idParamValidation, validate, controller.listDevices.bind(controller) as H);

/**
 * @swagger
 * /api/admin/licenses/{id}/devices/{deviceId}:
 *   delete:
 *     summary: Remove a device from a license
 *     tags: [Admin]
 *     security:
 *       - adminApiKey: []
 */
router.delete(
  '/licenses/:id/devices/:deviceId',
  [...idParamValidation, param('deviceId').isInt({ min: 1 }).withMessage('deviceId inválido.')],
  validate,
  controller.removeDevice.bind(controller) as H,
);

export default router;
