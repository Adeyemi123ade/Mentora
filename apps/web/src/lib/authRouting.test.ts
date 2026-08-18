import { describe, expect, it } from 'vitest';
import { resolveAuthDestination } from './authRouting';

describe('resolveAuthDestination', () => {
  it('sends a new parent to student onboarding', () => {
    expect(resolveAuthDestination('PARENT', { studentCount: 0 })).toBe('/onboarding/add-student');
  });

  it('sends an established parent and students to the dashboard', () => {
    expect(resolveAuthDestination('PARENT', { studentCount: 1 })).toBe('/dashboard');
    expect(resolveAuthDestination('STUDENT')).toBe('/student');
  });

  it('routes tutors through each onboarding stage', () => {
    expect(resolveAuthDestination('TUTOR')).toBe('/onboarding/tutor-profile');
    expect(resolveAuthDestination('TUTOR', { tutorProfile: { profileCompletedAt: '2026-01-01', verificationStatus: 'NOT_SUBMITTED' } })).toBe('/onboarding/tutor-verification');
    expect(resolveAuthDestination('TUTOR', { tutorProfile: { profileCompletedAt: '2026-01-01', verificationStatus: 'PENDING' } })).toBe('/tutor');
  });

  it('sends administrators to admin', () => {
    expect(resolveAuthDestination('ADMIN')).toBe('/admin');
  });
});
