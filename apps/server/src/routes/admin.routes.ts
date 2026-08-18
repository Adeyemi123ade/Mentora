import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireAdmin } from '../middleware/requireAdmin.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { rejectTutorSchema } from '../validation/admin.schemas.js';
import * as adminService from '../services/admin.service.js';
import * as operations from '../services/adminOperations.service.js';
import { z } from 'zod';

const router = Router();

router.use(requireAuth, requireAdmin);

router.get('/tutors/pending', asyncHandler(async (_req: Request, res: Response) => {
  const tutors = await adminService.listPendingTutors();
  res.json({ success: true, message: 'OK', data: { tutors } });
}));

router.post('/tutors/:userId/approve', asyncHandler(async (req: Request, res: Response) => {
  await adminService.approveTutor(req.params.userId, req.user!.id);
  res.json({ success: true, message: 'Tutor approved' });
}));

router.post('/tutors/:userId/reject', validate(rejectTutorSchema), asyncHandler(async (req: Request, res: Response) => {
  await adminService.rejectTutor(req.params.userId, req.body.reason, req.user!.id);
  res.json({ success: true, message: 'Tutor rejected' });
}));

const query = (req: Request) => ({ page: Number(req.query.page) || 1, pageSize: Number(req.query.pageSize) || 20, q: String(req.query.q ?? ''), role: req.query.role ? String(req.query.role) : undefined, status: req.query.status ? String(req.query.status) : undefined, type: req.query.type ? String(req.query.type) : undefined });
const reasonSchema = z.object({ body: z.object({ reason: z.string().trim().min(5).max(1000) }) });

router.get('/dashboard', asyncHandler(async (_req, res) => res.json({ success: true, message: 'OK', data: await operations.dashboard() })));
router.get('/search', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.globalSearch(String(req.query.q ?? '')) })));
router.get('/users', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listUsers(query(req)) })));
router.post('/users/:id/status', validate(z.object({ body: z.object({ status: z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED']), reason: z.string().trim().min(5).max(500) }) })), asyncHandler(async (req, res) => { await operations.setUserStatus(req.user!.id, req.params.id, req.body.status, req.body.reason); res.json({ success: true, message: 'Account status updated' }); }));
router.get('/bookings', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listBookings(query(req)) })));
router.post('/bookings/:id/cancel', validate(reasonSchema), asyncHandler(async (req, res) => { await operations.cancelBooking(req.user!.id, req.params.id, req.body.reason); res.json({ success: true, message: 'Booking cancelled and refund processed' }); }));
router.get('/transactions', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listTransactions(query(req)) })));
router.get('/disputes', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listDisputes(query(req)) })));
router.post('/disputes/:id/resolve', validate(z.object({ body: z.object({ status: z.enum(['UNDER_REVIEW', 'RESOLVED', 'CLOSED']), resolution: z.string().trim().min(5).max(2000), refund: z.boolean().default(false) }) })), asyncHandler(async (req, res) => { await operations.resolveDispute(req.user!.id, req.params.id, req.body.status, req.body.resolution, req.body.refund); res.json({ success: true, message: 'Dispute updated' }); }));
router.get('/reviews/tutors', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listReviewTutors(query(req)) })));
router.get('/reviews/tutors/:id', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.tutorReviews(req.params.id, Number(req.query.page) || 1, Number(req.query.pageSize) || 20, String(req.query.sort ?? 'recent')) })));
router.post('/reviews/:id/moderate', validate(z.object({ body: z.object({ status: z.enum(['PUBLISHED', 'FLAGGED', 'UNDER_REVIEW', 'REMOVED']), reason: z.string().trim().min(5).max(1000) }) })), asyncHandler(async (req, res) => { await operations.moderateReview(req.user!.id, req.params.id, req.body.status, req.body.reason); res.json({ success: true, message: 'Review moderation updated' }); }));
router.get('/support', asyncHandler(async (req, res) => res.json({ success: true, message: 'OK', data: await operations.listTickets(query(req)) })));
router.post('/support/:id/messages', validate(z.object({ body: z.object({ body: z.string().trim().min(1).max(5000), internal: z.boolean().default(false) }) })), asyncHandler(async (req, res) => { await operations.replyTicket(req.user!.id, req.params.id, req.body.body, req.body.internal); res.json({ success: true, message: req.body.internal ? 'Internal note added' : 'Reply sent' }); }));
router.patch('/support/:id', validate(z.object({ body: z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']), priority: z.enum(['LOW', 'MEDIUM', 'HIGH']) }) })), asyncHandler(async (req, res) => { await operations.updateTicket(req.user!.id, req.params.id, req.body.status, req.body.priority); res.json({ success: true, message: 'Ticket updated' }); }));
router.get('/settings', asyncHandler(async (_req, res) => res.json({ success: true, message: 'OK', data: { settings: await operations.getSettings() } })));
router.put('/settings', validate(z.object({ body: z.object({ values: z.record(z.unknown()) }) })), asyncHandler(async (req, res) => { await operations.saveSettings(req.user!.id, req.body.values); res.json({ success: true, message: 'Settings saved' }); }));

export default router;
