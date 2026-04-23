import { motion, AnimatePresence } from 'framer-motion';
import { Search, Info, Target, ShieldAlert } from 'lucide-react';
import { RecommendationBadge } from '@/components/ui/Badge';
import { StockSymbolInput } from '@/components/ui/StockSymbolInput';
import { useStockSearch } from '@/hooks/useStockSearch';
import { formatCurrency, formatPercent } from '@/utils/formatters';

const POPULAR = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'WIPRO', 'AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL'];

export default function StocksPage() {
  const { query, setQuery, result, isLoading, error, reset } = useStockSearch();

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div>
        <h1 className="page-title" >Stock Research</h1>
        <p className="page-subtitle mt-1">Search any stock symbol for AI-powered BUY/SELL/HOLD signals.</p>
      </div>

      {/* Search bar */}
      <div className="relative flex items-center">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none z-10" />
        <StockSymbolInput
          id="stock-search-input"
          value={query}
          onChange={setQuery}
          placeholder="Enter stock symbol — e.g. RELIANCE, AAPL, TSLA"
          className="pl-11 pr-10 text-base py-4 rounded-2xl w-full"
          wrapperClass="w-full"
          autoFocus
          maxLength={12}
        />
        {query && (
          <button onClick={reset}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 dark:text-slate-300 text-xl leading-none z-10">
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
                  : 'bg-white dark:bg-dark-100 border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-primary-500/40 hover:text-primary-400'}`}
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
            <p className="text-slate-500 dark:text-slate-400 text-sm">Analysing {query.toUpperCase()}…</p>
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
            className={`card space-y-6 relative overflow-hidden transition-all duration-500 border
              ${result.recommendation === 'BUY' ? 'border-bull/30 shadow-[0_0_40px_-15px_rgba(34,197,94,0.3)]' :
                result.recommendation === 'SELL' ? 'border-bear/30 shadow-[0_0_40px_-15px_rgba(239,68,68,0.3)]' :
                'border-slate-300 dark:border-slate-700/50'}`}
          >
            {/* Background Glow */}
            <div className={`absolute top-[-50%] right-[-10%] w-[300px] h-[300px] rounded-full blur-[100px] opacity-20 pointer-events-none ${
              result.recommendation === 'BUY' ? 'bg-bull' : result.recommendation === 'SELL' ? 'bg-bear' : 'bg-primary-500'
            }`} />

            {/* Header */}
            <div className="flex items-start justify-between flex-wrap gap-4 relative z-10">
              <div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white flex items-center gap-3">
                  {result.symbol}
                  <div className="flex items-center gap-1 bg-white dark:bg-dark-100 rounded-lg px-2 py-1 text-xs">
                    <span className="flex h-2 w-2 relative">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${result.recommendation === 'BUY' ? 'bg-bull' : result.recommendation === 'SELL' ? 'bg-bear' : 'bg-primary-400'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${result.recommendation === 'BUY' ? 'bg-bull' : result.recommendation === 'SELL' ? 'bg-bear' : 'bg-primary-500'}`}></span>
                    </span>
                    <span className="text-slate-500 dark:text-slate-400 font-medium ml-1">Live</span>
                  </div>
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-5xl font-black text-primary-300 drop-shadow-lg">{formatCurrency(result.price)}</p>
                </div>
              </div>
              <div className="scale-110 origin-right">
                <RecommendationBadge value={result.recommendation} size="lg" />
              </div>
            </div>

            {/* Confidence meter */}
            <div className="relative z-10 bg-slate-50 dark:bg-dark-200/50 p-4 rounded-2xl border border-slate-300 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-slate-600 dark:text-slate-300 font-semibold flex items-center gap-2">
                  <Target size={16} className="text-primary-400" /> AI Confidence Score
                </span>
                <span className={`text-xl font-black ${
                  result.confidence > 0.7 ? 'text-bull drop-shadow-[0_0_10px_rgba(34,197,94,0.4)]' :
                  result.confidence < 0.4 ? 'text-bear drop-shadow-[0_0_10px_rgba(239,68,68,0.4)]' : 'text-primary-400'
                }`}>{formatPercent(result.confidence)}</span>
              </div>
              <div className="h-4 bg-white dark:bg-dark-100 rounded-full overflow-hidden shadow-inner border border-slate-200 dark:border-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${result.confidence * 100}%` }}
                  transition={{ duration: 1.2, type: 'spring', bounce: 0.3 }}
                  className={`h-full rounded-full relative overflow-hidden ${
                    result.recommendation === 'BUY'  ? 'bg-gradient-bull' :
                    result.recommendation === 'SELL' ? 'bg-gradient-bear' : 'bg-hold'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 w-full animate-shimmer" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)', transform: 'skewX(-20deg)' }} />
                </motion.div>
              </div>
            </div>

            {/* Target / Stop Loss */}
            {(result.targetPrice || result.stopLoss) && (
              <div className="grid grid-cols-2 gap-4 relative z-10">
                {result.targetPrice && (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="bg-gradient-to-br from-bull/10 to-transparent border border-bull/20 rounded-2xl p-5 hover:border-bull/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-bull/20 rounded-lg text-bull"><Target size={16} /></div>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold tracking-wide">TARGET PRICE</span>
                    </div>
                    <p className="text-2xl font-black text-bull">{formatCurrency(result.targetPrice)}</p>
                  </motion.div>
                )}
                {result.stopLoss && (
                  <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }} className="bg-gradient-to-br from-bear/10 to-transparent border border-bear/20 rounded-2xl p-5 hover:border-bear/40 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-bear/20 rounded-lg text-bear"><ShieldAlert size={16} /></div>
                      <span className="text-xs text-slate-600 dark:text-slate-300 font-semibold tracking-wide">STOP LOSS</span>
                    </div>
                    <p className="text-2xl font-black text-bear">{formatCurrency(result.stopLoss)}</p>
                  </motion.div>
                )}
              </div>
            )}

            {/* AI Reasoning */}
            {result.reasoning && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="relative z-10 bg-gradient-to-r from-dark-100 to-dark-200 rounded-2xl p-5 border border-slate-300 dark:border-slate-700/60 shadow-lg">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 p-2 bg-primary-500/10 rounded-xl border border-primary-500/20 text-primary-400">
                    <Search size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm text-primary-300 font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                      AI Analysis <span className="flex h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse"></span>
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {result.reasoning.split('.').map((s: string, i: number) => s.trim() ? <span key={i} className="block mb-1">• {s.trim()}</span> : null)}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Disclaimer */}
            <p className="text-[10px] text-slate-500 text-center uppercase tracking-wider font-semibold pt-2">
              ⚠️ AI insights are for informational purposes only. Do not execute trades blindly.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!query && !result && !isLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-slate-500 bg-slate-50 dark:bg-dark-200/30 rounded-3xl border border-dashed border-slate-300 dark:border-slate-700/50">
          <div className="w-16 h-16 bg-white dark:bg-dark-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-300 dark:border-slate-700/50 shadow-glow-primary">
            <Search size={28} className="text-primary-500/80" />
          </div>
          <p className="text-base font-semibold text-slate-600 dark:text-slate-300">Start your smart research</p>
          <p className="text-xs mt-1">Type a stock symbol above (e.g., RELIANCE) to get instant BUY/SELL signals</p>
        </motion.div>
      )}
    </div>
  );
}
