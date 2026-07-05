import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config/env.config';

export interface JwtPayload {
  license_id: number;
  email: string;
  plan: string;
  jti: string;
  device_hash: string;
}

export function signToken(payload: Omit<JwtPayload, 'jti'>): { token: string; jti: string } {
  const jti = uuidv4();
  const token = jwt.sign({ ...payload, jti }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
  return { token, jti };
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, config.jwt.secret) as JwtPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  try {
    return jwt.decode(token) as JwtPayload;
  } catch {
    return null;
  }
}

export function getTokenExpiry(): Date {
  const days = parseInt(config.jwt.expiresIn.replace('d', ''), 10) || 30;
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + days);
  return expiry;
}
