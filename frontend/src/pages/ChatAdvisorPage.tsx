import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, RefreshCw } from 'lucide-react';
import api from '@/services/api';
import { useAuthStore } from '@/features/auth/authStore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const STARTERS = [
  'What stocks should I buy today?',
  'Analyse RELIANCE for me.',
  'How is the market sentiment?',
  'What is my biggest risk right now?',
];

function uid() { return Math.random().toString(36).slice(2); }

export default function ChatAdvisorPage() {
  const user = useAuthStore((s) => s.user);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: uid(), role: 'assistant', timestamp: new Date(),
      content: `Hello ${user?.name?.split(' ')[0] ?? 'Trader'}! 👋 I'm your CapitalWave AI Advisor. Ask me anything about stocks, market trends, or your portfolio!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMsg: Message = { id: uid(), role: 'user', content: trimmed, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const { data } = await api.post('/ai/chat', { message: trimmed });
      const reply = data.reply ?? data.message ?? data.response ?? data.data?.reply ??
        "I couldn't get a response right now. Please try again.";
      setMessages((prev) => [...prev, { id: uid(), role: 'assistant', content: reply, timestamp: new Date() }]);
    } catch {
      setMessages((prev) => [...prev, {
        id: uid(), role: 'assistant', timestamp: new Date(),
        content: 'Sorry, I encountered an error. Please check your connection and try again.',
      }]);
    } finally {
      setIsTyping(false);
    }
  }, [isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const clearChat = () => {
    setMessages([{
      id: uid(), role: 'assistant', timestamp: new Date(),
      content: `Chat cleared! Ask me anything about the market, ${user?.name?.split(' ')[0] ?? 'Trader'}.`,
    }]);
  };

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto animate-fade-in" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-primary">
            <Sparkles size={18} className="text-white" />
          </div>
          <div>
            <h1 className="page-title text-xl">AI Chat Advisor</h1>
            <p className="text-xs text-bull flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-bull animate-pulse" /> Online
            </p>
          </div>
        </div>
        <button onClick={clearChat} className="btn-ghost text-sm py-2 px-3 flex items-center gap-1.5">
          <RefreshCw size={14} /> Clear
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center
                ${msg.role === 'assistant' ? 'bg-gradient-brand shadow-glow-primary/30' : 'bg-dark-100 border border-slate-700'}`}>
                {msg.role === 'assistant'
                  ? <Bot size={14} className="text-white" />
                  : <User size={14} className="text-slate-400" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed
                ${msg.role === 'assistant'
                  ? 'glass text-slate-200'
                  : 'bg-primary-500/20 border border-primary-500/30 text-white'
                }`}>
                {msg.content}
                <p className="text-[10px] text-slate-600 mt-1.5">
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-brand flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-white" />
            </div>
            <div className="glass rounded-2xl px-4 py-3 flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-2 h-2 rounded-full bg-primary-400"
                  style={{ animation: `bounce 1s infinite ${i * 0.15}s` }} />
              ))}
            </div>
          </motion.div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestion chips */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {STARTERS.map((s) => (
            <button key={s} onClick={() => sendMessage(s)}
              className="text-xs bg-dark-100 border border-slate-700 text-slate-400 px-3 py-1.5 rounded-xl
                         hover:border-primary-500/50 hover:text-primary-400 transition-all">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-3 mt-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me about any stock or market trend…"
          className="form-input flex-1"
          maxLength={500}
          disabled={isTyping}
          id="chat-input"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="btn-primary px-4 py-2.5 flex items-center gap-2 flex-shrink-0"
        >
          <Send size={16} />
        </button>
      </form>

      <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }`}</style>
    </div>
  );
}
