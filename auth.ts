import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './env';
import type { Profile } from './types';

/** Current user + profile (deduplicated per request). Returns nulls when signed out. */
export const getSession = cache(async () => {
  if (!isSupabaseConfigured()) return { user: null, profile: null as Profile | null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null as Profile | null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, phone, email, role, created_at')
    .eq('id', user.id)
    .maybeSingle();
  return { user, profile: (profile as Profile | null) ?? null };
});

export async function requireUser(nextPath = '/dashboard') {
  const session = await getSession();
  if (!session.user) redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  return session as { user: NonNullable<typeof session.user>; profile: Profile | null };
}

export async function requireAdmin() {
  const session = await requireUser('/admin');
  if (session.profile?.role !== 'admin') redirect('/dashboard?denied=admin');
  return session as { user: NonNullable<typeof session.user>; profile: Profile };
}

/** For server actions / route handlers: returns null instead of redirecting. */
export async function getAdminOrNull() {
  const session = await getSession();
  if (!session.user || session.profile?.role !== 'admin') return null;
  return session;
}
