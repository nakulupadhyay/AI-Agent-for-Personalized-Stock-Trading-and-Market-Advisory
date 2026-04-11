import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useLocation } from 'react-router-dom';

// Map routes to readable page titles
const PAGE_TITLES: Record<string, string> = {
  '/dashboard':     'Dashboard',
  '/stocks':        'Stock Research',
  '/portfolio':     'My Portfolio',
  '/paper-trading': 'Paper Trading',
  '/risk-analysis': 'Risk Analysis',
  '/chat-advisor':  'AI Chat Advisor',
  '/education':     'Education Hub',
  '/settings':      'Settings',
};

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const pageTitle = PAGE_TITLES[pathname] ?? '';

  return (
    <div className="flex h-screen overflow-hidden bg-surface-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopNavbar title={pageTitle} />

        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Risk disclaimer footer */}
        <footer className="px-6 py-2 border-t border-slate-800/60 bg-dark-200/40">
          <p className="text-[10px] text-slate-600 text-center">
            ⚠️ CapitalWave AI provides AI-powered market insights — not financial advice. Invest responsibly.
          </p>
        </footer>
      </div>
    </div>
  );
}
