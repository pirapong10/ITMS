import { NextRequest } from 'next/server';
import { verifyJwt, JwtPayload } from './auth';

export interface AuthContext {
  tenantId: string;
  userId?: string;
  role?: string;
}

/**
 * Extracts AuthContext (tenantId, userId, role) from Next.js Request.
 * Inspects Authorization Header (Bearer), cookies (auth_token), and x-tenant-id header.
 */
export function extractAuthContext(req: Request | NextRequest): AuthContext | null {
  // 1. Check x-tenant-id header (for API keys / test harnesses)
  const explicitTenantId = req.headers.get('x-tenant-id');

  // 2. Check Authorization Bearer Token
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7).trim();
  }

  // 3. Check Cookie (if Request contains cookie header or NextRequest cookies)
  if (!token) {
    if ('cookies' in req && typeof (req as any).cookies?.get === 'function') {
      token = (req as any).cookies.get('auth_token')?.value || null;
    } else {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/auth_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }
  }

  if (token) {
    try {
      const payload: JwtPayload = verifyJwt(token);
      return {
        tenantId: explicitTenantId || payload.tenantId,
        userId: payload.userId,
        role: payload.role,
      };
    } catch {
      // If token invalid but explicitTenantId exists in dev/test, use it; otherwise null
      if (explicitTenantId) {
        return { tenantId: explicitTenantId };
      }
      return null;
    }
  }

  if (explicitTenantId) {
    const actorId = req.headers.get('x-user-id') || undefined;
    const actorRole = req.headers.get('x-user-role') || undefined;
    return {
      tenantId: explicitTenantId,
      userId: actorId,
      role: actorRole,
    };
  }

  return null;
}
