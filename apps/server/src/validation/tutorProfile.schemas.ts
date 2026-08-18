import { z } from 'zod';
import { TUTOR_TEACHING_FORMATS, TUTOR_ID_TYPES } from '@mentora/shared';

export const updateTutorProfileSchema = z.object({
  professionalTitle: z.string().trim().max(160).optional(),
  bio: z.string().trim().max(300).optional(),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  languages: z.array(z.string().trim().max(40)).max(20).optional(),
  subjects: z.array(z.string().trim().max(60)).max(30).optional(),
  gradeLevels: z.array(z.string().trim().max(60)).max(10).optional(),
  yearsExperience: z.string().trim().max(40).optional(),
  qualification: z.string().trim().max(60).optional(),
  teachingFormats: z.array(z.enum(TUTOR_TEACHING_FORMATS)).max(2).optional(),
  sessionDurationMinutes: z.coerce.number().int().positive().max(480).optional(),
  sessionPrice: z.coerce.number().int().min(0).optional(),
  institutionName: z.string().trim().max(160).optional(),
  experienceDescription: z.string().trim().max(500).optional(),
  idType: z.enum(TUTOR_ID_TYPES).optional(),
  declarationAccurate: z.boolean().optional(),
  declarationMisinfo: z.boolean().optional(),
  declarationConsent: z.boolean().optional(),
  markProfileCompleted: z.boolean().optional(),
});

export const documentKindSchema = z.object({
  kind: z.enum(['photo', 'idFront', 'idBack', 'certificate', 'supportingDoc']),
});

export const deleteDocumentSchema = z.object({
  kind: z.enum(['photo', 'idFront', 'idBack', 'certificate', 'supportingDoc']),
  url: z.string().optional(),
});
