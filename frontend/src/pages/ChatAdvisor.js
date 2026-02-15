import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import './ChatAdvisor.css';

const suggestedQuestions = [
    'Should I buy RELIANCE today?',
    'What is the sentiment for TCS?',
    'Is INFY a good long-term investment?',
    'How should I diversify my portfolio?',
    'What does a high Sharpe Ratio mean?',
];

const ChatAdvisor = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm your AI Stock Advisor powered by CapitalWave. I can help you with stock analysis, market insights, and investment strategies.\n\nTry asking me about specific stocks, portfolio strategies, or market terminology!",
            timestamp: new Date(),
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const sendMessage = async (text) => {
        const msg = text || input.trim();
        if (!msg) return;

        const userMsg = { role: 'user', content: msg, timestamp: new Date() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/ai/chat', { message: msg });
            const aiMsg = {
                role: 'assistant',
                content: res.data.data?.response || 'I apologize, I could not process your query. Please try again.',
                timestamp: new Date(),
            };
            setMessages(prev => [...prev, aiMsg]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Sorry, I encountered an error. Please try again.',
                timestamp: new Date(),
                isError: true,
            }]);
        }
        setLoading(false);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        sendMessage();
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <div className="chat-page">
            <div className="chat-container animate-fadeInUp">
                {/* Chat Header */}
                <div className="chat-header glass">
                    <div className="ch-left">
                        <div className="ch-avatar">🤖</div>
                        <div className="ch-info">
                            <h2>AI Stock Advisor</h2>
                            <span className="ch-status">
                                <span className="live-dot" /> Online — Ready to assist
                            </span>
                        </div>
                    </div>
                    <div className="ch-right">
                        <span className="ch-badge badge badge-buy">AI Powered</span>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="chat-messages">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`chat-msg ${msg.role} ${msg.isError ? 'error' : ''} animate-fadeInUp`}
                        >
                            {msg.role === 'assistant' && (
                                <div className="msg-avatar">🤖</div>
                            )}
                            <div className="msg-bubble">
                                <p className="msg-text">{msg.content}</p>
                                <span className="msg-time">{formatTime(msg.timestamp)}</span>
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="chat-msg assistant animate-fadeIn">
                            <div className="msg-avatar">🤖</div>
                            <div className="msg-bubble typing">
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                                <span className="typing-dot" />
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Suggested Questions */}
                {messages.length <= 1 && (
                    <div className="suggested-questions">
                        <span className="sq-label">Try asking:</span>
                        <div className="sq-list">
                            {suggestedQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    className="sq-btn"
                                    onClick={() => sendMessage(q)}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Input Area */}
                <form className="chat-input-area" onSubmit={handleSubmit}>
                    <div className="chat-input-wrapper">
                        <input
                            type="text"
                            placeholder="Ask about stocks, markets, or strategies..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={loading}
                        />
                        <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
                            <svg viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                            </svg>
                        </button>
                    </div>
                    <p className="chat-disclaimer">
                        AI responses are generated for educational purposes. Always consult a certified financial advisor.
                    </p>
                </form>
            </div>
        </div>
    );
};

export default ChatAdvisor;
