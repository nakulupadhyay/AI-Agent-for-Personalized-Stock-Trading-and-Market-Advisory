import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, ShieldCheck, TrendingUp, TrendingDown, AlertTriangle, Briefcase, PieChart, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';

const SECTORS = ['Information Technology','Banking & Finance','Energy & Petrochemicals','FMCG','Pharmaceuticals','Automobile','Infrastructure','Telecom','Metals & Mining','Real Estate','Media & Entertainment','Other'];

const fmt = (n: number) => n?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) ?? '0';
const fmtCur = (n: number) => `₹${fmt(n)}`;

interface Holding { symbol: string; companyName: string; sector: string; quantity: number; averagePrice: number; currentPrice: number; _id?: string; }
interface RiskData { riskScore: number; riskCategory: string; metrics: any; diversification: any; sectorBreakdown: any[]; explanations: string[]; stressTest: any[]; scoreBreakdown: any; portfolioSummary?: any; isEmpty?: boolean; }

const levelColor = (l: string) => l === 'Low' ? 'text-emerald-400' : l === 'High' ? 'text-red-400' : 'text-amber-400';
const levelBg = (l: string) => l === 'Low' ? 'bg-emerald-500/10 border-emerald-500/30' : l === 'High' ? 'bg-red-500/10 border-red-500/30' : 'bg-amber-500/10 border-amber-500/30';

