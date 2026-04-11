import { Bell, Search, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { useUIStore } from '@/app/store';

interface TopNavbarProps {
  title?: string;
}

export default function TopNavbar({ title }: TopNavbarProps) {
  const user = useAuthStore((s) => s.user);
  const { theme, toggleTheme } = useUIStore();

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'U';

  return (
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60 bg-dark-200/60 backdrop-blur-sm flex-shrink-0">
      {/* Page title */}
      <div>
        {title && <h1 className="text-lg font-semibold text-white">{title}</h1>}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-dark-100 border border-slate-700/60 flex items-center justify-center
                     text-slate-400 hover:text-primary-400 hover:border-primary-500/50 transition-all"
          title="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-dark-100 border border-slate-700/60
                            flex items-center justify-center text-slate-400 hover:text-primary-400
                            hover:border-primary-500/50 transition-all">
          <Bell size={16} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary-500" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-brand flex items-center justify-center
                          text-white text-xs font-bold shadow-glow-primary/50">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-medium text-white leading-none">{user?.name ?? 'User'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{user?.role ?? 'Investor'}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
