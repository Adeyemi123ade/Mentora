import type { Booking, StudentOverview, StudentProgressSummary } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

async function linkedStudent(accountUserId: string) {
  const student = await prisma.student.findUnique({
    where: { accountUserId },
    include: { parent: true, tutorProgress: true },
  });
  if (!student) throw new AppError(404, 'This student account is not linked to a student profile.', 'STUDENT_PROFILE_NOT_LINKED');
  return student;
}

function studentDto(student: Awaited<ReturnType<typeof linkedStudent>>) {
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

function effectiveProgress(student: Awaited<ReturnType<typeof linkedStudent>>, completed: number, total: number): number {
  if (student.overallProgress !== null) return student.overallProgress;
  if (student.tutorProgress.length) {
    return Math.round(student.tutorProgress.reduce((sum, item) => sum + item.progressPercent, 0) / student.tutorProgress.length);
  }
  return total ? Math.round((completed / total) * 100) : 0;
}

export async function getOverview(accountUserId: string): Promise<StudentOverview> {
  const student = await linkedStudent(accountUserId);
  const bookings = await prisma.booking.findMany({ where: { studentId: student.id } });
  const completed = bookings.filter((item) => item.status === 'COMPLETED').length;
  const now = new Date();
  const upcoming = bookings.filter((item) => item.status === 'CONFIRMED' && item.date >= new Date(now.toDateString())).length;
  return {
    student: studentDto(student),
    parentName: student.parent.name,
    memberSince: student.createdAt.toISOString(),
    overallProgress: effectiveProgress(student, completed, bookings.length),
    lessonsCompleted: completed,
    totalLessons: bookings.length,
    upcomingLessons: upcoming,
  };
}

export async function listLessons(accountUserId: string): Promise<Booking[]> {
  const student = await linkedStudent(accountUserId);
  const bookings = await prisma.booking.findMany({
    where: { studentId: student.id },
    include: { student: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  return bookings.map((booking) => ({
    id: booking.id,
    studentId: booking.studentId,
    studentName: booking.student.fullName,
    studentGrade: booking.student.grade,
    tutorId: booking.tutorId,
    tutorName: booking.tutorName,
    tutorTitle: booking.tutorTitle,
    tutorPhotoUrl: booking.tutorPhotoUrl,
    subject: booking.subject,
    specificTopic: booking.specificTopic,
    format: booking.format,
    date: booking.date.toISOString(),
    startTime: booking.startTime,
    endTime: booking.endTime,
    message: booking.message,
    price: booking.price,
    platformFee: booking.platformFee,
    total: booking.total,
    status: booking.status,
    approvalStatus: booking.approvalStatus,
    createdAt: booking.createdAt.toISOString(),
  }));
}

export async function getProgress(accountUserId: string): Promise<StudentProgressSummary> {
  const student = await linkedStudent(accountUserId);
  const bookings = await prisma.booking.findMany({ where: { studentId: student.id } });
  const completed = bookings.filter((item) => item.status === 'COMPLETED').length;
  const subjects = new Map<string, { completed: number; total: number }>();
  for (const booking of bookings) {
    const current = subjects.get(booking.subject) ?? { completed: 0, total: 0 };
    current.total += 1;
    if (booking.status === 'COMPLETED') current.completed += 1;
    subjects.set(booking.subject, current);
  }
  return {
    overallProgress: effectiveProgress(student, completed, bookings.length),
    lessonsCompleted: completed,
    totalLessons: bookings.length,
    subjects: [...subjects.entries()].map(([subject, value]) => ({
      subject,
      progress: value.total ? Math.round((value.completed / value.total) * 100) : 0,
      completedLessons: value.completed,
      totalLessons: value.total,
    })),
  };
}
