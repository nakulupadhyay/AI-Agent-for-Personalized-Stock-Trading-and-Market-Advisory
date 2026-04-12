import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useLocation, Link } from 'react-router-dom';
import { MessageSquare, Mic } from 'lucide-react';

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
    <div className="flex h-screen overflow-hidden bg-surface-950 font-sans">
      {/* Sidebar - fixed left */}
      <Sidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <TopNavbar title={pageTitle} />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-dark-300/10">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>

        {/* Global Floating AI Actions */}
        <div className="fixed bottom-6 right-6 flex flex-col items-center gap-3 z-50">
          {/* Voice Button */}
          <button className="w-12 h-12 bg-dark-100 border border-slate-700 rounded-full flex items-center justify-center text-primary-400 hover:text-white hover:bg-primary-500 transition-all shadow-lg hover:scale-110 active:scale-95 group">
            <Mic size={20} className="group-hover:animate-pulse" />
          </button>
          
          {/* Chatbot Button */}
          <Link to="/chat-advisor" className="w-14 h-14 bg-gradient-brand rounded-full flex items-center justify-center text-white shadow-glow-primary hover:scale-110 active:scale-95 transition-all outline-none ring-4 ring-dark-200/50">
            <MessageSquare size={24} className="fill-white/20" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bull opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-bull border-2 border-dark-100"></span>
            </span>
          </Link>
        </div>

        {/* Risk disclaimer footer */}
        <footer className="px-6 py-2 border-t border-slate-800/60 bg-dark-200/40 shrink-0 relative z-20">
          <p className="text-[10px] text-slate-500 text-center font-medium">
            ⚠️ AI insights are not direct financial advice. Execute trades responsibly.
          </p>
        </footer>
      </div>
    </div>
  );
}
