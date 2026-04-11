import { NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/features/auth/authStore';
import { useUIStore } from '@/app/store';
import {
  LayoutDashboard, TrendingUp, Briefcase, BarChart2,
  MessageSquare, BookOpen, Settings, LogOut,
  ChevronLeft, ChevronRight, Activity, Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/stocks',        icon: TrendingUp,      label: 'Stocks' },
  { to: '/portfolio',     icon: Briefcase,       label: 'Portfolio' },
  { to: '/paper-trading', icon: Activity,        label: 'Paper Trading' },
  { to: '/risk-analysis', icon: BarChart2,       label: 'Risk Analysis' },
  { to: '/chat-advisor',  icon: MessageSquare,   label: 'AI Advisor' },
  { to: '/education',     icon: BookOpen,        label: 'Education' },
  { to: '/settings',      icon: Settings,        label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: sidebarOpen ? 240 : 68 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="relative flex flex-col h-screen bg-dark-200 border-r border-slate-800/60 overflow-hidden flex-shrink-0 z-30"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-slate-800/60 min-h-[64px]">
        <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0 shadow-glow-primary">
          <Zap size={18} className="text-white" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="font-bold text-white text-base whitespace-nowrap tracking-tight"
            >
              CapitalWave<span className="text-primary-400"> AI</span>
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-[72px] -right-3 w-6 h-6 rounded-full bg-dark-100 border border-slate-700
                   flex items-center justify-center text-slate-400 hover:text-primary-400
                   hover:border-primary-500 transition-all duration-200 z-50"
      >
        {sidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
      </button>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`
            }
            title={!sidebarOpen ? label : undefined}
          >
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.15 }}
                  className="whitespace-nowrap text-sm"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="border-t border-slate-800/60 p-3 space-y-1">
        {sidebarOpen && user && (
          <div className="px-2 py-2 mb-1">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`nav-link w-full text-bear/80 hover:text-bear hover:bg-bear/10 ${!sidebarOpen ? 'justify-center px-2' : ''}`}
          title={!sidebarOpen ? 'Logout' : undefined}
        >
          <LogOut size={18} className="flex-shrink-0" />
          <AnimatePresence>
            {sidebarOpen && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-sm"
              >
                Logout
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
