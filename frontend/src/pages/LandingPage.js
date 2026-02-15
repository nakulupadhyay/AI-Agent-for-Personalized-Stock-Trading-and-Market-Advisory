import React from 'react';
import { Link } from 'react-router-dom';
import './LandingPage.css';

const LandingPage = () => {
    return (
        <div className="landing">
            {/* Background Effects */}
            <div className="landing-bg">
                <div className="bg-orb lg-orb-1" />
                <div className="bg-orb lg-orb-2" />
                <div className="bg-grid" />
            </div>

            {/* Top Bar */}
            <nav className="landing-nav">
                <div className="landing-nav-inner">
                    <div className="nav-brand">
                        <svg viewBox="0 0 32 32" fill="none" width="32" height="32">
                            <rect width="32" height="32" rx="8" fill="url(#navlg)" />
                            <path d="M8 22L14 14L18 18L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            <defs>
                                <linearGradient id="navlg" x1="0" y1="0" x2="32" y2="32">
                                    <stop stopColor="#6c5ce7" />
                                    <stop offset="1" stopColor="#a29bfe" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <span>CapitalWave</span>
                    </div>
                    <div className="nav-actions">
                        <Link to="/login" className="nav-link">Login</Link>
                        <Link to="/signup" className="nav-cta">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* Hero */}
            <section className="hero">
                <div className="hero-badge">🤖 Powered by AI & Machine Learning</div>
                <h1 className="hero-title">
                    Smarter Trading with
                    <span className="hero-gradient"> AI Intelligence</span>
                </h1>
                <p className="hero-desc">
                    Get personalized stock recommendations, real-time sentiment analysis, and automated risk profiling — all powered by advanced artificial intelligence.
                </p>
                <div className="hero-ctas">
                    <Link to="/signup" className="btn btn-primary hero-btn">
                        Start Trading Free →
                    </Link>
                    <Link to="/login" className="btn btn-outline hero-btn">
                        Login to Dashboard
                    </Link>
                </div>

                {/* Stats Bar */}
                <div className="hero-stats">
                    <div className="hero-stat">
                        <span className="hs-value">10L+</span>
                        <span className="hs-label">Virtual Capital</span>
                    </div>
                    <div className="hero-stat-divider" />
                    <div className="hero-stat">
                        <span className="hs-value">95%</span>
                        <span className="hs-label">AI Accuracy</span>
                    </div>
                    <div className="hero-stat-divider" />
                    <div className="hero-stat">
                        <span className="hs-value">5+</span>
                        <span className="hs-label">NSE Stocks</span>
                    </div>
                    <div className="hero-stat-divider" />
                    <div className="hero-stat">
                        <span className="hs-value">24/7</span>
                        <span className="hs-label">AI Chat Support</span>
                    </div>
                </div>
            </section>

            {/* Features */}
            <section className="features">
                <h2 className="features-title">Why Choose CapitalWave?</h2>
                <p className="features-subtitle">Built for modern investors who want AI-backed decision making</p>

                <div className="features-grid">
                    {[
                        { icon: '🧠', title: 'AI Decision Engine', desc: 'Machine learning algorithms analyze price trends, momentum indicators, and market data to generate Buy/Sell/Hold signals with confidence scores.' },
                        { icon: '📰', title: 'Sentiment Strength Index', desc: 'NLP-powered analysis of news headlines and market reports to gauge overall sentiment — Positive, Negative, or Neutral.' },
                        { icon: '📊', title: 'Market Momentum Analysis', desc: 'Interactive charts with multiple timeframes (1D, 1W, 1M, 1Y). Track price movements with real-time updates.' },
                        { icon: '💼', title: 'Smart Portfolio Tracking', desc: 'Monitor your investments with CAGR, Sharpe Ratio, Beta, and risk-adjusted returns. Professional-grade analytics.' },
                        { icon: '📈', title: 'Paper Trading Simulator', desc: 'Practice with ₹10,00,000 virtual capital. Execute buy/sell orders without real risk. Perfect for learning.' },
                        { icon: '🤖', title: 'AI Chat Advisor', desc: 'Ask any investment question and get instant AI-powered responses. Your personal 24/7 financial advisor.' },
                    ].map((f, i) => (
                        <div key={i} className="feature-card glass-card">
                            <div className="fc-icon">{f.icon}</div>
                            <h3 className="fc-title">{f.title}</h3>
                            <p className="fc-desc">{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Banner */}
            <section className="cta-section">
                <div className="cta-card glass">
                    <h2>Ready to trade smarter?</h2>
                    <p>Join CapitalWave and let AI guide your investment decisions.</p>
                    <Link to="/signup" className="btn btn-primary">Create Free Account →</Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="landing-footer">
                <div className="footer-brand">
                    <span>CapitalWave</span> — AI Stock Trading & Market Advisory
                </div>
                <div className="footer-note">
                    ⚠️ This is an AI-powered advisory system for educational purposes. Not financial advice.
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;
