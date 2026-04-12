import { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, AlertTriangle, RefreshCw, TrendingDown,
  Activity, BarChart2, Zap, PieChart,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line,
} from 'recharts';
import api from '@/services/api';
import { CardSkeleton } from '@/components/ui/Skeleton';

// ── Backend API response shape ────────────────────────────────
interface BackendRiskData {
  riskScore: number;
  riskCategory: 'Low' | 'Medium' | 'High' | 'N/A';
  metrics: {
    volatility: number;
    sharpeRatio: number;
    sortinoRatio: number;
    maxDrawdown: number;
    currentDrawdown: number;
    beta: number;
    varDaily: number;
    varAmount: number;
  };
  diversification: {
    hhi: number;
    sectorConcentration: number;
    diversificationRatio: number;
  };
  sectorBreakdown: Array<{ sector: string; value: number; percent: number; color: string }>;
  stressTest: Array<{
    scenario: string;
    description: string;
    marketDrop: number;
    portfolioCurrentValue: number;
    portfolioProjectedValue: number;
    portfolioLoss: number;
    portfolioDropPercent: number;
  }>;
  scoreBreakdown: {
    volatilityScore: number;
    sharpeScore: number;
    drawdownScore: number;
    varScore: number;
  };
  explanations: string[];
  portfolioValues: Array<{ day: number; value: number }>;
  userRiskProfile: string | null;
  mlPrediction: unknown | null;
  isEmpty: boolean;
  portfolioSummary?: {
    totalInvested: number;
    currentValue: number;
    holdingCount: number;
    sectorCount: number;
  };
}

// ── Helpers ────────────────────────────────────────────────────
const levelColor = (level: string) =>
  level === 'Low' ? 'text-emerald-400'
  : level === 'High' ? 'text-red-400'
  : level === 'N/A' ? 'text-slate-400'
  : 'text-amber-400';

const levelBg = (level: string) =>
  level === 'Low' ? 'bg-emerald-500/10 border-emerald-500/30'
  : level === 'High' ? 'bg-red-500/10 border-red-500/30'
  : level === 'N/A' ? 'bg-slate-500/10 border-slate-500/30'
  : 'bg-amber-500/10 border-amber-500/30';

const levelStroke = (level: string) =>
  level === 'Low' ? '#10B981' : level === 'High' ? '#EF4444' : level === 'N/A' ? '#64748b' : '#F59E0B';

const fmt = (n: number) => n?.toLocaleString('en-IN') ?? '0';

// ── Empty state (no portfolio) ─────────────────────────────────
function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="card flex flex-col items-center justify-center py-20 text-center">
      <ShieldCheck size={52} className="text-primary-400 mb-4 opacity-60" />
      <h2 className="text-xl font-bold text-white mb-2">No Portfolio Data</h2>
      <p className="text-slate-400 text-sm max-w-xs">
        Start paper trading to unlock AI-powered risk analysis, stress tests, and sector breakdowns.
      </p>
    </motion.div>
  );
}

