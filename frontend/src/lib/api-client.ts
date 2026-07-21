// Thin fetch wrapper for the NestJS backend at VITE_API_URL.
// When VITE_API_URL is unset, `isApiEnabled` is false and callers should
// fall back to the existing in-browser Zustand store.

const BASE = import.meta.env.VITE_API_URL as string | undefined;

export const isApiEnabled = Boolean(BASE);

const TOKEN_KEY = "propvault.jwt";

export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  init?: RequestInit,
): Promise<T> {
  if (!BASE) throw new Error("VITE_API_URL not set");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    ...init,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(p: string) => request<T>("GET", p),
  post: <T>(p: string, b?: unknown) => request<T>("POST", p, b),
  patch: <T>(p: string, b?: unknown) => request<T>("PATCH", p, b),
  delete: <T>(p: string) => request<T>("DELETE", p),

  async upload(file: File): Promise<{ url: string }> {
    if (!BASE) throw new Error("VITE_API_URL not set");
    const fd = new FormData();
    fd.append("file", file);
    const token = getToken();
    const res = await fetch(`${BASE}/uploads`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return res.json();
  },

  async login(email: string, password: string) {
    const r = await request<{ access_token: string; user: unknown }>(
      "POST",
      "/auth/login",
      { email, password },
    );
    setToken(r.access_token);
    return r;
  },

  logout() {
    setToken(null);
  },
};
