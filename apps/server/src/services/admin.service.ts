import type { AdminPendingTutorDto, AdminInviteDto } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { supabaseAdmin } from '../lib/supabase.js';
import { env } from '../env.js';
import * as storageService from './storage.service.js';
import { sendAdminInviteEmail } from './email.service.js';

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

function toInviteDto(invite: { id: string; email: string; status: string; createdAt: Date; acceptedAt: Date | null; invitedBy: { name: string } }): AdminInviteDto {
  return {
    id: invite.id,
    email: invite.email,
    status: invite.status as AdminInviteDto['status'],
    invitedByName: invite.invitedBy.name,
    createdAt: invite.createdAt.toISOString(),
    acceptedAt: invite.acceptedAt ? invite.acceptedAt.toISOString() : null,
  };
}

export async function listInvites(): Promise<AdminInviteDto[]> {
  const invites = await prisma.adminInvite.findMany({
    include: { invitedBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return invites.map(toInviteDto);
}

/**
 * Invites a brand-new email address to become an admin. Only ever reachable through
 * requireAdmin-protected routes, and only ever creates ADMIN role via the pending
 * AdminInvite row that authService.syncUserFromSupabase checks on first materialization.
 */
export async function inviteAdmin(inviterId: string, inviterName: string, email: string): Promise<AdminInviteDto> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Admin invites are not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError(409, 'This email already has a Mentora account. Promote them to admin from the Users list instead.', 'EMAIL_ALREADY_REGISTERED');
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: `${env.CLIENT_URL}/accept-invite` },
  });

  if (error || !data?.properties?.action_link) {
    if (error && /already (been )?registered/i.test(error.message)) {
      throw new AppError(409, 'This email already has a Mentora account. Promote them to admin from the Users list instead.', 'EMAIL_ALREADY_REGISTERED');
    }
    console.error('[admin] Failed to generate invite link:', error?.message ?? 'no action_link in response');
    throw new AppError(502, 'Could not create the invite. Please try again.', 'INVITE_GENERATE_FAILED');
  }

  await sendAdminInviteEmail(email, inviterName, data.properties.action_link);

  const invite = await prisma.adminInvite.upsert({
    where: { email },
    update: { status: 'PENDING', invitedById: inviterId, acceptedAt: null },
    create: { email, invitedById: inviterId },
    include: { invitedBy: { select: { name: true } } },
  });

  await prisma.adminAuditLog.create({
    data: { adminId: inviterId, action: 'ADMIN_INVITE_SENT', entityType: 'AdminInvite', entityId: invite.id, metadata: { email } },
  });

  return toInviteDto(invite);
}

export async function revokeInvite(actorId: string, inviteId: string): Promise<void> {
  const invite = await prisma.adminInvite.findUnique({ where: { id: inviteId } });
  if (!invite) throw new AppError(404, 'Invite not found', 'INVITE_NOT_FOUND');
  if (invite.status !== 'PENDING') throw new AppError(400, 'Only pending invites can be revoked', 'INVITE_NOT_PENDING');

  await prisma.$transaction([
    prisma.adminInvite.update({ where: { id: inviteId }, data: { status: 'REVOKED' } }),
    prisma.adminAuditLog.create({ data: { adminId: actorId, action: 'ADMIN_INVITE_REVOKED', entityType: 'AdminInvite', entityId: inviteId, metadata: { email: invite.email } } }),
  ]);
}
