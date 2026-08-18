import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AccountSummary, UserSummary } from '@mentora/shared';
import { supabase } from '../lib/supabase';
import { apiRequest } from '../lib/api';
import { resolveAuthDestination } from '../lib/authRouting';

export type AppRole = 'PARENT' | 'STUDENT' | 'TUTOR' | 'ADMIN';

export type AppUser = UserSummary;

interface AuthContextValue {
  user: AppUser | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<AppUser>;
  signInStudent: (loginId: string, password: string) => Promise<AppUser>;
  signUp: (input: { email: string; password: string; name: string; role: AppRole }) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<AppUser>;
  resendSignupOtp: (email: string) => Promise<void>;
  refreshUser: () => Promise<AppUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [initializing, setInitializing] = useState(true);

  async function refreshUser(): Promise<AppUser | null> {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setUser(null);
      return null;
    }
    try {
      const res = await apiRequest<{ user: AppUser }>('/api/auth/me');
      if (res.data?.user) setUser(res.data.user);
      return res.data?.user ?? null;
    } catch {
      setUser(null);
      return null;
    }
  }

  useEffect(() => {
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) {
        void refreshUser().finally(() => setInitializing(false));
      } else {
        setInitializing(false);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        void refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(email: string, password: string): Promise<AppUser> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    const profile = await refreshUser();
    if (!profile) throw new Error('Could not load your profile.');
    return profile;
  }

  async function signInStudent(loginId: string, password: string): Promise<AppUser> {
    const response = await apiRequest<{
      session: { access_token: string; refresh_token: string };
      user: AppUser;
    }>('/api/auth/student-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loginId, password }),
    });
    const session = response.data?.session;
    if (!session) throw new Error('Mentora could not start your student session. Please try again.');
    const { error } = await supabase.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    if (error) throw error;
    const profile = await refreshUser();
    if (!profile) throw new Error('Could not load your student profile.');
    return profile;
  }

  async function signUp(input: { email: string; password: string; name: string; role: AppRole }): Promise<void> {
    await apiRequest<{ user: AppUser }>('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: input.email,
        password: input.password,
        name: input.name.trim(),
        role: input.role,
      }),
    });
  }

  async function verifyEmailOtp(email: string, token: string): Promise<AppUser> {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'magiclink' });
    if (error) throw error;
    const profile = await refreshUser();
    if (!profile) throw new Error('Could not load your profile after verification.');
    return profile;
  }

  async function resendSignupOtp(email: string): Promise<void> {
    await apiRequest('/api/auth/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
  }

  async function signInWithGoogle(): Promise<void> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw error;
  }

  async function sendPasswordResetEmail(email: string): Promise<void> {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  }

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signInStudent, signUp, signInWithGoogle, sendPasswordResetEmail, verifyEmailOtp, resendSignupOtp, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export function roleHome(role: AppRole): string {
  if (role === 'STUDENT') return '/student';
  if (role === 'TUTOR') return '/tutor';
  if (role === 'ADMIN') return '/admin';
  return '/dashboard';
}

/**
 * Determines where to send a user right after email verification / sign-in,
 * based on their role and (for tutors) how far they got in onboarding.
 */
export async function postAuthDestination(user: AppUser): Promise<string> {
  if (user.role === 'TUTOR') {
    try {
      const res = await apiRequest<{
        profile: { profileCompletedAt?: string | null; verificationStatus?: string };
      }>('/api/tutor-profile/me');
      const profile = res.data?.profile;
      return resolveAuthDestination(user.role, { tutorProfile: profile });
    } catch {
      return resolveAuthDestination(user.role);
    }
  }

  if (user.role === 'PARENT') {
    try {
      const res = await apiRequest<{ summary: AccountSummary }>('/api/users/me/account-summary');
      return resolveAuthDestination(user.role, { studentCount: res.data?.summary.studentCount ?? 0 });
    } catch {
      return resolveAuthDestination(user.role);
    }
  }

  return resolveAuthDestination(user.role);
}
