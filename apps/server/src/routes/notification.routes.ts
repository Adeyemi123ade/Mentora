import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import * as notificationService from '../services/notification.service.js';

const router = Router();

router.get('/', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const notifications = await notificationService.listNotifications(req.user!.id);
  res.json({ success: true, message: 'OK', data: { notifications } });
}));

router.post('/:id/read', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const notification = await notificationService.markAsRead(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Notification marked as read', data: { notification } });
}));

router.post('/read-all', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllAsRead(req.user!.id);
  res.json({ success: true, message: 'All notifications marked as read' });
}));

export default router;
