import { Response } from 'express';

export const respondSuccess = (res: Response, data: unknown, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

export const respondError = (res: Response, message: string, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, message });
};
