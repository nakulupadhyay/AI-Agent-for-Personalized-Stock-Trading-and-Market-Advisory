import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Activity, Sparkles, ArrowRight, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/features/auth/authStore';
import { formatCurrency, formatPercent, formatChange } from '@/utils/formatters';

// Memoized static mock data
const MOCK_CHART = Array.from({ length: 12 }, (_, i) => ({
  month: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][i],
  value: 80000 + (Math.random() * 40000),
}));

const FALLBACK_STOCKS = [
  { symbol: 'RELIANCE', companyName: 'Reliance Industries', currentPrice: 2450, change: 12.5, changePercent: 0.5 },
  { symbol: 'TCS', companyName: 'Tata Consultancy', currentPrice: 3820, change: -15.4, changePercent: -0.4 },
  { symbol: 'INFY', companyName: 'Infosys Ltd', currentPrice: 1540, change: 8.2, changePercent: 0.53 },
  { symbol: 'HDFCBANK', companyName: 'HDFC Bank', currentPrice: 1680, change: 5.4, changePercent: 0.32 },
];

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = useState<any>(null);
  const [stocks, setStocks] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsSyncing(true);
    
    try {
      const [portRes, stockRes] = await Promise.allSettled([
        api.get('/portfolio'),
        api.get('/stocks')
      ]);

      if (portRes.status === 'fulfilled') {
        const d = portRes.value.data;
        setStats({
          value: d.totalValue ?? d.data?.totalValue ?? 125000,
          invested: d.totalInvested ?? d.data?.totalInvested ?? 112500,
          pnl: d.totalGainLoss ?? d.data?.totalGainLoss ?? 12500,
          pnlPercent: d.totalGainLossPercent ?? d.data?.totalGainLossPercent ?? 11.1,
        });
      } else {
        setStats((prev: any) => prev || { value: 125000, invested: 112500, pnl: 12500, pnlPercent: 11.1 });
      }

      if (stockRes.status === 'fulfilled') {
        const sData = stockRes.value.data?.data || stockRes.value.data || [];
        setStocks(sData.slice(0, 4));
      } else {
        setStocks((prev: any[]) => prev.length > 0 ? prev : FALLBACK_STOCKS);
      }
    } catch {
      // Background failure silently ignores
    } finally {
      setInitialLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchDashboardData(false);
  }, [fetchDashboardData]);

  // Real-time integration via Polling (20s interval)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 20000); // 20 seconds background poll (safeguards rate limits)
    
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const getTimeOfDay = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Morning';
    if (h < 17) return 'Afternoon';
    return 'Evening';
  }, []);

  // Performance Optimization: Memoize the primary cards array to prevent re-instantiation
  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      { label: 'Portfolio Value', value: formatCurrency(stats.value), isPnl: false },
      { label: 'Total P&L', value: `${stats.pnl >= 0 ? '+' : ''}${formatCurrency(Math.abs(stats.pnl))}`, isPnl: true, pnlVal: stats.pnl },
      { label: 'Total Invested', value: formatCurrency(stats.invested), isPnl: false }
    ];
  }, [stats]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in w-full max-w-7xl mx-auto will-change-transform">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-black text-white tracking-tight"
          >
            Good {getTimeOfDay}, <span className="text-primary-400">{user?.name?.split(' ')[0] ?? 'Trader'}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-slate-400 mt-1">
            Market is looking active today. Here is your portfolio summary.
          </motion.p>
        </div>
        <button 
          onClick={() => fetchDashboardData(false)} 
          disabled={isSyncing}
          className="btn-ghost flex items-center gap-2 self-start sm:self-auto px-4 py-2 text-xs"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin text-primary-400' : ''} />
          {isSyncing ? 'Syncing...' : 'Live Sync'}
        </button>
      </div>

      {initialLoading && !stats ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* STATS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card bg-gradient-to-br from-dark-200/80 to-dark-100/50 border-t-primary-500/30">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{statCards[0].label}</p>
              <h2 className="text-3xl font-black text-white">{statCards[0].value}</h2>
              <div className="mt-4 flex items-center gap-2 text-sm">
                <span className={`flex items-center gap-1 font-bold ${stats.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                  {stats.pnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  {formatChange(stats.pnlPercent)}%
                </span>
                <span className="text-slate-500">All-time return</span>
              </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.05 }} className="card bg-dark-200/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{statCards[1].label}</p>
              <h2 className={`text-3xl font-black ${stats.pnl >= 0 ? 'text-bull' : 'text-bear'}`}>
                {statCards[1].value}
              </h2>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="card bg-dark-200/50">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">{statCards[2].label}</p>
              <h2 className="text-3xl font-black text-slate-200">{statCards[2].value}</h2>
            </motion.div>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* LEFT COL: CHART + AI RECOMMENDATION */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              
              {/* Responsive Chart Area */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card flex-1 flex flex-col min-h-[340px] will-change-contents">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Activity size={16} className="text-primary-500" />
                    Portfolio Performance
                  </h3>
                  <div className="flex items-center gap-2">
                    {isSyncing && <span className="flex h-2 w-2 relative mr-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
                    </span>}
                    <div className="px-3 py-1 bg-dark-100 rounded-lg text-xs font-medium text-slate-400 border border-slate-800">Live</div>
                  </div>
                </div>
                <div className="flex-1 w-full relative min-h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={MOCK_CHART} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorPrimary" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#6C63FF" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', backdropFilter: 'blur(8px)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '12px' }}
                        itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        formatter={(val: number) => [formatCurrency(val), 'Value']}
                      />
                      <Area type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={3} fill="url(#colorPrimary)" activeDot={{ r: 6, fill: '#6C63FF', border: 'none' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              {/* AI Recommendation Card */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary-900/40 to-dark-200 border border-primary-500/20 p-6 flex flex-col sm:flex-row items-center gap-5 will-change-contents"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                
                <div className="w-14 h-14 shrink-0 rounded-2xl bg-primary-500/20 border border-primary-500/40 flex items-center justify-center relative z-10 shadow-glow-primary">
                  <Sparkles className="text-primary-400" size={24} />
                </div>
                
                <div className="flex-1 text-center sm:text-left relative z-10">
                  <p className="text-primary-300 font-bold text-sm tracking-wide uppercase mb-1">AI Recommendation</p>
                  <h4 className="text-lg text-white font-medium">AI suggests accumulating <strong className="text-primary-400 font-black">INFY</strong></h4>
                  <p className="text-sm text-slate-400 mt-1">High confidence score (87%) based on recent technical breakouts and sector momentum.</p>
                </div>
                
                <Link to="/stocks" className="shrink-0 relative z-10 btn-primary flex items-center gap-2 hover:gap-3 transition-all px-6 py-3 rounded-xl whitespace-nowrap shadow-glow-primary">
                  Analyze <ArrowRight size={16} />
                </Link>
              </motion.div>
            </div>

            {/* RIGHT COL: STOCK CARDS GRID */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Top Movers</h3>
                <Link to="/stocks" className="text-xs font-semibold text-primary-400 hover:text-primary-300 transition-colors">View All {'>'}</Link>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                {stocks.map((stock, i) => {
                  const isUp = stock.change >= 0;
                  return (
                    <motion.div 
                      key={stock.symbol}
                      initial={{ opacity: 0, x: 20 }} 
                      animate={{ opacity: 1, x: 0 }} 
                      transition={{ delay: 0.1 + (i * 0.05) }}
                      className="group relative bg-dark-200/40 backdrop-blur-md border border-slate-800 hover:border-slate-600 rounded-xl p-4 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl cursor-pointer will-change-transform"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs ${isUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
                            {stock.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <h4 className="font-bold text-white text-base group-hover:text-primary-300 transition-colors">{stock.symbol}</h4>
                            <p className="text-[10px] text-slate-500 line-clamp-1">{stock.companyName || 'Equity'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-end mt-2">
                        <p className="text-lg font-black text-white transition-opacity duration-300">{formatCurrency(stock.currentPrice)}</p>
                        <div className={`flex flex-col items-end text-sm font-bold transition-opacity duration-300 ${isUp ? 'text-bull' : 'text-bear'}`}>
                          <span className="flex items-center gap-1">
                            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {formatPercent(Math.abs(stock.changePercent))}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>

          </div>
        </>
      )}
    </div>
  );
}