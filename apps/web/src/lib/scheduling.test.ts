import { describe, it, expect } from 'vitest';
import { TUTORS } from '../data/tutors';
import {
  isSameDate,
  isPastDate,
  isDateAvailable,
  getTimeSlotsForDate,
  getRealTimeSlotsForDate,
  formatRealWeeklySchedule,
  describeRealAvailability,
  formatDateForApi,
  type RealAvailabilitySlot,
} from './scheduling';

const TUTOR = TUTORS[0];

function nextWeekday(day: number): Date {
  const d = new Date();
  const diff = (day - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

const MONDAY = nextWeekday(1);
const SUNDAY = nextWeekday(0);

describe('isSameDate', () => {
  it('matches dates on the same calendar day', () => {
    expect(isSameDate(new Date(2026, 5, 15, 8, 30), new Date(2026, 5, 15, 23, 59))).toBe(true);
  });

  it('rejects different calendar days', () => {
    expect(isSameDate(new Date(2026, 5, 15), new Date(2026, 5, 16))).toBe(false);
  });
});

describe('isPastDate', () => {
  it('flags dates strictly before today', () => {
    expect(isPastDate(new Date(2026, 0, 1))).toBe(true);
  });

  it('accepts future dates', () => {
    expect(isPastDate(new Date(2100, 0, 1))).toBe(false);
  });
});

describe('getTimeSlotsForDate (static catalog)', () => {
  it('returns the full day of one-hour slots for an available weekday', () => {
    const slots = getTimeSlotsForDate(TUTOR, MONDAY);
    expect(slots).toHaveLength(12);
    expect(slots[0]).toEqual({ start: '9:00 AM', end: '10:00 AM', startValue: '09:00', endValue: '10:00' });
    expect(slots[slots.length - 1].start).toBe('8:00 PM');
  });

  it('returns no slots when the tutor has no hours that day', () => {
    expect(getTimeSlotsForDate(TUTOR, SUNDAY)).toHaveLength(0);
  });
});

describe('isDateAvailable', () => {
  it('accepts scheduled weekdays and rejects closed days and past dates', () => {
    expect(isDateAvailable(TUTOR, MONDAY)).toBe(true);
    expect(isDateAvailable(TUTOR, SUNDAY)).toBe(false);
    expect(isDateAvailable(TUTOR, new Date(2000, 0, 1))).toBe(false);
  });
});

describe('getRealTimeSlotsForDate', () => {
  const slots: RealAvailabilitySlot[] = [
    { id: 's1', dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
    { id: 's2', dayOfWeek: 1, startTime: '13:00', endTime: '14:00' },
    { id: 's3', dayOfWeek: 2, startTime: '10:00', endTime: '12:00' },
  ];

  it('builds hourly slots for the matching day only', () => {
    expect(getRealTimeSlotsForDate(slots, MONDAY)).toEqual([
      { start: '9:00 AM', end: '10:00 AM', startValue: '09:00', endValue: '10:00' },
      { start: '10:00 AM', end: '11:00 AM', startValue: '10:00', endValue: '11:00' },
      { start: '1:00 PM', end: '2:00 PM', startValue: '13:00', endValue: '14:00' },
    ]);
  });

  it('returns an empty list when the day has no availability', () => {
    expect(getRealTimeSlotsForDate(slots, SUNDAY)).toHaveLength(0);
  });
});

describe('formatDateForApi', () => {
  it('formats using local calendar components, not UTC conversion', () => {
    expect(formatDateForApi(new Date(2026, 7, 20))).toBe('2026-08-20');
  });

  it('zero-pads single-digit months and days', () => {
    expect(formatDateForApi(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('is not shifted by a positive UTC offset at local midnight', () => {
    // A date constructed at local midnight (as the booking calendar does) must
    // still resolve to the same calendar day the user clicked — the historical
    // bug used `date.toISOString().slice(0, 10)`, which rolls back a day for
    // any timezone ahead of UTC (including WAT, UTC+1).
    const localMidnight = new Date(2026, 7, 20, 0, 0, 0, 0);
    expect(formatDateForApi(localMidnight)).toBe('2026-08-20');
  });
});

describe('formatRealWeeklySchedule', () => {
  it('renders Mon-first labels with nulls for closed days', () => {
    const schedule = formatRealWeeklySchedule([
      { id: 's1', dayOfWeek: 1, startTime: '09:00', endTime: '11:00' },
      { id: 's2', dayOfWeek: 3, startTime: '10:00', endTime: '12:00' },
    ]);
    expect(schedule[0]).toEqual({ day: 'Mon', hours: '9:00 AM – 11:00 AM' });
    expect(schedule[2]).toEqual({ day: 'Wed', hours: '10:00 AM – 12:00 PM' });
    expect(schedule[1].hours).toBeNull();
    expect(schedule[3].hours).toBeNull();
    expect(schedule.map((d) => d.day)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  });
});

describe('describeRealAvailability', () => {
  it('reports unset availability', () => {
    expect(describeRealAvailability([])).toEqual({ bucket: 'weekdays', label: 'Availability not set yet' });
  });

  it('categorizes weekday-only availability', () => {
    const { bucket } = describeRealAvailability([1, 2, 3, 4, 5]);
    expect(['now', 'weekdays']).toContain(bucket);
  });

  it('categorizes weekend-only availability', () => {
    const { bucket } = describeRealAvailability([0, 6]);
    expect(['now', 'weekends']).toContain(bucket);
  });
});
