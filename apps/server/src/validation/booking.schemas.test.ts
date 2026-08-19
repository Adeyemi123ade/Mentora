import { describe, expect, it } from 'vitest';
import { createBookingSchema } from './booking.schemas.js';

// Matches the exact shape apps/web/src/pages/BookingPage.tsx sends via
// formatDateForApi()/TimeSlot.startValue/endValue after the P0 fix.
const validPayload = {
  studentId: 'student-1',
  tutorId: 'tutor-1',
  tutorName: 'Amaka Okafor',
  tutorTitle: 'Mathematics Tutor',
  subject: 'Mathematics',
  format: 'ONE_ON_ONE',
  date: '2026-09-01',
  startTime: '09:00',
  endTime: '10:00',
  price: 5000,
  platformFee: 500,
  total: 5500,
  paymentSource: 'WALLET',
} as const;

describe('createBookingSchema', () => {
  it('accepts the exact payload shape the booking UI sends', () => {
    expect(createBookingSchema.safeParse(validPayload).success).toBe(true);
  });

  it('rejects 12-hour AM/PM time labels (regression: this broke every real booking)', () => {
    const result = createBookingSchema.safeParse({ ...validPayload, startTime: '9:00 AM', endTime: '10:00 AM' });
    expect(result.success).toBe(false);
  });

  it('accepts a valid morning time (09:00-10:00)', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '09:00', endTime: '10:00' }).success).toBe(true);
  });

  it('accepts a valid afternoon time (14:00-15:00)', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '14:00', endTime: '15:00' }).success).toBe(true);
  });

  it('accepts 24-hour start/end times across the full range', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '00:00', endTime: '01:00' }).success).toBe(true);
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '23:00', endTime: '23:30' }).success).toBe(true);
  });

  it('rejects a non-zero-padded hour (must be exactly HH:MM)', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '9:00', endTime: '10:00' }).success).toBe(false);
  });

  it('rejects an out-of-range hour', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '24:00', endTime: '24:30' }).success).toBe(false);
  });

  it('rejects a full ISO datetime for date (regression: Date#toISOString() broke every real booking)', () => {
    const result = createBookingSchema.safeParse({ ...validPayload, date: '2026-09-01T00:00:00.000Z' });
    expect(result.success).toBe(false);
  });

  it('accepts a plain YYYY-MM-DD date', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, date: '2026-09-01' }).success).toBe(true);
  });

  it('rejects endTime at or before startTime', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '10:00', endTime: '10:00' }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...validPayload, startTime: '10:00', endTime: '09:00' }).success).toBe(false);
  });

  it('requires a paystackReference when paying by card', () => {
    const result = createBookingSchema.safeParse({ ...validPayload, paymentSource: 'CARD' });
    expect(result.success).toBe(false);
  });

  it('accepts a card payment with a paystackReference', () => {
    const result = createBookingSchema.safeParse({ ...validPayload, paymentSource: 'CARD', paystackReference: 'ref_123' });
    expect(result.success).toBe(true);
  });

  it('rejects a missing studentId or tutorId', () => {
    expect(createBookingSchema.safeParse({ ...validPayload, studentId: '' }).success).toBe(false);
    expect(createBookingSchema.safeParse({ ...validPayload, tutorId: '' }).success).toBe(false);
  });
});
