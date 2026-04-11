import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import api, { AUTH_EVENTS } from '@/services/api';
import type { User, LoginCredentials, RegisterCredentials } from '@/types/auth.types';

interface AuthStore {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (credentials: LoginCredentials) => Promise<{ success: boolean; message?: string }>;
  register: (credentials: RegisterCredentials) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  validateSession: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async ({ email, password }) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/login', { email, password });
          const { token, refreshToken, user } = data;

          localStorage.setItem('token', token);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

          set({ user, token, refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Login failed. Please check your credentials.';
          set({ isLoading: false });
          return { success: false, message };
        }
      },

      register: async ({ name, email, password }) => {
        set({ isLoading: true });
        try {
          const { data } = await api.post('/auth/register', { name, email, password });
          const { token, refreshToken, user } = data;

          localStorage.setItem('token', token);
          if (refreshToken) localStorage.setItem('refreshToken', refreshToken);

          set({ user, token, refreshToken, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err: unknown) {
          const message =
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
            'Registration failed. Please try again.';
          set({ isLoading: false });
          return { success: false, message };
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      updateUser: (updates) => {
        const current = get().user;
        if (current) {
          const updated = { ...current, ...updates };
          set({ user: updated });
        }
      },

      validateSession: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return;
        }
        set({ isLoading: true });
        try {
          const { data } = await api.get('/auth/me');
          if (data?.success && data?.user) {
            set({ user: data.user, isAuthenticated: true });
          } else {
            get().logout();
          }
        } catch (err: unknown) {
          const isNetworkError = !(err as { response?: unknown })?.response;
          if (!isNetworkError) {
            get().logout();
          }
          // Network error: keep existing state (offline-friendly)
        } finally {
          set({ isLoading: false });
        }
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Listen for force-logout events dispatched by the API interceptor
window.addEventListener(AUTH_EVENTS.LOGOUT, () => {
  useAuthStore.getState().logout();
});
