const TOKEN_KEY = 'morbeez_admin_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export type ApiModule = {
  moduleKey: string;
  canRead: boolean;
  canWrite: boolean;
};

export type SessionAdmin = {
  id: string;
  email: string;
  role: string;
  fullName?: string;
};

export type SessionPayload = {
  admin: SessionAdmin;
  modules: ApiModule[];
  canApproveRecommendations: boolean;
};

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & {
    message?: string;
    error?: string;
  };

  if (!res.ok) {
    const body = data as { message?: string; error?: string };
    let msg = body.message || body.error || res.statusText || 'Request failed';
    if (body.error === 'NOT_FOUND' && msg === 'API route not found') {
      msg =
        'API route not found. Restart the backend after `npm run build:api` so new routes (e.g. Employees) are registered.';
    }
    if (body.error === 'DATABASE_SCHEMA') {
      msg = body.message ?? msg;
    }
    throw new Error(msg);
  }
  return data;
}

export async function login(email: string, password: string) {
  const data = await api<{
    ok: boolean;
    token: string;
    admin: SessionAdmin & { fullName?: string };
  }>('/console/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function fetchSession(): Promise<SessionPayload> {
  const data = await api<{
    ok: boolean;
    admin: SessionAdmin & { fullName?: string };
    modules: ApiModule[];
    canApproveRecommendations: boolean;
  }>('/console/api/v1/auth/me');
  return {
    admin: data.admin,
    modules: data.modules ?? [],
    canApproveRecommendations: Boolean(data.canApproveRecommendations),
  };
}

export function canAccess(modules: ApiModule[], key: string, mode: 'read' | 'write' = 'read') {
  const row = modules.find((m) => m.moduleKey === key);
  if (!row) return false;
  return mode === 'write' ? row.canWrite : row.canRead || row.canWrite;
}
