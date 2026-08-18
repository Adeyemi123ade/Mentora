import type { AccountSummary, ActivityOverview } from '@mentora/shared';
import prisma from '../db.js';

export async function getAccountSummary(userId: string): Promise<AccountSummary> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const [studentCount, totalBookings] = await Promise.all([
    prisma.student.count({ where: { parentId: userId } }),
    prisma.booking.count({ where: { parentId: userId, status: { not: 'CANCELLED' } } }),
  ]);

  return {
    studentCount,
    totalBookings,
    memberSince: user.createdAt.toISOString(),
  };
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

export async function getActivityOverview(userId: string): Promise<ActivityOverview> {
  const now = new Date();
  const bookings = await prisma.booking.findMany({
    where: { parentId: userId, status: { not: 'CANCELLED' } },
    select: { tutorId: true, date: true },
  });

  const pastBookings = bookings.filter((b) => b.date <= now);
  const totalSessionHours = pastBookings.length; // every session is a fixed 1-hour slot
  const sessionsCompleted = pastBookings.length;
  const tutorsWorkedWith = new Set(pastBookings.map((b) => b.tutorId)).size;

  const weekStarts = new Set(bookings.filter((b) => b.date <= now).map((b) => startOfWeek(b.date).getTime()));
  let bookingStreakWeeks = 0;
  const cursor = startOfWeek(now);
  while (weekStarts.has(cursor.getTime())) {
    bookingStreakWeeks += 1;
    cursor.setDate(cursor.getDate() - 7);
  }

  return { totalSessionHours, sessionsCompleted, tutorsWorkedWith, bookingStreakWeeks };
}
