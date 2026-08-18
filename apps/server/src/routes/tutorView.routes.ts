import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as tutorViewService from '../services/tutorView.service.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));

const logViewSchema = z.object({ tutorId: z.string().min(1) });

router.post('/', validate(logViewSchema), asyncHandler(async (req: Request, res: Response) => {
  await tutorViewService.logTutorView(req.user!.id, req.body.tutorId);
  res.json({ success: true, message: 'View logged' });
}));

router.get('/recent-count', asyncHandler(async (req: Request, res: Response) => {
  const count = await tutorViewService.countRecentlyViewed(req.user!.id, 7);
  res.json({ success: true, message: 'OK', data: { count } });
}));

export default router;
