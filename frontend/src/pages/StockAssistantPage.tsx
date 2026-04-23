import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Sparkles, RefreshCw, Mic, MicOff,
  Volume2, TrendingUp, TrendingDown, BarChart3, Shield,
  Zap, Target, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/features/auth/authStore';

/* ─── Types ──────────────────────────────────────────────── */
interface StockPick {
  stock: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: string;
  reason: string;
  price?: string;
  change?: string;
  trend?: string;
  strength?: string;
  risk?: string;
}

interface StockAnalysis {
  stock: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: string;
  reason: {
    trend: string;
    strength: string;
    risk: string;
    details: string;
  };
  marketData?: Record<string, string>;
  voiceSummary: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  type?: 'top_picks' | 'stock_analysis' | 'general_chat' | 'text';
  picks?: StockPick[];
  analysis?: StockAnalysis;
  voiceSummary?: string | null;
}

/* ─── Constants ──────────────────────────────────────────── */
const QUICK_ACTIONS = [
  { label: '🔥 Top Picks Today', query: 'Which stock should I buy today?' },
  { label: '📊 Analyze TCS', query: 'Should I buy TCS?' },
  { label: '💹 Analyze RELIANCE', query: 'Should I buy RELIANCE?' },
  { label: '🏦 Analyze HDFCBANK', query: 'How is HDFCBANK?' },
  { label: '💻 Analyze INFY', query: 'Should I buy INFY?' },
  { label: '📡 Market Overview', query: 'How is the market today?' },
];

function uid() { return Math.random().toString(36).slice(2, 10); }

/* ─── Signal Badge ───────────────────────────────────────── */
function SignalBadge({ signal }: { signal: string }) {
  const config: Record<string, { cls: string; icon: React.ReactNode }> = {
    BUY: { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', icon: <ArrowUpRight size={12} /> },
    SELL: { cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30', icon: <ArrowDownRight size={12} /> },
    HOLD: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', icon: <BarChart3 size={12} /> },
  };
  const c = config[signal] || config['HOLD'];
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black tracking-wider border ${c.cls}`}>
      {c.icon} {signal}
    </span>
  );
}

/* ─── Confidence Bar ─────────────────────────────────────── */
function ConfidenceBar({ confidence }: { confidence: string }) {
  const pct = parseInt(confidence) || 0;
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const glow = pct >= 70 ? 'shadow-[0_0_12px_rgba(16,185,129,0.4)]' : pct >= 50 ? 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' : 'shadow-[0_0_12px_rgba(244,63,94,0.4)]';
  return (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20">Confidence</span>
      <div className="flex-1 h-2.5 bg-slate-800/60 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className={`h-full rounded-full ${color} ${glow}`}
        />
      </div>
      <span className="text-sm font-black text-white tabular-nums w-12 text-right">{confidence}</span>
    </div>
  );
}

/* ─── Auto-speak utility (global) ────────────────────────── */
function autoSpeak(text: string) {
  if (!text || !window.speechSynthesis) return;
  // Small delay so the UI renders first
  setTimeout(() => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi'));
    if (hindiVoice) utterance.voice = hindiVoice;
    window.speechSynthesis.speak(utterance);
  }, 400);
}

/* ─── TTS Speaker Button ─────────────────────────────────── */
function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);

  const speak = () => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.includes('hi'));
    if (hindiVoice) utterance.voice = hindiVoice;
    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  return (
    <button
      onClick={speaking ? stop : speak}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200
        ${speaking
          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/40 animate-pulse'
          : 'bg-white dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-300 dark:border-slate-700/50 hover:text-primary-500 dark:hover:text-primary-400 hover:border-primary-500/40'
        }`}
      title={speaking ? 'Stop speaking' : 'Read Hinglish summary aloud'}
    >
      <Volume2 size={12} className={speaking ? 'animate-bounce' : ''} />
      {speaking ? 'Stop' : 'Suniye 🔊'}
    </button>
  );
}

