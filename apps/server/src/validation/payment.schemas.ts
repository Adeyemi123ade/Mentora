import { z } from 'zod';
import { TRANSACTION_TYPES } from '@mentora/shared';

export const initializePaymentSchema = z.object({
  amount: z.coerce.number().int().positive(),
  purpose: z.enum(TRANSACTION_TYPES),
});

export const confirmReferenceSchema = z.object({
  reference: z.string().min(1),
});
