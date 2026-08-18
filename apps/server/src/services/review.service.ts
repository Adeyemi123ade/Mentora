import type { Review as PrismaReview, Booking } from '@prisma/client';
import type { CreateReviewPayload, Review, ReviewableBooking } from '@mentora/shared';
import prisma from '../db.js';
import { AppError } from '../lib/AppError.js';

type ReviewWithBooking = PrismaReview & { booking: Booking & { student: { fullName: string } } };

function toReview(review: ReviewWithBooking): Review {
  return {
    id: review.id,
    bookingId: review.bookingId,
    tutorId: review.booking.tutorId,
    tutorName: review.booking.tutorName,
    tutorTitle: review.booking.tutorTitle,
    tutorPhotoUrl: review.booking.tutorPhotoUrl,
    studentName: review.booking.student.fullName,
    sessionDate: review.booking.date.toISOString(),
    sessionStartTime: review.booking.startTime,
    rating: review.rating,
    title: review.title,
    body: review.body,
    tags: review.tags,
    createdAt: review.createdAt.toISOString(),
  };
}

export async function listReviews(parentId: string): Promise<Review[]> {
  const reviews = await prisma.review.findMany({
    where: { parentId },
    include: { booking: { include: { student: { select: { fullName: true } } } } },
    orderBy: { createdAt: 'desc' },
  });
  return reviews.map(toReview);
}

export async function listReviewableBookings(parentId: string): Promise<ReviewableBooking[]> {
  const bookings = await prisma.booking.findMany({
    where: {
      parentId,
      status: { not: 'CANCELLED' },
      date: { lt: new Date() },
      review: null,
    },
    include: { student: { select: { fullName: true } } },
    orderBy: { date: 'desc' },
  });

  return bookings.map((b) => ({
    id: b.id,
    tutorId: b.tutorId,
    tutorName: b.tutorName,
    tutorTitle: b.tutorTitle,
    tutorPhotoUrl: b.tutorPhotoUrl,
    studentName: b.student.fullName,
    subject: b.subject,
    date: b.date.toISOString(),
    startTime: b.startTime,
  }));
}

export async function createReview(parentId: string, payload: CreateReviewPayload): Promise<Review> {
  const booking = await prisma.booking.findUnique({ where: { id: payload.bookingId }, include: { review: true } });
  if (!booking || booking.parentId !== parentId) {
    throw new AppError(404, 'Booking not found', 'BOOKING_NOT_FOUND');
  }
  if (booking.status === 'CANCELLED') {
    throw new AppError(400, 'This session was cancelled and cannot be reviewed', 'BOOKING_CANCELLED');
  }
  if (booking.date > new Date()) {
    throw new AppError(400, 'This session has not happened yet', 'BOOKING_NOT_COMPLETED');
  }
  if (booking.review) {
    throw new AppError(409, "You've already reviewed this session", 'ALREADY_REVIEWED');
  }

  const review = await prisma.review.create({
    data: {
      parentId,
      bookingId: payload.bookingId,
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
      tags: payload.tags ?? [],
    },
    include: { booking: { include: { student: { select: { fullName: true } } } } },
  });

  return toReview(review);
}

export async function deleteReview(parentId: string, reviewId: string): Promise<void> {
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review || review.parentId !== parentId) {
    throw new AppError(404, 'Review not found', 'REVIEW_NOT_FOUND');
  }
  await prisma.review.delete({ where: { id: reviewId } });
}
