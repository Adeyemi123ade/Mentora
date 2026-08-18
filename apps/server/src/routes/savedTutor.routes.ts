import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { saveTutorSchema, updateSavedTutorSchema } from '../validation/savedTutor.schemas.js';
import * as savedTutorService from '../services/savedTutor.service.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));

router.post('/', validate(saveTutorSchema), asyncHandler(async (req: Request, res: Response) => {
  const saved = await savedTutorService.saveTutor(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Tutor saved', data: { saved } });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const saved = await savedTutorService.listSavedTutors(req.user!.id);
  res.json({ success: true, message: 'OK', data: { saved } });
}));

router.patch('/:tutorId', validate(updateSavedTutorSchema), asyncHandler(async (req: Request, res: Response) => {
  const saved = await savedTutorService.updateSavedTutorNote(req.user!.id, req.params.tutorId, req.body.note);
  res.json({ success: true, message: 'Note updated', data: { saved } });
}));

router.delete('/:tutorId', asyncHandler(async (req: Request, res: Response) => {
  await savedTutorService.unsaveTutor(req.user!.id, req.params.tutorId);
  res.json({ success: true, message: 'Tutor removed from saved list' });
}));

export default router;
