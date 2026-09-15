import { describe, expect, it } from 'vitest';
import { resolveAuthDestination, getReturnPath } from './authRouting';

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

describe('getReturnPath', () => {
  it('recovers the path RequireAuth redirected from', () => {
    expect(getReturnPath({ from: { pathname: '/admin/users/123', search: '' } })).toBe('/admin/users/123');
  });

  it('preserves the query string', () => {
    expect(getReturnPath({ from: { pathname: '/dashboard/tutors', search: '?q=math' } })).toBe('/dashboard/tutors?q=math');
  });

  it('returns null when there is no redirect state', () => {
    expect(getReturnPath(null)).toBeNull();
    expect(getReturnPath(undefined)).toBeNull();
    expect(getReturnPath({})).toBeNull();
  });

  it('refuses to send the user back to an auth page', () => {
    expect(getReturnPath({ from: { pathname: '/login' } })).toBeNull();
    expect(getReturnPath({ from: { pathname: '/' } })).toBeNull();
    expect(getReturnPath({ from: { pathname: '/student-login' } })).toBeNull();
  });

  it('ignores malformed state', () => {
    expect(getReturnPath({ from: { pathname: 42 } })).toBeNull();
    expect(getReturnPath({ from: null })).toBeNull();
    expect(getReturnPath('not an object')).toBeNull();
  });
});
