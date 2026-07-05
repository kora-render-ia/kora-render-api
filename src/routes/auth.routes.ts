import { Router, Request, Response, NextFunction } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { loginValidation, validate } from '../middleware/validation.middleware';

const router = Router();
const controller = new AuthController();

type H = (req: Request, res: Response, next: NextFunction) => void;

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Plugin login
 *     description: Authenticates a plugin instance using email + license key + device info. Returns a JWT valid for 30 days.
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, license_key, device_hash, device_name, operating_system]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: cliente@email.com
 *               license_key:
 *                 type: string
 *                 pattern: '^KR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$'
 *                 example: KR-ABCD-EFGH-IJKL
 *               device_hash:
 *                 type: string
 *                 example: a1b2c3d4e5f6
 *               device_name:
 *                 type: string
 *                 example: Notebook Leonardo
 *               operating_system:
 *                 type: string
 *                 example: Windows 11
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 token:
 *                   type: string
 *                 license:
 *                   type: object
 *                   properties:
 *                     plan: { type: string, example: PRO }
 *                     expires_at: { type: string, format: date-time }
 *                     devices: { type: integer, example: 1 }
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: License blocked, expired, or device limit reached
 *       404:
 *         description: License not found
 *       422:
 *         description: Validation error
 */
router.post('/login', loginValidation, validate, controller.login.bind(controller) as H);

/**
 * @swagger
 * /api/auth/check-session:
 *   post:
 *     summary: Validate and refresh session
 *     description: Validates the current JWT and returns a new token. Checks license status in real-time.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session valid — new token issued
 *       401:
 *         description: Token invalid or expired
 *       403:
 *         description: License blocked, canceled, or subscription expired
 */
router.post('/check-session', controller.checkSession.bind(controller) as H);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout / invalidate session
 *     description: Invalidates the current session token so it cannot be reused.
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session ended
 */
router.post('/logout', controller.logout.bind(controller) as H);

export default router;
