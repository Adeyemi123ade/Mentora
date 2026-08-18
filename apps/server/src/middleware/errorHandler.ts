import type { Request, Response, NextFunction } from 'express';
import { MulterError } from 'multer';
import { AppError } from '../lib/AppError.js';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.code,
    });
    return;
  }

  if (err instanceof MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be smaller than 5MB' : err.message;
    res.status(400).json({ success: false, message, error: err.code });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
}
