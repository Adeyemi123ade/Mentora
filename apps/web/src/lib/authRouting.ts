export type AuthRole = 'PARENT' | 'STUDENT' | 'TUTOR' | 'ADMIN';

type DestinationState = {
  studentCount?: number;
  tutorProfile?: {
    profileCompletedAt?: string | null;
    verificationStatus?: string;
  } | null;
};

export function resolveAuthDestination(role: AuthRole, state: DestinationState = {}): string {
  if (role === 'ADMIN') return '/admin';
  if (role === 'STUDENT') return '/student';
  if (role === 'TUTOR') {
    if (!state.tutorProfile?.profileCompletedAt) return '/onboarding/tutor-profile';
    if (!state.tutorProfile.verificationStatus || state.tutorProfile.verificationStatus === 'NOT_SUBMITTED') {
      return '/onboarding/tutor-verification';
    }
    return '/tutor';
  }
  if (role === 'PARENT' && state.studentCount === 0) return '/onboarding/add-student';
  return '/dashboard';
}
