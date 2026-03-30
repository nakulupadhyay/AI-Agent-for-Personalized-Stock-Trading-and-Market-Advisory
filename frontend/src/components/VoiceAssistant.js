import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import './VoiceAssistant.css';

/* ── Speech Recognition Setup ── */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const WAKE_WORD = 'hey advisor';

const VoiceAssistant = () => {
    const navigate = useNavigate();
    const [isListening, setIsListening] = useState(false);
    const [isContinuous, setIsContinuous] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [interimTranscript, setInterimTranscript] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [conversationLog, setConversationLog] = useState([]);
    const [isExpanded, setIsExpanded] = useState(false);
    const [error, setError] = useState('');
    const [voiceSupported, setVoiceSupported] = useState(true);
    const [selectedVoice, setSelectedVoice] = useState(null);
    const [volume, setVolume] = useState(0);

    const recognitionRef = useRef(null);
    const logEndRef = useRef(null);
    const analyserRef = useRef(null);
    const animFrameRef = useRef(null);
    const mediaStreamRef = useRef(null);

    /* ── Check browser support ── */
    useEffect(() => {
        if (!SpeechRecognition) {
            setVoiceSupported(false);
            setError('Voice commands are not supported in this browser. Please use Chrome or Edge.');
        }

        // Pick a good voice for TTS
        const loadVoices = () => {
            const voices = window.speechSynthesis?.getVoices() || [];
            const preferred = voices.find(v =>
                v.name.includes('Google') && v.lang.startsWith('en')
            ) || voices.find(v => v.lang.startsWith('en'));
            if (preferred) setSelectedVoice(preferred);
        };

        loadVoices();
        window.speechSynthesis?.addEventListener('voiceschanged', loadVoices);

        return () => {
            window.speechSynthesis?.removeEventListener('voiceschanged', loadVoices);
            stopListening();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /* ── Auto-scroll conversation log ── */
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [conversationLog]);

    /* ── Volume analyzer for mic animation ── */
    const startVolumeAnalyzer = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            const updateVolume = () => {
                analyser.getByteFrequencyData(dataArray);
                const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
                setVolume(avg / 128); // Normalize 0-1
                animFrameRef.current = requestAnimationFrame(updateVolume);
            };
            updateVolume();
        } catch (err) {
            console.warn('Mic access denied for volume analyzer');
        }
    }, []);

    const stopVolumeAnalyzer = useCallback(() => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(t => t.stop());
            mediaStreamRef.current = null;
        }
        setVolume(0);
    }, []);

    /* ── Speak response with TTS ── */
    const speak = useCallback((text) => {
        if (!window.speechSynthesis || !text) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 0.9;
        if (selectedVoice) utterance.voice = selectedVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
            setIsSpeaking(false);
            // In continuous mode, restart listening after response
            if (isContinuous && recognitionRef.current) {
                try { recognitionRef.current.start(); } catch {}
            }
        };
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    }, [selectedVoice, isContinuous]);

    /* ── Process voice command through backend ── */
    const processCommand = useCallback(async (text) => {
        if (!text.trim()) return;

        setIsProcessing(true);
        setError('');

        // Add user message to log
        setConversationLog(prev => [...prev, {
            role: 'user',
            text: text,
            timestamp: new Date(),
        }]);

        try {
            const res = await api.post('/ai/voice-command', { transcript: text });
            const data = res.data.data;

            setAiResponse(data);

            // Add AI response to log
            setConversationLog(prev => [...prev, {
                role: 'assistant',
                text: data.text,
                intent: data.intent,
                timestamp: new Date(),
            }]);

            // Speak the response
            speak(data.text);

            // Handle navigation actions
            if (data.action === 'navigate' && data.navigateTo) {
                setTimeout(() => navigate(data.navigateTo), 2000);
            }
        } catch (err) {
            const errMsg = err.response?.data?.message || 'Failed to process voice command. Please try again.';
            setError(errMsg);
            setConversationLog(prev => [...prev, {
                role: 'error',
                text: errMsg,
                timestamp: new Date(),
            }]);
        } finally {
            setIsProcessing(false);
        }
    }, [navigate, speak]);

    /* ── Start Listening ── */
    const startListening = useCallback(() => {
        if (!SpeechRecognition) return;

        setError('');
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN';

        recognition.onstart = () => {
            setIsListening(true);
            startVolumeAnalyzer();
        };

        recognition.onresult = (event) => {
            let interim = '';
            let final = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const result = event.results[i];
                if (result.isFinal) {
                    final += result[0].transcript;
                } else {
                    interim += result[0].transcript;
                }
            }

            setInterimTranscript(interim);

            if (final) {
                const cleanedFinal = final.trim();
                setTranscript(cleanedFinal);
                setInterimTranscript('');

                // Check for wake word in continuous mode
                if (isContinuous && cleanedFinal.toLowerCase().startsWith(WAKE_WORD)) {
                    const command = cleanedFinal.slice(WAKE_WORD.length).trim();
                    if (command) {
                        recognition.stop();
                        processCommand(command);
                    }
                } else if (!isContinuous) {
                    recognition.stop();
                    processCommand(cleanedFinal);
                }
            }
        };

        recognition.onend = () => {
            setIsListening(false);
            stopVolumeAnalyzer();
            // In continuous mode, restart if not processing
            if (isContinuous && !isProcessing) {
                try { recognition.start(); } catch {}
            }
        };

        recognition.onerror = (event) => {
            if (event.error !== 'no-speech' && event.error !== 'aborted') {
                setError(`Voice error: ${event.error}. Please try again.`);
            }
            setIsListening(false);
            stopVolumeAnalyzer();
        };

        recognitionRef.current = recognition;

        try {
            recognition.start();
        } catch (err) {
            setError('Could not start voice recognition. Please check microphone permissions.');
        }
    }, [isContinuous, isProcessing, processCommand, startVolumeAnalyzer, stopVolumeAnalyzer]);

    /* ── Stop Listening ── */
    const stopListening = useCallback(() => {
        window.speechSynthesis?.cancel();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
        setIsSpeaking(false);
        setIsContinuous(false);
        stopVolumeAnalyzer();
    }, [stopVolumeAnalyzer]);

    /* ── Toggle Mic ── */
    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            setIsExpanded(true);
            startListening();
        }
    };

    /* ── Toggle Continuous Mode ── */
    const toggleContinuous = () => {
        if (isContinuous) {
            setIsContinuous(false);
            stopListening();
        } else {
            setIsContinuous(true);
            if (!isListening) startListening();
        }
    };

    /* ── Stop Speaking ── */
    const stopSpeaking = () => {
        window.speechSynthesis?.cancel();
        setIsSpeaking(false);
    };

    /* ── Clear Conversation ── */
    const clearConversation = () => {
        setConversationLog([]);
        setAiResponse(null);
        setTranscript('');
        setInterimTranscript('');
        setError('');
    };

    /* ── Quick Commands ── */
    const quickCommands = [
        { label: '📊 Portfolio', command: 'Show my portfolio' },
        { label: '📈 Market', command: 'How is the market today' },
        { label: '🤖 Analyze TCS', command: 'Analyze TCS stock' },
        { label: '💡 RELIANCE', command: 'Should I buy Reliance' },
    ];

    const executeQuickCommand = (command) => {
        setTranscript(command);
        processCommand(command);
    };

    if (!voiceSupported) {
        return (
            <div className="voice-assistant-panel glass-card">
                <div className="va-header">
                    <h2 className="section-title">
                        <span className="section-icon">🎤</span> Voice Assistant
                    </h2>
                </div>
                <div className="va-unsupported">
                    <span className="va-unsupported-icon">🚫</span>
                    <p>Voice commands require Chrome or Edge browser.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`voice-assistant-panel glass-card ${isExpanded ? 'expanded' : ''}`}>
            {/* ── Header ── */}
            <div className="va-header" onClick={() => setIsExpanded(!isExpanded)}>
                <h2 className="section-title">
                    <span className="section-icon">🎤</span> Voice Assistant
                    {isListening && <span className="va-live-badge">LIVE</span>}
                    {isSpeaking && <span className="va-speaking-badge">SPEAKING</span>}
                </h2>
                <button className="va-expand-btn" aria-label="Toggle expand">
                    {isExpanded ? '▲' : '▼'}
                </button>
            </div>

            {isExpanded && (
                <div className="va-body">
                    {/* ── Mic Button ── */}
                    <div className="va-mic-section">
                        <button
                            className={`va-mic-btn ${isListening ? 'active' : ''} ${isProcessing ? 'processing' : ''}`}
                            onClick={toggleListening}
                            disabled={isProcessing}
                            id="voice-mic-btn"
                            style={{
                                '--volume': volume,
                            }}
                        >
                            <div className="mic-rings">
                                <span className="ring ring-1" />
                                <span className="ring ring-2" />
                                <span className="ring ring-3" />
                            </div>
                            <span className="mic-icon">
                                {isProcessing ? '⏳' : isListening ? '🎙️' : '🎤'}
                            </span>
                        </button>
                        <p className="va-mic-label">
                            {isProcessing ? 'Processing...' :
                             isListening ? 'Listening... Speak now' :
                             'Tap to speak'}
                        </p>
                    </div>

                    {/* ── Transcript ── */}
                    {(transcript || interimTranscript) && (
                        <div className="va-transcript">
                            <span className="va-transcript-label">You said:</span>
                            <p className="va-transcript-text">
                                {transcript}
                                {interimTranscript && (
                                    <span className="va-interim">{interimTranscript}</span>
                                )}
                            </p>
                        </div>
                    )}

                    {/* ── Error ── */}
                    {error && (
                        <div className="va-error">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    {/* ── AI Response ── */}
                    {aiResponse && (
                        <div className={`va-response ${aiResponse.intent}`}>
                            <div className="va-response-header">
                                <span className="va-response-icon">🤖</span>
                                <span className="va-response-label">AI Advisor</span>
                                {aiResponse.intent && (
                                    <span className="va-intent-badge">{aiResponse.intent.replace('_', ' ')}</span>
                                )}
                            </div>
                            <p className="va-response-text">{aiResponse.text}</p>
                            {isSpeaking && (
                                <button className="va-stop-speak" onClick={stopSpeaking}>
                                    ⏹ Stop Speaking
                                </button>
                            )}

                            {/* Show recommendation data if available */}
                            {aiResponse.data?.recommendation && (
                                <div className="va-rec-badge-row">
                                    <span className={`va-rec-badge ${aiResponse.data.recommendation.toLowerCase()}`}>
                                        {aiResponse.data.recommendation}
                                    </span>
                                    <span className="va-rec-conf">
                                        {aiResponse.data.confidence}% confidence
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* ── Quick Commands ── */}
                    <div className="va-quick">
                        <span className="va-quick-label">Quick commands:</span>
                        <div className="va-quick-btns">
                            {quickCommands.map((cmd, i) => (
                                <button
                                    key={i}
                                    className="va-quick-btn"
                                    onClick={() => executeQuickCommand(cmd.command)}
                                    disabled={isProcessing || isListening}
                                >
                                    {cmd.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Controls ── */}
                    <div className="va-controls">
                        <button
                            className={`va-ctrl-btn ${isContinuous ? 'active' : ''}`}
                            onClick={toggleContinuous}
                            title="Continuous listening mode (wake word: 'Hey Advisor')"
                        >
                            {isContinuous ? '🟢' : '⚪'} Continuous
                        </button>
                        <button className="va-ctrl-btn" onClick={clearConversation} title="Clear conversation">
                            🗑️ Clear
                        </button>
                    </div>

                    {/* ── Conversation Log ── */}
                    {conversationLog.length > 0 && (
                        <div className="va-log">
                            <span className="va-log-label">Conversation History</span>
                            <div className="va-log-list">
                                {conversationLog.map((entry, i) => (
                                    <div key={i} className={`va-log-item ${entry.role}`}>
                                        <span className="va-log-role">
                                            {entry.role === 'user' ? '🗣️' : entry.role === 'error' ? '⚠️' : '🤖'}
                                        </span>
                                        <div className="va-log-content">
                                            <p>{entry.text}</p>
                                            <span className="va-log-time">
                                                {entry.timestamp.toLocaleTimeString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                                <div ref={logEndRef} />
                            </div>
                        </div>
                    )}

                    {/* ── Wake word hint ── */}
                    {isContinuous && (
                        <div className="va-wake-hint">
                            💡 Say <strong>"Hey Advisor"</strong> followed by your command
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VoiceAssistant;