export default function AddPortfolioPage() {
  const navigate = useNavigate();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [risk, setRisk] = useState<RiskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [riskLoading, setRiskLoading] = useState(false);
  const [form, setForm] = useState({ symbol: '', companyName: '', sector: 'Other', quantity: '', buyPrice: '', currentPrice: '' });

  const loadPortfolio = useCallback(async () => {
    try {
      const { data } = await api.get('/portfolio/holdings');
      setHoldings(data.data?.holdings || []);
    } catch { /* empty portfolio */ }
  }, []);

  const loadRisk = useCallback(async () => {
    setRiskLoading(true);
    try {
      const { data } = await api.get('/risk-analysis');
      setRisk(data.data ?? data);
    } catch { setRisk(null); }
    finally { setRiskLoading(false); }
  }, []);

  useEffect(() => { loadPortfolio(); loadRisk(); }, [loadPortfolio, loadRisk]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol || !form.quantity || !form.buyPrice) return;
    setLoading(true);
    try {
      await api.post('/portfolio/add-holding', {
        symbol: form.symbol.toUpperCase(), companyName: form.companyName || form.symbol.toUpperCase(),
        sector: form.sector, quantity: Number(form.quantity), buyPrice: Number(form.buyPrice),
        currentPrice: Number(form.currentPrice) || Number(form.buyPrice),
      });
      setForm({ symbol: '', companyName: '', sector: 'Other', quantity: '', buyPrice: '', currentPrice: '' });
      await loadPortfolio(); await loadRisk();
    } catch {}
    finally { setLoading(false); }
  };

  const handleRemove = async (symbol: string) => {
    try {
      await api.delete(`/portfolio/holding/${symbol}`);
      await loadPortfolio(); await loadRisk();
    } catch {}
  };

  const totalInvested = holdings.reduce((s, h) => s + h.quantity * h.averagePrice, 0);
  const currentValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
  const totalPL = currentValue - totalInvested;
  const plPercent = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
  const uniqueSectors = [...new Set(holdings.map(h => h.sector || 'Other'))];

  return (
    <div className="min-h-full bg-slate-50 dark:bg-gradient-to-br dark:from-[#020617] dark:via-[#0f172a] dark:to-[#020617] -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
      <div className="space-y-6 animate-fade-in max-w-7xl mx-auto pb-10">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <motion.h1 initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-4xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              <button onClick={() => navigate('/portfolio')} className="p-2 rounded-xl hover:bg-white/10 transition-colors"><ArrowLeft size={24} /></button>
              Add Portfolio
            </motion.h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm font-medium ml-12">Add stocks manually and get instant AI risk analysis.</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Left: Form + Table */}
          <div className="lg:col-span-2 space-y-6">
            {/* Add Stock Form */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card border border-primary-500/20">
              <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Plus size={18} className="text-primary-400" /> Add Stock</h2>
              <form onSubmit={handleAdd} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input value={form.symbol} onChange={e => setForm(f => ({...f, symbol: e.target.value}))} placeholder="Symbol (e.g. TCS)" className="form-input" required />
                  <input value={form.companyName} onChange={e => setForm(f => ({...f, companyName: e.target.value}))} placeholder="Company Name" className="form-input" />
                </div>
                <select value={form.sector} onChange={e => setForm(f => ({...f, sector: e.target.value}))} className="form-input">
                  {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-3">
                  <input type="number" step="1" min="1" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} placeholder="Qty" className="form-input" required />
                  <input type="number" step="0.01" min="0.01" value={form.buyPrice} onChange={e => setForm(f => ({...f, buyPrice: e.target.value}))} placeholder="Buy ₹" className="form-input" required />
                  <input type="number" step="0.01" min="0.01" value={form.currentPrice} onChange={e => setForm(f => ({...f, currentPrice: e.target.value}))} placeholder="Current ₹" className="form-input" />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} {loading ? 'Adding...' : 'Add to Portfolio'}
                </button>
              </form>
            </motion.div>

            {/* Holdings Table */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
              <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Briefcase size={18} className="text-primary-400" /> Holdings ({holdings.length})</h2>
              {holdings.length === 0 ? (
                <div className="text-center py-8 text-slate-500"><Briefcase size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">No stocks yet. Add your first stock above.</p></div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar">
                  <AnimatePresence>
                    {holdings.map((h, i) => {
                      const pl = (h.currentPrice - h.averagePrice) * h.quantity;
                      const plPct = h.averagePrice > 0 ? ((h.currentPrice - h.averagePrice) / h.averagePrice) * 100 : 0;
                      const isUp = pl >= 0;
                      return (
                        <motion.div key={h.symbol + i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ delay: i * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-dark-100/40 border border-slate-200 dark:border-white/5 hover:border-primary-500/30 transition-colors group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs ${isUp ? 'bg-bull/10 text-bull' : 'bg-bear/10 text-bear'}`}>
                              {h.symbol.substring(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{h.symbol}</p>
                              <p className="text-[10px] text-slate-500 truncate">{h.sector} · {h.quantity} shares</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className={`font-bold text-sm ${isUp ? 'text-bull' : 'text-bear'}`}>{isUp ? '+' : ''}{fmtCur(pl)}</p>
                              <p className={`text-[10px] font-bold ${isUp ? 'text-bull' : 'text-bear'}`}>{isUp ? '+' : ''}{plPct.toFixed(1)}%</p>
                            </div>
                            <button onClick={() => handleRemove(h.symbol)} className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
              {holdings.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-3 gap-3 text-center">
                  <div><p className="text-[10px] text-slate-500 uppercase font-bold">Invested</p><p className="text-sm font-black text-slate-900 dark:text-white">{fmtCur(totalInvested)}</p></div>
                  <div><p className="text-[10px] text-slate-500 uppercase font-bold">Current</p><p className="text-sm font-black text-slate-900 dark:text-white">{fmtCur(currentValue)}</p></div>
                  <div><p className="text-[10px] text-slate-500 uppercase font-bold">P&L</p><p className={`text-sm font-black ${totalPL >= 0 ? 'text-bull' : 'text-bear'}`}>{totalPL >= 0 ? '+' : ''}{fmtCur(totalPL)} ({plPercent.toFixed(1)}%)</p></div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right: AI Risk Report */}
          <div className="lg:col-span-3 space-y-6">
            {riskLoading ? (
              <div className="card flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin text-primary-400" /><p className="ml-3 text-slate-500">Analyzing portfolio risk...</p></div>
            ) : !risk || risk.isEmpty || holdings.length === 0 ? (
              <div className="card flex flex-col items-center justify-center py-20 text-center">
                <ShieldCheck size={52} className="text-primary-400 mb-4 opacity-60" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Risk Data Yet</h2>
                <p className="text-slate-500 text-sm max-w-xs">Add stocks to your portfolio to generate an AI-powered risk analysis report.</p>
              </div>
            ) : (
              <>
                {/* Portfolio Summary */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card border border-primary-500/20">
                  <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2"><PieChart size={18} className="text-primary-400" /> Portfolio Summary</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-dark-100 rounded-xl p-3 border border-slate-300 dark:border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500">Total Stocks</p><p className="text-lg font-black text-slate-900 dark:text-white">{holdings.length}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-100 rounded-xl p-3 border border-slate-300 dark:border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500">Sectors</p><p className="text-lg font-black text-slate-900 dark:text-white">{uniqueSectors.length}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-100 rounded-xl p-3 border border-slate-300 dark:border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500">Investment</p><p className="text-lg font-black text-slate-900 dark:text-white">{fmtCur(totalInvested)}</p>
                    </div>
                    <div className="bg-white dark:bg-dark-100 rounded-xl p-3 border border-slate-300 dark:border-slate-700/40 text-center">
                      <p className="text-xs text-slate-500">Diversification</p><p className="text-lg font-black text-slate-900 dark:text-white">{risk.diversification?.diversificationRatio ?? 'N/A'}</p>
                    </div>
                  </div>
                </motion.div>

                {/* Overall Risk */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className={`card border ${levelBg(risk.riskCategory)} flex flex-col sm:flex-row items-center gap-6`}>
                  <div className="relative w-28 h-28 flex-shrink-0">
                    <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                      <circle cx="50" cy="50" r="42" fill="none" stroke={risk.riskCategory === 'Low' ? '#10B981' : risk.riskCategory === 'High' ? '#EF4444' : '#F59E0B'}
                        strokeWidth="10" strokeLinecap="round" strokeDasharray={`${((risk.riskScore ?? 0) / 100) * 263.9} 263.9`} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-2xl font-black ${levelColor(risk.riskCategory)}`}>{risk.riskScore}</span>
                      <span className="text-[10px] text-slate-500">/ 100</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-slate-500 mb-1">Overall Risk Level</p>
                    <p className={`text-3xl font-black ${levelColor(risk.riskCategory)}`}>{risk.riskCategory} Risk</p>
                    <p className="text-sm text-slate-500 mt-2">Your portfolio carries a <span className={`font-semibold ${levelColor(risk.riskCategory)}`}>{risk.riskCategory?.toLowerCase()}</span> risk profile.</p>
                  </div>
                </motion.div>

                {/* Risk Metrics */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card">
                  <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4">Risk Metrics</h2>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Volatility', value: `${risk.metrics?.volatility ?? 0}%`, color: (risk.metrics?.volatility ?? 0) > 30 ? 'text-red-400' : (risk.metrics?.volatility ?? 0) > 15 ? 'text-amber-400' : 'text-emerald-400' },
                      { label: 'Sharpe Ratio', value: risk.metrics?.sharpeRatio ?? 0, color: (risk.metrics?.sharpeRatio ?? 0) > 1 ? 'text-emerald-400' : 'text-amber-400' },
                      { label: 'Max Drawdown', value: `${risk.metrics?.maxDrawdown ?? 0}%`, color: (risk.metrics?.maxDrawdown ?? 0) > 20 ? 'text-red-400' : 'text-emerald-400' },
                      { label: 'Beta', value: risk.metrics?.beta ?? 0, color: (risk.metrics?.beta ?? 0) > 1.2 ? 'text-red-400' : 'text-emerald-400' },
                      { label: 'VaR (Daily)', value: `${risk.metrics?.varDaily ?? 0}%`, color: (risk.metrics?.varDaily ?? 0) > 3 ? 'text-red-400' : 'text-amber-400' },
                      { label: 'Sector HHI', value: risk.diversification?.hhi ?? 0, color: (risk.diversification?.hhi ?? 0) > 0.5 ? 'text-red-400' : 'text-emerald-400' },
                      { label: 'Concentration', value: `${risk.diversification?.sectorConcentration ?? 0}%`, color: (risk.diversification?.sectorConcentration ?? 0) > 60 ? 'text-red-400' : 'text-emerald-400' },
                      { label: 'VaR Amount', value: fmtCur(risk.metrics?.varAmount ?? 0), color: 'text-amber-400' },
                    ].map((m, i) => (
                      <div key={i} className="bg-white dark:bg-dark-100 rounded-xl p-3 border border-slate-300 dark:border-slate-700/40">
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest">{m.label}</p>
                        <p className={`text-lg font-black ${m.color}`}>{m.value}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>

                {/* Sector Breakdown */}
                {risk.sectorBreakdown && risk.sectorBreakdown.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card">
                    <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4">Sector Allocation</h2>
                    <div className="space-y-3">
                      {risk.sectorBreakdown.map((s: any) => (
                        <div key={s.sector}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-semibold text-slate-600 dark:text-slate-300">{s.sector}</span>
                            <span className="text-slate-500">{s.percent}% · {fmtCur(s.value)}</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2">
                            <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(100, s.percent)}%`, backgroundColor: s.color }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* AI Insights */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="card">
                  <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4 flex items-center gap-2"><ShieldCheck size={18} className="text-primary-400" /> AI Risk Insights & Recommendations</h2>
                  <div className="space-y-2">
                    {(risk.explanations ?? []).map((s: string, i: number) => (
                      <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                        className="flex items-start gap-3 bg-white dark:bg-dark-100 rounded-xl px-4 py-3 border border-slate-300 dark:border-slate-700/40">
                        {s.startsWith('✅') ? <TrendingUp size={14} className="text-emerald-400 flex-shrink-0 mt-0.5" /> :
                         s.startsWith('⚠️') || s.startsWith('🔴') ? <AlertTriangle size={14} className="text-red-400 flex-shrink-0 mt-0.5" /> :
                         <TrendingDown size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />}
                        <span className="text-sm text-slate-600 dark:text-slate-300">{s}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* Stress Test */}
                {risk.stressTest && risk.stressTest.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card">
                    <h2 className="font-black text-lg text-slate-900 dark:text-white mb-4">Stress Test Scenarios</h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {risk.stressTest.map((s: any) => (
                        <div key={s.scenario} className="bg-white dark:bg-dark-100 rounded-xl p-4 border border-slate-300 dark:border-slate-700/30">
                          <p className="text-xs text-slate-500 mb-1">{s.description}</p>
                          <p className="font-bold text-slate-900 dark:text-white text-sm">{s.scenario}</p>
                          <p className="text-red-400 font-black text-lg mt-2">{s.portfolioDropPercent}%</p>
                          <p className="text-xs text-slate-500">Loss: {fmtCur(Math.abs(s.portfolioLoss))}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Final Verdict */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
                  className={`card border ${levelBg(risk.riskCategory)}`}>
                  <h2 className="font-black text-lg text-slate-900 dark:text-white mb-3">Final Verdict</h2>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {risk.riskCategory === 'Low' && `Your portfolio demonstrates strong fundamentals with a risk score of ${risk.riskScore}/100. The diversification across ${uniqueSectors.length} sector(s) and ${holdings.length} stock(s) provides good downside protection. Continue monitoring and maintain your balanced approach.`}
                    {risk.riskCategory === 'Medium' && `Your portfolio has a moderate risk score of ${risk.riskScore}/100. With ${holdings.length} stock(s) across ${uniqueSectors.length} sector(s), there's room for improvement. Consider diversifying into defensive sectors like FMCG or Pharma to reduce volatility.`}
                    {risk.riskCategory === 'High' && `⚠️ Your portfolio carries elevated risk at ${risk.riskScore}/100. With ${holdings.length} stock(s) in ${uniqueSectors.length} sector(s), concentration risk is a concern. Urgently consider rebalancing — add defensive stocks and reduce overweight positions.`}
                  </p>
                </motion.div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
