import type {
  TutorDashboardSummary,
  TutorActivityItem,
  TutorBookingDto,
  TutorStudentDto,
  TutorReviewDto,
  ProfileStrength,
  TutorCalendarDay,
  TutorBookingsSummary,
  UpdateStudentProgressPayload,
} from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';
import { refundBookingPayment } from './payment.service.js';

export async function getSummary(tutorId: string): Promise<TutorDashboardSummary> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [totalBookings, upcomingSessions, unreadMessages, earningsBookings] = await Promise.all([
    prisma.booking.count({ where: { tutorId } }),
    prisma.booking.count({ where: { tutorId, date: { gt: now }, status: { not: 'CANCELLED' }, approvalStatus: 'ACCEPTED' } }),
    (async () => {
      const conversations = await prisma.conversation.findMany({ where: { tutorId }, select: { id: true } });
      if (conversations.length === 0) return 0;
      return prisma.message.count({
        where: { conversationId: { in: conversations.map((c) => c.id) }, senderId: { not: tutorId }, readAt: null },
      });
    })(),
    prisma.booking.findMany({
      where: { tutorId, status: { not: 'CANCELLED' }, approvalStatus: 'ACCEPTED', createdAt: { gte: startOfMonth } },
      select: { price: true },
    }),
  ]);

  const totalEarningsThisMonth = earningsBookings.reduce((sum, b) => sum + b.price, 0);

  return { totalBookings, upcomingSessions, unreadMessages, totalEarningsThisMonth };
}

export async function getActivity(tutorId: string): Promise<TutorActivityItem[]> {
  const [user, profile, bookings, reviews] = await Promise.all([
    prisma.user.findUnique({ where: { id: tutorId }, select: { createdAt: true } }),
    prisma.tutorProfile.findUnique({ where: { userId: tutorId } }),
    prisma.booking.findMany({ where: { tutorId }, orderBy: { createdAt: 'desc' }, take: 5, include: { parent: { select: { name: true } } } }),
    prisma.review.findMany({
      where: { booking: { tutorId } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { parent: { select: { name: true } } },
    }),
  ]);

  const items: TutorActivityItem[] = [];

  if (user) {
    items.push({
      id: 'welcome',
      kind: 'welcome',
      title: 'Welcome to Mentora!',
      description: 'Complete your setup to start receiving bookings.',
      createdAt: user.createdAt.toISOString(),
    });
  }

  if (profile?.submittedAt) {
    items.push({
      id: 'verification-submitted',
      kind: 'verification_submitted',
      title: 'Your profile is under review',
      description: "We'll notify you via email once it's approved.",
      createdAt: profile.submittedAt.toISOString(),
    });
  }

  if (profile?.verificationStatus === 'APPROVED') {
    items.push({
      id: 'verification-approved',
      kind: 'verification_approved',
      title: "You're verified!",
      description: 'Your profile is approved and visible to parents.',
      createdAt: profile.updatedAt.toISOString(),
    });
  }

  for (const b of bookings) {
    items.push({
      id: `booking-${b.id}`,
      kind: 'booking',
      title: 'New booking',
      description: `${b.parent.name} booked a ${b.subject} session.`,
      createdAt: b.createdAt.toISOString(),
    });
  }

  for (const r of reviews) {
    items.push({
      id: `review-${r.id}`,
      kind: 'review',
      title: 'New review',
      description: `${r.parent.name} left you a ${r.rating}-star review.`,
      createdAt: r.createdAt.toISOString(),
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);
}

export async function listBookings(tutorId: string): Promise<TutorBookingDto[]> {
  const bookings = await prisma.booking.findMany({
    where: { tutorId },
    include: {
      parent: { select: { name: true } },
      student: { select: { fullName: true, grade: true, photoUrl: true } },
    },
    orderBy: { date: 'desc' },
  });

  return bookings.map((b) => ({
    id: b.id,
    parentName: b.parent.name,
    studentName: b.student.fullName,
    studentGrade: b.student.grade,
    studentPhotoUrl: b.student.photoUrl,
    subject: b.subject,
    specificTopic: b.specificTopic,
    format: b.format,
    date: b.date.toISOString(),
    startTime: b.startTime,
    endTime: b.endTime,
    price: b.price,
    status: b.status,
    approvalStatus: b.approvalStatus,
  }));
}

export async function acceptBooking(tutorId: string, bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.tutorId !== tutorId) throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (booking.approvalStatus !== 'PENDING') throw new AppError(400, 'This booking has already been responded to', 'ALREADY_RESPONDED');

  await prisma.booking.update({ where: { id: bookingId }, data: { approvalStatus: 'ACCEPTED', respondedAt: new Date() } });
}

export async function declineBooking(tutorId: string, bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.tutorId !== tutorId) throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (booking.approvalStatus !== 'PENDING') throw new AppError(400, 'This booking has already been responded to', 'ALREADY_RESPONDED');

  await refundBookingPayment(bookingId);
  await prisma.booking.update({
    where: { id: bookingId },
    data: { approvalStatus: 'DECLINED', status: 'CANCELLED', respondedAt: new Date() },
  });
}

export async function cancelBooking(tutorId: string, bookingId: string): Promise<void> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.tutorId !== tutorId) throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  if (booking.status === 'CANCELLED') throw new AppError(400, 'This booking is already cancelled', 'ALREADY_CANCELLED');
  if (booking.status === 'COMPLETED') throw new AppError(400, 'Cannot cancel a completed session', 'ALREADY_COMPLETED');

  await refundBookingPayment(bookingId);
  await prisma.booking.update({ where: { id: bookingId }, data: { status: 'CANCELLED' } });
}

