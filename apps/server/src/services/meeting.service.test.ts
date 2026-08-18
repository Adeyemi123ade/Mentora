import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  booking: { findUnique: vi.fn(), update: vi.fn() },
}));
vi.mock('../db.js', () => ({ default: db }));

import { getMeeting, updateMeeting } from './meeting.service.js';

const booking = {
  id: 'booking-a', parentId: 'parent-a', tutorId: 'tutor-a', tutorName: 'Tutor A',
  student: { fullName: 'Student A', accountUserId: 'student-a' }, subject: 'Math',
  date: new Date('2026-09-01T00:00:00Z'), startTime: '10:00', endTime: '11:00',
  status: 'CONFIRMED', approvalStatus: 'ACCEPTED', meetingProvider: 'GOOGLE_MEET',
  meetingUrl: 'https://meet.example/booking-a',
};

describe('meeting service authorization', () => {
  beforeEach(() => { vi.clearAllMocks(); db.booking.findUnique.mockResolvedValue(booking); db.booking.update.mockResolvedValue(booking); });

  it('returns a URL to the linked student during the access window', async () => {
    const result = await getMeeting({ id: 'student-a', role: 'STUDENT' }, 'booking-a', new Date('2026-09-01T10:00:00Z'));
    expect(result.joinUrl).toBe(booking.meetingUrl);
  });

  it('conceals the booking from an unrelated student', async () => {
    await expect(getMeeting({ id: 'student-b', role: 'STUDENT' }, 'booking-a')).rejects.toMatchObject({ statusCode: 404, code: 'SESSION_NOT_FOUND' });
  });

  it('conceals the booking from an unrelated tutor', async () => {
    await expect(getMeeting({ id: 'tutor-b', role: 'TUTOR' }, 'booking-a')).rejects.toMatchObject({ statusCode: 404, code: 'SESSION_NOT_FOUND' });
  });

  it('returns an intentional error for an invalid booking', async () => {
    db.booking.findUnique.mockResolvedValueOnce(null);
    await expect(getMeeting({ id: 'parent-a', role: 'PARENT' }, 'missing')).rejects.toMatchObject({ statusCode: 404, code: 'SESSION_NOT_FOUND' });
  });

  it('rejects a cancelled session without exposing its URL', async () => {
    db.booking.findUnique.mockResolvedValueOnce({ ...booking, status: 'CANCELLED' });
    await expect(getMeeting({ id: 'student-a', role: 'STUDENT' }, 'booking-a')).rejects.toMatchObject({ statusCode: 409, code: 'SESSION_CANCELLED' });
  });

  it('rejects a session that the tutor has not accepted', async () => {
    db.booking.findUnique.mockResolvedValueOnce({ ...booking, approvalStatus: 'PENDING' });
    await expect(getMeeting({ id: 'parent-a', role: 'PARENT' }, 'booking-a')).rejects.toMatchObject({ statusCode: 409, code: 'SESSION_NOT_ACCEPTED' });
  });

  it('allows only the booked tutor to update meeting details', async () => {
    await updateMeeting('tutor-a', 'booking-a', { provider: 'ZOOM', meetingUrl: 'https://zoom.example/booking-a' });
    expect(db.booking.update).toHaveBeenCalledOnce();
    await expect(updateMeeting('tutor-b', 'booking-a', { provider: 'ZOOM', meetingUrl: 'https://zoom.example/booking-a' })).rejects.toMatchObject({ statusCode: 404 });
  });
});
