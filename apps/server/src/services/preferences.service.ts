import type { UserPreferences as PrismaUserPreferences } from '@prisma/client';
import type { UserPreferences, UpdatePreferencesPayload } from '@mentora/shared';
import prisma from '../db.js';

function toPreferences(prefs: PrismaUserPreferences): UserPreferences {
  return {
    emailNotifications: prefs.emailNotifications,
    pushNotifications: prefs.pushNotifications,
    bookingReminders: prefs.bookingReminders,
    sessionReminders: prefs.sessionReminders,
    messageNotifications: prefs.messageNotifications,
    paymentNotifications: prefs.paymentNotifications,
    reviewNotifications: prefs.reviewNotifications,
    announcements: prefs.announcements,
    quietHoursEnabled: prefs.quietHoursEnabled,
    quietHoursStart: prefs.quietHoursStart,
    quietHoursEnd: prefs.quietHoursEnd,
    contentFiltering: prefs.contentFiltering,
    directMessaging: prefs.directMessaging,
    searchRestrictions: prefs.searchRestrictions,
    dailyScreenTimeLimit: prefs.dailyScreenTimeLimit,
    weeklyActivitySummary: prefs.weeklyActivitySummary,
    unusualActivityAlerts: prefs.unusualActivityAlerts,
  };
}

export async function getPreferences(userId: string): Promise<UserPreferences> {
  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return toPreferences(prefs);
}

export async function updatePreferences(userId: string, payload: UpdatePreferencesPayload): Promise<UserPreferences> {
  const prefs = await prisma.userPreferences.upsert({
    where: { userId },
    update: payload,
    create: { userId, ...payload },
  });
  return toPreferences(prefs);
}
