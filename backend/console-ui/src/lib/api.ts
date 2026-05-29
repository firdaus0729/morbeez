import { STAFF_API_V1 } from './staff-portal';

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
    ...(options.headers as Record<string, string>),
  };
  if (options.body != null && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }
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

export type InvitePreview = {
  email: string | null;
  fullName: string | null;
  role: string | null;
  expiresAt: string;
  purpose: string;
};

export async function fetchInvitePreview(token: string): Promise<InvitePreview> {
  const params = new URLSearchParams({ token });
  const data = await api<{ ok: boolean; invite: InvitePreview }>(
    `${STAFF_API_V1}/auth/invite?${params}`
  );
  return data.invite;
}

export async function completeInvite(
  token: string,
  password: string,
  confirmPassword: string
): Promise<void> {
  await api(`${STAFF_API_V1}/auth/complete-invite`, {
    method: 'POST',
    body: JSON.stringify({ token, password, confirmPassword }),
  });
}

export async function requestForgotPassword(email: string): Promise<{
  message: string;
  resetUrl: string | null;
  expiresAt: string | null;
}> {
  const data = await api<{
    ok: boolean;
    message: string;
    resetUrl?: string | null;
    expiresAt?: string | null;
  }>(`${STAFF_API_V1}/auth/forgot-password`, {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
  return {
    message: data.message,
    resetUrl: data.resetUrl ?? null,
    expiresAt: data.expiresAt ?? null,
  };
}

export type ResetPasswordPreview = {
  email: string | null;
  fullName: string | null;
  expiresAt: string;
  source: string;
};

export async function fetchResetPasswordPreview(token: string): Promise<ResetPasswordPreview> {
  const params = new URLSearchParams({ token });
  const data = await api<{ ok: boolean; reset: ResetPasswordPreview }>(
    `${STAFF_API_V1}/auth/reset-password?${params}`
  );
  return data.reset;
}

export async function completePasswordReset(
  token: string,
  password: string,
  confirmPassword: string
): Promise<void> {
  await api(`${STAFF_API_V1}/auth/complete-reset-password`, {
    method: 'POST',
    body: JSON.stringify({ token, password, confirmPassword }),
  });
}

export async function login(email: string, password: string) {
  const data = await api<{
    ok: boolean;
    token: string;
    admin: SessionAdmin & { fullName?: string };
  }>(`${STAFF_API_V1}/auth/login`, {
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
  }>(`${STAFF_API_V1}/auth/me`);
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
