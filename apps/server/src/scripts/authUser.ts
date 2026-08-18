import { supabaseAdmin, type SupabaseUser } from '../lib/supabase.js';

export async function findOrCreateAuthUser(input: {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'TUTOR' | 'PARENT' | 'STUDENT';
}): Promise<SupabaseUser> {
  if (!supabaseAdmin) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required to seed auth users.');
  }
  const admin = supabaseAdmin;

  async function findExisting(email: string): Promise<SupabaseUser> {
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (error) throw error;
    const existing = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!existing) throw new Error(`Auth user not found for ${email}`);
    return existing;
  }

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: { name: input.name, role: input.role },
    });
    if (!error && data.user) return data.user;
    if (error && /already (been )?registered/i.test(error.message)) return findExisting(input.email);
    throw error ?? new Error(`Could not create auth user for ${input.email}`);
  } catch (err) {
    // Some supabase-js builds throw instead of returning { data, error }.
    const message = err instanceof Error ? err.message : '';
    if (!/already (been )?registered/i.test(message)) throw err;
    return findExisting(input.email);
  }
}