/* ─── Stock Pick Card ────────────────────────────────────── */
function StockPickCard({ pick, index }: { pick: StockPick; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.12, duration: 0.4, ease: 'easeOut' }}
      className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-br from-slate-900/80 via-slate-800/60 to-slate-900/90 backdrop-blur-xl p-5 hover:border-primary-500/30 transition-all duration-300 group"
    >
      {/* Glow accent */}
      <div className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20 pointer-events-none
        ${pick.signal === 'BUY' ? 'bg-emerald-500' : pick.signal === 'SELL' ? 'bg-rose-500' : 'bg-amber-500'}`} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black
              ${pick.signal === 'BUY' ? 'bg-emerald-500/15 text-emerald-400' : pick.signal === 'SELL' ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'}`}>
              {pick.stock.slice(0, 2)}
            </div>
            <div>
              <h4 className="text-white font-black text-base tracking-tight">{pick.stock}</h4>
              {pick.price && <span className="text-xs text-slate-400">{pick.price}</span>}
            </div>
          </div>
          <SignalBadge signal={pick.signal} />
        </div>

        {/* Change */}
        {pick.change && (
          <div className={`text-sm font-bold mb-3 flex items-center gap-1
            ${pick.change.startsWith('+') ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pick.change.startsWith('+') ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {pick.change} today
          </div>
        )}

        {/* Confidence */}
        <ConfidenceBar confidence={pick.confidence} />

        {/* Reason */}
        <p className="text-xs text-slate-400 mt-3 leading-relaxed">{pick.reason}</p>

        {/* Meta row */}
        {(pick.trend || pick.strength || pick.risk) && (
          <div className="flex gap-3 mt-3 flex-wrap">
            {pick.trend && (
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <TrendingUp size={10} /> {pick.trend}
              </span>
            )}
            {pick.strength && (
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <Zap size={10} /> {pick.strength}
              </span>
            )}
            {pick.risk && (
              <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                <Shield size={10} /> Risk: {pick.risk}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Single Stock Analysis Card ─────────────────────────── */
function AnalysisCard({ analysis }: { analysis: StockAnalysis }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-br from-slate-900/90 via-slate-800/60 to-slate-900/80 backdrop-blur-xl p-6"
    >
      {/* Glow */}
      <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none
        ${analysis.signal === 'BUY' ? 'bg-emerald-500' : analysis.signal === 'SELL' ? 'bg-rose-500' : 'bg-amber-500'}`} />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black
              ${analysis.signal === 'BUY' ? 'bg-emerald-500/15 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                : analysis.signal === 'SELL' ? 'bg-rose-500/15 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                : 'bg-amber-500/15 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.2)]'}`}>
              {analysis.stock.slice(0, 3)}
            </div>
            <div>
              <h3 className="text-white font-black text-xl tracking-tight">{analysis.stock}</h3>
              <span className="text-xs text-slate-500">NSE Stock Analysis</span>
            </div>
          </div>
          <SignalBadge signal={analysis.signal} />
        </div>

        {/* Confidence */}
        <div className="mb-5">
          <ConfidenceBar confidence={analysis.confidence} />
        </div>

        {/* Reason breakdown */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp size={12} className="text-primary-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Trend</span>
            </div>
            <p className="text-sm font-bold text-white">{analysis.reason.trend}</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap size={12} className="text-amber-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Strength</span>
            </div>
            <p className="text-sm font-bold text-white">{analysis.reason.strength}</p>
          </div>
          <div className="bg-slate-800/40 rounded-xl p-3 border border-slate-700/30">
            <div className="flex items-center gap-1.5 mb-1">
              <Shield size={12} className="text-rose-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Risk</span>
            </div>
            <p className="text-sm font-bold text-white">{analysis.reason.risk}</p>
          </div>
        </div>

        {/* Details */}
        {analysis.reason.details && (
          <p className="text-sm text-slate-300 leading-relaxed mb-4">
            {analysis.reason.details}
          </p>
        )}

        {/* Market data */}
        {analysis.marketData && (
          <div className="flex flex-wrap gap-3 mb-4">
            {Object.entries(analysis.marketData).map(([key, val]) => (
              <div key={key} className="text-[10px] font-medium text-slate-500 bg-slate-800/30 rounded-lg px-2.5 py-1 border border-slate-700/20">
                <span className="text-slate-600">{key.replace(/([A-Z])/g, ' $1').trim()}: </span>
                <span className="text-slate-300">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Voice summary */}
        {analysis.voiceSummary && (
          <div className="flex items-center justify-between bg-primary-500/5 rounded-xl px-4 py-3 border border-primary-500/15">
            <p className="text-xs text-primary-300/80 font-medium italic flex-1 mr-3">
              🗣️ "{analysis.voiceSummary}"
            </p>
            <SpeakButton text={analysis.voiceSummary} />
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
   ═════════════════════════════════════════════════════════════ */
export default function StockAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(), role: 'assistant', timestamp: new Date(), type: 'text',
      content: `Namaste ${user?.name?.split(' ')[0] ?? 'Trader'}! 🙏 I'm your AI Stock Assistant — think of me as Zerodha Kite meets ChatGPT.\n\nAsk me:\n• "Which stock should I buy today?"\n• "Should I buy TCS?"\n• Any stock market question!\n\nI give structured BUY / SELL / HOLD signals with confidence scores.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load voices for TTS
  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  /* ── Send Message ──────────────────────────────────────── */
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed, timestamp: new Date(), type: 'text' };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await api.post('/stock-assistant/chat', { message: trimmed });
      const resData = data.data;

      const assistantMsg: Message = {
        id: uid(),
        role: 'assistant',
        timestamp: new Date(),
        content: '',
        type: resData?.type || 'text',
        voiceSummary: resData?.voiceSummary || null,
      };

      if (resData?.type === 'top_picks' && resData.picks) {
        assistantMsg.content = resData.title || 'Top Picks Today';
        assistantMsg.picks = resData.picks;
        assistantMsg.voiceSummary = resData.voiceSummary;
      } else if (resData?.type === 'stock_analysis') {
        assistantMsg.content = `Analysis: ${resData.stock}`;
        assistantMsg.analysis = resData as StockAnalysis;
        assistantMsg.voiceSummary = resData.voiceSummary;
      } else {
        assistantMsg.content = resData?.response || resData?.message || "I couldn't process that. Try asking about a specific stock.";
        assistantMsg.type = 'text';
      }

      setMessages(prev => [...prev, assistantMsg]);

      // Auto-speak the voice summary through the speaker
      const spokenText = assistantMsg.voiceSummary || (assistantMsg.type === 'general_chat' ? assistantMsg.content : null);
      if (spokenText) {
        autoSpeak(spokenText);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: uid(), role: 'assistant', timestamp: new Date(), type: 'text',
        content: 'Sorry, I encountered an error. Please check your connection and try again.',
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping]);

  /* ── Voice Input (Web Speech API) ──────────────────────── */
  const toggleVoiceInput = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in this browser. Try Chrome.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
      setIsListening(false);
      // Auto-send after voice capture
      setTimeout(() => sendMessage(transcript), 300);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, sendMessage]);

  /* ── Form Submit ───────────────────────────────────────── */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{
      id: uid(), role: 'assistant', timestamp: new Date(), type: 'text',
      content: `Chat cleared! Ask me anything about stocks, ${user?.name?.split(' ')[0] ?? 'Trader'}. 🚀`,
    }]);
  };

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto animate-fade-in" style={{ height: 'calc(100vh - 140px)' }}>

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ rotate: -10, scale: 0.8 }}
            animate={{ rotate: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-500 via-violet-500 to-fuchsia-500 flex items-center justify-center shadow-[0_0_24px_rgba(108,99,255,0.4)]"
          >
            <Target size={20} className="text-white" />
          </motion.div>
          <div>
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              AI Stock Assistant
            </h1>
            <p className="text-[10px] text-emerald-500 flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE · Powered by Real-Time Market Data
            </p>
          </div>
        </div>
        <button onClick={clearChat} className="btn-ghost text-xs py-2 px-3 flex items-center gap-1.5" id="clear-chat-btn">
          <RefreshCw size={12} /> Clear
        </button>
      </div>

      {/* ── Messages ───────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-2 pb-4" id="message-container">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-1
                ${msg.role === 'assistant'
                  ? 'bg-gradient-to-br from-primary-500 to-violet-500 shadow-[0_0_12px_rgba(108,99,255,0.3)]'
                  : 'bg-slate-100 dark:bg-dark-100 border border-slate-300 dark:border-slate-700'}`}
              >
                {msg.role === 'assistant'
                  ? <Bot size={14} className="text-white" />
                  : <User size={14} className="text-slate-400" />}
              </div>

              {/* Content */}
              <div className={`max-w-[85%] ${msg.role === 'user' ? '' : ''}`}>

                {/* Top Picks Render */}
                {msg.type === 'top_picks' && msg.picks && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles size={14} className="text-primary-400" />
                      <span className="text-sm font-black text-white">Top Picks Today</span>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {msg.picks.map((pick, i) => (
                        <StockPickCard key={pick.stock} pick={pick} index={i} />
                      ))}
                    </div>
                    {msg.voiceSummary && (
                      <div className="flex items-center justify-between bg-primary-500/5 rounded-xl px-4 py-3 border border-primary-500/15 mt-3">
                        <p className="text-xs text-primary-300/80 font-medium italic flex-1 mr-3">
                          🗣️ "{msg.voiceSummary}"
                        </p>
                        <SpeakButton text={msg.voiceSummary} />
                      </div>
                    )}
                  </div>
                )}

                {/* Stock Analysis Render */}
                {msg.type === 'stock_analysis' && msg.analysis && (
                  <AnalysisCard analysis={msg.analysis} />
                )}

                {/* Text Render */}
                {(msg.type === 'text' || msg.type === 'general_chat') && (
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'assistant'
                      ? 'glass text-slate-700 dark:text-slate-200'
                      : 'bg-primary-500/15 border border-primary-500/25 text-slate-900 dark:text-white'
                    }`}>
                    {msg.content}
                  </div>
                )}

                {/* Timestamp */}
                <p className={`text-[9px] text-slate-600 mt-1 ${msg.role === 'user' ? 'text-right' : ''}`}>
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-violet-500 flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_rgba(108,99,255,0.3)]">
              <Bot size={14} className="text-white" />
            </div>
            <div className="glass rounded-2xl px-5 py-3 flex items-center gap-2">
              <span className="text-xs text-slate-400 mr-1">Analyzing market data</span>
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-primary-400"
                  style={{ animation: `assistantBounce 1.2s infinite ${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Quick Action Chips ─────────────────────────────── */}
      {messages.length <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap gap-2 mb-3"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(action.query)}
              className="text-xs bg-white dark:bg-dark-100 border border-slate-300 dark:border-slate-700/40
                         text-slate-700 dark:text-slate-400 shadow-sm
                         px-3.5 py-2 rounded-xl hover:border-primary-500/50 hover:text-primary-500 dark:hover:text-primary-400
                         hover:bg-primary-50 dark:hover:bg-primary-500/5 hover:shadow-md transition-all duration-200 font-semibold"
              id={`quick-action-${action.label.replace(/\s/g, '-').toLowerCase()}`}
            >
              {action.label}
            </button>
          ))}
        </motion.div>
      )}

      {/* ── Input Area ─────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        {/* Mic button */}
        <button
          type="button"
          onClick={toggleVoiceInput}
          className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 border
            ${isListening
              ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.3)]'
              : 'bg-white dark:bg-slate-800/40 border-slate-300 dark:border-slate-700/40 text-slate-600 dark:text-slate-400 shadow-sm hover:text-primary-500 dark:hover:text-primary-400 hover:border-primary-500/40 hover:shadow-md'
            }`}
          title={isListening ? 'Stop listening' : 'Voice input'}
          id="voice-input-btn"
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>

        {/* Text input */}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isListening ? '🎤 Listening...' : 'Ask about any stock — "Should I buy TCS?"'}
          className="form-input flex-1"
          maxLength={500}
          disabled={isTyping}
          id="stock-assistant-input"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="btn-primary px-4 py-2.5 flex items-center gap-2 flex-shrink-0 rounded-xl"
          id="send-btn"
        >
          <Send size={16} />
        </button>
      </form>

      {/* ── Disclaimer ─────────────────────────────────────── */}
      <p className="text-[9px] text-center text-slate-600 mt-2">
        ⚠️ AI-generated analysis. Not financial advice. Consult a SEBI-registered advisor before investing.
      </p>

      {/* Keyframes */}
      <style>{`
        @keyframes assistantBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}
