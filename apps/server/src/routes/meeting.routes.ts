import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { updateMeetingSchema } from '../validation/meeting.schemas.js';
import * as meetingService from '../services/meeting.service.js';

const router = Router();
router.use(requireAuth);

router.get('/:bookingId', requireRole('PARENT', 'STUDENT', 'TUTOR', 'ADMIN'), asyncHandler(async (req: Request, res: Response) => {
  const meeting = await meetingService.getMeeting(req.user!, req.params.bookingId);
  res.json({ success: true, message: 'OK', data: { meeting } });
}));

router.put('/:bookingId', requireRole('TUTOR'), validate(updateMeetingSchema), asyncHandler(async (req: Request, res: Response) => {
  await meetingService.updateMeeting(req.user!.id, req.params.bookingId, req.body);
  res.json({ success: true, message: 'Meeting details updated' });
}));

export default router;
