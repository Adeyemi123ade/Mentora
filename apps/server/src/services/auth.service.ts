import { Prisma, type User } from '@prisma/client';
import type { UserSummary, UpdateProfilePayload, SignupPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { supabase, supabaseAdmin } from '../lib/supabase.js';
import { sendVerificationEmail } from './email.service.js';
import * as loginEventService from './loginEvent.service.js';

const SIGNUP_ROLE_VALUES = new Set(['PARENT', 'TUTOR']);

function toUserSummary(user: User): UserSummary {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified,
    photoUrl: user.photoUrl,
    phone: user.phone,
    location: user.location,
    createdAt: user.createdAt.toISOString(),
  };
}

function metadataName(metadata: Record<string, unknown> | undefined, fallback: string): string {
  if (typeof metadata?.name === 'string' && metadata.name.trim()) return metadata.name.trim();
  if (typeof metadata?.full_name === 'string' && metadata.full_name.trim()) return metadata.full_name.trim();
  return fallback;
}

function metadataRole(metadata: Record<string, unknown> | undefined): 'STUDENT' | 'PARENT' | 'TUTOR' | null {
  const role = metadata?.role;
  return typeof role === 'string' && SIGNUP_ROLE_VALUES.has(role) ? (role as 'STUDENT' | 'PARENT' | 'TUTOR') : null;
}

function metadataPhotoUrl(metadata: Record<string, unknown> | undefined): string | null {
  const avatar = metadata?.avatar_url;
  return typeof avatar === 'string' && avatar ? avatar : null;
}

/** Ensures a local `User` row exists for the given Supabase user and keeps it in sync. */
export async function syncUserFromSupabase(
  supabaseUser: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
    email_confirmed_at?: string | null;
  },
): Promise<UserSummary> {
  const email = supabaseUser.email ?? '';
  const name = metadataName(supabaseUser.user_metadata, email.split('@')[0] || 'Mentora user');
  const photoUrl = metadataPhotoUrl(supabaseUser.user_metadata);
  const emailVerified = Boolean(supabaseUser.email_confirmed_at);

  let user = await prisma.user.findUnique({ where: { supabaseUserId: supabaseUser.id } });

  if (!user) {
    user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { supabaseUserId: supabaseUser.id, emailVerified },
      });
    } else {
      user = await prisma.user.create({
        data: {
          supabaseUserId: supabaseUser.id,
          email,
          name,
          // Public users may only become parents or tutors. Student identities are
          // provisioned and linked by the parent-owned student workflow.
          role: metadataRole(supabaseUser.app_metadata) ?? 'PARENT',
          photoUrl,
          emailVerified,
        },
      });
    }
  }

  const nameChanged = user.name !== name;
  const emailChanged = user.email !== email;
  const photoChanged = photoUrl !== null && user.photoUrl !== photoUrl;
  const verificationChanged = user.emailVerified !== emailVerified;
  if (nameChanged || emailChanged || photoChanged || verificationChanged) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: nameChanged ? name : user.name,
        email: emailChanged ? email : user.email,
        photoUrl: photoChanged ? photoUrl : user.photoUrl,
        emailVerified,
      },
    });
  }

  return toUserSummary(user);
}

export async function getMe(userId: string): Promise<UserSummary> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  return toUserSummary(user);
}

export async function signInStudent(loginId: string, password: string) {
  const student = await prisma.student.findUnique({
    where: { loginId },
    include: { accountUser: true },
  });
  if (!student?.accountUser || student.accountUser.role !== 'STUDENT') {
    throw new AppError(401, 'The Student ID or password is incorrect.', 'INVALID_STUDENT_LOGIN');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: student.accountUser.email,
    password,
  });
  if (error || !data.session) {
    throw new AppError(401, 'The Student ID or password is incorrect.', 'INVALID_STUDENT_LOGIN');
  }
  await loginEventService.logEvent(student.accountUser.id, 'LOGIN');
  return { session: data.session, user: toUserSummary(student.accountUser) };
}

export async function updatePhoto(userId: string, photoUrl: string | null): Promise<UserSummary> {
  const user = await prisma.user.update({ where: { id: userId }, data: { photoUrl } });
  return toUserSummary(user);
}

export async function updateProfile(userId: string, payload: UpdateProfilePayload): Promise<UserSummary> {
  const user = await prisma.user.update({
    where: { id: userId },
    data: { name: payload.name, phone: payload.phone, location: payload.location },
  });
  return toUserSummary(user);
}

export async function logout(userId: string): Promise<void> {
  await loginEventService.logEvent(userId, 'LOGOUT');
}

/**
 * Creates an unconfirmed Supabase account without invoking hosted email, then
 * delivers the generated OTP through the API-owned SMTP configuration.
 */
export async function signup(payload: SignupPayload): Promise<UserSummary> {
  const { name, email, password, role } = payload;

  if (!supabaseAdmin) {
    throw new AppError(503, 'Sign-up is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { name },
    app_metadata: { role },
  });

  if (error) {
    if (/already (been )?registered/i.test(error.message)) {
      throw new AppError(409, 'An account with this email already exists. Try signing in instead.', 'EMAIL_TAKEN');
    }
    if (/fetch failed|network|unable to connect/i.test(error.message)) {
      throw new AppError(503, "We couldn't connect to the account service. Please try again in a few minutes.", 'AUTH_SERVICE_UNAVAILABLE');
    }
    console.error('[auth] Supabase signup failed:', error.message);
    throw new AppError(502, 'Could not create your account. Please try again.', 'SIGNUP_FAILED');
  }

  const authUser = data.user;
  if (!authUser) {
    throw new AppError(502, 'Could not create your account. Please try again.', 'SIGNUP_FAILED');
  }

  let user = await prisma.user.findUnique({ where: { email } });
  if (user) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: { supabaseUserId: authUser.id, emailVerified: false, role },
    });
  } else {
    user = await prisma.user.create({
      data: { supabaseUserId: authUser.id, email, name, role, emailVerified: false },
    });
  }

  await sendSignupOtp(email);

  return toUserSummary(user);
}

/** Generates a Supabase OTP and sends it through the API-owned SMTP provider. */
export async function sendSignupOtp(email: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Sign-up is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: {
      redirectTo: `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/verify?email=${encodeURIComponent(email)}`,
    },
  });

  if (error || !data?.properties?.email_otp) {
    console.error('[auth] Failed to generate signup OTP:', error?.message ?? 'no OTP in response');
    throw new AppError(502, 'Could not generate a verification code. Please try again.', 'OTP_GENERATE_FAILED');
  }

  await sendVerificationEmail(email, data.properties.email_otp);
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.CLIENT_URL ?? 'http://localhost:5173'}/reset-password`,
  });
  if (error) {
    throw new AppError(502, 'Could not send the password reset email. Please try again.', 'RESET_EMAIL_FAILED');
  }
}

export async function deleteAccount(userId: string, supabaseUserId: string): Promise<void> {
  if (!supabaseAdmin) {
    throw new AppError(503, 'Account deletion is not configured on this server yet', 'ADMIN_NOT_CONFIGURED');
  }

  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      throw new AppError(409, 'This account has booking history and can’t be deleted. Contact support to close it.', 'HAS_BOOKING_HISTORY');
    }
    throw err;
  }

  const { error } = await supabaseAdmin.auth.admin.deleteUser(supabaseUserId);
  if (error) {
    console.warn(`[auth] Public user ${userId} deleted but Supabase auth user cleanup failed: ${error.message}`);
  }
}