// ── Metric Card ────────────────────────────────────────────────
function MetricCard({ label, value, sub, color = 'text-white' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="card flex flex-col gap-1">
      <p className="text-xs text-slate-500 uppercase tracking-widest">{label}</p>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────
export default function RiskAnalysisPage() {
  const [data, setData] = useState<BackendRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/risk-analysis');
      // Handle both { data: { ... } } and unwrapped shapes
      const payload: BackendRiskData = res.data?.data ?? res.data;
      setData(payload);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? (err as { message?: string })?.message ?? 'Failed to load risk analysis';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Radar dimensions derived from scoreBreakdown ─────────────
  const radarData = data ? [
    { subject: 'Volatility',  A: data.scoreBreakdown?.volatilityScore ?? 0 },
    { subject: 'Sharpe',      A: 100 - (data.scoreBreakdown?.sharpeScore ?? 0) },
    { subject: 'Drawdown',    A: data.scoreBreakdown?.drawdownScore ?? 0 },
    { subject: 'VaR',         A: data.scoreBreakdown?.varScore ?? 0 },
    { subject: 'Concentration', A: Math.min(100, (data.diversification?.sectorConcentration ?? 0) * 1.5) },
    { subject: 'Sector HHI', A: Math.round((data.diversification?.hhi ?? 0) * 100) },
  ] : [];

  // ── Bar chart from score breakdown ───────────────────────────
  const factorsBar = data ? [
    { name: 'Volatility Risk',    score: data.scoreBreakdown?.volatilityScore ?? 0 },
    { name: 'Sharpe Risk',        score: data.scoreBreakdown?.sharpeScore ?? 0 },
    { name: 'Drawdown Risk',      score: data.scoreBreakdown?.drawdownScore ?? 0 },
    { name: 'Value-at-Risk',      score: data.scoreBreakdown?.varScore ?? 0 },
  ] : [];

  const level = data?.riskCategory ?? 'N/A';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Risk Analysis</h1>
          <p className="page-subtitle mt-1">AI-powered quantitative portfolio risk assessment.</p>
        </div>
        <button onClick={load} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="card border border-red-500/30 bg-red-500/10 text-center py-12">
          <AlertTriangle size={36} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-300 font-semibold">Something went wrong</p>
          <p className="text-slate-400 text-sm mt-1">{error}</p>
          <button onClick={load} className="btn-primary mt-4 text-sm px-4 py-2">Try Again</button>
        </motion.div>
      )}

      {/* Empty portfolio */}
      {!loading && !error && data?.isEmpty && <EmptyState />}

      {/* Main content */}
      {!loading && !error && data && !data.isEmpty && (
        <>
          {/* ── Overall Risk Score ─────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className={`card border ${levelBg(level)} flex flex-col sm:flex-row items-center gap-6`}>
            {/* Gauge */}
            <div className="relative w-28 h-28 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="10" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={levelStroke(level)}
                  strokeWidth="10" strokeLinecap="round"
                  strokeDasharray={`${((data.riskScore ?? 0) / 100) * 263.9} 263.9`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${levelColor(level)}`}>{data.riskScore}</span>
                <span className="text-[10px] text-slate-500">/ 100</span>
              </div>
            </div>
            {/* Labels */}
            <div className="flex-1">
              <p className="text-sm text-slate-500 mb-1">Overall Risk Level</p>
              <p className={`text-3xl font-black ${levelColor(level)}`}>{level} Risk</p>
              <p className="text-sm text-slate-400 mt-2">
                Your portfolio carries a{' '}
                <span className={`font-semibold ${levelColor(level)}`}>{level.toLowerCase()}</span>{' '}
                risk profile. Review the breakdown below.
              </p>
            </div>
            {/* Quick stats */}
            {data.portfolioSummary && (
              <div className="grid grid-cols-2 gap-3 text-center min-w-[180px]">
                <div className="bg-dark-100 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500">Holdings</p>
                  <p className="text-lg font-bold text-white">{data.portfolioSummary.holdingCount}</p>
                </div>
                <div className="bg-dark-100 rounded-xl p-3 border border-slate-700/40">
                  <p className="text-xs text-slate-500">Sectors</p>
                  <p className="text-lg font-bold text-white">{data.portfolioSummary.sectorCount}</p>
                </div>
                <div className="bg-dark-100 rounded-xl p-3 border border-slate-700/40 col-span-2">
                  <p className="text-xs text-slate-500">Current Value</p>
                  <p className="text-lg font-bold text-white">₹{fmt(data.portfolioSummary.currentValue)}</p>
                </div>
              </div>
            )}
          </motion.div>

          {/* ── Key Metrics Grid ───────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Volatility (Ann.)" value={`${data.metrics.volatility}%`}
              sub="Annualized std deviation"
              color={data.metrics.volatility > 30 ? 'text-red-400' : data.metrics.volatility > 15 ? 'text-amber-400' : 'text-emerald-400'} />
            <MetricCard label="Sharpe Ratio" value={`${data.metrics.sharpeRatio}`}
              sub="Risk-adj. return"
              color={data.metrics.sharpeRatio > 1 ? 'text-emerald-400' : data.metrics.sharpeRatio > 0 ? 'text-amber-400' : 'text-red-400'} />
            <MetricCard label="Max Drawdown" value={`${data.metrics.maxDrawdown}%`}
              sub="Peak-to-trough decline"
              color={data.metrics.maxDrawdown > 20 ? 'text-red-400' : data.metrics.maxDrawdown > 10 ? 'text-amber-400' : 'text-emerald-400'} />
            <MetricCard label="Beta" value={`${data.metrics.beta}`}
              sub="vs Nifty 50 benchmark"
              color={data.metrics.beta > 1.2 ? 'text-red-400' : data.metrics.beta < 0.8 ? 'text-emerald-400' : 'text-amber-400'} />
            <MetricCard label="VaR (95%, Daily)" value={`${data.metrics.varDaily}%`}
              sub={`₹${fmt(data.metrics.varAmount)} at risk`}
              color={data.metrics.varDaily > 3 ? 'text-red-400' : 'text-amber-400'} />
            <MetricCard label="Sortino Ratio" value={`${data.metrics.sortinoRatio}`}
              sub="Downside-adj. return"
              color={data.metrics.sortinoRatio > 1 ? 'text-emerald-400' : 'text-amber-400'} />
            <MetricCard label="Current Drawdown" value={`${data.metrics.currentDrawdown}%`}
              sub="From recent peak"
              color={data.metrics.currentDrawdown > 10 ? 'text-red-400' : 'text-emerald-400'} />
            <MetricCard label="Sector HHI" value={`${data.diversification.hhi}`}
              sub={`Concentration: ${data.diversification.sectorConcentration}%`}
              color={data.diversification.hhi > 0.5 ? 'text-red-400' : data.diversification.hhi > 0.25 ? 'text-amber-400' : 'text-emerald-400'} />
          </div>

          {/* ── Radar + Bar charts ─────────────────────── */}
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Activity size={16} className="text-primary-400" />
                <h2 className="font-semibold text-white">Risk Dimensions</h2>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.06)" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 11 }} />
                    <Radar name="Risk" dataKey="A" stroke={levelStroke(level)}
                      fill={levelStroke(level)} fillOpacity={0.18} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BarChart2 size={16} className="text-primary-400" />
                <h2 className="font-semibold text-white">Risk Score Breakdown</h2>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={factorsBar} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} width={110} axisLine={false} />
                    <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`${v}/100`, 'Risk Score']} />
                    <Bar dataKey="score" radius={[0, 6, 6, 0]}
                      fill={levelStroke(level)} background={{ fill: 'rgba(255,255,255,0.03)', radius: 6 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* ── Portfolio Value History ────────────────── */}
          {data.portfolioValues && data.portfolioValues.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingDown size={16} className="text-primary-400" />
                <h2 className="font-semibold text-white">Simulated Portfolio History (90 days)</h2>
              </div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.portfolioValues}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false}
                      label={{ value: 'Day', position: 'insideBottomRight', fill: '#64748b', fontSize: 10 }} />
                    <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false}
                      tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                    <Tooltip contentStyle={{ background: '#1a1f2e', border: '1px solid #333', borderRadius: 8, fontSize: 12 }}
                      formatter={(v: number) => [`₹${fmt(v)}`, 'Portfolio Value']} />
                    <Line type="monotone" dataKey="value" stroke="#6C63FF" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Sector Breakdown ───────────────────────── */}
          {data.sectorBreakdown && data.sectorBreakdown.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={16} className="text-primary-400" />
                <h2 className="font-semibold text-white">Sector Allocation</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.sectorBreakdown.map((s) => (
                  <div key={s.sector} className="bg-dark-100 rounded-xl p-3 border border-slate-700/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300">{s.sector}</span>
                      <span className="text-xs text-slate-500">{s.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${s.percent}%`, backgroundColor: s.color }} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">₹{fmt(s.value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Stress Test ────────────────────────────── */}
          {data.stressTest && data.stressTest.length > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Zap size={16} className="text-primary-400" />
                <h2 className="font-semibold text-white">Stress Test Scenarios</h2>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {data.stressTest.map((s) => (
                  <div key={s.scenario} className="bg-dark-100 rounded-xl p-4 border border-slate-700/30">
                    <p className="text-xs text-slate-500 mb-1">{s.description}</p>
                    <p className="font-bold text-white text-sm">{s.scenario}</p>
                    <p className="text-red-400 font-black text-lg mt-2">{s.portfolioDropPercent}%</p>
                    <p className="text-xs text-slate-400">Loss: ₹{fmt(Math.abs(s.portfolioLoss))}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      ₹{fmt(s.portfolioCurrentValue)} → ₹{fmt(s.portfolioProjectedValue)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Insights ────────────────────────────── */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={18} className="text-primary-400" />
              <h2 className="font-semibold text-white">AI Risk Insights & Recommendations</h2>
            </div>
            <div className="space-y-3">
              {(data.explanations ?? []).map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 bg-dark-100 rounded-xl px-4 py-3 border border-slate-700/40">
                  <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-slate-300">{s}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
