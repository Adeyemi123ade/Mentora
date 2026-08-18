import { z } from 'zod';
import { GOAL_CATEGORIES } from '@mentora/shared';

export const createLearningGoalSchema = z.object({
  studentId: z.string().min(1),
  title: z.string().trim().min(2).max(120),
  category: z.enum(GOAL_CATEGORIES).default('GENERAL'),
  targetDate: z.string().min(1),
  progress: z.coerce.number().int().min(0).max(100).default(0),
});

export const updateLearningGoalSchema = z.object({
  title: z.string().trim().min(2).max(120).optional(),
  category: z.enum(GOAL_CATEGORIES).optional(),
  targetDate: z.string().min(1).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
});
