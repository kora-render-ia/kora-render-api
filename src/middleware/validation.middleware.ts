import { Request, Response, NextFunction } from 'express';
import { validationResult, body, param, query } from 'express-validator';
import { respondError } from '../utils/response.util';

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((e) => e.msg).join('; ');
    respondError(res, messages, 422);
    return;
  }
  next();
}

export const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('license_key')
    .matches(/^KR-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/)
    .withMessage('Formato de chave de licença inválido. Use: KR-XXXX-XXXX-XXXX'),
  body('device_hash').isString().isLength({ min: 8, max: 255 }).withMessage('device_hash inválido.'),
  body('device_name').isString().isLength({ min: 1, max: 255 }).trim().withMessage('device_name inválido.'),
  body('operating_system').isString().isLength({ min: 1, max: 100 }).trim().withMessage('operating_system inválido.'),
];

export const createLicenseValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido.'),
  body('name').isString().isLength({ min: 2, max: 255 }).trim().withMessage('Nome inválido.'),
  body('plan').isIn(['BASIC', 'PRO', 'STUDIO']).withMessage('Plano inválido. Use: BASIC, PRO, STUDIO'),
  body('expires_at').isISO8601().withMessage('Data de validade inválida. Use formato ISO 8601.'),
  body('max_devices').optional().isInt({ min: 1, max: 10 }).withMessage('max_devices deve ser entre 1 e 10.'),
];

export const updateLicenseValidation = [
  body('status').optional().isIn(['ACTIVE', 'BLOCKED', 'EXPIRED', 'REFUNDED', 'CANCELED']).withMessage('Status inválido.'),
  body('plan').optional().isIn(['BASIC', 'PRO', 'STUDIO']).withMessage('Plano inválido.'),
  body('expires_at').optional().isISO8601().withMessage('Data de validade inválida.'),
  body('max_devices').optional().isInt({ min: 1, max: 10 }).withMessage('max_devices deve ser entre 1 e 10.'),
];

export const idParamValidation = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido.'),
];

export const listQueryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Página inválida.'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit deve ser entre 1 e 100.'),
  query('status').optional().isIn(['ACTIVE', 'BLOCKED', 'EXPIRED', 'REFUNDED', 'CANCELED']).withMessage('Status inválido.'),
];
