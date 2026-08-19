import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({
  user: { findUnique: vi.fn() },
  adminInvite: { findUnique: vi.fn(), findMany: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  adminAuditLog: { create: vi.fn() },
  $transaction: vi.fn(),
}));
vi.mock('../db.js', () => ({ default: db }));

const supabaseMock = vi.hoisted(() => ({
  supabaseAdmin: { auth: { admin: { generateLink: vi.fn() } } },
}));
vi.mock('../lib/supabase.js', () => supabaseMock);

const emailMock = vi.hoisted(() => ({ sendAdminInviteEmail: vi.fn() }));
vi.mock('./email.service.js', () => emailMock);

// admin.service.ts also imports storage.service.js (for listPendingTutors'
// document signed URLs, not exercised below) — mock it so the real module
// never loads. It imports env.js directly, which throws at import time in
// any environment without DATABASE_URL/SUPABASE_* configured (e.g. CI).
vi.mock('./storage.service.js', () => ({ createDocumentSignedUrl: vi.fn() }));

import { inviteAdmin, listInvites, revokeInvite } from './admin.service.js';

const inviter = { id: 'admin-1', name: 'Ada Admin' };

beforeEach(() => {
  vi.clearAllMocks();
  db.user.findUnique.mockResolvedValue(null);
  supabaseMock.supabaseAdmin.auth.admin.generateLink.mockResolvedValue({
    data: { properties: { action_link: 'https://mentora.dev/accept-invite?token=abc' } },
    error: null,
  });
  emailMock.sendAdminInviteEmail.mockResolvedValue(undefined);
  db.adminInvite.upsert.mockResolvedValue({
    id: 'invite-1',
    email: 'new-admin@example.com',
    status: 'PENDING',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    acceptedAt: null,
    invitedBy: { name: inviter.name },
  });
  db.adminAuditLog.create.mockResolvedValue({});
});

describe('inviteAdmin', () => {
  it('sends an invite email and creates a PENDING AdminInvite for a brand-new email', async () => {
    const invite = await inviteAdmin(inviter.id, inviter.name, 'new-admin@example.com');

    expect(supabaseMock.supabaseAdmin.auth.admin.generateLink).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'invite', email: 'new-admin@example.com' })
    );
    expect(emailMock.sendAdminInviteEmail).toHaveBeenCalledWith(
      'new-admin@example.com',
      inviter.name,
      'https://mentora.dev/accept-invite?token=abc'
    );
    expect(db.adminInvite.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'new-admin@example.com' } })
    );
    expect(db.adminAuditLog.create).toHaveBeenCalledOnce();
    expect(invite).toEqual({
      id: 'invite-1',
      email: 'new-admin@example.com',
      status: 'PENDING',
      invitedByName: 'Ada Admin',
      createdAt: '2026-01-01T00:00:00.000Z',
      acceptedAt: null,
    });
  });

  it('rejects an email that already has a Mentora account without calling Supabase', async () => {
    db.user.findUnique.mockResolvedValueOnce({ id: 'existing-user' });

    await expect(inviteAdmin(inviter.id, inviter.name, 'parent@example.com')).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
    });
    expect(supabaseMock.supabaseAdmin.auth.admin.generateLink).not.toHaveBeenCalled();
    expect(emailMock.sendAdminInviteEmail).not.toHaveBeenCalled();
  });

  it('rejects with the same guidance when Supabase reports the email is already registered', async () => {
    supabaseMock.supabaseAdmin.auth.admin.generateLink.mockResolvedValueOnce({
      data: null,
      error: { message: 'Email address already registered' },
    });

    await expect(inviteAdmin(inviter.id, inviter.name, 'ghost@example.com')).rejects.toMatchObject({
      statusCode: 409,
      code: 'EMAIL_ALREADY_REGISTERED',
    });
  });

  it('surfaces a clear error when Supabase fails for another reason', async () => {
    supabaseMock.supabaseAdmin.auth.admin.generateLink.mockResolvedValueOnce({
      data: null,
      error: { message: 'Internal error' },
    });

    await expect(inviteAdmin(inviter.id, inviter.name, 'new-admin@example.com')).rejects.toMatchObject({
      statusCode: 502,
      code: 'INVITE_GENERATE_FAILED',
    });
    expect(emailMock.sendAdminInviteEmail).not.toHaveBeenCalled();
  });
});

describe('listInvites', () => {
  it('maps invite rows to DTOs', async () => {
    db.adminInvite.findMany.mockResolvedValue([
      { id: 'invite-1', email: 'a@example.com', status: 'PENDING', createdAt: new Date('2026-01-01T00:00:00Z'), acceptedAt: null, invitedBy: { name: 'Ada Admin' } },
      { id: 'invite-2', email: 'b@example.com', status: 'ACCEPTED', createdAt: new Date('2026-01-02T00:00:00Z'), acceptedAt: new Date('2026-01-03T00:00:00Z'), invitedBy: { name: 'Ada Admin' } },
    ]);
    const invites = await listInvites();
    expect(invites).toHaveLength(2);
    expect(invites[1]).toEqual({
      id: 'invite-2', email: 'b@example.com', status: 'ACCEPTED', invitedByName: 'Ada Admin',
      createdAt: '2026-01-02T00:00:00.000Z', acceptedAt: '2026-01-03T00:00:00.000Z',
    });
  });
});

describe('revokeInvite', () => {
  it('revokes a pending invite and writes an audit log entry', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'PENDING' });
    db.$transaction.mockResolvedValue([{}, {}]);

    await revokeInvite('admin-1', 'invite-1');
    expect(db.$transaction).toHaveBeenCalledOnce();
  });

  it('rejects revoking an invite that does not exist', async () => {
    db.adminInvite.findUnique.mockResolvedValue(null);
    await expect(revokeInvite('admin-1', 'missing')).rejects.toMatchObject({ statusCode: 404, code: 'INVITE_NOT_FOUND' });
  });

  it('rejects revoking an invite that is already accepted or revoked', async () => {
    db.adminInvite.findUnique.mockResolvedValue({ id: 'invite-1', email: 'a@example.com', status: 'ACCEPTED' });
    await expect(revokeInvite('admin-1', 'invite-1')).rejects.toMatchObject({ statusCode: 400, code: 'INVITE_NOT_PENDING' });
  });
});
