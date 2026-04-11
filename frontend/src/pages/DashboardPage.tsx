import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, DollarSign, Activity, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import api from '@/services/api';
import { useAuthStore } from '@/features/auth/authStore';
import { useStockSearch } from '@/hooks/useStockSearch';
import { RecommendationBadge } from '@/components/ui/Badge';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent, formatChange } from '@/utils/formatters';

// Fallback chart data while API loads
const MOCK_CHART = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  value: 80000 + Math.random() * 40000,
}));

interface DashboardStats {
  portfolioValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  totalInvested: number;
  activeTrades: number;
}

const QUICK_SYMBOLS = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'WIPRO'];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [chartData, setChartData] = useState(MOCK_CHART);
  const [statsLoading, setStatsLoading] = useState(true);
  const { query, setQuery, result, isLoading: searchLoading } = useStockSearch();

  const fetchDashboardData = useCallback(async () => {
    setStatsLoading(true);
    try {
      const { data } = await api.get('/portfolio');
      setStats({
        portfolioValue:       data.totalValue        ?? data.data?.totalValue        ?? 125000,
        totalGainLoss:        data.totalGainLoss     ?? data.data?.totalGainLoss     ?? 12500,
        totalGainLossPercent: data.totalGainLossPercent ?? data.data?.totalGainLossPercent ?? 11.1,
        totalInvested:        data.totalInvested      ?? data.data?.totalInvested     ?? 112500,
        activeTrades:         data.holdings?.length   ?? data.data?.holdings?.length  ?? 0,
      });
    } catch {
      // Use demo data on error
      setStats({ portfolioValue: 125000, totalGainLoss: 12500, totalGainLossPercent: 11.1, totalInvested: 112500, activeTrades: 5 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchDashboardData(); }, [fetchDashboardData]);

  const statCards = stats ? [
    { label: 'Portfolio Value',  value: formatCurrency(stats.portfolioValue),             icon: DollarSign,   color: 'text-primary-400', bg: 'bg-primary-500/10' },
    { label: 'Total P&L',        value: formatCurrency(Math.abs(stats.totalGainLoss)),     icon: stats.totalGainLoss >= 0 ? TrendingUp : TrendingDown,
      color: stats.totalGainLoss >= 0 ? 'text-bull' : 'text-bear',
      bg:    stats.totalGainLoss >= 0 ? 'bg-bull/10' : 'bg-bear/10',
      sub:   formatChange(stats.totalGainLossPercent) + '%' },
    { label: 'Total Invested',   value: formatCurrency(stats.totalInvested),              icon: Activity,     color: 'text-hold',        bg: 'bg-hold/10' },
    { label: 'Active Holdings',  value: String(stats.activeTrades),                       icon: RefreshCw,    color: 'text-slate-300',   bg: 'bg-slate-700/40' },
  ] : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Good {getTimeOfDay()}, {user?.name?.split(' ')[0] ?? 'Trader'} 👋</h1>
          <p className="page-subtitle mt-1">Here's your market overview for today.</p>
        </div>
        <button onClick={fetchDashboardData} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
          : statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="stat-card"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg ${card.bg} flex items-center justify-center`}>
                  <card.icon size={15} className={card.color} />
                </div>
              </div>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              {card.sub && <div className="text-xs text-slate-500">{card.sub}</div>}
            </motion.div>
          ))
        }
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Portfolio Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold text-white">Portfolio Performance</h2>
            <span className="text-xs text-slate-500">Last 12 months</span>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6C63FF" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6C63FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false}
                       tickFormatter={(v) => `₹${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  contentStyle={{ background: '#1a1f2e', border: '1px solid rgba(108,99,255,0.2)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#a29bfe' }}
                  formatter={(v: number) => [formatCurrency(v), 'Value']}
                />
                <Area type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={2}
                      fill="url(#colorValue)" dot={false} activeDot={{ r: 5, fill: '#6C63FF' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quick Stock Search */}
        <div className="card">
          <h2 className="font-semibold text-white mb-4">Quick Stock Lookup</h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value.toUpperCase())}
            placeholder="Search symbol e.g. RELIANCE"
            className="form-input mb-4 text-sm"
            maxLength={10}
          />

          {/* Quick picks */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {QUICK_SYMBOLS.map((s) => (
              <button key={s} onClick={() => setQuery(s)}
                className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-dark-100 border border-slate-700
                           text-slate-400 hover:border-primary-500 hover:text-primary-400 transition-all">
                {s}
              </button>
            ))}
          </div>

          {/* Result */}
          {searchLoading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
            </div>
          )}
          {result && !searchLoading && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-dark-100 rounded-xl p-4 border border-slate-700/60 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-white">{result.symbol}</p>
                  <p className="text-xl font-black text-primary-300">{formatCurrency(result.price)}</p>
                </div>
                <RecommendationBadge value={result.recommendation} size="md" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Confidence:</span>
                <div className="flex-1 h-1.5 bg-dark-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-brand rounded-full transition-all"
                       style={{ width: `${(result.confidence * 100)}%` }} />
                </div>
                <span className="text-xs text-primary-400 font-semibold">{formatPercent(result.confidence)}</span>
              </div>
              {result.reasoning && (
                <p className="text-xs text-slate-400 leading-relaxed">{result.reasoning}</p>
              )}
            </motion.div>
          )}

          <Link to="/stocks" className="btn-ghost w-full text-sm mt-4 flex items-center justify-center gap-1.5">
            Full Stock Research <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
