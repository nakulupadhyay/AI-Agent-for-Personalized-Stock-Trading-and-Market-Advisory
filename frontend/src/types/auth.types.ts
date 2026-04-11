// ─── Auth Types ───────────────────────────────────────────────────────────────

export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  riskProfile?: 'conservative' | 'moderate' | 'aggressive';
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  refreshToken?: string;
  user: User;
}

export interface LoginFormValues {
  email: string;
  password: string;
}

export interface RegisterFormValues {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}
