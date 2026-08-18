import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createBookingSchema } from '../validation/booking.schemas.js';
import * as bookingService from '../services/booking.service.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));

router.post('/', validate(createBookingSchema), asyncHandler(async (req: Request, res: Response) => {
  const booking = await bookingService.createBooking(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Booking confirmed', data: { booking } });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const bookings = await bookingService.listBookings(req.user!.id);
  res.json({ success: true, message: 'OK', data: { bookings } });
}));

export default router;
