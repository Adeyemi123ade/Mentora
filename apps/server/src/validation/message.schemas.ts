import { z } from 'zod';

export const startConversationSchema = z.object({
  counterpartId: z.string().min(1),
});

export const sendMessageSchema = z.object({
  body: z.string().trim().min(1).max(2000),
  studentId: z.string().min(1).optional(),
});
