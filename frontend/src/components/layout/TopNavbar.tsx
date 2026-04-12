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
    <header className="h-16 flex items-center justify-between px-6 border-b border-slate-800/60 bg-dark-200/40 backdrop-blur-md flex-shrink-0 relative z-20">
      
      {/* Search Bar (New) */}
      <div className="hidden md:flex flex-1 max-w-md ml-4 mr-8 items-center bg-dark-100 border border-slate-700/60 rounded-xl px-3 py-1.5 focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 transition-all">
        <Search size={16} className="text-slate-500" />
        <input 
          type="text" 
          placeholder="Search stocks, news, or topics..." 
          className="bg-transparent border-none outline-none text-sm text-white w-full ml-2 placeholder:text-slate-500" 
        />
      </div>

      <div className="flex md:hidden flex-1">
        {title && <h1 className="text-lg font-bold text-white">{title}</h1>}
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 rounded-xl bg-dark-100 border border-slate-700/60 flex items-center justify-center
                     text-slate-400 hover:text-primary-400 hover:border-primary-500/50 transition-all"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <button className="relative w-9 h-9 rounded-xl bg-dark-100 border border-slate-700/60
                            flex items-center justify-center text-slate-400 hover:text-primary-400
                            hover:border-primary-500/50 transition-all group">
          <Bell size={16} className="group-hover:animate-bounce-short" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500 border border-dark-100" />
        </button>

        {/* Avatar */}
        <div className="flex items-center gap-3 border-l border-slate-800 pl-4 ml-1 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-bold text-white leading-none">{user?.name ?? 'User'}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{user?.role ?? 'Investor'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center
                          text-white text-sm font-black shadow-lg shadow-primary-500/20 ring-2 ring-dark-100">
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
