import type { Student as PrismaStudent } from '@prisma/client';
import type { CreateStudentPayload, Student, UpdateStudentPayload } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { randomBytes } from 'node:crypto';
import { supabaseAdmin } from '../lib/supabase.js';

function toStudent(student: PrismaStudent): Student {
  return {
    id: student.id,
    loginId: student.loginId,
    accessEnabled: Boolean(student.accountUserId),
    fullName: student.fullName,
    age: student.age,
    gender: student.gender,
    grade: student.grade,
    interests: student.interests,
    photoUrl: student.photoUrl,
    overallProgress: student.overallProgress,
  };
}

export async function createStudent(parentId: string, payload: CreateStudentPayload): Promise<Student> {
  if (!supabaseAdmin) throw new AppError(503, 'Student account creation is temporarily unavailable', 'AUTH_NOT_CONFIGURED');

  let loginId = '';
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = `MEN-${randomBytes(4).toString('hex').toUpperCase()}`;
    if (!(await prisma.student.findUnique({ where: { loginId: candidate } }))) {
      loginId = candidate;
      break;
    }
  }
  if (!loginId) throw new AppError(503, 'Could not generate a student login ID. Please try again.', 'LOGIN_ID_UNAVAILABLE');

  const internalEmail = `${loginId.toLowerCase()}@students.mentora.dev`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: internalEmail,
    password: payload.password,
    email_confirm: true,
    user_metadata: { name: payload.fullName },
    app_metadata: { role: 'STUDENT', login_id: loginId },
  });
  if (error || !data.user) {
    console.error('[student] Supabase account creation failed:', error?.message ?? 'No user returned');
    throw new AppError(502, 'Could not create the student login. Please try again.', 'STUDENT_AUTH_CREATE_FAILED');
  }

  let student: PrismaStudent;
  try {
    student = await prisma.$transaction(async (tx) => {
      const account = await tx.user.create({
        data: {
          supabaseUserId: data.user.id,
          email: internalEmail,
          name: payload.fullName,
          role: 'STUDENT',
          emailVerified: true,
        },
      });
      return tx.student.create({
        data: {
          parentId,
          accountUserId: account.id,
          loginId,
          fullName: payload.fullName,
          age: payload.age,
          gender: payload.gender,
          grade: payload.grade,
          interests: payload.interests,
        },
      });
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    throw err;
  }

  return toStudent(student);
}

export async function resetStudentPassword(parentId: string, studentId: string, password: string): Promise<Student> {
  if (!supabaseAdmin) throw new AppError(503, 'Student password reset is temporarily unavailable', 'AUTH_NOT_CONFIGURED');
  let student = await assertOwnership(parentId, studentId);
  if (student.accountUserId) {
    const account = await prisma.user.findUnique({ where: { id: student.accountUserId } });
    if (!account?.supabaseUserId) throw new AppError(409, 'This student login is not correctly linked', 'STUDENT_ACCOUNT_NOT_LINKED');
    const { error } = await supabaseAdmin.auth.admin.updateUserById(account.supabaseUserId, { password });
    if (error) throw new AppError(502, 'Could not update the student password. Please try again.', 'STUDENT_PASSWORD_UPDATE_FAILED');
    return toStudent(student);
  }

  const internalEmail = `${student.loginId.toLowerCase()}@students.mentora.dev`;
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
    user_metadata: { name: student.fullName },
    app_metadata: { role: 'STUDENT', login_id: student.loginId },
  });
  if (error || !data.user) {
    console.error('[student] Supabase account activation failed:', error?.message ?? 'No user returned');
    throw new AppError(502, 'Could not enable student access. Please try again.', 'STUDENT_AUTH_CREATE_FAILED');
  }
  try {
    student = await prisma.$transaction(async (tx) => {
      const account = await tx.user.create({ data: { supabaseUserId: data.user.id, email: internalEmail, name: student.fullName, role: 'STUDENT', emailVerified: true } });
      return tx.student.update({ where: { id: student.id }, data: { accountUserId: account.id } });
    });
  } catch (err) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    throw err;
  }
  return toStudent(student);
}

export async function listStudents(parentId: string): Promise<Student[]> {
  const students = await prisma.student.findMany({
    where: { parentId },
    orderBy: { createdAt: 'asc' },
  });

  return students.map(toStudent);
}

async function assertOwnership(parentId: string, studentId: string): Promise<PrismaStudent> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student || student.parentId !== parentId) {
    throw new AppError(404, 'Student not found', 'STUDENT_NOT_FOUND');
  }
  return student;
}

export async function getStudentPhotoUrl(parentId: string, studentId: string): Promise<string | null> {
  const student = await assertOwnership(parentId, studentId);
  return student.photoUrl;
}

export async function updateStudentPhoto(parentId: string, studentId: string, photoUrl: string | null): Promise<Student> {
  const existing = await assertOwnership(parentId, studentId);
  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({ where: { id: studentId }, data: { photoUrl } });
    if (existing.accountUserId) {
      await tx.user.update({ where: { id: existing.accountUserId }, data: { photoUrl } });
    }
    return updated;
  });
  return toStudent(student);
}

export async function updateStudent(parentId: string, studentId: string, payload: UpdateStudentPayload): Promise<Student> {
  const existing = await assertOwnership(parentId, studentId);
  const student = await prisma.$transaction(async (tx) => {
    const updated = await tx.student.update({
      where: { id: studentId },
      data: {
        fullName: payload.fullName,
        age: payload.age,
        gender: payload.gender,
        grade: payload.grade,
        interests: payload.interests,
        overallProgress: payload.overallProgress,
      },
    });
    if (existing.accountUserId && payload.fullName !== undefined) {
      await tx.user.update({ where: { id: existing.accountUserId }, data: { name: payload.fullName } });
    }
    return updated;
  });
  return toStudent(student);
}

export async function deleteStudent(parentId: string, studentId: string): Promise<void> {
  const student = await assertOwnership(parentId, studentId);
  const account = student.accountUserId
    ? await prisma.user.findUnique({ where: { id: student.accountUserId } })
    : null;

  if (account?.supabaseUserId) {
    if (!supabaseAdmin) throw new AppError(503, 'Student removal is temporarily unavailable', 'AUTH_NOT_CONFIGURED');
    const { error } = await supabaseAdmin.auth.admin.deleteUser(account.supabaseUserId);
    if (error) throw new AppError(502, 'Could not disable the student login. Please try again.', 'STUDENT_AUTH_DELETE_FAILED');
  }

  await prisma.$transaction(async (tx) => {
    await tx.student.delete({ where: { id: studentId } });
    if (account) await tx.user.delete({ where: { id: account.id } });
  });
}
