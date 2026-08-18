import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { validate } from '../middleware/validate.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { photoUpload, extensionFor } from '../lib/upload.js';
import { AppError } from '../lib/AppError.js';
import { updateProfileSchema, updatePreferencesSchema } from '../validation/account.schemas.js';
import * as authService from '../services/auth.service.js';
import * as storageService from '../services/storage.service.js';
import * as preferencesService from '../services/preferences.service.js';
import * as accountService from '../services/account.service.js';

const router = Router();

router.post('/me/photo', requireAuth, photoUpload.single('photo'), asyncHandler(async (req: Request, res: Response) => {
  if (!req.file) throw new AppError(400, 'No photo file was provided', 'NO_FILE');

  const previous = await authService.getMe(req.user!.id);
  const path = `users/${req.user!.id}-${Date.now()}.${extensionFor(req.file.mimetype)}`;
  const url = await storageService.uploadPhoto(path, req.file.buffer, req.file.mimetype);
  const user = await authService.updatePhoto(req.user!.id, url);
  await storageService.deletePhotoByUrl(previous.photoUrl);
  res.json({ success: true, message: 'Photo updated', data: { user } });
}));

router.delete('/me/photo', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const previous = await authService.getMe(req.user!.id);
  const user = await authService.updatePhoto(req.user!.id, null);
  await storageService.deletePhotoByUrl(previous.photoUrl);
  res.json({ success: true, message: 'Photo removed', data: { user } });
}));

router.patch('/me', requireAuth, validate(updateProfileSchema), asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.updateProfile(req.user!.id, req.body);
  res.json({ success: true, message: 'Profile updated', data: { user } });
}));

router.delete('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  await authService.deleteAccount(req.user!.id, req.user!.supabaseUserId!);
  res.json({ success: true, message: 'Account deleted' });
}));

router.get('/me/preferences', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const preferences = await preferencesService.getPreferences(req.user!.id);
  res.json({ success: true, message: 'OK', data: { preferences } });
}));

router.patch('/me/preferences', requireAuth, validate(updatePreferencesSchema), asyncHandler(async (req: Request, res: Response) => {
  const preferences = await preferencesService.updatePreferences(req.user!.id, req.body);
  res.json({ success: true, message: 'Preferences updated', data: { preferences } });
}));

router.get('/me/account-summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const summary = await accountService.getAccountSummary(req.user!.id);
  res.json({ success: true, message: 'OK', data: { summary } });
}));

router.get('/me/activity-overview', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const overview = await accountService.getActivityOverview(req.user!.id);
  res.json({ success: true, message: 'OK', data: { overview } });
}));

export default router;
