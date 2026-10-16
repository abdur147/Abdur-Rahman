import 'server-only';
import { createClient } from '@supabase/supabase-js';

/** Cookie-less anonymous client for public catalogue data (lets pages be cached). */
export function createPublicClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
