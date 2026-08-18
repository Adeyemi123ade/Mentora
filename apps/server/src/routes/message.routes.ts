import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { startConversationSchema, sendMessageSchema } from '../validation/message.schemas.js';
import * as messageService from '../services/message.service.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT', 'TUTOR'));

router.get('/conversations', asyncHandler(async (req: Request, res: Response) => {
  const conversations = await messageService.listConversations(req.user!);
  res.json({ success: true, message: 'OK', data: { conversations } });
}));

router.post('/conversations', validate(startConversationSchema), asyncHandler(async (req: Request, res: Response) => {
  const conversation = await messageService.startConversation(req.user!, req.body.counterpartId);
  res.status(201).json({ success: true, message: 'Conversation ready', data: { conversation } });
}));

router.get('/conversations/:id/messages', asyncHandler(async (req: Request, res: Response) => {
  const messages = await messageService.listMessages(req.user!, req.params.id);
  res.json({ success: true, message: 'OK', data: { messages } });
}));

router.post('/conversations/:id/messages', validate(sendMessageSchema), asyncHandler(async (req: Request, res: Response) => {
  const message = await messageService.sendMessage(req.user!, req.params.id, req.body);
  res.status(201).json({ success: true, message: 'Message sent', data: { message } });
}));

router.get('/conversations/:id/students', asyncHandler(async (req: Request, res: Response) => {
  const students = await messageService.listMessageableStudents(req.user!, req.params.id);
  res.json({ success: true, message: 'OK', data: { students } });
}));

router.get('/unread-count', asyncHandler(async (req: Request, res: Response) => {
  const count = await messageService.getUnreadCount(req.user!);
  res.json({ success: true, message: 'OK', data: { count } });
}));

router.get('/messageable-parents', asyncHandler(async (req: Request, res: Response) => {
  const parents = await messageService.listMessageableParents(req.user!);
  res.json({ success: true, message: 'OK', data: { parents } });
}));

router.get('/messageable-tutors', asyncHandler(async (req: Request, res: Response) => {
  const tutors = await messageService.listMessageableTutors(req.user!);
  res.json({ success: true, message: 'OK', data: { tutors } });
}));

export default router;
