import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  
  // 1. ข้าม Middleware สำหรับ Root Path, Static Files และ API
  if (
    pathname === '/' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract subdomain (e.g., tenant1.localhost:3000 -> tenant1)
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // Check auth token
  const token = request.cookies.get('auth_token')?.value;
  
  // If accessing a tenant subdomain (not localhost/www)
  if (subdomain !== 'localhost' && subdomain !== 'www') {
    if (!token) {
      // Not authenticated, redirect to login
      url.pathname = '/login';
      return NextResponse.rewrite(url);
    }
    
    try {
      // Rewrite to include the subdomain in the path.
      url.pathname = `/${subdomain}${pathname}`;
      return NextResponse.rewrite(url);
    } catch (e) {
      url.pathname = '/login';
      return NextResponse.rewrite(url);
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