export async function getCalendarDays(tutorId: string, year: number, month: number): Promise<TutorCalendarDay[]> {
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 1);
  const bookings = await prisma.booking.findMany({
    where: { tutorId, date: { gte: start, lt: end }, status: { not: 'CANCELLED' }, approvalStatus: { not: 'DECLINED' } },
    select: { date: true },
  });

  const counts = new Map<string, number>();
  for (const b of bookings) {
    const key = b.date.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? null : 100;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getBookingsSummary(tutorId: string): Promise<TutorBookingsSummary> {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.booking.findMany({ where: { tutorId, createdAt: { gte: startOfThisMonth } } }),
    prisma.booking.findMany({ where: { tutorId, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } } }),
  ]);

  const totalBookings = thisMonth.length;
  const totalBookingsLast = lastMonth.length;
  const completed = thisMonth.filter((b) => b.status === 'COMPLETED').length;
  const completedLast = lastMonth.filter((b) => b.status === 'COMPLETED').length;
  const earnings = thisMonth.filter((b) => b.status !== 'CANCELLED' && b.approvalStatus === 'ACCEPTED').reduce((s, b) => s + b.price, 0);
  const earningsLast = lastMonth.filter((b) => b.status !== 'CANCELLED' && b.approvalStatus === 'ACCEPTED').reduce((s, b) => s + b.price, 0);
  const pending = thisMonth.filter((b) => b.approvalStatus === 'PENDING').length;
  const pendingLast = lastMonth.filter((b) => b.approvalStatus === 'PENDING').length;

  return {
    totalBookings,
    totalBookingsChangePercent: pctChange(totalBookings, totalBookingsLast),
    completed,
    completedChangePercent: pctChange(completed, completedLast),
    earnings,
    earningsChangePercent: pctChange(earnings, earningsLast),
    pending,
    pendingChangePercent: pctChange(pending, pendingLast),
  };
}

