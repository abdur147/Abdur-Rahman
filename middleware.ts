import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const configured =
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
    !/your-project-ref/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
  if (!configured) return NextResponse.next();
  return updateSession(request);
}

// Only run where a session matters, so public marketing pages stay static and fast.
// The Razorpay webhook is excluded (it must receive the raw body untouched).
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/login',
    '/register',
    '/reset-password',
    '/order/:path*',
    '/receipt/:path*',
    '/api/((?!payments/webhook).*)',
  ],
};
