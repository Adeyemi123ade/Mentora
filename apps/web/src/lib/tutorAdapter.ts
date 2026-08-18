import type { PublicTutorDto } from '@mentora/shared';
import type { Tutor, CategoryKey, TutorType } from '../data/tutors';
import { describeRealAvailability } from './scheduling';

const SUBJECT_CATEGORY_HINTS: Record<CategoryKey, string[]> = {
  ai: ['ai', 'machine learning', 'deep learning', 'neural', 'artificial intelligence'],
  coding: ['web', 'javascript', 'react', 'node', 'python', 'java', 'flutter', 'mobile', 'software', 'programming', 'git', 'system design'],
  data: ['data', 'sql', 'excel', 'power bi', 'analytics', 'statistics'],
  speaking: ['speaking', 'debate', 'presentation', 'communication'],
  math: ['math', 'algebra', 'calculus', 'physics', 'chemistry', 'biology', 'science'],
  business: ['business', 'entrepreneur', 'finance', 'marketing', 'management', 'product'],
};

function inferCategory(subjects: string[]): CategoryKey {
  const text = subjects.join(' ').toLowerCase();
  for (const [key, hints] of Object.entries(SUBJECT_CATEGORY_HINTS) as [CategoryKey, string[]][]) {
    if (hints.some((h) => text.includes(h))) return key;
  }
  return 'coding';
}

function inferType(qualification: string | null): TutorType {
  if (qualification === "Master's Degree" || qualification === 'PhD / Doctorate') return 'expert';
  if (qualification === "Bachelor's Degree") return 'professional';
  return 'university';
}

function parseYears(bucket: string | null): number {
  if (!bucket) return 0;
  const match = bucket.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

/** Adapts a real, backend-driven tutor into the same shape the static catalog UI expects.
 * Fields with no real backing data (experience history, canned reviews, FAQs) are left
 * empty rather than fabricated — pages render those sections conditionally. */
export function adaptPublicTutor(dto: PublicTutorDto): Tutor {
  const { bucket, label } = describeRealAvailability(dto.availabilityDays);

  return {
    id: dto.id,
    name: dto.name,
    photo: dto.photoUrl ?? undefined,
    title: dto.professionalTitle ?? 'Tutor',
    category: inferCategory(dto.subjects),
    tags: dto.subjects,
    experienceYears: parseYears(dto.yearsExperience),
    rating: dto.rating,
    reviews: dto.reviewCount,
    education: dto.qualification ?? 'Not specified',
    availability: bucket,
    availabilityLabel: label,
    sessionTypes: dto.teachingFormats.includes('IN_PERSON') ? ['online', 'in-person'] : ['online'],
    price: dto.sessionPrice ?? 0,
    status: dto.availabilityDays.length > 0 ? 'Online' : 'Busy',
    type: inferType(dto.qualification),
    verified: true,
    location: [dto.city, dto.country].filter(Boolean).join(', '),
    bio: dto.bio ?? 'This tutor has not added a bio yet.',
    languages: dto.languages.map((name) => ({ name, level: '' })),
    educationDetail: [dto.qualification, dto.country].filter(Boolean).join(', ') || 'Not specified',
    expertise: dto.subjects,
    studentsTaught: dto.studentsTaught,
    experienceHistory: [],
    outcomes: [],
    ratingBreakdown: [],
    reviewsList: [],
    avgResponseTime: '',
    faqs: [],
  };
}
