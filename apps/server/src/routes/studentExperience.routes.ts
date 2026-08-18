import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as service from '../services/studentExperience.service.js';

const router = Router();
router.use(requireAuth, requireRole('STUDENT'));

router.get('/overview', asyncHandler(async (req: Request, res: Response) => {
  const overview = await service.getOverview(req.user!.id);
  res.json({ success: true, message: 'OK', data: { overview } });
}));

router.get('/lessons', asyncHandler(async (req: Request, res: Response) => {
  const lessons = await service.listLessons(req.user!.id);
  res.json({ success: true, message: 'OK', data: { lessons } });
}));

router.get('/progress', asyncHandler(async (req: Request, res: Response) => {
  const progress = await service.getProgress(req.user!.id);
  res.json({ success: true, message: 'OK', data: { progress } });
}));

router.get('/resources', (_req, res) => {
  res.json({ success: true, message: 'Learning resources are not available yet.', data: { resources: [], supported: false } });
});

export default router;
