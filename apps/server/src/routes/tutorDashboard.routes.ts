import { Router, type Request, type Response } from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { AppError } from '../lib/AppError.js';
import * as tutorDashboardService from '../services/tutorDashboard.service.js';

const router = Router();

function requireTutor(req: Request): void {
  if (req.user!.role !== 'TUTOR') {
    throw new AppError(403, 'Only tutors have a dashboard', 'NOT_A_TUTOR');
  }
}

router.get('/summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const summary = await tutorDashboardService.getSummary(req.user!.id);
  res.json({ success: true, message: 'OK', data: { summary } });
}));

router.get('/activity', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const activity = await tutorDashboardService.getActivity(req.user!.id);
  res.json({ success: true, message: 'OK', data: { activity } });
}));

router.get('/profile-strength', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const strength = await tutorDashboardService.getProfileStrength(req.user!.id);
  res.json({ success: true, message: 'OK', data: { strength } });
}));

router.get('/bookings', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const bookings = await tutorDashboardService.listBookings(req.user!.id);
  res.json({ success: true, message: 'OK', data: { bookings } });
}));

router.post('/bookings/:id/accept', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  await tutorDashboardService.acceptBooking(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Booking accepted' });
}));

router.post('/bookings/:id/decline', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  await tutorDashboardService.declineBooking(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Booking declined and refunded' });
}));

router.post('/bookings/:id/cancel', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  await tutorDashboardService.cancelBooking(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Booking cancelled and refunded' });
}));

router.get('/bookings-summary', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const summary = await tutorDashboardService.getBookingsSummary(req.user!.id);
  res.json({ success: true, message: 'OK', data: { summary } });
}));

router.get('/calendar', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const year = Number(req.query.year);
  const month = Number(req.query.month);
  if (!Number.isInteger(year) || !Number.isInteger(month)) {
    throw new AppError(400, 'year and month query params are required', 'INVALID_QUERY');
  }
  const days = await tutorDashboardService.getCalendarDays(req.user!.id, year, month);
  res.json({ success: true, message: 'OK', data: { days } });
}));

router.get('/students', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const students = await tutorDashboardService.listStudents(req.user!.id);
  res.json({ success: true, message: 'OK', data: { students } });
}));

router.patch('/students/:id/progress', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const progressPercent = Number(req.body.progressPercent);
  if (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100) {
    throw new AppError(400, 'progressPercent must be an integer between 0 and 100', 'INVALID_PROGRESS');
  }
  await tutorDashboardService.updateStudentProgress(req.user!.id, req.params.id, {
    progressPercent,
    note: typeof req.body.note === 'string' ? req.body.note : undefined,
  });
  res.json({ success: true, message: 'Progress updated' });
}));

router.get('/reviews', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  requireTutor(req);
  const reviews = await tutorDashboardService.listReviews(req.user!.id);
  res.json({ success: true, message: 'OK', data: { reviews } });
}));

export default router;
