import { z } from 'zod';
import { REVIEW_TAGS } from '@mentora/shared';

export const createReviewSchema = z.object({
  bookingId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120),
  body: z.string().trim().min(2).max(1000),
  tags: z.array(z.enum(REVIEW_TAGS)).default([]),
});
