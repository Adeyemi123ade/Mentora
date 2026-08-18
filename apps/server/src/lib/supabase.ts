import { createClient, type User as SupabaseUser } from '@supabase/supabase-js';
import { env } from '../env.js';

export type { SupabaseUser };

export const hasServiceRole = Boolean(env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);

export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

export const supabaseAdmin = hasServiceRole
  ? createClient(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    })
  : null;
