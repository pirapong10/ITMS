/**
 * Unified API Client for ITSM Enterprise
 */

const TOKEN_KEY = 'itsm_auth_token';
const TENANT_KEY = 'itsm_tenant_id';
const USER_KEY = 'itsm_user_info';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  tenant_id: string;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getStoredTenantId(): string {
  if (typeof window === 'undefined') return 'tenant-default';
  return localStorage.getItem(TENANT_KEY) || 'tenant-default';
}

export function setStoredTenantId(tenantId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TENANT_KEY, tenantId);
}

export function getStoredUser(): UserSession | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user: UserSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  if (user.tenant_id) {
    setStoredTenantId(user.tenant_id);
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getStoredToken();
  const tenantId = getStoredTenantId();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-tenant-id': tenantId,
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(path, {
      ...options,
      headers,
    });

    const status = res.status;
    let json: any = null;

    try {
      json = await res.json();
    } catch {
      // Body might be empty
    }

    if (!res.ok) {
      const errorMsg = json?.message || json?.error || `Request failed with status ${status}`;
      return { data: null, error: errorMsg, status };
    }

    return { data: json as T, error: null, status };
  } catch (err: any) {
    return { data: null, error: err.message || 'Network connection error', status: 500 };
  }
}
