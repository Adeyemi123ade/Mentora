import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  refreshSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('./supabase', () => ({ supabase: { auth } }));

import { ApiError, apiRequest } from './api';

function response(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api authentication recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.getSession.mockResolvedValue({ data: { session: { access_token: 'old-token' } } });
    auth.signOut.mockResolvedValue({ error: null });
  });

  it('refreshes and retries once without logging out after a stale-token 401', async () => {
    auth.refreshSession.mockResolvedValue({ data: { session: { access_token: 'fresh-token' } }, error: null });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(401, { message: 'Invalid or expired session' }))
      .mockResolvedValueOnce(response(200, { data: { ok: true } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest<{ ok: boolean }>('/api/example');

    expect(result.data?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('preserves the stored session when refresh fails because of a temporary outage', async () => {
    auth.refreshSession.mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { message: 'Authentication service unavailable' })));

    await expect(apiRequest('/api/example')).rejects.toBeInstanceOf(ApiError);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('clears the local session only when Supabase confirms the refresh token is invalid', async () => {
    auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { status: 400, message: 'Invalid Refresh Token: Refresh Token Not Found' },
    });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(401, { message: 'Invalid or expired session' })));

    await expect(apiRequest('/api/example')).rejects.toBeInstanceOf(ApiError);
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('terminates the local session when the backend confirms the account is inactive', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response(403, {
      error: 'ACCOUNT_INACTIVE',
      message: 'This account has been deactivated.',
    })));

    await expect(apiRequest('/api/example')).rejects.toMatchObject({ status: 403, code: 'ACCOUNT_INACTIVE' });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
});
