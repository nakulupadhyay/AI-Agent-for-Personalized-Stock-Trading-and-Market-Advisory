import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/features/auth/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Redirects unauthenticated users to /login.
 * Preserves the original destination via `state.from` so we can redirect back after login.
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
