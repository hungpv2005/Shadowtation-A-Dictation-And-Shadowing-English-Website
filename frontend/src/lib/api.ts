const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let refreshInFlight: Promise<string | null> | null = null;

function clearStoredSession() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('student_profile');
  sessionStorage.removeItem('access_token');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refresh_token');
  sessionStorage.removeItem('student_profile');
  window.dispatchEvent(new Event('shadowtation:auth-change'));
}

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  const refreshToken = localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    let response: Response;
    try {
      response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
        cache: 'no-store',
      });
    } catch {
      // A temporary network failure should not erase a still-valid saved session.
      return null;
    }
    if (response.status === 401 || response.status === 403) {
      clearStoredSession();
      return null;
    }
    if (!response.ok) return null;
    try {
      const result = await response.json() as { accessToken?: string; refreshToken?: string };
      if (!result.accessToken || !result.refreshToken) return null;
      localStorage.setItem('access_token', result.accessToken);
      localStorage.setItem('refresh_token', result.refreshToken);
      sessionStorage.setItem('access_token', result.accessToken);
      sessionStorage.setItem('refresh_token', result.refreshToken);
      window.dispatchEvent(new Event('shadowtation:auth-change'));
      return result.accessToken;
    } catch {
      return null;
    }
  })();

  try {
    return await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

/** Gọi Core API và gửi JWT nếu người dùng đã đăng nhập ở trình duyệt. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const send = (tokenOverride?: string) => {
    const headers = new Headers(init.headers);
    const isMultipart = typeof FormData !== 'undefined' && init.body instanceof FormData;
    if (!headers.has('Content-Type') && !isMultipart) headers.set('Content-Type', 'application/json');
    if (typeof window !== 'undefined') {
      const token = tokenOverride ??
        localStorage.getItem('access_token') ??
        sessionStorage.getItem('access_token') ??
        localStorage.getItem('accessToken') ??
        sessionStorage.getItem('accessToken');
      if (token) headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(`${API_URL}${path}`, { ...init, headers, cache: 'no-store' });
  };

  let res = await send();
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    const refreshToken = localStorage.getItem('refresh_token') ?? sessionStorage.getItem('refresh_token');
    if (refreshToken) {
      const freshToken = await refreshAccessToken();
      if (freshToken) res = await send(freshToken);
    } else if (
      localStorage.getItem('access_token') ||
      sessionStorage.getItem('access_token') ||
      localStorage.getItem('accessToken') ||
      sessionStorage.getItem('accessToken')
    ) {
      clearStoredSession();
    }
  }
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body.message ?? message;
    } catch {
      /* phản hồi không phải JSON */
    }
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}
