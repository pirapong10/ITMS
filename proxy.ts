import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  
  // 1. Skip Middleware for Root, API, and Static assets
  if (
    pathname === '/' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract subdomain (e.g., tenant1.localhost:3000 -> tenant1)
  const hostWithoutPort = (request.headers.get('host') || '').split(':')[0];
  const isLocalOrDirect = hostWithoutPort === 'localhost' || hostWithoutPort === '127.0.0.1' || !hostWithoutPort.includes('.');
  const subdomain = hostWithoutPort.split('.')[0];

  // If accessing without subdomain or on direct host
  if (isLocalOrDirect || subdomain === 'localhost' || subdomain === 'www') {
    return NextResponse.next();
  }

  // Check auth token
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    url.pathname = '/login';
    return NextResponse.rewrite(url);
  }
  
  try {
    url.pathname = `/${subdomain}${pathname}`;
    return NextResponse.rewrite(url);
  } catch {
    url.pathname = '/login';
    return NextResponse.rewrite(url);
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
