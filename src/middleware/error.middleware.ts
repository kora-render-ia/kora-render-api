import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.util';

export interface AppError {
  status?: number;
  message: string;
}

export function errorHandler(
  err: AppError | Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const status = (err as AppError).status || 500;
  const message =
    status === 500 ? 'Erro interno do servidor.' : err.message;

  if (status === 500) {
    logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
  }

  res.status(status).json({ success: false, message });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Rota não encontrada: ${req.method} ${req.path}` });
}
