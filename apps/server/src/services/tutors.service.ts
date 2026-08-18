import type { TutorProfile as PrismaTutorProfile } from '@prisma/client';
import type { PublicTutorDto, PublicTutorReviewDto } from '@mentora/shared';
import prisma from '../db.js';

type ProfileWithUser = PrismaTutorProfile & { user: { name: string; photoUrl: string | null } };

async function buildStatsMaps(tutorIds: string[]) {
  const [reviews, bookings, availability] = await Promise.all([
    prisma.review.findMany({
      where: { moderationStatus: 'PUBLISHED', booking: { tutorId: { in: tutorIds } } },
      select: { rating: true, booking: { select: { tutorId: true } } },
    }),
    prisma.booking.findMany({
      where: { tutorId: { in: tutorIds }, status: 'COMPLETED' },
      select: { tutorId: true, studentId: true },
      distinct: ['tutorId', 'studentId'],
    }),
    prisma.tutorAvailability.findMany({
      where: { tutorId: { in: tutorIds } },
      select: { tutorId: true, dayOfWeek: true },
      distinct: ['tutorId', 'dayOfWeek'],
    }),
  ]);

  const ratingMap = new Map<string, number[]>();
  for (const r of reviews) {
    const list = ratingMap.get(r.booking.tutorId) ?? [];
    list.push(r.rating);
    ratingMap.set(r.booking.tutorId, list);
  }

  const studentsMap = new Map<string, Set<string>>();
  for (const b of bookings) {
    const set = studentsMap.get(b.tutorId) ?? new Set<string>();
    set.add(b.studentId);
    studentsMap.set(b.tutorId, set);
  }

  const daysMap = new Map<string, number[]>();
  for (const a of availability) {
    const list = daysMap.get(a.tutorId) ?? [];
    list.push(a.dayOfWeek);
    daysMap.set(a.tutorId, list);
  }

  return { ratingMap, studentsMap, daysMap };
}

function toDto(
  profile: ProfileWithUser,
  ratingMap: Map<string, number[]>,
  studentsMap: Map<string, Set<string>>,
  daysMap: Map<string, number[]>,
): PublicTutorDto {
  const ratings = ratingMap.get(profile.userId) ?? [];
  const rating = ratings.length > 0 ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 10) / 10 : 0;

  return {
    id: profile.userId,
    name: profile.user.name,
    photoUrl: profile.photoUrl ?? profile.user.photoUrl,
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
    rating,
    reviewCount: ratings.length,
    studentsTaught: (studentsMap.get(profile.userId) ?? new Set()).size,
    availabilityDays: (daysMap.get(profile.userId) ?? []).sort((a, b) => a - b),
  };
}

export async function listApprovedTutors(): Promise<PublicTutorDto[]> {
  const profiles = await prisma.tutorProfile.findMany({
    where: { verificationStatus: 'APPROVED', user: { accountStatus: 'ACTIVE' } },
    include: { user: { select: { name: true, photoUrl: true } } },
  });
  if (profiles.length === 0) return [];

  const { ratingMap, studentsMap, daysMap } = await buildStatsMaps(profiles.map((p) => p.userId));
  return profiles.map((p) => toDto(p, ratingMap, studentsMap, daysMap));
}

export async function getApprovedTutorById(id: string): Promise<PublicTutorDto | null> {
  const profile = await prisma.tutorProfile.findUnique({
    where: { userId: id },
    include: { user: { select: { name: true, photoUrl: true } } },
  });
  if (!profile || profile.verificationStatus !== 'APPROVED') return null;
  const active = await prisma.user.count({ where: { id, accountStatus: 'ACTIVE' } });
  if (!active) return null;

  const { ratingMap, studentsMap, daysMap } = await buildStatsMaps([id]);
  return toDto(profile, ratingMap, studentsMap, daysMap);
}

export async function getTutorReviews(id: string): Promise<PublicTutorReviewDto[]> {
  const reviews = await prisma.review.findMany({
    where: { moderationStatus: 'PUBLISHED', booking: { tutorId: id, tutor: { accountStatus: 'ACTIVE', tutorProfile: { verificationStatus: 'APPROVED' } } } },
    include: { parent: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return reviews.map((r) => ({
    parentName: r.parent.name,
    rating: r.rating,
    body: r.body,
    createdAt: r.createdAt.toISOString(),
  }));
}
