const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Gọi Core API và gửi JWT nếu người dùng đã đăng nhập ở trình duyệt. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  if (typeof window !== 'undefined' && !headers.has('Authorization')) {
    const token = localStorage.getItem('access_token') ?? localStorage.getItem('accessToken');
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: 'no-store',
  });
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
