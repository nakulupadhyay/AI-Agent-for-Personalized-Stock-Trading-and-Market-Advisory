import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
export const AUTH_EVENTS = {
  LOGOUT: 'auth:logout',
} as const;

// ─── Axios instance ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// ─── Refresh-token queue ──────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  failedQueue = [];
};

// ─── Request interceptor — attach JWT ────────────────────────────────────────
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor — handle 401, global errors ────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Handle 401: try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      const isAuthRoute = originalRequest.url?.includes('/auth/');
      if (isAuthRoute) return Promise.reject(error);

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) throw new Error('No refresh token');

        const { data } = await axios.post(
          `${api.defaults.baseURL}/auth/refresh`,
          { refreshToken }
        );

        const newToken: string = data.token;
        localStorage.setItem('token', newToken);
        if (data.refreshToken) {
          localStorage.setItem('refreshToken', data.refreshToken);
        }

        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        processQueue(null, newToken);

        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGOUT));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Global error toast (skip 401 — handled by redirect)
    if (error.response?.status !== 401) {
      const message =
        (error.response?.data as { message?: string })?.message ||
        error.message ||
        'Something went wrong. Please try again.';

      // Don't show toast for network errors silently swallowed by components
      if (error.response) {
        toast.error(message, { id: 'api-error', duration: 4000 });
      }
    }

    return Promise.reject(error);
  }
);

export default api;
