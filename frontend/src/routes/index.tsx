import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '@/components/layout/AppLayout';
import PageLoader from '@/components/ui/PageLoader';

// ─── Lazy-loaded Pages ────────────────────────────────────────────────────────
const LandingPage     = lazy(() => import('@/pages/LandingPage'));
const LoginPage       = lazy(() => import('@/pages/LoginPage'));
const SignupPage      = lazy(() => import('@/pages/SignupPage'));
const DashboardPage   = lazy(() => import('@/pages/DashboardPage'));
const StocksPage      = lazy(() => import('@/pages/StocksPage'));
const PortfolioPage   = lazy(() => import('@/pages/PortfolioPage'));
const PaperTradingPage = lazy(() => import('@/pages/PaperTradingPage'));
const RiskAnalysisPage = lazy(() => import('@/pages/RiskAnalysisPage'));
const ChatAdvisorPage = lazy(() => import('@/pages/ChatAdvisorPage'));
const EducationPage   = lazy(() => import('@/pages/EducationPage'));
const SettingsPage    = lazy(() => import('@/pages/SettingsPage'));
const NotFoundPage    = lazy(() => import('@/pages/NotFoundPage'));
const StockAssistantPage = lazy(() => import('@/pages/StockAssistantPage'));

// ─── Protected dashboard routes ───────────────────────────────────────────────
const dashboardRoutes = [
  { path: '/dashboard',     Component: DashboardPage },
  { path: '/stocks',        Component: StocksPage },
  { path: '/portfolio',     Component: PortfolioPage },
  { path: '/paper-trading', Component: PaperTradingPage },
  { path: '/risk-analysis', Component: RiskAnalysisPage },
  { path: '/chat-advisor',  Component: ChatAdvisorPage },
  { path: '/stock-assistant', Component: StockAssistantPage },
  { path: '/education',     Component: EducationPage },
  { path: '/settings',      Component: SettingsPage },
];

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/"       element={<LandingPage />} />
        <Route path="/login"  element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected — wrapped in dashboard layout */}
        {dashboardRoutes.map(({ path, Component }) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Component />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        ))}

        {/* Catch-all */}
        <Route path="/404"  element={<NotFoundPage />} />
        <Route path="*"     element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
}
