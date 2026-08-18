import type { TutorProfile as PrismaTutorProfile } from '@prisma/client';
import type { TutorProfileDto, UpdateTutorProfilePayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import * as storageService from './storage.service.js';
import * as authService from './auth.service.js';
import { extensionFor } from '../lib/upload.js';

export type DocumentKind = 'photo' | 'idFront' | 'idBack' | 'certificate' | 'supportingDoc';

const SINGLE_FIELD_FOR_KIND: Record<Exclude<DocumentKind, 'supportingDoc'>, 'photoUrl' | 'idFrontUrl' | 'idBackUrl' | 'certificateUrl'> = {
  photo: 'photoUrl',
  idFront: 'idFrontUrl',
  idBack: 'idBackUrl',
  certificate: 'certificateUrl',
};

function toDto(profile: PrismaTutorProfile): TutorProfileDto {
  return {
    photoUrl: profile.photoUrl,
    professionalTitle: profile.professionalTitle,
    bio: profile.bio,
    country: profile.country,
    city: profile.city,
    languages: profile.languages,
    subjects: profile.subjects,
    gradeLevels: profile.gradeLevels,
    yearsExperience: profile.yearsExperience,
    qualification: profile.qualification,
    teachingFormats: profile.teachingFormats,
    sessionDurationMinutes: profile.sessionDurationMinutes,
    sessionPrice: profile.sessionPrice,
    profileCompletedAt: profile.profileCompletedAt ? profile.profileCompletedAt.toISOString() : null,
    idType: profile.idType,
    idFrontUrl: profile.idFrontUrl,
    idBackUrl: profile.idBackUrl,
    institutionName: profile.institutionName,
    certificateUrl: profile.certificateUrl,
    supportingDocUrls: profile.supportingDocUrls,
    experienceDescription: profile.experienceDescription,
    declarationAccurate: profile.declarationAccurate,
    declarationMisinfo: profile.declarationMisinfo,
    declarationConsent: profile.declarationConsent,
    verificationStatus: profile.verificationStatus,
    submittedAt: profile.submittedAt ? profile.submittedAt.toISOString() : null,
    reviewedAt: profile.reviewedAt ? profile.reviewedAt.toISOString() : null,
    rejectionReason: profile.rejectionReason,
    payoutAccountName: profile.payoutAccountName,
    payoutVerifiedAt: profile.payoutVerifiedAt ? profile.payoutVerifiedAt.toISOString() : null,
  };
}

export async function getMyProfile(userId: string): Promise<TutorProfileDto> {
  const profile = await prisma.tutorProfile.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
  return toDto(profile);
}

export async function updateMyProfile(userId: string, payload: UpdateTutorProfilePayload): Promise<TutorProfileDto> {
  const { markProfileCompleted, ...fields } = payload;
  const data: Record<string, unknown> = { ...fields };
  if (markProfileCompleted) data.profileCompletedAt = new Date();

  const profile = await prisma.tutorProfile.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
  return toDto(profile);
}

export async function uploadDocument(userId: string, kind: DocumentKind, buffer: Buffer, mimetype: string): Promise<TutorProfileDto> {
  const path = `tutor-profiles/${userId}/${kind}-${Date.now()}.${extensionFor(mimetype)}`;
  const url = kind === 'photo'
    ? await storageService.uploadPhoto(path, buffer, mimetype)
    : await storageService.uploadPrivateDocument(path, buffer, mimetype);

  if (kind === 'supportingDoc') {
    const profile = await prisma.tutorProfile.upsert({
      where: { userId },
      update: { supportingDocUrls: { push: url } },
      create: { userId, supportingDocUrls: [url] },
    });
    return toDto(profile);
  }

  const field = SINGLE_FIELD_FOR_KIND[kind];
  const previous = await prisma.tutorProfile.findUnique({ where: { userId } });
  const profile = await prisma.tutorProfile.upsert({
    where: { userId },
    update: { [field]: url },
    create: { userId, [field]: url },
  });
  if (previous) {
    const previousValue = (previous as unknown as Record<string, string | null>)[field];
    if (kind === 'photo') await storageService.deletePhotoByUrl(previousValue);
    else await storageService.deletePrivateDocument(previousValue);
  }
  if (kind === 'photo') await authService.updatePhoto(userId, url);
  return toDto(profile);
}

export async function deleteDocument(userId: string, kind: DocumentKind, url?: string): Promise<TutorProfileDto> {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'Tutor profile not found', 'PROFILE_NOT_FOUND');

  if (kind === 'supportingDoc') {
    if (!url) throw new AppError(400, 'url is required to remove a supporting document', 'URL_REQUIRED');
    await storageService.deletePrivateDocument(url);
    const updated = await prisma.tutorProfile.update({
      where: { userId },
      data: { supportingDocUrls: profile.supportingDocUrls.filter((u) => u !== url) },
    });
    return toDto(updated);
  }

  const field = SINGLE_FIELD_FOR_KIND[kind];
  const previous = (profile as unknown as Record<string, string | null>)[field];
  if (kind === 'photo') await storageService.deletePhotoByUrl(previous);
  else await storageService.deletePrivateDocument(previous);
  const updated = await prisma.tutorProfile.update({ where: { userId }, data: { [field]: null } });
  if (kind === 'photo') await authService.updatePhoto(userId, null);
  return toDto(updated);
}

export async function submitForVerification(userId: string): Promise<TutorProfileDto> {
  const profile = await prisma.tutorProfile.findUnique({ where: { userId } });
  if (!profile) throw new AppError(404, 'Tutor profile not found', 'PROFILE_NOT_FOUND');

  const missing: string[] = [];
  if (!profile.idType || !profile.idFrontUrl) missing.push('Identity verification');
  if (!profile.qualification || !profile.institutionName || !profile.certificateUrl) missing.push('Education / Qualification');
  if (!profile.yearsExperience || !profile.experienceDescription) missing.push('Experience & supporting evidence');
  if (!profile.declarationAccurate || !profile.declarationMisinfo || !profile.declarationConsent) missing.push('Declaration & Consent');

  if (missing.length > 0) {
    throw new AppError(400, `Please complete: ${missing.join(', ')}`, 'INCOMPLETE_VERIFICATION');
  }

  const updated = await prisma.tutorProfile.update({
    where: { userId },
    data: { verificationStatus: 'PENDING', submittedAt: new Date() },
  });
  return toDto(updated);
}
