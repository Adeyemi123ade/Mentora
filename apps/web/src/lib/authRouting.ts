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

// Paths a user could have been "returning to" that don't make sense to redirect
// back into after signing in (they'd just bounce right back to /login, etc.).
const NON_RETURNABLE_PATHS = ['/', '/login', '/student-login', '/verify', '/forgot-password', '/reset-password', '/auth/callback', '/accept-invite'];

/**
 * Recovers the route RequireAuth redirected away from (passed via router state
 * when it sent the user to /login), so a fresh sign-in can restore them to
 * where they were instead of always landing on their role's default home.
 */
export function getReturnPath(state: unknown): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) return null;
  const from = (state as { from?: unknown }).from;
  if (!from || typeof from !== 'object' || !('pathname' in from)) return null;
  const pathname = (from as { pathname?: unknown }).pathname;
  if (typeof pathname !== 'string' || !pathname.startsWith('/') || NON_RETURNABLE_PATHS.includes(pathname)) return null;
  const search = (from as { search?: unknown }).search;
  return pathname + (typeof search === 'string' ? search : '');
}
