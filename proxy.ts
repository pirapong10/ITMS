import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  
  // Extract subdomain (e.g., tenant1.localhost:3000 -> tenant1)
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  
  // Skip middleware for static files, api routes (except protected ones), and root domain
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/favicon.ico') ||
    url.pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Check auth token
  const token = request.cookies.get('auth_token')?.value;
  
  // If accessing a tenant subdomain (not localhost/www)
  if (subdomain !== 'localhost' && subdomain !== 'www') {
    if (!token) {
      // Not authenticated, could redirect to login
      url.pathname = '/login';
      return NextResponse.rewrite(url);
    }
    
    try {
      // In Edge runtime, jsonwebtoken cannot be used directly because it relies on Node.js core modules.
      // We would normally use jose or webcrypto here.
      // For this phase, we just pass the request through and let the backend validate if needed, 
      // or we can implement a basic check.
      // Since this is a demonstration of the routing, we'll rewrite to include the subdomain in the path.
      
      url.pathname = `/${subdomain}${url.pathname}`;
      return NextResponse.rewrite(url);
    } catch (e) {
      url.pathname = '/login';
      return NextResponse.rewrite(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (auth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
