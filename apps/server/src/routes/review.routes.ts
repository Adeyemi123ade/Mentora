import { Router, type Request, type Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';
import { asyncHandler } from '../lib/asyncHandler.js';
import { createReviewSchema } from '../validation/review.schemas.js';
import * as reviewService from '../services/review.service.js';

const router = Router();
router.use(requireAuth, requireRole('PARENT'));

router.post('/', validate(createReviewSchema), asyncHandler(async (req: Request, res: Response) => {
  const review = await reviewService.createReview(req.user!.id, req.body);
  res.status(201).json({ success: true, message: 'Review submitted', data: { review } });
}));

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  const reviews = await reviewService.listReviews(req.user!.id);
  res.json({ success: true, message: 'OK', data: { reviews } });
}));

router.get('/reviewable-bookings', asyncHandler(async (req: Request, res: Response) => {
  const bookings = await reviewService.listReviewableBookings(req.user!.id);
  res.json({ success: true, message: 'OK', data: { bookings } });
}));

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  await reviewService.deleteReview(req.user!.id, req.params.id);
  res.json({ success: true, message: 'Review removed' });
}));

export default router;
