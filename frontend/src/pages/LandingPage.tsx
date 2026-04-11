import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, BarChart2, ArrowRight, CheckCircle } from 'lucide-react';

const FEATURES = [
  { icon: TrendingUp, title: 'AI Stock Predictions', desc: 'Real-time BUY/SELL/HOLD signals powered by advanced ML models.' },
  { icon: Shield,     title: 'Risk Management',      desc: 'Dynamic risk profiling and portfolio protection strategies.' },
  { icon: BarChart2,  title: 'Portfolio Analytics',  desc: 'Deep insights into your holdings with interactive charts.' },
  { icon: Zap,        title: 'AI Chat Advisor',       desc: '24/7 AI-powered advisor answering your market questions.' },
];

const STATS = [
  { value: '87%',  label: 'Avg. Prediction Accuracy' },
  { value: '50K+', label: 'Active Traders' },
  { value: '₹2B+', label: 'Portfolio Value Managed' },
  { value: '< 1s', label: 'Signal Latency' },
];

const BENEFITS = [
  'Real-time market data', 'AI-powered decisions',
  'Paper trading simulator', 'Risk analysis engine',
  'Educational resources', 'Social trading community',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface-950 overflow-x-hidden">
      {/* ─── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4
                      bg-surface-950/80 backdrop-blur-md border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-brand flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="font-bold text-white">CapitalWave<span className="text-primary-400"> AI</span></span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login"  className="btn-ghost text-sm py-2 px-4">Login</Link>
          <Link to="/signup" className="btn-primary text-sm py-2 px-4">Get Started</Link>
        </div>
      </nav>

      {/* ─── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center pt-20 px-6">
        {/* Background orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-bull/8 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px]
                          bg-primary-900/20 rounded-full blur-[100px]" />
        </div>

        <div className="relative text-center max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20
                             text-primary-400 text-xs font-semibold px-4 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
              AI-Powered Trading Platform
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-black text-white mb-6 leading-[1.08] tracking-tight"
          >
            Trade Smarter with{' '}
            <span className="bg-gradient-brand bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            CapitalWave AI analyses thousands of market signals in real-time to deliver
            precise BUY/SELL/HOLD recommendations. Your edge in an uncertain market.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.38 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/signup" className="btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2">
              Start Trading Free <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-ghost px-8 py-3.5 text-base">
              Sign In
            </Link>
          </motion.div>

          {/* Benefits checklist */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="mt-10 flex flex-wrap justify-center gap-x-6 gap-y-2"
          >
            {BENEFITS.map((b) => (
              <span key={b} className="flex items-center gap-1.5 text-sm text-slate-500">
                <CheckCircle size={14} className="text-bull" /> {b}
              </span>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-y border-slate-800/60 bg-dark-200/40">
        <div className="max-w-5xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
            >
              <div className="text-3xl font-black text-white mb-1">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-3">Everything you need to win the market</h2>
            <p className="text-slate-400">Professional-grade tools powered by artificial intelligence.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="card hover:border-primary-500/30 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center mb-4">
                  <Icon size={20} className="text-primary-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="card border-primary-500/20 shadow-glow-primary/20">
            <h2 className="text-3xl font-bold text-white mb-3">Ready to transform your trading?</h2>
            <p className="text-slate-400 mb-8">Join thousands of traders already using CapitalWave AI.</p>
            <Link to="/signup" className="btn-primary px-10 py-3.5 text-base inline-flex items-center gap-2">
              Create Free Account <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/60 px-8 py-6 text-center text-xs text-slate-600">
        © {new Date().getFullYear()} CapitalWave AI. Not financial advice. All trading involves risk.
      </footer>
    </div>
  );
}
