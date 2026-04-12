import { motion, AnimatePresence } from 'framer-motion';
import { Search, Info, Target, ShieldAlert } from 'lucide-react';
import { RecommendationBadge } from '@/components/ui/Badge';
import { useStockSearch } from '@/hooks/useStockSearch';
import { formatCurrency, formatPercent } from '@/utils/formatters';

const POPULAR = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];

export default function StocksPage() {
  const { query, setQuery, result, isLoading, error, reset } = useStockSearch();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="page-title">Stock Research</h1>
        <p className="page-subtitle mt-1">Search any stock symbol for AI-powered BUY/SELL/HOLD signals.</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          type="text"
          id="stock-search-input"
          placeholder="Enter stock symbol — e.g. RELIANCE, AAPL, TSLA"
          className="form-input pl-11 pr-10 text-base py-4 rounded-2xl"
          maxLength={10}
          autoFocus
        />
        {query && (
          <button onClick={reset}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xl leading-none">
            ×
          </button>
        )}
      </div>

      {/* Popular symbols */}
      <div>
        <p className="text-xs text-slate-600 uppercase tracking-wider mb-2 font-semibold">Popular Symbols</p>
        <div className="flex flex-wrap gap-2">
          {POPULAR.map((s) => (
            <button
              key={s}
              onClick={() => setQuery(s)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all
                ${query.toUpperCase() === s
                  ? 'bg-primary-500/20 border-primary-500/50 text-primary-300'
                  : 'bg-dark-100 border-slate-700 text-slate-400 hover:border-primary-500/40 hover:text-primary-400'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="card flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 rounded-full border-3 border-primary-500/20 border-t-primary-500 animate-spin" />
            <p className="text-slate-400 text-sm">Analysing {query.toUpperCase()}…</p>
          </div>
        </div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="card border-bear/30 bg-bear/5 flex items-center gap-3"
          >
            <Info size={18} className="text-bear flex-shrink-0" />
            <div>
              <p className="font-medium text-bear text-sm">Symbol not found</p>
              <p className="text-xs text-slate-500 mt-0.5">{error}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result card */}
      <AnimatePresence>
        {result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="card space-y-6"
          >
            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-black text-white">{result.symbol}</h2>
                <p className="text-4xl font-black text-primary-300 mt-1">{formatCurrency(result.price)}</p>
              </div>
              <RecommendationBadge value={result.recommendation} size="lg" />
            </div>

            {/* Confidence meter */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400 font-medium">AI Confidence</span>
                <span className="text-sm font-bold text-primary-400">{formatPercent(result.confidence)}</span>
              </div>
              <div className="h-3 bg-dark-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence * 100}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className={`h-full rounded-full ${
                    result.recommendation === 'BUY'  ? 'bg-gradient-bull' :
                    result.recommendation === 'SELL' ? 'bg-gradient-bear' : 'bg-hold'
                  }`}
                />
              </div>
            </div>

            {/* Target / Stop Loss */}
            {(result.targetPrice || result.stopLoss) && (
              <div className="grid grid-cols-2 gap-4">
                {result.targetPrice && (
                  <div className="bg-bull/10 border border-bull/20 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Target size={13} className="text-bull" />
                      <span className="text-xs text-bull font-semibold uppercase tracking-wide">Target</span>
                    </div>
                    <p className="text-lg font-bold text-bull">{formatCurrency(result.targetPrice)}</p>
                  </div>
                )}
                {result.stopLoss && (
                  <div className="bg-bear/10 border border-bear/20 rounded-xl p-4">
                    <div className="flex items-center gap-1.5 mb-1">
                      <ShieldAlert size={13} className="text-bear" />
                      <span className="text-xs text-bear font-semibold uppercase tracking-wide">Stop Loss</span>
                    </div>
                    <p className="text-lg font-bold text-bear">{formatCurrency(result.stopLoss)}</p>
                  </div>
                )}
              </div>
            )}

            {/* AI Reasoning */}
            {result.reasoning && (
              <div className="bg-dark-100 rounded-xl p-4 border border-slate-700/60">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-2">AI Analysis</p>
                <p className="text-sm text-slate-300 leading-relaxed">{result.reasoning}</p>
              </div>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-slate-600">
              ⚠️ AI predictions are for informational purposes only. Not financial advice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!query && !result && !isLoading && (
        <div className="text-center py-16 text-slate-600">
          <Search size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm">Type a stock symbol above to get started</p>
        </div>
      )}
    </div>
  );
}
