import { z } from 'zod';
import { BOOKING_FORMATS } from '@mentora/shared';

export const createBookingSchema = z
  .object({
    studentId: z.string().min(1),
    tutorId: z.string().min(1),
    tutorName: z.string().trim().min(1).max(120),
    tutorTitle: z.string().trim().min(1).max(160),
    tutorPhotoUrl: z.string().trim().max(2000).optional(),
    subject: z.string().trim().min(1).max(120),
    specificTopic: z.string().trim().max(250).optional(),
    format: z.enum(BOOKING_FORMATS),
    date: z.string().date(),
    startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid start time'),
    endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a valid end time'),
    message: z.string().trim().max(250).optional(),
    price: z.coerce.number().int().min(0),
    platformFee: z.coerce.number().int().min(0),
    total: z.coerce.number().int().min(0),
    paymentSource: z.enum(['CARD', 'WALLET']),
    paystackReference: z.string().min(1).optional(),
  })
  .refine((data) => data.paymentSource !== 'CARD' || Boolean(data.paystackReference), {
    message: 'paystackReference is required when paying by card',
    path: ['paystackReference'],
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'End time must be after start time',
    path: ['endTime'],
  });
