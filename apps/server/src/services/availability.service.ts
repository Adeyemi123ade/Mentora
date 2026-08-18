import type { AvailabilitySlot, CreateAvailabilitySlotPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

export async function listAvailability(tutorId: string): Promise<AvailabilitySlot[]> {
  const slots = await prisma.tutorAvailability.findMany({
    where: { tutorId },
    orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
  });
  return slots.map((s) => ({ id: s.id, dayOfWeek: s.dayOfWeek, startTime: s.startTime, endTime: s.endTime }));
}

export async function addAvailability(tutorId: string, payload: CreateAvailabilitySlotPayload): Promise<AvailabilitySlot> {
  if (payload.startTime >= payload.endTime) {
    throw new AppError(400, 'Start time must be before end time', 'INVALID_RANGE');
  }
  const overlap = await prisma.tutorAvailability.findFirst({
    where: {
      tutorId,
      dayOfWeek: payload.dayOfWeek,
      startTime: { lt: payload.endTime },
      endTime: { gt: payload.startTime },
    },
  });
  if (overlap) {
    throw new AppError(409, 'This time overlaps an existing availability slot', 'AVAILABILITY_OVERLAP');
  }
  const slot = await prisma.tutorAvailability.create({
    data: { tutorId, dayOfWeek: payload.dayOfWeek, startTime: payload.startTime, endTime: payload.endTime },
  });
  return { id: slot.id, dayOfWeek: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime };
}

export async function removeAvailability(tutorId: string, id: string): Promise<void> {
  const slot = await prisma.tutorAvailability.findUnique({ where: { id } });
  if (!slot || slot.tutorId !== tutorId) {
    throw new AppError(404, 'Availability slot not found', 'SLOT_NOT_FOUND');
  }
  await prisma.tutorAvailability.delete({ where: { id } });
}
