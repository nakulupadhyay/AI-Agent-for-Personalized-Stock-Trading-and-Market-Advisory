import { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Shield, Palette, Moon, Sun, Save, LogOut } from 'lucide-react';
import { useAuthStore } from '@/features/auth/authStore';
import { useUIStore } from '@/app/store';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

type Tab = 'profile' | 'notifications' | 'security' | 'appearance';

const TABS: Array<{ id: Tab; icon: React.ElementType; label: string }> = [
  { id: 'profile',       icon: User,    label: 'Profile'       },
  { id: 'notifications', icon: Bell,    label: 'Notifications' },
  { id: 'security',      icon: Shield,  label: 'Security'      },
  { id: 'appearance',    icon: Palette, label: 'Appearance'    },
];

export default function SettingsPage() {
  const { user, logout, updateUser } = useAuthStore();
  const { theme, toggleTheme } = useUIStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      updateUser({ name: name.trim() });
      toast.success('Profile updated!');
    } catch {
      toast.error('Could not save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('You have been signed out.');
  };

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle mt-1">Manage your account preferences and security.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-white dark:bg-dark-100 rounded-xl border border-slate-200 dark:border-slate-800/60">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === id ? 'bg-slate-50 dark:bg-dark-200 text-slate-900 dark:text-white shadow' : 'text-slate-500 hover:text-slate-600 dark:text-slate-300'}`}>
            <Icon size={15} /> <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Profile */}
      {activeTab === 'profile' && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card space-y-5">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-brand flex items-center justify-center text-2xl font-black text-slate-900 dark:text-white shadow-glow-primary">
              {user?.name?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
              <span className="text-[10px] text-primary-400 font-semibold bg-primary-500/10 px-2 py-0.5 rounded-full">
                {user?.role ?? 'user'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1.5">Display Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="form-input" placeholder="Your full name" maxLength={50} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-600 dark:text-slate-300 block mb-1.5">Email Address</label>
            <input value={user?.email ?? ''} disabled className="form-input opacity-50 cursor-not-allowed" />
            <p className="text-xs text-slate-600 mt-1">Email cannot be changed.</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={handleSaveProfile} disabled={saving} className="btn-primary flex items-center gap-2">
              <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </motion.div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card space-y-4">
          {[
            { label: 'Price Alerts',            sub: 'Get notified when a stock hits your target price', defaultOn: true  },
            { label: 'AI Signal Alerts',         sub: 'Receive BUY/SELL recommendations from AI',       defaultOn: true  },
            { label: 'Portfolio Updates',        sub: 'Daily P&L summary for your holdings',            defaultOn: false },
            { label: 'Market News',              sub: 'Breaking news affecting your watchlist stocks',   defaultOn: false },
            { label: 'Educational Newsletters',  sub: 'Weekly trading tips and market insights',         defaultOn: true  },
          ].map((item) => (
            <NotifToggle key={item.label} {...item} />
          ))}
        </motion.div>
      )}

      {/* Security */}
      {activeTab === 'security' && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Change Password</h3>
            <p className="text-xs text-slate-500 mb-4">Use a strong password with uppercase letters and numbers.</p>
            <div className="space-y-3">
              <input type="password" placeholder="Current password" className="form-input" />
              <input type="password" placeholder="New password" className="form-input" />
              <input type="password" placeholder="Confirm new password" className="form-input" />
            </div>
            <button className="btn-primary mt-4 flex items-center gap-2" onClick={() => toast.success('Password change request sent!')}>
              <Shield size={15} /> Update Password
            </button>
          </div>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Session Management</h3>
            <p className="text-xs text-slate-500 mb-3">Sign out from all devices and sessions.</p>
            <button onClick={handleLogout} className="flex items-center gap-2 text-bear text-sm font-medium bg-bear/10 border border-bear/30
                                                       px-4 py-2.5 rounded-xl hover:bg-bear/20 transition-all">
              <LogOut size={15} /> Sign Out from All Devices
            </button>
          </div>
        </motion.div>
      )}

      {/* Appearance */}
      {activeTab === 'appearance' && (
        <motion.div initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="card space-y-5">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white mb-1">Theme</h3>
            <p className="text-xs text-slate-500 mb-4">Switch between dark and light mode.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Dark Mode', icon: Moon,  value: 'dark' },
                { label: 'Light Mode', icon: Sun,  value: 'light' },
              ].map(({ label, icon: Icon, value }) => (
                <button key={value} onClick={toggleTheme}
                  className={`p-4 rounded-xl border flex items-center gap-3 transition-all
                    ${theme === value ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                  <Icon size={18} /> <span className="font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function NotifToggle({ label, sub, defaultOn }: { label: string; sub: string; defaultOn: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
        <p className="text-xs text-slate-500">{sub}</p>
      </div>
      <button onClick={() => setOn(v => !v)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${on ? 'bg-primary-500' : 'bg-white dark:bg-dark-100 border border-slate-300 dark:border-slate-700'}`}>
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${on ? 'left-[calc(100%-22px)]' : 'left-0.5'}`} />
      </button>
    </div>
  );
}
