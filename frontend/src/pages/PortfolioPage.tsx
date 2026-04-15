import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { TrendingUp, TrendingDown, RefreshCw, Wallet, Activity, Briefcase, Search, Sparkles, Filter, ChevronUp, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { formatCurrency, formatPercent, formatChange } from '@/utils/formatters';
import { useAnimatedNumber } from '@/hooks/useAnimatedNumber';

const COLORS = ['#6C63FF', '#10B981', '#F59E0B', '#EF4444', '#a29bfe', '#34d399'];
const generateSparkline = () => Array.from({ length: 15 }, () => ({ value: Math.random() * 100 }));

const DEMO = {
  totalValue: 125000, totalInvested: 112500, totalGainLoss: 12500, totalGainLossPercent: 11.1,
  holdings: [
    { _id: '1', symbol: 'RELIANCE', name: 'Reliance Industries', quantity: 10, avgPrice: 2400, currentPrice: 2650, currentValue: 26500, gainLoss: 2500, gainLossPercent: 10.4, allocation: 21.2 },
    { _id: '2', symbol: 'TCS',      name: 'Tata Consultancy',    quantity: 5,  avgPrice: 3500, currentPrice: 3820, currentValue: 19100, gainLoss: 1600, gainLossPercent:  9.1, allocation: 15.3 },
    { _id: '3', symbol: 'INFY',     name: 'Infosys Ltd',         quantity: 15, avgPrice: 1480, currentPrice: 1560, currentValue: 23400, gainLoss: 1200, gainLossPercent:  5.4, allocation: 18.7 },
    { _id: '4', symbol: 'HDFCBANK', name: 'HDFC Bank',           quantity: 8,  avgPrice: 1620, currentPrice: 1590, currentValue: 12720, gainLoss: -240, gainLossPercent: -1.8, allocation: 10.2 },
  ],
};

const SparkLine = ({ data, color }: { data: any[], color: string }) => (
  <div className="h-10 w-24 opacity-60 mix-blend-screen drop-shadow-md">
    <ResponsiveContainer w-full="true" height="100%">
      <LineChart data={data}>
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default function PortfolioPage() {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Table state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'currentValue', direction: 'desc' });

  const loadData = useCallback(async (isBackground = false) => {
    if (!isBackground) setIsSyncing(true);
    try {
      const { data } = await api.get('/portfolio/analysis');
      setPortfolio(data.data ?? DEMO);
    } catch {
      setPortfolio((prev: any) => prev || DEMO);
    } finally {
      setIsSyncing(false);
      setInitialLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => { loadData(false); }, [loadData]);

  // Background polling (real-time UX) -> ping every 20 seconds
  useEffect(() => {
    const interval = setInterval(() => loadData(true), 20000);
    return () => clearInterval(interval);
  }, [loadData]);

  const navigate = useNavigate();

  // Smooth number animations mappings
  const animValue = useAnimatedNumber(portfolio?.summary?.currentValue ?? portfolio?.totalValue ?? 0);
  const animInvested = useAnimatedNumber(portfolio?.summary?.totalInvestment ?? portfolio?.totalInvested ?? 0);
  const animPnl = useAnimatedNumber(portfolio?.summary?.totalPL ?? portfolio?.totalGainLoss ?? 0);

  const handleSort = (key: string) => {
    setSortConfig(s => ({
      key,
      direction: s.key === key && s.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const processedHoldings = useMemo(() => {
    if (!portfolio || !portfolio.holdings) return [];
    return portfolio.holdings
      .filter((h: any) => {
        const query = searchQuery.toLowerCase();
        return (h.symbol?.toLowerCase().includes(query)) || 
               (h.name?.toLowerCase().includes(query)) ||
               (h.companyName?.toLowerCase().includes(query));
      })
      .sort((a: any, b: any) => {
        const valA = a[sortConfig.key] ?? a.totalValue ?? a.currentValue ?? 0;
        const valB = b[sortConfig.key] ?? b.totalValue ?? b.currentValue ?? 0;
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
  }, [portfolio, searchQuery, sortConfig]);

  const pieData = useMemo(() => {
    return portfolio?.holdings?.map((h: any) => ({
      name: h.symbol, value: h.totalValue ?? h.currentValue ?? ((h.currentPrice * h.quantity) || 0), allocation: h.allocation || 0,
    })) ?? [];
  }, [portfolio]);

  const animPieLength = useAnimatedNumber(pieData.length, 1500);

  // Top cards generated globally so map rendering is strict
  const topCards = useMemo(() => {
    if (!portfolio) return [];
    const isProfitable = animPnl >= 0;
    return [
      { label: 'Total Portfolio Value', value: formatCurrency(animValue), bg: 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10', icon: Wallet, color: '#6C63FF', chart: generateSparkline() },
      { label: 'Total Invested Amount', value: formatCurrency(animInvested), bg: 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10', icon: Briefcase, color: '#94a3b8', chart: generateSparkline() },
      { label: 'Net Profit & Loss',
        value: `${isProfitable ? '+' : ''}${formatCurrency(Math.abs(animPnl))}`,
        sub: formatChange(portfolio.summary?.returnPercent ?? portfolio.totalGainLossPercent) + '% Returns',
        isPnl: true,
        bg: isProfitable ? 'bg-bull/10 border-bull/20' : 'bg-bear/10 border-bear/20',
        icon: isProfitable ? TrendingUp : TrendingDown,
        color: isProfitable ? '#10B981' : '#EF4444',
        chart: generateSparkline()
      },
    ];
  }, [portfolio, animValue, animInvested, animPnl]);

  return (
    <div className="min-h-full bg-slate-50 dark:bg-gradient-to-br dark:from-[#020617] dark:via-[#0f172a] dark:to-[#020617] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">
        
        {/* Header */}
        {/* i want to add profolio add button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              My Portfolio
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
              Track your open positions, asset allocation, and AI insights.

            </motion.p>
          </div>
          <button>+ADD</button>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              My Portfolio
            </motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium">
              Track your open positions, asset allocation, and AI insights.
            </motion.p>
          </div>
          <button 
            onClick={() => loadData(false)} 
            disabled={isSyncing}
            className="btn-ghost text-sm py-2 px-4 flex items-center gap-2 hover:bg-primary-500/10 shadow-lg"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin text-primary-400' : ''} />
            {isSyncing ? 'Live Syncing...' : 'Live Sync Data'}
          </button>
        </div>

        {initialLoading && !portfolio ? (
          <div className="grid sm:grid-cols-3 gap-6">{Array.from({length: 3}).map((_,i) => <CardSkeleton key={i} />)}</div>
        ) : portfolio ? (
          <>
            {/* Top Stat Cards Grid */}
            <div className="grid sm:grid-cols-3 gap-6">
              {topCards.map((c, i) => (
                <motion.div key={c.label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}
                  className={`relative overflow-hidden rounded-2xl border ${c.bg} p-6 shadow-2xl backdrop-blur-xl hover:scale-[1.03] hover:shadow-glow-primary transition-all duration-300 group will-change-transform`}>
                  
                  {/* Glow aura */}
                  <div className="absolute top-0 right-0 w-32 h-32 opacity-20 blur-3xl rounded-full pointer-events-none transition-all duration-300 group-hover:opacity-40" style={{ backgroundColor: c.color }} />

                  <div className="flex justify-between items-start relative z-10">
                    <div>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{c.label}</span>
                      <h2 className={`mt-2 text-3xl font-black tracking-tight ${c.isPnl ? (animPnl >= 0 ? 'text-bull' : 'text-bear') : 'text-slate-900 dark:text-white'}`}>
                        {c.value}
                      </h2>
                      {c.sub && <p className="mt-1 text-sm font-bold opacity-90" style={{ color: c.color }}>{c.sub}</p>}
                    </div>
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-slate-100 dark:bg-white/5 shadow-inner" style={{ color: c.color }}>
                      <c.icon size={24} />
                    </div>
                  </div>

                  <div className="mt-4 flex justify-between items-end relative z-10">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider flex items-center gap-2">
                       {isSyncing && <span className="flex h-1.5 w-1.5 relative"><span className="animate-ping absolute h-full w-full rounded-full bg-primary-400 opacity-75"></span><span className="relative rounded-full h-1.5 w-1.5 bg-primary-500"></span></span>}
                       Real-time status
                    </div>
                    <SparkLine data={c.chart} color={c.color} />
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Main Content Area */}
            <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
              
              {/* Left Col: Charts & AI */}
              <div className="lg:col-span-1 flex flex-col gap-6">
                {/* Target Allocation Donut Chart */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
                            className="rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 backdrop-blur-xl p-6 shadow-2xl flex flex-col hover:border-slate-300 dark:hover:border-white/10 transition-colors will-change-transform">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="font-black text-lg text-slate-900 dark:text-white">Asset Allocation</h2>
                    <div className="p-2 bg-slate-100 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/5"><Activity size={16} className="text-primary-500" /></div>
                  </div>
                  
                  {pieData.length > 0 ? (
                    <div className="flex-1 min-h-[250px] relative mt-4">
                      <ResponsiveContainer w-full="true" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                               innerRadius={65} outerRadius={95} paddingAngle={4} minAngle={15}>
                            {pieData.map((_: any, i: number) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer outline-none drop-shadow-xl" stroke="rgba(255,255,255,0.05)" strokeWidth={2} />
                            ))}
                          </Pie>
                          <RechartsTooltip 
                            contentStyle={{ background: 'rgba(15,23,42,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                            formatter={(val: number) => [formatCurrency(val), 'Market Value']}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mb-4">
                        <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Holdings</span>
                        <span className="text-slate-900 dark:text-white text-3xl font-black">{animPieLength.toFixed(0)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 border border-dashed border-white/10 rounded-2xl min-h-[200px] mt-4">
                      <Briefcase size={32} className="mb-2 opacity-50" />
                      <p className="font-medium text-sm text-slate-500 dark:text-slate-400">No holdings to analyze</p>
                    </div>
                  )}
                </motion.div>

                {/* AI Insights Panel */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                            className="rounded-2xl border border-primary-500/30 bg-white dark:bg-gradient-to-b dark:from-primary-900/20 dark:to-transparent backdrop-blur-xl p-6 shadow-2xl relative overflow-hidden group will-change-transform">
                   <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <Sparkles size={100} />
                   </div>
                   <div className="flex items-center gap-3 mb-4 relative z-10">
                     <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center text-slate-900 dark:text-white shadow-glow-primary">
                       <Sparkles size={20} />
                     </div>
                     <h2 className="font-black text-lg text-slate-900 dark:text-white">AI Insights</h2>
                   </div>
                   
                   <div className="space-y-4 relative z-10">
                     {portfolio.aiInsights?.length > 0 ? (
                       portfolio.aiInsights.slice(0, 2).map((insight: string, idx: number) => (
                         <div key={idx} className="bg-white dark:bg-dark-100/40 rounded-xl p-4 border border-slate-200 dark:border-white/5 hover:border-primary-500/30 transition-colors">
                           <h3 className="font-bold text-primary-400 text-sm mb-1 flex justify-between">
                             Insight #{idx + 1}
                             <span className="bg-primary-500/20 text-primary-400 px-2 py-0.5 rounded text-[10px]">AI</span>
                           </h3>
                           <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{insight}</p>
                         </div>
                       ))
                     ) : (
                       <>
                         <div className="bg-white dark:bg-dark-100/40 rounded-xl p-4 border border-slate-200 dark:border-white/5 hover:border-bull/30 transition-colors">
                           <h3 className="font-bold text-bull text-sm mb-1 flex justify-between">
                             Buy Opportunity: TCS
                             <span className="bg-bull/20 text-bull px-2 py-0.5 rounded text-[10px]">92% Match</span>
                           </h3>
                           <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">AI suggests accumulating TCS based on an imminent technical breakout combined with solid sector momentum.</p>
                         </div>
                         <div className="bg-white dark:bg-dark-100/40 rounded-xl p-4 border border-slate-200 dark:border-white/5 hover:border-bear/30 transition-colors">
                           <h3 className="font-bold text-bear text-sm mb-1 flex justify-between">
                             Risk Warning: ICICI
                             <span className="bg-bear/20 text-bear px-2 py-0.5 rounded text-[10px]">Bearish</span>
                           </h3>
                           <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Avoid increasing positions in ICICI Bank short-term due to underlying MACD divergence detected by our core modeling.</p>
                         </div>
                       </>
                     )}
                   </div>
                </motion.div>
              </div>

              {/* Right Col: Interactive Holdings Table */}
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}
                          className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-white/5 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden max-h-[850px] will-change-transform">
                
                <div className="p-6 border-b border-white/5 bg-white dark:bg-dark-100/20 sm:flex justify-between items-center space-y-4 sm:space-y-0">
                  <div>
                    <h2 className="font-black text-xl text-slate-900 dark:text-white flex items-center gap-2">
                       Current Assets 
                       {isSyncing && <span className="px-2 py-0.5 bg-primary-500/10 text-primary-400 border border-primary-500/20 rounded-md text-[10px] tracking-widest uppercase animate-pulse">Syncing</span>}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">Manage and review your live holdings</p>
                  </div>
                  
                  {/* Search and Filters */}
                  <div className="flex items-center gap-3">
                    <div className="relative flex items-center w-full sm:w-auto">
                      <Search size={14} className="absolute left-3 text-slate-500" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search symbols..."
                        className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-dark-200/50 border border-white/10 rounded-xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none w-full shadow-inner transition-all hover:bg-slate-50 dark:bg-dark-200/80"
                      />
                    </div>
                    <button className="p-2.5 bg-slate-50 dark:bg-dark-200/50 border border-white/10 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:text-white hover:border-white/30 transition-all">
                      <Filter size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Table container with scrolling */}
                <div className="overflow-y-auto overflow-x-auto flex-1 custom-scrollbar">
                  <table className="w-full text-sm text-left border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-[#0f172a]/95 backdrop-blur-md shadow-sm border-b border-slate-200 dark:border-white/5">
                      <tr>
                        {[
                          { key: 'symbol', label: 'Asset' },
                          { key: 'quantity', label: 'Holdings' },
                          { key: 'avgPrice', label: 'Avg Cost' },
                          { key: 'currentPrice', label: 'Current' },
                          { key: 'gainLoss', label: 'Net Return' },
                        ].map((col) => (
                          <th key={col.key} onClick={() => handleSort(col.key)} className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none">
                            <div className="flex items-center gap-1">
                              {col.label}
                              <div className="flex flex-col">
                                <ChevronUp size={10} className={`${sortConfig.key === col.key && sortConfig.direction === 'asc' ? 'text-primary-400' : 'text-slate-600'}`} />
                                <ChevronDown size={10} className={`-mt-1 ${sortConfig.key === col.key && sortConfig.direction === 'desc' ? 'text-primary-400' : 'text-slate-600'}`} />
                              </div>
                            </div>
                          </th>
                        ))}
                        <th className="px-6 py-4 font-bold text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      <AnimatePresence>
                        {processedHoldings.length === 0 ? (
                          <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <td colSpan={6} className="px-6 py-16 text-center text-slate-500 font-medium">
                              No matching assets found in your portfolio.
                            </td>
                          </motion.tr>
                        ) : (
                          processedHoldings.map((h: any, i: number) => {
                            const netPnl = h.profitLoss ?? h.gainLoss ?? (((h.currentPrice - (h.averagePrice || h.avgBuyPrice || h.avgPrice || 0)) * h.quantity) || 0);
                            const isUp = netPnl >= 0;
                            const pnlPercent = h.returnPercent ?? h.gainLossPercent ?? ((((h.currentPrice - (h.averagePrice || h.avgBuyPrice || h.avgPrice || 1)) / (h.averagePrice || h.avgBuyPrice || h.avgPrice || 1)) * 100) || 0);
                            
                            return (
                              <motion.tr 
                                layout
                                key={h.symbol || h._id || i} 
                                initial={{ opacity: 0, y: 10 }} 
                                animate={{ opacity: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: 0.05 * i }}
                                className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group cursor-pointer"
                              >
                                
                                {/* Asset info with logo placeholder */}
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex flex-shrink-0 items-center justify-center font-black text-sm ring-2 ring-transparent transition-all group-hover:ring-white/20 group-hover:shadow-lg ${isUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
                                      {h.symbol.substring(0, 2)}
                                    </div>
                                      <div className="min-w-0">
                                        <p className="font-black text-slate-900 dark:text-white text-base truncate group-hover:text-primary-300 transition-colors">{h.symbol}</p>
                                        <p className="text-[11px] font-medium text-slate-500 truncate max-w-[120px]">{h.companyName || h.name}</p>
                                      </div>
                                  </div>
                                </td>

                                <td className="px-6 py-5">
                                  <p className="font-bold text-slate-900 dark:text-white text-base">{h.quantity}</p>
                                  <p className="text-[10px] uppercase font-bold text-slate-600 tracking-wider">Shares</p>
                                </td>

                                <td className="px-6 py-5">
                                  <p className="font-bold text-slate-600 dark:text-slate-300">{formatCurrency(h.avgBuyPrice ?? h.averagePrice ?? h.avgPrice ?? 0)}</p>
                                </td>

                                <td className="px-6 py-5">
                                  <p className="font-black text-slate-900 dark:text-white">{formatCurrency(h.currentPrice)}</p>
                                  <p className={`text-[10px] font-bold mt-0.5 tracking-wide ${(h.currentPrice % 2 === 0) ? 'text-bull' : 'text-bear'}`}>
                                    Live
                                  </p>
                                </td>

                                <td className="px-6 py-5">
                                  <p className={`font-black text-base ${isUp ? 'text-bull' : 'text-bear'}`}>
                                    {isUp ? '+' : ''}{formatCurrency(Math.abs(netPnl))}
                                  </p>
                                  <div className={`inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded mt-1 shadow-sm ${isUp ? 'bg-bull/20 text-bull border border-bull/20' : 'bg-bear/20 text-bear border border-bear/20'}`}>
                                    {isUp ? <TrendingUp size={12} strokeWidth={3} /> : <TrendingDown size={12} strokeWidth={3} />}
                                    {formatPercent(Math.abs(pnlPercent) / 100)}
                                  </div>
                                </td>

                                <td className="px-6 py-5 text-right">
                                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); navigate(`/paper-trading?symbol=${h.symbol}&action=BUY`); }} 
                                      className="px-4 py-2 bg-bull/10 hover:bg-bull hover:text-slate-900 dark:text-white text-bull border border-bull/20 hover:border-bull text-xs font-black rounded-xl transition-all shadow-lg hover:shadow-bull/20">
                                      BUY
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); navigate(`/paper-trading?symbol=${h.symbol}&action=SELL`); }} 
                                      className="px-4 py-2 bg-bear/10 hover:bg-bear hover:text-slate-900 dark:text-white text-bear border border-bear/20 hover:border-bear text-xs font-black rounded-xl transition-all shadow-lg hover:shadow-bear/20">
                                      SELL
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })
                        )}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
              </motion.div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
