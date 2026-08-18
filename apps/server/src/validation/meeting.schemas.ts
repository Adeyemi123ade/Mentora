import { z } from 'zod';
export const updateMeetingSchema = z.object({
  provider: z.enum(['GOOGLE_MEET', 'ZOOM', 'MICROSOFT_TEAMS', 'OTHER']),
  meetingUrl: z.string().url().refine((value) => new URL(value).protocol === 'https:', {
    message: 'Meeting URL must use HTTPS',
  }),
});
