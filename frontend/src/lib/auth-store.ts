import { create } from 'zustand';
import { persist, createJSONStorage, StateStorage } from 'zustand/middleware';

export type UserRole = 'STUDENT' | 'PREMIUM_STUDENT' | 'ADMIN';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  role: UserRole;
  streakCount: number;
  premiumExpiredAt: string | null;
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  setAuth: (user: UserProfile, accessToken: string, refreshToken: string, rememberMe?: boolean) => void;
  updateUser: (user: Partial<UserProfile>) => void;
  updateTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

const REMEMBER_ME_KEY = 'shadowtation_remember_me';

/**
 * Storage tùy biến:
 * - Khi "Lưu đăng nhập" (rememberMe = true): Lưu vĩnh viễn trong localStorage.
 * - Khi không lưu đăng nhập (mặc định): Chỉ lưu trong sessionStorage (khi tắt trình duyệt mở lại sẽ tự động về trạng thái chưa đăng nhập).
 */
const dynamicAuthStorage: StateStorage = {
  getItem: (name: string): string | null => {
    if (typeof window === 'undefined') return null;

    const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRemembered) {
      return localStorage.getItem(name);
    }

    // Nếu không bật Ghi nhớ đăng nhập mà còn sót session cũ trong localStorage thì tự động xóa
    if (localStorage.getItem(name)) {
      localStorage.removeItem(name);
    }

    // Chỉ đọc từ sessionStorage của phiên làm việc hiện tại
    return sessionStorage.getItem(name);
  },

  setItem: (name: string, value: string): void => {
    if (typeof window === 'undefined') return;

    const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRemembered) {
      localStorage.setItem(name, value);
      sessionStorage.removeItem(name);
    } else {
      sessionStorage.setItem(name, value);
      localStorage.removeItem(name);
    }
  },

  removeItem: (name: string): void => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(name);
    sessionStorage.removeItem(name);
    localStorage.removeItem(REMEMBER_ME_KEY);
    localStorage.removeItem('access_token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refresh_token');
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('refresh_token');
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: false,

      setAuth: (user, accessToken, refreshToken, rememberMe = false) => {
        if (typeof window !== 'undefined') {
          if (rememberMe) {
            localStorage.setItem(REMEMBER_ME_KEY, 'true');
            localStorage.setItem('access_token', accessToken);
            sessionStorage.removeItem('access_token');
          } else {
            localStorage.removeItem(REMEMBER_ME_KEY);
            localStorage.removeItem('access_token');
            sessionStorage.setItem('access_token', accessToken);
          }
        }

        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
          rememberMe: Boolean(rememberMe),
        });
      },

      updateUser: (updatedUser) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        })),

      updateTokens: (accessToken, refreshToken) => {
        if (typeof window !== 'undefined') {
          const isRemembered = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
          if (isRemembered) {
            localStorage.setItem('access_token', accessToken);
          } else {
            sessionStorage.setItem('access_token', accessToken);
          }
        }

        set({
          accessToken,
          refreshToken,
        });
      },

      logout: () => {
        dynamicAuthStorage.removeItem('shadowtation-auth-storage');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: false,
        });
      },
    }),
    {
      name: 'shadowtation-auth-storage',
      storage: createJSONStorage(() => dynamicAuthStorage),
    },
  ),
);
