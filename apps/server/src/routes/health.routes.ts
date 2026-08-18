import { Router, type Request, type Response } from 'express';
import { APP_NAME, type ApiResponse } from '@mentora/shared';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  const payload: ApiResponse<{ app: string; status: string }> = {
    success: true,
    message: 'API is running',
    data: { app: APP_NAME, status: 'healthy' },
  };
  res.json(payload);
});

router.get('/', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'MENTORA API is ready',
    data: { app: APP_NAME, version: '0.1.0' },
  });
});

export default router;
