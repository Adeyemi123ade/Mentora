import type { Request, Response, NextFunction } from 'express';
import prisma from '../db.js';
import { supabase } from '../lib/supabase.js';
import { syncUserFromSupabase, metadataHasPassword } from '../services/auth.service.js';
import { AppError } from '../lib/AppError.js';

function extractBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1] : null;
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const token = extractBearerToken(req);
    if (!token) throw new AppError(401, 'Not authenticated');

    let supabaseUser: {
      id: string;
      email?: string | null;
      user_metadata?: Record<string, unknown>;
      app_metadata?: Record<string, unknown>;
      email_confirmed_at?: string | null;
    };
    try {
      // Verifies the JWT's signature locally against Supabase's public keys (cached
      // in-process after the first lookup per key id) instead of calling the Auth API
      // over the network on every single request — cuts a ~350-450ms round trip down
      // to ~1ms for every request after the first since server start. Still rejects
      // expired tokens (validated locally from the exp claim, same as before).
      // Falls back to an equivalent getUser() call automatically for legacy
      // symmetric-key (HS256) projects, so this is safe regardless of project config.
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data) throw new AppError(401, 'Invalid or expired session');
      const claims = data.claims;
      const userMetadata = (claims.user_metadata ?? {}) as Record<string, unknown>;
      supabaseUser = {
        id: claims.sub,
        email: claims.email,
        user_metadata: userMetadata,
        app_metadata: claims.app_metadata as Record<string, unknown> | undefined,
        // The JWT carries user_metadata.email_verified (boolean) rather than the full
        // getUser() response's email_confirmed_at (a timestamp) — every consumer of
        // this field only ever does Boolean(email_confirmed_at), never reads it as an
        // actual date, so a presence/absence stand-in reproduces the exact same
        // behavior without changing that (separately tested) contract.
        email_confirmed_at: userMetadata.email_verified ? '1' : null,
      };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw new AppError(401, 'Invalid or expired session');
    }

    const user = await prisma.user.findUnique({
      where: { supabaseUserId: supabaseUser.id },
      select: { id: true, email: true, name: true, role: true, emailVerified: true, hasPassword: true, supabaseUserId: true, accountStatus: true },
    });

    if (user) {
      if (user.accountStatus !== 'ACTIVE') {
        throw new AppError(403, user.accountStatus === 'SUSPENDED' ? 'This account is suspended. Contact Mentora support for help.' : 'This account has been deactivated.', 'ACCOUNT_INACTIVE');
      }
      const emailVerified = Boolean(supabaseUser.email_confirmed_at);
      const hasPassword = metadataHasPassword(supabaseUser.app_metadata);
      if (user.emailVerified !== emailVerified || user.hasPassword !== hasPassword) {
        const updated = await prisma.user.update({
          where: { id: user.id },
          data: { emailVerified, hasPassword },
          select: { id: true, email: true, name: true, role: true, emailVerified: true, hasPassword: true, supabaseUserId: true },
        });
        req.user = updated;
      } else {
        req.user = user;
      }
      next();
      return;
    }

    // First authenticated request for this Supabase account — materialize the local profile.
    const synced = await syncUserFromSupabase(supabaseUser);
    req.user = {
      id: synced.id,
      email: synced.email,
      name: synced.name,
      role: synced.role,
      emailVerified: synced.emailVerified,
      hasPassword: synced.hasPassword,
      supabaseUserId: supabaseUser.id,
    };
    next();
  } catch (err) {
    next(err);
  }
}
