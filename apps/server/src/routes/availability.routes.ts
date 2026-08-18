import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/AppError.js';
import { createAvailabilitySlotSchema } from '../validation/availability.schemas.js';
import * as availabilityService from '../services/availability.service.js';

const router = Router();

function requireTutor(req: Request): void {
  if (req.user!.role !== 'TUTOR') {
    throw new AppError(403, 'Only tutors have availability', 'NOT_A_TUTOR');
  }
}

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const slots = await availabilityService.listAvailability(req.user!.id);
  res.json({ success: true, message: 'OK', data: { slots } });
}));

router.post('/', requireAuth, validate(createAvailabilitySlotSchema), asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const slot = await availabilityService.addAvailability(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Availability added', data: { slot } });
}));

router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  await availabilityService.removeAvailability(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Availability removed' });
}));

export default router;
