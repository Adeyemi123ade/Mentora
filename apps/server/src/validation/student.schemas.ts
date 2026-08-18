import { z } from 'zod';
import { GENDERS, SKILL_INTERESTS } from '@mentora/shared';

export const createStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(80),
  age: z.coerce.number().int().min(8).max(18).optional(),
  gender: z.enum(GENDERS).default('UNSPECIFIED'),
  grade: z.string().trim().max(40).optional(),
  interests: z.array(z.enum(SKILL_INTERESTS)).default([]),
  password: z.string().min(8).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
});

export const resetStudentPasswordSchema = z.object({
  password: z.string().min(8).max(72).regex(/[A-Z]/).regex(/[a-z]/).regex(/[0-9]/).regex(/[^A-Za-z0-9]/),
});

export const updateStudentSchema = z.object({
  fullName: z.string().trim().min(2).max(80).optional(),
  age: z.coerce.number().int().min(8).max(18).optional(),
  gender: z.enum(GENDERS).optional(),
  grade: z.string().trim().max(40).optional(),
  interests: z.array(z.enum(SKILL_INTERESTS)).optional(),
  overallProgress: z.coerce.number().int().min(0).max(100).optional(),
});
