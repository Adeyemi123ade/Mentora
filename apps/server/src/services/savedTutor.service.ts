import type { SavedTutor as PrismaSavedTutor } from '@prisma/client';
import type { SavedTutor, SaveTutorPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

function toSavedTutor(saved: PrismaSavedTutor): SavedTutor {
  return {
    id: saved.id,
    tutorId: saved.tutorId,
    note: saved.note,
    createdAt: saved.createdAt.toISOString(),
  };
}

export async function saveTutor(parentId: string, payload: SaveTutorPayload): Promise<SavedTutor> {
  const tutor = await prisma.user.findFirst({
    where: { id: payload.tutorId, role: 'TUTOR', accountStatus: 'ACTIVE', tutorProfile: { verificationStatus: 'APPROVED' } },
    select: { id: true },
  });
  if (!tutor) throw new AppError(404, 'Tutor not found', 'TUTOR_NOT_FOUND');
  const saved = await prisma.savedTutor.upsert({
    where: { parentId_tutorId: { parentId, tutorId: payload.tutorId } },
    update: {},
    create: { parentId, tutorId: payload.tutorId, note: payload.note },
  });
  return toSavedTutor(saved);
}

export async function listSavedTutors(parentId: string): Promise<SavedTutor[]> {
  const saved = await prisma.savedTutor.findMany({
    where: { parentId },
    orderBy: { createdAt: 'desc' },
  });
  return saved.map(toSavedTutor);
}

export async function updateSavedTutorNote(parentId: string, tutorId: string, note: string): Promise<SavedTutor> {
  const existing = await prisma.savedTutor.findUnique({ where: { parentId_tutorId: { parentId, tutorId } } });
  if (!existing) throw new AppError(404, 'This tutor is not in your saved list', 'SAVED_TUTOR_NOT_FOUND');

  const saved = await prisma.savedTutor.update({
    where: { parentId_tutorId: { parentId, tutorId } },
    data: { note },
  });
  return toSavedTutor(saved);
}

export async function unsaveTutor(parentId: string, tutorId: string): Promise<void> {
  await prisma.savedTutor.deleteMany({ where: { parentId, tutorId } });
}
