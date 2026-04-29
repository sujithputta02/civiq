import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Force a permissive CSP header to override any other source
  response.headers.set(
    'Content-Security-Policy',
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * ws: wss:;"
  );

  return response;
}

export const config = {
  matcher: '/:path*',
};
