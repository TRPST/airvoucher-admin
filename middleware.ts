import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware now focuses on security and common headers
// For implicit flow (client-only), we do NOT handle auth on the server
export function middleware(request: NextRequest) {
  // Add debug logging
  console.log('Middleware triggered for path:', request.nextUrl.pathname);
  console.log('Hostname:', request.headers.get('host'));

  // Just pass through - auth is handled client-side with implicit flow
  return NextResponse.next();
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