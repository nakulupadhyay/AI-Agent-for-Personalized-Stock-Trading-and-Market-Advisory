import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, DollarSign, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { RecommendationBadge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatters';
import { CardSkeleton } from '@/components/ui/Skeleton';
import type { PaperTrade } from '@/types/portfolio.types';

interface TradeFormState { symbol: string; action: 'BUY' | 'SELL'; quantity: number; }

const DEMO_TRADES: PaperTrade[] = [
  { _id:'1', symbol:'RELIANCE', action:'BUY',  quantity:5,  price:2640, total:13200, timestamp: new Date(Date.now()-3600000).toISOString(), pnl: 250 },
  { _id:'2', symbol:'TCS',      action:'SELL', quantity:2,  price:3800, total:7600,  timestamp: new Date(Date.now()-7200000).toISOString(), pnl:-120 },
  { _id:'3', symbol:'INFY',     action:'BUY',  quantity:10, price:1545, total:15450, timestamp: new Date(Date.now()-86400000).toISOString(), pnl: 150 },
];

export default function PaperTradingPage() {
  const [form, setForm] = useState<TradeFormState>({ symbol: '', action: 'BUY', quantity: 1 });
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const loadTrades = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trading/paper');
      setTrades(data.trades ?? data.data?.trades ?? DEMO_TRADES);
    } catch { setTrades(DEMO_TRADES); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadTrades(); }, []);

  const handleTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.symbol.trim()) { setError('Symbol is required'); return; }
    if (form.quantity < 1) { setError('Quantity must be at least 1'); return; }
    setError(''); setSuccess(''); setSubmitting(true);
    try {
      await api.post('/trading/paper', {
        symbol: form.symbol.trim().toUpperCase(),
        action: form.action,
        quantity: Number(form.quantity),
      });
      setSuccess(`${form.action} order for ${form.quantity} ${form.symbol.toUpperCase()} placed!`);
      setForm({ symbol: '', action: 'BUY', quantity: 1 });
      loadTrades();
    } catch (err: unknown) {
      setError((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Trade failed');
    } finally { setSubmitting(false); }
  };

  const totalPnL = trades.reduce((sum, t) => sum + (t.pnl ?? 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Paper Trading</h1>
          <p className="page-subtitle mt-1">Simulate trades risk-free with virtual money.</p>
        </div>
        <button onClick={loadTrades} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Trade form */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <Activity size={18} className="text-primary-400" />
            <h2 className="font-semibold text-white">Place Order</h2>
          </div>

          {error   && <div className="bg-bear/10 border border-bear/30 text-bear text-sm px-3 py-2.5 rounded-xl mb-4">{error}</div>}
          {success && <div className="bg-bull/10 border border-bull/30 text-bull text-sm px-3 py-2.5 rounded-xl mb-4">{success}</div>}

          <form onSubmit={handleTrade} className="space-y-4">
            <div>
              <label className="text-sm text-slate-400 font-medium block mb-1.5">Stock Symbol</label>
              <input value={form.symbol} onChange={(e) => setForm(f => ({ ...f, symbol: e.target.value.toUpperCase() }))}
                placeholder="e.g. RELIANCE" className="form-input" maxLength={10} />
            </div>
            <div>
              <label className="text-sm text-slate-400 font-medium block mb-1.5">Action</label>
              <div className="grid grid-cols-2 gap-2">
                {(['BUY', 'SELL'] as const).map((a) => (
                  <button key={a} type="button"
                    onClick={() => setForm(f => ({ ...f, action: a }))}
                    className={`py-2.5 rounded-xl text-sm font-bold transition-all border
                      ${form.action === a
                        ? a === 'BUY' ? 'bg-bull/20 border-bull/50 text-bull' : 'bg-bear/20 border-bear/50 text-bear'
                        : 'bg-dark-100 border-slate-700 text-slate-500 hover:border-slate-600'}`}>
                    {a === 'BUY' ? '↑' : '↓'} {a}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 font-medium block mb-1.5">Quantity</label>
              <input type="number" min="1" max="99999"
                value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                className="form-input" />
            </div>
            <button type="submit" disabled={submitting} className={`w-full py-3 rounded-xl font-bold transition-all
              ${form.action === 'BUY' ? 'bg-gradient-bull hover:shadow-glow-bull' : 'bg-gradient-bear hover:shadow-glow-bear'}
              text-white disabled:opacity-50`}>
              {submitting ? 'Placing…' : `${form.action === 'BUY' ? '↑' : '↓'} ${form.action} Paper Order`}
            </button>
          </form>
        </div>

        {/* Trade history */}
        <div className="lg:col-span-2 card overflow-hidden p-0">
          <div className="p-5 border-b border-slate-800/60 flex items-center justify-between">
            <h2 className="font-semibold text-white">Trade History</h2>
            <span className={`text-sm font-bold ${totalPnL >= 0 ? 'text-bull' : 'text-bear'}`}>
              P&L: {totalPnL >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalPnL))}
            </span>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">{Array.from({length:3}).map((_,i) => <CardSkeleton key={i} />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    {['Symbol', 'Action', 'Qty', 'Price', 'Total', 'P&L', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t, i) => (
                    <motion.tr key={t._id}
                      initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.05 }}
                      className="border-b border-slate-800/30 hover:bg-dark-100/40 transition-colors">
                      <td className="px-4 py-3 font-bold text-white">{t.symbol}</td>
                      <td className="px-4 py-3"><RecommendationBadge value={t.action as 'BUY'|'SELL'} size="sm" /></td>
                      <td className="px-4 py-3 text-slate-300">{t.quantity}</td>
                      <td className="px-4 py-3 text-slate-300">{formatCurrency(t.price)}</td>
                      <td className="px-4 py-3 text-white font-medium">{formatCurrency(t.total)}</td>
                      <td className="px-4 py-3">
                        {t.pnl != null ? (
                          <span className={t.pnl >= 0 ? 'text-bull' : 'text-bear'}>
                            {t.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(t.pnl))}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {new Date(t.timestamp).toLocaleDateString('en-IN')}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
              {trades.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  <Activity size={32} className="mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No paper trades yet. Place your first order!</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
