import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

// Middleware handles auth session management and routing
export async function middleware(request: NextRequest) {
  // Add debug logging
  console.log('Middleware triggered for path:', request.nextUrl.pathname);
  console.log('Hostname:', request.headers.get('host'));
  
  // Update Supabase auth session
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 