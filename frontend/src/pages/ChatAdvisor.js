import React, { useState, useRef, useEffect } from 'react';
import api from '../utils/api';
import './ChatAdvisor.css';

function ChatAdvisor() {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content:
                "Hi! I'm StockWise AI. Ask me anything about stocks, investing, or market concepts. This is not financial advice.",
        },
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const chatRef = useRef(null);

    useEffect(() => {
        chatRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = { role: 'user', content: input.trim() };
        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const res = await api.post('/ai/chat', { message: userMessage.content });
            const data = res.data.data;
            const aiText = data?.response || data?.aiResponse || "Sorry, I couldn't reach the AI right now. Please try again.";
            setMessages((prev) => [...prev, { role: 'assistant', content: aiText }]);
        } catch (err) {
            console.error(err);
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: "Sorry, I couldn't reach the AI right now. Please try again." },
            ]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sw-chat-page">
            <div className="sw-chat-wrapper">
                {/* Header */}
                <div className="sw-header">
                    <div className="sw-header-icon">📈</div>
                    <div className="sw-header-info">
                        <h1>StockWise AI</h1>
                        <p>Powered by Mistral-7B • Hugging Face</p>
                    </div>
                </div>

                {/* Messages */}
                <div className="sw-messages chat-container">
                    {messages.map((msg, i) => (
                        <div
                            key={i}
                            className={`sw-msg-row ${msg.role === 'user' ? 'sw-msg-user' : 'sw-msg-assistant'}`}
                        >
                            <div className={`sw-bubble ${msg.role}`}>
                                <p>{msg.content}</p>
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="sw-msg-row sw-msg-assistant">
                            <div className="sw-bubble assistant sw-typing">
                                <div className="sw-dots">
                                    <span className="sw-dot" />
                                    <span className="sw-dot" />
                                    <span className="sw-dot" />
                                </div>
                                <span className="sw-thinking-text">Thinking...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatRef} />
                </div>

                {/* Input */}
                <form onSubmit={sendMessage} className="sw-input-area">
                    <div className="sw-input-row">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about stocks, charts, or investing..."
                            disabled={loading}
                        />
                        <button type="submit" disabled={loading || !input.trim()}>
                            Send
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default ChatAdvisor;