export async function listStudents(tutorId: string): Promise<TutorStudentDto[]> {
  const [bookings, progressRows, reviews] = await Promise.all([
    prisma.booking.findMany({
      where: { tutorId },
      include: { student: { select: { id: true, fullName: true, grade: true, photoUrl: true } } },
      orderBy: { date: 'desc' },
    }),
    prisma.tutorStudentProgress.findMany({ where: { tutorId } }),
    prisma.review.findMany({ where: { booking: { tutorId } }, select: { rating: true, booking: { select: { studentId: true } } } }),
  ]);

  const progressByStudent = new Map(progressRows.map((p) => [p.studentId, p]));
  const ratingsByStudent = new Map<string, number[]>();
  for (const r of reviews) {
    const list = ratingsByStudent.get(r.booking.studentId) ?? [];
    list.push(r.rating);
    ratingsByStudent.set(r.booking.studentId, list);
  }

  const byStudent = new Map<string, TutorStudentDto & { _subjects: Set<string> }>();
  for (const b of bookings) {
    const existing = byStudent.get(b.student.id);
    if (existing) {
      existing.sessionsCount += 1;
      existing._subjects.add(b.subject);
    } else {
      const progress = progressByStudent.get(b.student.id);
      const ratings = ratingsByStudent.get(b.student.id) ?? [];
      byStudent.set(b.student.id, {
        studentId: b.student.id,
        parentId: b.parentId,
        fullName: b.student.fullName,
        grade: b.student.grade,
        photoUrl: b.student.photoUrl,
        subjects: [],
        _subjects: new Set([b.subject]),
        sessionsCount: 1,
        lastSessionDate: b.date.toISOString(),
        progressPercent: progress?.progressPercent ?? 0,
        progressNote: progress?.note ?? null,
        rating: ratings.length > 0 ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10 : null,
        reviewCount: ratings.length,
      });
    }
  }

  return Array.from(byStudent.values()).map((s) => ({ ...s, subjects: Array.from(s._subjects) }));
}

export async function updateStudentProgress(tutorId: string, studentId: string, payload: UpdateStudentProgressPayload) {
  const hasBooking = await prisma.booking.findFirst({ where: { tutorId, studentId } });
  if (!hasBooking) throw new AppError(404, 'Student not found', 'STUDENT_NOT_FOUND');

  await prisma.tutorStudentProgress.upsert({
    where: { tutorId_studentId: { tutorId, studentId } },
    update: { progressPercent: payload.progressPercent, note: payload.note },
    create: { tutorId, studentId, progressPercent: payload.progressPercent, note: payload.note },
  });
}

export async function listReviews(tutorId: string): Promise<TutorReviewDto[]> {
  const reviews = await prisma.review.findMany({
    where: { booking: { tutorId } },
    include: { parent: { select: { name: true } }, booking: { select: { student: { select: { fullName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });

  return reviews.map((r) => ({
    id: r.id,
    parentName: r.parent.name,
    studentName: r.booking.student.fullName,
    rating: r.rating,
    title: r.title,
    body: r.body,
    tags: r.tags,
    createdAt: r.createdAt.toISOString(),
  }));
}

const PROFILE_STRENGTH_LABELS: [number, string][] = [
  [90, "You're all set!"],
  [70, 'Good start!'],
  [40, 'Keep going!'],
  [0, 'Just getting started'],
];

export async function getProfileStrength(tutorId: string): Promise<ProfileStrength> {
  const [profile, availabilityCount] = await Promise.all([
    prisma.tutorProfile.findUnique({ where: { userId: tutorId } }),
    prisma.tutorAvailability.count({ where: { tutorId } }),
  ]);

  const factors = [
    profile?.photoUrl,
    profile?.professionalTitle,
    profile?.bio,
    profile?.country,
    profile?.city,
    (profile?.languages.length ?? 0) > 0,
    (profile?.subjects.length ?? 0) > 0,
    (profile?.gradeLevels.length ?? 0) > 0,
    profile?.yearsExperience,
    profile?.qualification,
    (profile?.teachingFormats.length ?? 0) > 0,
    profile?.sessionDurationMinutes,
    profile?.sessionPrice !== null && profile?.sessionPrice !== undefined,
    availabilityCount > 0,
    Boolean(profile?.payoutVerifiedAt),
  ];

  const filled = factors.filter(Boolean).length;
  const percent = Math.round((filled / factors.length) * 100);
  const label = PROFILE_STRENGTH_LABELS.find(([threshold]) => percent >= threshold)?.[1] ?? 'Just getting started';

  return { percent, label };
}
