import { z } from 'zod';

export const saveTutorSchema = z.object({
  tutorId: z.string().min(1),
  note: z.string().trim().max(280).optional(),
});

export const updateSavedTutorSchema = z.object({
  note: z.string().trim().max(280),
});
