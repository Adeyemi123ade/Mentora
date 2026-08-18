import type { NavigateFunction } from 'react-router-dom';
import type { ApiResponse } from '@mentora/shared';
import { supabase } from './supabase';

// In development, use the same host that served the page. A hard-coded
// localhost points back to the user's device when testing from mobile/LAN.
const BASE_URL = import.meta.env.VITE_API_URL
  ?? (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:4000` : '');

export class ApiError extends Error {
  status: number;
  code?: string;
  fieldErrors?: Record<string, string[] | undefined>;

  constructor(status: number, message: string, code?: string, fieldErrors?: Record<string, string[] | undefined>) {
    super(message);
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

const NETWORK_ERROR_MESSAGE = "We can't connect to Mentora right now. Check your internet connection and try again. If the problem continues, please try again in a few minutes.";

function asNetworkError(error: unknown): never {
  if (error instanceof ApiError) throw error;
  if (error instanceof TypeError || (error instanceof Error && /failed to fetch|network|load failed/i.test(error.message))) {
    throw new ApiError(0, NETWORK_ERROR_MESSAGE, 'NETWORK_ERROR');
  }
  throw error;
}

async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
  const body: ApiResponse<T> = await res.json();

  if (!res.ok) {
    const code = typeof body.error === 'string' ? body.error : undefined;
    const fieldErrors = typeof body.error === 'object' && body.error !== null ? body.error : undefined;
    const firstFieldMessage = fieldErrors ? Object.values(fieldErrors).flat().find(Boolean) : undefined;
    throw new ApiError(res.status, firstFieldMessage ?? body.message ?? 'Request failed', code, fieldErrors);
  }

  return body;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function isAuthError(status: number, path: string): boolean {
  return status === 401 && path !== '/api/auth/me';
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const headers = { 'Content-Type': 'application/json', ...(await authHeaders()), ...options.headers };
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, credentials: 'include', headers });
  } catch (error) {
    asNetworkError(error);
  }

  if (isAuthError(res.status, path)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }

  return handleResponse<T>(res);
}

export async function apiUpload<T>(path: string, formData: FormData, method: 'POST' | 'PUT' = 'POST'): Promise<ApiResponse<T>> {
  const headers = await authHeaders();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, credentials: 'include', headers, body: formData });
  } catch (error) {
    asNetworkError(error);
  }

  if (isAuthError(res.status, path)) {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
  }

  return handleResponse<T>(res);
}

export async function logout(navigate: NavigateFunction): Promise<void> {
  await supabase.auth.signOut().catch(() => {});
  await apiRequest('/api/auth/logout', { method: 'POST' }).catch(() => {});
  navigate('/login');
}
