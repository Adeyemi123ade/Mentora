import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/AppError.js';

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (req.user!.role !== 'ADMIN') {
    next(new AppError(403, 'Admin access required', 'NOT_AN_ADMIN'));
    return;
  }
  next();
}
