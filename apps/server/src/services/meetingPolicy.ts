import type { Role } from '@prisma/client';
import type { MeetingAvailability } from '@mentora/shared';

export type MeetingViewer = { id: string; role: Role };
export type MeetingBookingPolicyInput = {
  parentId: string;
  tutorId: string;
  student: { accountUserId: string | null };
  date: Date;
  startTime: string;
  endTime: string;
  status: 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
  approvalStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  meetingUrl: string | null;
};

export function isMeetingParticipant(viewer: MeetingViewer, booking: MeetingBookingPolicyInput): boolean {
  if (viewer.role === 'ADMIN') return true;
  if (viewer.role === 'PARENT') return booking.parentId === viewer.id;
  if (viewer.role === 'TUTOR') return booking.tutorId === viewer.id;
  return booking.student.accountUserId === viewer.id;
}

function atBookingTime(date: Date, time: string): Date {
  const day = date.toISOString().slice(0, 10);
  return new Date(`${day}T${time}:00.000Z`);
}

export function meetingAvailability(booking: MeetingBookingPolicyInput, now: Date): MeetingAvailability {
  if (!booking.meetingUrl) return 'NOT_CONFIGURED';
  const opensAt = new Date(atBookingTime(booking.date, booking.startTime).getTime() - 15 * 60_000);
  const closesAt = new Date(atBookingTime(booking.date, booking.endTime).getTime() + 60 * 60_000);
  if (now < opensAt) return 'TOO_EARLY';
  if (now > closesAt || booking.status === 'COMPLETED') return 'ENDED';
  return 'READY';
}
