import type { MeetingInfo, UpdateMeetingPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { isMeetingParticipant, meetingAvailability, type MeetingViewer } from './meetingPolicy.js';

async function bookingForMeeting(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { student: { select: { fullName: true, accountUserId: true } } },
  });
  if (!booking) throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
  return booking;
}

export async function getMeeting(viewer: MeetingViewer, bookingId: string, now = new Date()): Promise<MeetingInfo> {
  const booking = await bookingForMeeting(bookingId);
  if (!isMeetingParticipant(viewer, booking)) {
    throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
  }
  if (booking.status === 'CANCELLED' || booking.approvalStatus === 'DECLINED') {
    throw new AppError(409, 'This session was cancelled', 'SESSION_CANCELLED');
  }
  if (booking.approvalStatus !== 'ACCEPTED') {
    throw new AppError(409, 'This session is awaiting tutor confirmation', 'SESSION_NOT_ACCEPTED');
  }
  const availability = meetingAvailability(booking, now);
  return {
    bookingId: booking.id,
    tutorName: booking.tutorName,
    studentName: booking.student.fullName,
    subject: booking.subject,
    date: booking.date.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    provider: booking.meetingProvider as MeetingInfo['provider'],
    availability,
    joinUrl: availability === 'READY' ? booking.meetingUrl : null,
  };
}

export async function updateMeeting(tutorId: string, bookingId: string, payload: UpdateMeetingPayload): Promise<void> {
  const booking = await bookingForMeeting(bookingId);
  if (booking.tutorId !== tutorId) throw new AppError(404, 'Session not found', 'SESSION_NOT_FOUND');
  if (booking.status !== 'CONFIRMED' || booking.approvalStatus !== 'ACCEPTED') {
    throw new AppError(409, 'Meeting details can only be set for an accepted upcoming session', 'SESSION_NOT_ACTIVE');
  }
  await prisma.booking.update({
    where: { id: bookingId },
    data: { meetingProvider: payload.provider, meetingUrl: payload.meetingUrl, meetingUpdatedAt: new Date() },
  });
}
