import { z } from 'zod';

export const resolveAccountSchema = z.object({
  bankCode: z.string().min(1),
  accountNumber: z.string().trim().regex(/^\d{10}$/, 'Account number must be 10 digits'),
});
