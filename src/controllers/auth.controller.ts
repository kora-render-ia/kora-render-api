import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { respondSuccess, respondError } from '../utils/response.util';
import { verifyToken } from '../utils/jwt.util';
import { LoginRequest } from '../types';

const authService = new AuthService();

export class AuthController {
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const body = req.body as LoginRequest;
      const result = await authService.login(body);
      res.status(200).json({ success: true, token: result.token, license: result.license });
    } catch (err) {
      next(err);
    }
  }

  async checkSession(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        respondError(res, 'Token não fornecido.', 401);
        return;
      }

      const token = authHeader.split(' ')[1];
      const result = await authService.checkSession(token);
      respondSuccess(res, result);
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        respondError(res, 'Token não fornecido.', 401);
        return;
      }

      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);
      await authService.logout(payload.jti);
      respondSuccess(res, { message: 'Sessão encerrada com sucesso.' });
    } catch {
      // Still respond success for logout even if token is expired
      respondSuccess(res, { message: 'Sessão encerrada.' });
    }
  }
}
