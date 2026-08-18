import type { AdminPendingTutorDto } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import * as storageService from './storage.service.js';

export async function listPendingTutors(): Promise<AdminPendingTutorDto[]> {
  const profiles = await prisma.tutorProfile.findMany({
    where: { verificationStatus: 'PENDING' },
    include: { user: { select: { id: true, name: true, email: true, photoUrl: true } } },
    orderBy: { submittedAt: 'asc' },
  });

  return Promise.all(profiles.map(async (p) => ({
    userId: p.userId,
    name: p.user.name,
    email: p.user.email,
    photoUrl: p.photoUrl ?? p.user.photoUrl,
    professionalTitle: p.professionalTitle,
    bio: p.bio,
    country: p.country,
    city: p.city,
    subjects: p.subjects,
    languages: p.languages,
    gradeLevels: p.gradeLevels,
    yearsExperience: p.yearsExperience,
    qualification: p.qualification,
    institutionName: p.institutionName,
    sessionPrice: p.sessionPrice,
    idType: p.idType,
    idFrontUrl: p.idFrontUrl ? await storageService.createDocumentSignedUrl(p.idFrontUrl) : null,
    idBackUrl: p.idBackUrl ? await storageService.createDocumentSignedUrl(p.idBackUrl) : null,
    certificateUrl: p.certificateUrl ? await storageService.createDocumentSignedUrl(p.certificateUrl) : null,
    supportingDocUrls: await Promise.all(p.supportingDocUrls.map((path) => storageService.createDocumentSignedUrl(path))),
    experienceDescription: p.experienceDescription,
    submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
  })));
}

async function findPendingProfile(userId: string) {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'Tutor profile not found', 'PROFILE_NOT_FOUND');
  if (profile.verificationStatus !== 'PENDING') {
    throw new AppError(400, 'This tutor is not awaiting review', 'NOT_PENDING');
  }
  return profile;
}

export async function approveTutor(userId: string, reviewerId: string): Promise<void> {
  const profile = await findPendingProfile(userId);
  await prisma.$transaction([
    prisma.tutorProfile.update({
      where: { userId },
      data: { verificationStatus: 'APPROVED', reviewedAt: new Date(), rejectionReason: null },
    }),
    prisma.notification.create({
      data: {
        userId,
        title: "You're verified!",
        body: 'Your tutor profile has been approved and is now visible to parents.',
      },
    }),
    prisma.tutorVerificationEvent.create({ data: { tutorProfileId: profile.id, reviewerId, status: 'APPROVED', snapshot: { submittedAt: profile.submittedAt, subjects: profile.subjects, qualification: profile.qualification } } }),
    prisma.adminAuditLog.create({ data: { adminId: reviewerId, action: 'TUTOR_APPROVED', entityType: 'TutorProfile', entityId: profile.id } }),
  ]);
}

export async function rejectTutor(userId: string, reason: string, reviewerId: string): Promise<void> {
  const profile = await findPendingProfile(userId);
  await prisma.$transaction([
    prisma.tutorProfile.update({
      where: { userId },
      data: { verificationStatus: 'REJECTED', reviewedAt: new Date(), rejectionReason: reason },
    }),
    prisma.notification.create({
      data: {
        userId,
        title: 'Verification update',
        body: `Your tutor verification wasn't approved: ${reason}`,
      },
    }),
    prisma.tutorVerificationEvent.create({ data: { tutorProfileId: profile.id, reviewerId, status: 'REJECTED', reason, snapshot: { submittedAt: profile.submittedAt, subjects: profile.subjects, qualification: profile.qualification } } }),
    prisma.adminAuditLog.create({ data: { adminId: reviewerId, action: 'TUTOR_REJECTED', entityType: 'TutorProfile', entityId: profile.id, reason } }),
  ]);
}
