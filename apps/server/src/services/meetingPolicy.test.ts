import { describe, expect, it } from 'vitest';
import { isMeetingParticipant, meetingAvailability, type MeetingBookingPolicyInput } from './meetingPolicy.js';

const booking: MeetingBookingPolicyInput = {
  parentId: 'parent-a',
  tutorId: 'tutor-a',
  student: { accountUserId: 'student-a' },
  date: new Date('2026-09-01T00:00:00.000Z'),
  startTime: '10:00',
  endTime: '11:00',
  status: 'CONFIRMED',
  approvalStatus: 'ACCEPTED',
  meetingUrl: 'https://meet.example/session-a',
};

describe('meeting participant authorization', () => {
  it('allows the booked parent', () => expect(isMeetingParticipant({ id: 'parent-a', role: 'PARENT' }, booking)).toBe(true));
  it('denies an unrelated parent', () => expect(isMeetingParticipant({ id: 'parent-b', role: 'PARENT' }, booking)).toBe(false));
  it('allows the linked student account', () => expect(isMeetingParticipant({ id: 'student-a', role: 'STUDENT' }, booking)).toBe(true));
  it('denies another student account', () => expect(isMeetingParticipant({ id: 'student-b', role: 'STUDENT' }, booking)).toBe(false));
  it('allows the booked tutor', () => expect(isMeetingParticipant({ id: 'tutor-a', role: 'TUTOR' }, booking)).toBe(true));
  it('denies an unrelated tutor', () => expect(isMeetingParticipant({ id: 'tutor-b', role: 'TUTOR' }, booking)).toBe(false));
  it('allows an authenticated admin', () => expect(isMeetingParticipant({ id: 'admin-a', role: 'ADMIN' }, booking)).toBe(true));
});

describe('meeting availability window', () => {
  it('does not expose an unconfigured URL', () => expect(meetingAvailability({ ...booking, meetingUrl: null }, new Date('2026-09-01T10:00:00Z'))).toBe('NOT_CONFIGURED'));
  it('keeps the URL unavailable before the join window', () => expect(meetingAvailability(booking, new Date('2026-09-01T09:44:59Z'))).toBe('TOO_EARLY'));
  it('allows joining from fifteen minutes before start', () => expect(meetingAvailability(booking, new Date('2026-09-01T09:45:00Z'))).toBe('READY'));
  it('ends access after the post-session grace period', () => expect(meetingAvailability(booking, new Date('2026-09-01T12:00:01Z'))).toBe('ENDED'));
  it('ends access when the booking is completed', () => expect(meetingAvailability({ ...booking, status: 'COMPLETED' }, new Date('2026-09-01T10:30:00Z'))).toBe('ENDED'));
});
