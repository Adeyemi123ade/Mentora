import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { documentUpload } from '../lib/upload.js';
import { AppError } from '../lib/AppError.js';
import { updateTutorProfileSchema } from '../validation/tutorProfile.schemas.js';
import { resolveAccountSchema } from '../validation/payout.schemas.js';
import * as tutorProfileService from '../services/tutorProfile.service.js';
import type { DocumentKind } from '../services/tutorProfile.service.js';
import * as payoutService from '../services/payout.service.js';

const router = Router();

function requireTutor(req: Request): void {
  if (req.user!.role !== 'TUTOR') {
    throw new AppError(403, 'Only tutors have a tutor profile', 'NOT_A_TUTOR');
  }
}

router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const profile = await tutorProfileService.getMyProfile(req.user!.id);
  res.json({ success: true, message: 'OK', data: { profile } });
}));

router.patch('/me', requireAuth, validate(updateTutorProfileSchema), asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const profile = await tutorProfileService.updateMyProfile(req.user!.id, req.body);
  res.json({ success: true, message: 'Profile updated', data: { profile } });
}));

router.post('/me/documents', requireAuth, documentUpload.single('file'), asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  if (!req.file) throw new AppError(400, 'No file was provided', 'NO_FILE');
  const kind = req.body.kind as DocumentKind;
  if (!['photo', 'idFront', 'idBack', 'certificate', 'supportingDoc'].includes(kind)) {
    throw new AppError(400, 'Choose a valid document type', 'INVALID_DOCUMENT_KIND');
  }
  const profile = await tutorProfileService.uploadDocument(req.user!.id, kind, req.file.buffer, req.file.mimetype);
  res.json({ success: true, message: 'Document uploaded', data: { profile } });
}));

router.delete('/me/documents/:kind', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const kind = req.params.kind as DocumentKind;
  const url = typeof req.query.url === 'string' ? req.query.url : undefined;
  const profile = await tutorProfileService.deleteDocument(req.user!.id, kind, url);
  res.json({ success: true, message: 'Document removed', data: { profile } });
}));

router.post('/me/submit', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const profile = await tutorProfileService.submitForVerification(req.user!.id);
  res.json({ success: true, message: 'Submitted for verification', data: { profile } });
}));

router.get('/me/payout', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const payout = await payoutService.getPayoutDetails(req.user!.id);
  res.json({ success: true, message: 'OK', data: { payout } });
}));

router.post('/me/payout/resolve', requireAuth, validate(resolveAccountSchema), asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const payout = await payoutService.resolveAndSaveAccount(req.user!.id, req.body.bankCode, req.body.accountNumber);
  res.json({ success: true, message: 'Account verified', data: { payout } });
}));

export default router;
