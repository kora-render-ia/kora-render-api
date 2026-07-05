import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt.util';
import { SessionRepository } from '../repositories/session.repository';
import { respondError } from '../utils/response.util';
import { config } from '../config/env.config';

const sessionRepo = new SessionRepository();

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    respondError(res, 'Token de autenticação não fornecido.', 401);
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = verifyToken(token);

    // Check if session is still valid in DB
    const session = await sessionRepo.findByJti(payload.jti);
    if (!session || !session.is_valid) {
      respondError(res, 'Sessão inválida ou encerrada.', 401);
      return;
    }

    (req as Request & { user: typeof payload }).user = payload;
    next();
  } catch {
    respondError(res, 'Token inválido ou expirado.', 401);
  }
}

export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const adminKey = req.headers['x-admin-key'];

  if (!adminKey || adminKey !== config.admin.apiKey) {
    respondError(res, 'Acesso não autorizado.', 401);
    return;
  }

  next();
}
