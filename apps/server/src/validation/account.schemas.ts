import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  location: z.string().trim().max(120).optional(),
});

export const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  bookingReminders: z.boolean().optional(),
  sessionReminders: z.boolean().optional(),
  messageNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
  reviewNotifications: z.boolean().optional(),
  announcements: z.boolean().optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  quietHoursEnd: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional(),
  contentFiltering: z.boolean().optional(),
  directMessaging: z.boolean().optional(),
  searchRestrictions: z.boolean().optional(),
  dailyScreenTimeLimit: z.coerce.number().int().min(0).max(1440).nullable().optional(),
  weeklyActivitySummary: z.boolean().optional(),
  unusualActivityAlerts: z.boolean().optional(),
});
