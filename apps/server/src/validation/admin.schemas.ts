import { z } from 'zod';

export const rejectTutorSchema = z.object({
  reason: z.string().trim().min(10, 'Please give the tutor a specific reason (at least 10 characters)').max(500),
});
