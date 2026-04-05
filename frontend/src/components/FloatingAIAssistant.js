import React, {
    useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './FloatingAIAssistant.css';

/* ── Speech Recognition ── */
const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;
const WAKE_WORD = 'hey advisor';

/* ─────────────────────────────────────────────
   SUB-COMPONENT: Chat Panel
───────────────────────────────────────────── */
function ChatPanel({ onClose }) {
    const [messages, setMessages]     = useState([]);
    const [inputText, setInputText]   = useState('');
    const [isTyping, setIsTyping]     = useState(false);
    const messagesEndRef = useRef(null);
    const textareaRef    = useRef(null);

    const SUGGESTIONS = [
        '📊 Analyze my portfolio',
        '📈 What is TCS trending?',
        '💡 Should I buy Reliance?',
        '⚠️ My risk exposure today',
    ];

    /* Auto-scroll */
    useLayoutEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    /* Auto-resize textarea */
    const handleInput = (e) => {
        const ta = e.target;
        setInputText(ta.value);
        ta.style.height = 'auto';
        ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
    };

    const sendMessage = useCallback(async (text) => {
        const trimmed = (text || inputText).trim();
        if (!trimmed) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            text: trimmed,
            time: new Date(),
        };
        setMessages(prev => [...prev, userMsg]);
        setInputText('');
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
        }
        setIsTyping(true);

        try {
            const res = await api.post('/ai/chat', { message: trimmed });
            const replyText =
                res.data?.data?.response ||
                res.data?.response ||
                res.data?.message ||
                'I received your message. How can I help further?';

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'assistant',
                text: replyText,
                time: new Date(),
            }]);
        } catch (err) {
            const errMsg =
                err.response?.data?.message ||
                'Sorry, I\'m having trouble connecting to the AI service. Please try again.';
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: 'error',
                text: errMsg,
                time: new Date(),
            }]);
        } finally {
            setIsTyping(false);
        }
    }, [inputText]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className="ai-panel" role="dialog" aria-label="Chat AI Panel">
            {/* Header */}
            <div className="ai-panel-header">
                <div className="ai-panel-avatar purple">🤖</div>
                <div className="ai-panel-title">
                    <h3>AI Financial Advisor</h3>
                    <div className="ai-status">
                        <span className="ai-status-dot" />
                        Online · GPT-powered
                    </div>
                </div>
                <button
                    className="ai-panel-close"
                    onClick={onClose}
                    aria-label="Close chat"
                    title="Close"
                >
                    ✕
                </button>
            </div>

            {/* Messages */}
            <div className="chat-messages" role="log" aria-live="polite">
                {messages.length === 0 && (
                    <div className="chat-welcome">
                        <div className="chat-welcome-icon">💼</div>
                        <h4>Hello, Trader!</h4>
                        <p>
                            Ask me anything about stocks, markets,<br />
                            portfolio strategy, or risk analysis.
                        </p>
                        <div className="chat-suggestions">
                            {SUGGESTIONS.map((s, i) => (
                                <button
                                    key={i}
                                    className="chat-suggestion-chip"
                                    onClick={() => sendMessage(s)}
                                    disabled={isTyping}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {messages.map(msg => (
                    <div key={msg.id} className={`chat-msg ${msg.role}`}>
                        <div className="chat-msg-avatar">
                            {msg.role === 'user' ? '👤' : msg.role === 'error' ? '⚠️' : '🤖'}
                        </div>
                        <div>
                            <div className="chat-bubble">{msg.text}</div>
                            <div className="chat-bubble-time">{fmt(msg.time)}</div>
                        </div>
                    </div>
                ))}

                {isTyping && (
                    <div className="chat-msg assistant">
                        <div className="chat-msg-avatar">🤖</div>
                        <div>
                            <div className="chat-typing">
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <div className="chat-input-row">
                    <textarea
                        ref={textareaRef}
                        className="chat-textarea"
                        placeholder="Ask about stocks, portfolio, market trends…"
                        value={inputText}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        id="chat-input-textarea"
                        aria-label="Chat message input"
                        disabled={isTyping}
                    />
                    <button
                        className="chat-send-btn"
                        onClick={() => sendMessage()}
                        disabled={isTyping || !inputText.trim()}
                        id="chat-send-btn"
                        aria-label="Send message"
                    >
                        {/* Paper-plane icon */}
                        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                    </button>
                </div>
                <div className="chat-input-hint">Press Enter to send · Shift+Enter for new line</div>
            </div>
        </div>
    );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENT: Voice Panel
───────────────────────────────────────────── */
function VoicePanel({ onClose }) {
    const navigate = useNavigate();

    const [isListening, setIsListening]         = useState(false);
    const [isContinuous, setIsContinuous]       = useState(false);
    const [transcript, setTranscript]           = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [aiResponse, setAiResponse]           = useState(null);
    const [isProcessing, setIsProcessing]       = useState(false);
    const [isSpeaking, setIsSpeaking]           = useState(false);
    const [conversationLog, setConversationLog] = useState([]);
    const [error, setError]                     = useState('');
    const [voiceSupported]                      = useState(!!SpeechRecognition);
    const [selectedVoice, setSelectedVoice]     = useState(null);
    const [volBars, setVolBars]                 = useState(Array(10).fill(4));

    const recognitionRef  = useRef(null);
    const logEndRef       = useRef(null);
    const analyserRef     = useRef(null);
    const animFrameRef    = useRef(null);
    const mediaStreamRef  = useRef(null);

    /* Load TTS voice */
    useEffect(() => {
        const loadVoices = () => {
            const voices = window.speechSynthesis?.getVoices() || [];
            const pref = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en'))
                      || voices.find(v => v.lang.startsWith('en'));
            if (pref) setSelectedVoice(pref);
        };
        loadVoices();
        window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);
        return () => {
            window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
            stopListening();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* Auto-scroll log */
    useLayoutEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationLog]);

    /* Volume analyzer → animated bars */
    const startVolumeAnalyzer = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source   = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64;
            source.connect(analyser);
            analyserRef.current = analyser;

            const data = new Uint8Array(analyser.frequencyBinCount);
            const BAR_COUNT = 10;

            const tick = () => {
                analyser.getByteFrequencyData(data);
                const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
                    const idx = Math.floor(i * data.length / BAR_COUNT);
                    return Math.max(4, (data[idx] / 255) * 32);
                });
                setVolBars(bars);
                animFrameRef.current = requestAnimationFrame(tick);
            };
            tick();
        } catch {
            /* mic denied — silent fail */
        }
    }, []);

    const stopVolumeAnalyzer = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        setVolBars(Array(10).fill(4));
    }, []);

    /* TTS speak */
    const speak = useCallback((text) => {
        if (!window.speechSynthesis || !text) return;
        window.speechSynthesis.cancel();
        const utt = new SpeechSynthesisUtterance(text);
        utt.rate = 1.0; utt.pitch = 1.0; utt.volume = 0.9;
        if (selectedVoice) utt.voice = selectedVoice;
        utt.onstart = () => setIsSpeaking(true);
        utt.onend   = () => {
            setIsSpeaking(false);
            if (isContinuous && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch {}
            }
        };
        utt.onerror = () => setIsSpeaking(false);
        window.speechSynthesis.speak(utt);
    }, [selectedVoice, isContinuous]);

    /* Process voice command */
    const processCommand = useCallback(async (text) => {
        if (!text.trim()) return;
        setIsProcessing(true);
        setError('');
        setConversationLog(prev => [...prev, {
            role: 'user', text, timestamp: new Date(),
        }]);

        try {
            const res  = await api.post('/ai/voice-command', { transcript: text });
            const data = res.data.data;
            setAiResponse(data);
            setConversationLog(prev => [...prev, {
                role: 'assistant', text: data.text, intent: data.intent, timestamp: new Date(),
            }]);
            speak(data.text);
            if (data.action === 'navigate' && data.navigateTo) {
                setTimeout(() => navigate(data.navigateTo), 2000);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to process voice command.';
            setError(msg);
            setConversationLog(prev => [...prev, { role: 'error', text: msg, timestamp: new Date() }]);
        } finally {
            setIsProcessing(false);
        }
    }, [navigate, speak]);

    /* Start listening */
    const startListening = useCallback(() => {
        if (!SpeechRecognition) return;
        setError('');
        const rec = new SpeechRecognition();
        rec.continuous     = true;
        rec.interimResults = true;
        rec.lang           = 'en-IN';

        rec.onstart  = () => { setIsListening(true); startVolumeAnalyzer(); };
        rec.onresult = (e) => {
            let interim = '', final = '';
            for (let i = e.resultIndex; i < e.results.length; i++) {
                if (e.results[i].isFinal) final  += e.results[i][0].transcript;
                else                      interim += e.results[i][0].transcript;
            }
            setInterimTranscript(interim);
            if (final) {
                const clean = final.trim();
                setTranscript(clean);
                setInterimTranscript('');
                if (isContinuous && clean.toLowerCase().startsWith(WAKE_WORD)) {
                    const cmd = clean.slice(WAKE_WORD.length).trim();
                    if (cmd) { rec.stop(); processCommand(cmd); }
                } else if (!isContinuous) {
                    rec.stop();
                    processCommand(clean);
                }
            }
        };
        rec.onend  = () => {
            setIsListening(false);
            stopVolumeAnalyzer();
            if (isContinuous && !isProcessing) {
                try { rec.start(); } catch {}
            }
        };
        rec.onerror = (e) => {
            if (e.error !== 'no-speech' && e.error !== 'aborted') {
                setError(`Voice error: ${e.error}. Please try again.`);
            }
            setIsListening(false);
            stopVolumeAnalyzer();
        };
        recognitionRef.current = rec;
        try { rec.start(); } catch {
            setError('Could not start voice recognition. Check microphone permissions.');
        }
    }, [isContinuous, isProcessing, processCommand, startVolumeAnalyzer, stopVolumeAnalyzer]);

    /* Stop listening */
    const stopListening = useCallback(() => {
        window.speechSynthesis?.cancel();
        recognitionRef.current?.stop();
        recognitionRef.current = null;
        setIsListening(false);
        setIsSpeaking(false);
        setIsContinuous(false);
        stopVolumeAnalyzer();
    }, [stopVolumeAnalyzer]);

    const toggleMic = () => isListening ? stopListening() : startListening();

    const toggleContinuous = () => {
        if (isContinuous) { setIsContinuous(false); stopListening(); }
        else { setIsContinuous(true); if (!isListening) startListening(); }
    };

    const clearAll = () => {
        setConversationLog([]); setAiResponse(null);
        setTranscript(''); setInterimTranscript(''); setError('');
    };

    const QUICK_CMDS = [
        { label: '📊 My Portfolio', cmd: 'Show my portfolio' },
        { label: '📈 Market Today', cmd: 'How is the market today' },
        { label: '🤖 Analyze TCS',  cmd: 'Analyze TCS stock' },
        { label: '💡 Buy Reliance', cmd: 'Should I buy Reliance' },
    ];

    const fmt = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const orbClass = isProcessing ? 'processing' : isListening ? 'listening' : '';
    const labelText = isProcessing ? 'Processing…' : isListening ? 'Listening… Speak now' : 'Tap to talk';

    if (!voiceSupported) {
        return (
            <div className="ai-panel" role="dialog" aria-label="Voice Assistant Panel">
                <div className="ai-panel-header">
                    <div className="ai-panel-avatar green">🎤</div>
                    <div className="ai-panel-title">
                        <h3>Voice Assistant</h3>
                    </div>
                    <button className="ai-panel-close" onClick={onClose} aria-label="Close">✕</button>
                </div>
                <div className="va-unsupported">
                    <span className="va-unsupported-icon">🚫</span>
                    <p>Voice commands require <strong>Chrome</strong> or <strong>Edge</strong> browser.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="ai-panel" role="dialog" aria-label="Voice Assistant Panel">
            {/* Header */}
            <div className="ai-panel-header">
                <div className="ai-panel-avatar green">🎤</div>
                <div className="ai-panel-title">
                    <h3>Voice Assistant</h3>
                    <div className="ai-status">
                        {isListening
                            ? <><span className="ai-status-dot" /> Listening</>
                            : isSpeaking
                              ? <><span className="ai-status-dot" style={{background:'var(--primary-light)'}} /> Speaking</>
                              : <><span className="ai-status-dot" /> Ready</>
                        }
                    </div>
                </div>
                <button className="ai-panel-close" onClick={onClose} aria-label="Close voice panel">✕</button>
            </div>

            <div className="voice-panel-body">

                {/* Orb */}
                <div className="va-orb-wrapper">
                    {isListening && (
                        <>
                            <span className="va-wave" />
                            <span className="va-wave" />
                            <span className="va-wave" />
                        </>
                    )}
                    <button
                        className={`va-orb ${orbClass}`}
                        onClick={toggleMic}
                        disabled={isProcessing}
                        id="voice-mic-orb-btn"
                        aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    >
                        <span className="va-orb-icon">
                            {isProcessing ? '⏳' : isListening ? '🎙️' : '🎤'}
                        </span>
                    </button>
                </div>

                <div className={`va-orb-label ${orbClass}`}>{labelText}</div>

                {/* Volume bars */}
                {isListening && (
                    <div className="va-volume-bar-wrapper" aria-hidden="true">
                        {volBars.map((h, i) => (
                            <div
                                key={i}
                                className="va-vol-bar"
                                style={{ height: h + 'px' }}
                            />
                        ))}
                    </div>
                )}

                {/* Transcript */}
                {(transcript || interimTranscript) && (
                    <div className="va-transcript-box">
                        <div className="va-transcript-label">You said</div>
                        <p className="va-transcript-text">
                            {transcript}
                            {interimTranscript && (
                                <span className="va-interim-text"> {interimTranscript}</span>
                            )}
                        </p>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="va-error-banner" role="alert">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* AI Response */}
                {aiResponse && (
                    <div className="va-response-box">
                        <div className="va-response-header">
                            <div className="va-response-icon">🤖</div>
                            <span className="va-response-title">AI Advisor</span>
                            {aiResponse.intent && (
                                <span className="va-response-intent">
                                    {aiResponse.intent.replace(/_/g, ' ')}
                                </span>
                            )}
                        </div>
                        <p className="va-response-text">{aiResponse.text}</p>
                        {aiResponse.data?.recommendation && (
                            <div className="va-rec-row">
                                <span className={`va-rec-badge ${aiResponse.data.recommendation.toLowerCase()}`}>
                                    {aiResponse.data.recommendation}
                                </span>
                                <span className="va-rec-confidence">
                                    {aiResponse.data.confidence}% confidence
                                </span>
                            </div>
                        )}
                    </div>
                )}

                {/* Controls */}
                <div className="va-ctrl-row">
                    <button
                        className={`va-ctrl-btn ${isContinuous ? 'active' : ''}`}
                        onClick={toggleContinuous}
                        title="Continuous listening (wake: 'Hey Advisor')"
                        id="va-continuous-btn"
                    >
                        {isContinuous ? '🟢' : '⚪'} Continuous
                    </button>
                    {isSpeaking && (
                        <button
                            className="va-ctrl-btn speaking"
                            onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }}
                            id="va-stop-speaking-btn"
                        >
                            ⏹ Stop
                        </button>
                    )}
                    <button
                        className="va-ctrl-btn"
                        onClick={clearAll}
                        title="Clear conversation"
                        id="va-clear-btn"
                    >
                        🗑️ Clear
                    </button>
                </div>

                {/* Quick Commands */}
                <div className="va-quick-section">
                    <div className="va-quick-title">Quick commands</div>
                    <div className="va-quick-grid">
                        {QUICK_CMDS.map(({ label, cmd }, i) => (
                            <button
                                key={i}
                                className="va-quick-chip"
                                onClick={() => { setTranscript(cmd); processCommand(cmd); }}
                                disabled={isProcessing || isListening}
                                id={`va-quick-${i}`}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Conversation Log */}
                {conversationLog.length > 0 && (
                    <div className="va-log-section">
                        <div className="va-log-title">Conversation History</div>
                        <div className="va-log-list" role="log">
                            {conversationLog.map((entry, i) => (
                                <div key={i} className="va-log-item">
                                    <span className="va-log-role-icon">
                                        {entry.role === 'user' ? '🗣️' : entry.role === 'error' ? '⚠️' : '🤖'}
                                    </span>
                                    <div className={`va-log-bubble ${entry.role}`}>
                                        <p>{entry.text}</p>
                                        <span className="va-log-time">{fmt(entry.timestamp)}</span>
                                    </div>
                                </div>
                            ))}
                            <div ref={logEndRef} />
                        </div>
                    </div>
                )}

                {/* Continuous mode Wake-word hint */}
                {isContinuous && (
                    <div className="va-transcript-box" style={{ textAlign: 'center' }}>
                        <p className="va-transcript-text" style={{ color: 'var(--accent-yellow)' }}>
                            💡 Say <strong>"Hey Advisor"</strong> followed by your command
                        </p>
                    </div>
                )}

            </div>
        </div>
    );
}


/* ─────────────────────────────────────────────
   MAIN: Floating AI Assistant
───────────────────────────────────────────── */
export default function FloatingAIAssistant() {
    const [isMenuOpen, setIsMenuOpen]   = useState(false);
    const [activePanel, setActivePanel] = useState(null); // 'chat' | 'voice' | null

    const openPanel = (panel) => {
        setActivePanel(panel);
        setIsMenuOpen(false);
    };

    const closePanel = () => {
        setActivePanel(null);
        setIsMenuOpen(false);
    };

    const toggleMenu = () => {
        if (activePanel) { closePanel(); return; }
        setIsMenuOpen(prev => !prev);
    };

    /* Close on Escape */
    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') { closePanel(); setIsMenuOpen(false); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const isOpen = isMenuOpen || !!activePanel;

    return (
        <>
            {/* Overlay backdrop */}
            {isOpen && (
                <div
                    className="ai-overlay"
                    onClick={closePanel}
                    aria-hidden="true"
                />
            )}

            {/* Chat Panel */}
            {activePanel === 'chat' && <ChatPanel onClose={closePanel} />}

            {/* Voice Panel */}
            {activePanel === 'voice' && <VoicePanel onClose={closePanel} />}

            {/* FAB Wrapper */}
            <div className="fab-wrapper">
                {/* Button */}
                <button
                    className={`fab-btn ${isOpen ? 'open' : ''}`}
                    onClick={toggleMenu}
                    id="floating-ai-fab"
                    aria-label={isOpen ? 'Close AI assistant' : 'Open AI assistant'}
                    aria-expanded={isOpen}
                >
                    {/* Idle pulse ring */}
                    {!isOpen && <span className="fab-pulse-ring" aria-hidden="true" />}

                    {/* Icon — transforms from AI spark to × on open */}
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        {isOpen
                            ? <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                            : <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
                        }
                    </svg>
                </button>

                {/* Popup menu */}
                {isMenuOpen && !activePanel && (
                    <div className="fab-menu" role="menu">
                        <button
                            className="fab-menu-item"
                            onClick={() => openPanel('chat')}
                            id="fab-open-chat"
                            role="menuitem"
                        >
                            <div className="fab-menu-icon chat-icon">💬</div>
                            Chat AI
                        </button>
                        <button
                            className="fab-menu-item"
                            onClick={() => openPanel('voice')}
                            id="fab-open-voice"
                            role="menuitem"
                        >
                            <div className="fab-menu-icon voice-icon">🎤</div>
                            Voice Assistant
                        </button>
                    </div>
                )}
            </div>
        </>
    );
}
