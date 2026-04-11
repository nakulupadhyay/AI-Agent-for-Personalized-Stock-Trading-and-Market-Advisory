import { useEffect } from 'react';
import AppRoutes from '@/routes';
import { useAuthStore } from '@/features/auth/authStore';

export default function App() {
  const validateSession = useAuthStore((s) => s.validateSession);

  // Validate JWT on app startup
  useEffect(() => {
    validateSession();
  }, [validateSession]);

  return <AppRoutes />;
}
