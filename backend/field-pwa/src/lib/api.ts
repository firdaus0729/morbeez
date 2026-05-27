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

export async function api<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, { ...options, headers });
  const data = (await res.json().catch(() => ({}))) as T & { message?: string; error?: string };

  if (!res.ok) {
    const msg = data.message || data.error || res.statusText;
    throw new Error(msg || 'Request failed');
  }
  return data;
}

export async function login(email: string, password: string) {
  const data = await api<{ ok: boolean; token: string }>('/console/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function fetchFieldSession() {
  return api<{
    ok: boolean;
    admin: { email: string; role: string };
    modules: Array<{ moduleKey: string; canRead: boolean; canWrite: boolean }>;
  }>('/console/api/v1/os/session');
}

export function canFieldWrite(
  modules: Array<{ moduleKey: string; canRead: boolean; canWrite: boolean }>
) {
  const ag = modules.find((m) => m.moduleKey === 'agronomist');
  return Boolean(ag?.canWrite);
}
