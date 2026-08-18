import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/AppError.js';
import * as tutorsService from '../services/tutors.service.js';
import * as availabilityService from '../services/availability.service.js';

const router = Router();

router.use(requireAuth, requireRole('PARENT'));

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const tutors = await tutorsService.listApprovedTutors();
  res.json({ success: true, message: 'OK', data: { tutors } });
}));

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const tutor = await tutorsService.getApprovedTutorById(req.params.id);
  if (!tutor) throw new AppError(404, 'Tutor not found', 'TUTOR_NOT_FOUND');
  res.json({ success: true, message: 'OK', data: { tutor } });
}));

router.get('/:id/reviews', asyncHandler(async (req: Request, res: Response) => {
  const reviews = await tutorsService.getTutorReviews(req.params.id);
  res.json({ success: true, message: 'OK', data: { reviews } });
}));

router.get('/:id/availability', asyncHandler(async (req: Request, res: Response) => {
  const slots = await availabilityService.listAvailability(req.params.id);
  res.json({ success: true, message: 'OK', data: { slots } });
}));

export default router;
