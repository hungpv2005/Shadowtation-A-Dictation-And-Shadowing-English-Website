import { useAuthStore } from './auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

function onRefreshed(token: string) {
  refreshSubscribers.map((cb) => cb(token));
  refreshSubscribers = [];
}

/**
 * Gọi Core API, tự động gắn JWT và tự động làm mới token khi hết hạn (UC-01)
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const { accessToken, refreshToken, updateTokens, logout } = useAuthStore.getState();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  };

  const token =
    accessToken ??
    (typeof window !== 'undefined'
      ? localStorage.getItem('shadowtation_remember_me') === 'true'
        ? localStorage.getItem('access_token') ?? localStorage.getItem('accessToken')
        : sessionStorage.getItem('access_token') ?? sessionStorage.getItem('accessToken')
      : null);

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });

  // Xử lý khi Token hết hạn (401 Unauthorized) và có refreshToken
  if (res.status === 401 && refreshToken && path !== '/auth/login' && path !== '/auth/refresh') {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        if (!refreshRes.ok) {
          throw new Error('Refresh token expired');
        }

        const data = await refreshRes.json();
        updateTokens(data.accessToken, data.refreshToken);
        onRefreshed(data.accessToken);
        isRefreshing = false;

        // Thử lại request ban đầu với token mới
        headers['Authorization'] = `Bearer ${data.accessToken}`;
        const retryRes = await fetch(`${API_URL}${path}`, {
          ...init,
          headers,
          cache: 'no-store',
        });
        if (!retryRes.ok) {
          const body = await retryRes.json().catch(() => ({}));
          throw new ApiError(retryRes.status, body.message ?? retryRes.statusText);
        }
        return (await retryRes.json()) as T;
      } catch (err) {
        isRefreshing = false;
        logout();
        throw new ApiError(401, 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      }
    } else {
      // Đang có request khác refresh, xếp hàng chờ
      return new Promise<T>((resolve, reject) => {
        subscribeTokenRefresh(async (newToken) => {
          try {
            headers['Authorization'] = `Bearer ${newToken}`;
            const retryRes = await fetch(`${API_URL}${path}`, {
              ...init,
              headers,
              cache: 'no-store',
            });
            if (!retryRes.ok) {
              const body = await retryRes.json().catch(() => ({}));
              throw new ApiError(retryRes.status, body.message ?? retryRes.statusText);
            }
            resolve((await retryRes.json()) as T);
          } catch (e) {
            reject(e);
          }
        });
      });
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
