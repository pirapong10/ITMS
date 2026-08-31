import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const url = request.nextUrl.clone();
  
  // 1. Skip Middleware for Root, Auth, API, and Static assets
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Extract hostname and host parts
  const hostWithoutPort = (request.headers.get('host') || '').split(':')[0];
  
  // Direct access: localhost, 127.0.0.1, or main Vercel domain (*.vercel.app without tenant prefix)
  const isDirectHost =
    hostWithoutPort === 'localhost' ||
    hostWithoutPort === '127.0.0.1' ||
    !hostWithoutPort.includes('.') ||
    (hostWithoutPort.endsWith('.vercel.app') && hostWithoutPort.split('.').length <= 3) ||
    hostWithoutPort.startsWith('www.');

  if (isDirectHost) {
    return NextResponse.next();
  }

  const subdomain = hostWithoutPort.split('.')[0];
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
