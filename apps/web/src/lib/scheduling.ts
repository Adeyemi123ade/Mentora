import type { Tutor, Availability } from '../data/tutors';
import { getWeeklySchedule } from '../data/tutors';

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dayLabelFor(date: Date): string {
  return DAY_ORDER[(date.getDay() + 6) % 7];
}

function parseTimeToMinutes(label: string): number {
  const match = label.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return NaN;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
}

function formatMinutesToLabel(totalMinutes: number): string {
  const hours24 = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function isPastDate(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compare = new Date(date);
  compare.setHours(0, 0, 0, 0);
  return compare < today;
}

export function isDateAvailable(tutor: Tutor, date: Date): boolean {
  if (isPastDate(date)) return false;
  const schedule = getWeeklySchedule(tutor.status);
  const entry = schedule.find((d) => d.day === dayLabelFor(date));
  return Boolean(entry?.hours);
}

export type TimeSlot = { start: string; end: string };

export function getTimeSlotsForDate(tutor: Tutor, date: Date): TimeSlot[] {
  const schedule = getWeeklySchedule(tutor.status);
  const entry = schedule.find((d) => d.day === dayLabelFor(date));
  if (!entry?.hours) return [];

  const [startLabel, endLabel] = entry.hours.split('–').map((s) => s.trim());
  const startMinutes = parseTimeToMinutes(startLabel);
  const endMinutes = parseTimeToMinutes(endLabel);
  if (Number.isNaN(startMinutes) || Number.isNaN(endMinutes)) return [];

  const slots: TimeSlot[] = [];
  for (let m = startMinutes; m + 60 <= endMinutes; m += 60) {
    slots.push({ start: formatMinutesToLabel(m), end: formatMinutesToLabel(m + 60) });
  }
  return slots;
}

export function formatBookingDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export type RealAvailabilitySlot = { id: string; dayOfWeek: number; startTime: string; endTime: string };

function parse24hToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isRealDateAvailable(slots: RealAvailabilitySlot[], date: Date): boolean {
  if (isPastDate(date)) return false;
  return slots.some((s) => s.dayOfWeek === date.getDay());
}

export function getRealTimeSlotsForDate(slots: RealAvailabilitySlot[], date: Date): TimeSlot[] {
  const dayOfWeek = date.getDay();
  const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek);
  const result: TimeSlot[] = [];
  for (const slot of daySlots) {
    const startMinutes = parse24hToMinutes(slot.startTime);
    const endMinutes = parse24hToMinutes(slot.endTime);
    for (let m = startMinutes; m + 60 <= endMinutes; m += 60) {
      result.push({ start: formatMinutesToLabel(m), end: formatMinutesToLabel(m + 60) });
    }
  }
  return result.sort((a, b) => parseTimeToMinutes(a.start) - parseTimeToMinutes(b.start));
}

const WEEKDAY_ORDER_MON_FIRST = [
  { label: 'Mon', jsDay: 1 },
  { label: 'Tue', jsDay: 2 },
  { label: 'Wed', jsDay: 3 },
  { label: 'Thu', jsDay: 4 },
  { label: 'Fri', jsDay: 5 },
  { label: 'Sat', jsDay: 6 },
  { label: 'Sun', jsDay: 0 },
];

export function formatRealWeeklySchedule(slots: RealAvailabilitySlot[]): { day: string; hours: string | null }[] {
  return WEEKDAY_ORDER_MON_FIRST.map(({ label, jsDay }) => {
    const daySlots = slots.filter((s) => s.dayOfWeek === jsDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (daySlots.length === 0) return { day: label, hours: null };
    const hours = daySlots
      .map((s) => `${formatMinutesToLabel(parse24hToMinutes(s.startTime))} – ${formatMinutesToLabel(parse24hToMinutes(s.endTime))}`)
      .join(', ');
    return { day: label, hours };
  });
}

export function describeRealAvailability(days: number[]): { bucket: Availability; label: string } {
  if (days.length === 0) return { bucket: 'weekdays', label: 'Availability not set yet' };
  const today = new Date().getDay();
  if (days.includes(today)) return { bucket: 'now', label: 'Available Today' };
  const hasWeekday = days.some((d) => d >= 1 && d <= 5);
  if (hasWeekday) return { bucket: 'weekdays', label: 'Available This Week' };
  return { bucket: 'weekends', label: 'Available Weekends' };
}
