import { auth } from "@/lib/firebase";

export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: Record<string, unknown>;
  constructor(code: string, message: string, status: number, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  if (!auth?.currentUser) return {};
  try {
    const token = await auth.currentUser.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      // not JSON
    }
  }
  if (!res.ok) {
    const b = (body || {}) as { error?: string; message?: string; details?: Record<string, unknown> };
    throw new ApiClientError(
      b.error || "INTERNAL",
      b.message || `Request failed with ${res.status}`,
      res.status,
      b.details,
    );
  }
  return (body as T) ?? ({} as T);
}

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(path, { method: "GET", headers, cache: "no-store" });
  return parseResponse<T>(res);
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const headers = await getAuthHeader();
  const res = await fetch(path, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  return parseResponse<T>(res);
}
