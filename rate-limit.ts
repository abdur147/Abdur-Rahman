import 'server-only';
import { headers } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';
import { sha256Hex } from './order-utils';

export async function getClientIpHash(): Promise<string> {
  const h = await headers();
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'unknown';
  return sha256Hex(`${process.env.IP_HASH_SALT ?? 'ards'}:${ip}`);
}

/**
 * Database-backed rate limit (works across serverless instances).
 * Counts rows in `table` created by this ip hash within the window.
 */
export async function isRateLimited(
  admin: SupabaseClient,
  table: 'orders' | 'contact_messages',
  ipHash: string,
  limit: number,
  windowMinutes = 60,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMinutes * 60_000).toISOString();
  const { count, error } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipHash)
    .gte('created_at', since);
  if (error) return false; // fail open — never block real customers because of a counting error
  return (count ?? 0) >= limit;
}
