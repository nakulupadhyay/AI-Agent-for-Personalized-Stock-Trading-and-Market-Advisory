import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './Dashboard.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

/* ── HELPERS ──────────────────────────────── */
const fmt = (n) => n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

const SkeletonCard = () => (
    <div className="skeleton-wrapper">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
    </div>
);

/* ========================================
   MAIN DASHBOARD COMPONENT
   ======================================== */
const Dashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stocks, setStocks] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [recommendation, setRecommendation] = useState(null);
    const [sentiment, setSentiment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartTimeframe, setChartTimeframe] = useState('1M');
    const [showAiExplanation, setShowAiExplanation] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedStock, setSelectedStock] = useState(null);

    /* ── Alerts (generated from data) ── */
    const [alerts, setAlerts] = useState([]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            fetchData();
            setLastUpdated(new Date());
        }, 30000);
        return () => clearInterval(interval);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const [stocksRes, portfolioRes] = await Promise.all([
                api.get('/stocks'),
                api.get('/trading/portfolio'),
            ]);

            const stocksData = stocksRes.data.data || [];
            setStocks(stocksData);
            setPortfolio(portfolioRes.data.data || {});

            if (stocksData.length > 0) {
                setSelectedStock(stocksData[0]);
                const [recRes, sentRes] = await Promise.all([
                    api.post('/ai/recommendation', {
                        symbol: stocksData[0].symbol,
                        currentPrice: stocksData[0].currentPrice,
                        sentiment: 'Positive',
                    }),
                    api.post('/ai/sentiment', { symbol: stocksData[0].symbol }),
                ]);
                setRecommendation(recRes.data.data);
                setSentiment(sentRes.data.data);

                // Generate alerts from data
                const newAlerts = [];
                stocksData.forEach(s => {
                    if (Math.abs(s.changePercent) > 3) {
                        newAlerts.push({ type: 'volatility', icon: '⚡', message: `${s.symbol} showing high volatility (${s.changePercent > 0 ? '+' : ''}${s.changePercent?.toFixed(2)}%)`, time: 'Just now' });
                    }
                });
                if (recRes.data.data) {
                    newAlerts.push({ type: 'ai', icon: '🤖', message: `AI recommends ${recRes.data.data.recommendation} for ${stocksData[0].symbol}`, time: '2 min ago' });
                }
                newAlerts.push({ type: 'info', icon: '📊', message: 'Market data refreshed successfully', time: 'Just now' });
                setAlerts(newAlerts);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    /* ── STOCK SEARCH ── */
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) return;
        setSearchLoading(true);
        setSearchResults([]);
        try {
            const res = await api.get(`/stocks/search/${searchQuery.trim()}`);
            const results = res.data.data;
            if (results && results.length > 0) {
                setSearchResults(results);
            } else {
                setSearchResults([{ notFound: true }]);
            }
        } catch (err) {
            // Fallback: search in loaded stocks
            const found = stocks.filter(s =>
                s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                s.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
            );
            if (found.length > 0) setSearchResults(found);
            else setSearchResults([{ notFound: true }]);
        }
        setSearchLoading(false);
    };

    /* ── CHART DATA ── */
    const generateChartData = useCallback(() => {
        const labels = {
            '1D': ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30'],
            '1W': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            '1M': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        };
        const base = selectedStock?.currentPrice || 2480;
        const generatePrices = (count) => {
            const prices = [];
            let p = base * 0.95;
            for (let i = 0; i < count; i++) {
                p += (Math.random() - 0.45) * (base * 0.02);
                prices.push(Math.round(p * 100) / 100);
            }
            prices[prices.length - 1] = base;
            return prices;
        };
        const counts = { '1D': 13, '1W': 5, '1M': 4, '1Y': 12 };

        return {
            labels: labels[chartTimeframe],
            datasets: [{
                label: selectedStock?.symbol || 'RELIANCE',
                data: generatePrices(counts[chartTimeframe]),
                borderColor: '#6c5ce7', borderWidth: 2, tension: 0.4,
                pointRadius: 0, pointHoverRadius: 6,
                pointHoverBackgroundColor: '#6c5ce7', pointHoverBorderColor: '#fff', pointHoverBorderWidth: 2,
                fill: true,
                backgroundColor: (ctx) => {
                    const c = ctx.chart.ctx;
                    const g = c.createLinearGradient(0, 0, 0, 300);
                    g.addColorStop(0, 'rgba(108,92,231,0.3)');
                    g.addColorStop(1, 'rgba(108,92,231,0.0)');
                    return g;
                },
            }],
        };
    }, [chartTimeframe, selectedStock]);

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17,24,39,0.95)', borderColor: 'rgba(108,92,231,0.3)', borderWidth: 1,
                titleColor: '#f1f5f9', bodyColor: '#a29bfe', cornerRadius: 8, padding: 12, displayColors: false,
                callbacks: { label: (ctx) => `₹${ctx.parsed.y.toLocaleString()}` },
            },
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 11 }, callback: (v) => `₹${v}` } },
        },
        interaction: { intersect: false, mode: 'index' },
        animation: { duration: 800, easing: 'easeInOutQuart' },
    };

    /* ── MARKET STATUS ── */
    const now = new Date();
    const hour = now.getHours();
    const day = now.getDay();
    const isMarketOpen = day >= 1 && day <= 5 && hour >= 9 && hour < 16;

    /* ── TOP GAINER / LOSER ── */
    const topGainer = stocks.length > 0 ? stocks.reduce((a, b) => (a.changePercent > b.changePercent ? a : b)) : null;
    const topLoser = stocks.length > 0 ? stocks.reduce((a, b) => (a.changePercent < b.changePercent ? a : b)) : null;

    /* ── TIME AGO ── */
    const getTimeAgo = () => {
        const diff = Math.floor((new Date() - lastUpdated) / 1000);
        if (diff < 60) return 'Just now';
        return `${Math.floor(diff / 60)} min ago`;
    };

    /* ── LOADING ── */
    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <div className="skeleton skeleton-title" style={{ width: '250px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '350px' }} />
                </div>
                <div className="market-overview-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="glass-card"><SkeletonCard /></div>)}
                </div>
                <div className="glass-card" style={{ height: '350px' }}>
                    <div className="skeleton" style={{ height: '100%', borderRadius: '12px' }} />
                </div>
            </div>
        );
    }

    /* ========================================
       MAIN RENDER
       ======================================== */
    return (
        <div className="dashboard">
            {/* ── HEADER ── */}
            <div className="dashboard-header animate-fadeInUp">
                <div>
                    <h1 className="dashboard-title">
                        Welcome back, <span className="text-gradient">{user?.name || 'Investor'}</span>
                    </h1>
                    <p className="dashboard-subtitle">
                        AI-powered market insights & real-time analysis
                        <span className="update-time"> • Updated {getTimeAgo()}</span>
                    </p>
                </div>
            </div>

            {/* ── 1. MARKET OVERVIEW ── */}
            <div className="market-overview-grid animate-fadeInUp">
                <div className="market-card glass-card">
                    <div className="mc-top">
                        <span className="mc-label">NIFTY 50</span>
                        <span className="mc-change positive">▲ 0.82%</span>
                    </div>
                    <div className="mc-value">22,458.30</div>
                    <div className="mc-sub">+183.25 pts</div>
                </div>
                <div className="market-card glass-card">
                    <div className="mc-top">
                        <span className="mc-label">SENSEX</span>
                        <span className="mc-change positive">▲ 0.75%</span>
                    </div>
                    <div className="mc-value">73,891.40</div>
                    <div className="mc-sub">+552.80 pts</div>
                </div>
                <div className="market-card glass-card">
                    <div className="mc-top">
                        <span className="mc-label">Market Status</span>
                    </div>
                    <div className={`mc-value mc-status ${isMarketOpen ? 'open' : 'closed'}`}>
                        <span className={`status-dot ${isMarketOpen ? 'green' : 'red'}`}></span>
                        {isMarketOpen ? 'Open' : 'Closed'}
                    </div>
                    <div className="mc-sub">NSE / BSE</div>
                </div>
                <div className="market-card glass-card">
                    <div className="mc-top">
                        <span className="mc-label">Top Gainer</span>
                        <span className="mc-change positive">▲</span>
                    </div>
                    <div className="mc-value mc-gainer">{topGainer?.symbol || '—'}</div>
                    <div className="mc-sub positive">{topGainer ? `+${topGainer.changePercent?.toFixed(2)}%` : ''}</div>
                </div>
                <div className="market-card glass-card">
                    <div className="mc-top">
                        <span className="mc-label">Top Loser</span>
                        <span className="mc-change negative">▼</span>
                    </div>
                    <div className="mc-value mc-loser">{topLoser?.symbol || '—'}</div>
                    <div className="mc-sub negative">{topLoser ? `${topLoser.changePercent?.toFixed(2)}%` : ''}</div>
                </div>
            </div>

            {/* ── 2. STOCK SEARCH ── */}
            <div className="search-section glass-card animate-fadeInUp">
                <form className="search-bar" onSubmit={handleSearch}>
                    <span className="search-icon">🔍</span>
                    <input
                        type="text"
                        placeholder="Search stock symbol (e.g. RELIANCE, TCS, INFY)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                    <button type="submit" className="search-btn" disabled={searchLoading}>
                        {searchLoading ? '...' : 'Search'}
                    </button>
                </form>
                {searchResults.length > 0 && !searchResults[0]?.notFound && (
                    <div className="search-results-list animate-fadeIn">
                        {searchResults.map((result, idx) => (
                            <div key={idx} className="search-result">
                                <div className="sr-main">
                                    <span className="sr-symbol">{result.symbol}</span>
                                    <span className="sr-name">{result.companyName || result.name || ''}</span>
                                </div>
                                <div className="sr-price">
                                    {result.currentPrice ? `₹${fmt(result.currentPrice)}` : ''}
                                </div>
                                {result.changePercent !== undefined && (
                                    <span className={`sr-change ${result.changePercent >= 0 ? 'positive' : 'negative'}`}>
                                        {result.changePercent >= 0 ? '▲' : '▼'} {Math.abs(result.changePercent)?.toFixed(2)}%
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {searchResults.length > 0 && searchResults[0]?.notFound && (
                    <div className="search-result animate-fadeIn">
                        <span className="sr-empty">No results found for "{searchQuery}"</span>
                    </div>
                )}
            </div>

            {/* ── MAIN GRID: Chart + AI Recommendation ── */}
            <div className="dashboard-grid">
                {/* 4. LIVE STOCK CHART */}
                <div className="chart-section glass-card animate-fadeInUp stagger-3">
                    <div className="chart-header">
                        <div className="chart-title-group">
                            <h2 className="section-title">📈 Live Stock Price</h2>
                            <div className="chart-stock-info">
                                <span className="chart-symbol">{selectedStock?.symbol || 'RELIANCE'}</span>
                                <span className="chart-price">₹{fmt(selectedStock?.currentPrice)}</span>
                                <span className={`chart-change ${(selectedStock?.change || 0) >= 0 ? 'positive' : 'negative'}`}>
                                    {(selectedStock?.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(selectedStock?.change || 0)?.toFixed(2)} ({selectedStock?.changePercent?.toFixed(2)}%)
                                </span>
                            </div>
                        </div>
                        <div className="timeframe-buttons">
                            {['1D', '1W', '1M', '1Y'].map(t => (
                                <button key={t} className={`tf-btn ${chartTimeframe === t ? 'active' : ''}`} onClick={() => setChartTimeframe(t)}>{t}</button>
                            ))}
                        </div>
                    </div>
                    {/* Stock selector pills */}
                    <div className="stock-pills">
                        {stocks.slice(0, 5).map(s => (
                            <button
                                key={s.symbol}
                                className={`sp-btn ${selectedStock?.symbol === s.symbol ? 'active' : ''}`}
                                onClick={() => setSelectedStock(s)}
                            >
                                {s.symbol}
                            </button>
                        ))}
                    </div>
                    <div className="chart-container">
                        <Line data={generateChartData()} options={chartOptions} />
                    </div>
                </div>

                {/* 3. AI RECOMMENDATION — Main Highlight 🔥 */}
                <div className="ai-section glass-card animate-fadeInUp stagger-4">
                    <h2 className="section-title">🤖 AI Decision Engine</h2>
                    {recommendation && (
                        <>
                            <div className="ai-main-rec">
                                <span className={`ai-action badge-${recommendation.recommendation?.toLowerCase()}`}>
                                    {recommendation.recommendation}
                                </span>
                                <span className="ai-symbol">{recommendation.symbol}</span>
                            </div>

                            {/* Confidence Meter */}
                            <div className="confidence-section">
                                <div className="confidence-header">
                                    <span>AI Confidence Score</span>
                                    <span className="confidence-value">{recommendation.confidence}%</span>
                                </div>
                                <div className="confidence-track">
                                    <div className="confidence-fill" style={{ width: `${recommendation.confidence}%` }} />
                                </div>
                            </div>

                            {/* Short explanation */}
                            <div className="ai-short-explain">
                                {recommendation.recommendation === 'BUY'
                                    ? '📈 Upward momentum + Positive sentiment detected.'
                                    : recommendation.recommendation === 'SELL'
                                        ? '📉 Downward pressure + Negative sentiment signals.'
                                        : '🔄 Market is consolidating. Hold current position.'}
                            </div>

                            {/* Target Price */}
                            <div className="ai-metric-row">
                                <span className="metric-label">Target Price</span>
                                <span className="metric-value">₹{recommendation.targetPrice?.toFixed(2)}</span>
                            </div>
                            <div className="ai-metric-row">
                                <span className="metric-label">Risk Adjusted Return</span>
                                <span className="metric-value positive">+8.2%</span>
                            </div>

                            {/* Expandable */}
                            <button className="ai-explain-btn" onClick={() => setShowAiExplanation(!showAiExplanation)}>
                                {showAiExplanation ? '▲ Hide Details' : '▼ View Detailed Analysis'}
                            </button>

                            {showAiExplanation && (
                                <div className="ai-explanation animate-fadeIn">
                                    <div className="explain-title">AI Transparency — Decision Breakdown</div>
                                    <ul className="explain-list">
                                        <li><span className="dot green" /> Positive sentiment detected in 78% of news</li>
                                        <li><span className="dot green" /> Upward price momentum over 14-day EMA</li>
                                        <li><span className="dot green" /> Low volatility (Beta: 0.82)</li>
                                        <li><span className="dot blue" /> Strong quarterly earnings (QoQ +12.3%)</li>
                                        <li><span className="dot yellow" /> Market Momentum Index: 7.2/10</li>
                                    </ul>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* 5. SENTIMENT ANALYSIS */}
                <div className="sentiment-section glass-card animate-fadeInUp stagger-5">
                    <h2 className="section-title">📊 Sentiment Analysis</h2>
                    {sentiment && (
                        <>
                            <div className="sentiment-main">
                                <div className={`sentiment-circle ${sentiment.overallSentiment?.toLowerCase()}`}>
                                    <span className="sentiment-score">{(sentiment.sentimentScore / 100).toFixed(2)}</span>
                                    <span className="sentiment-label">/ 1.0</span>
                                </div>
                                <span className={`badge badge-${sentiment.overallSentiment?.toLowerCase() === 'positive' ? 'buy' : sentiment.overallSentiment?.toLowerCase() === 'negative' ? 'sell' : 'hold'}`}>
                                    {sentiment.overallSentiment}
                                </span>
                            </div>

                            {/* News Headlines */}
                            <div className="news-feed">
                                <div className="news-header">Latest Headlines</div>
                                {sentiment.newsArticles?.slice(0, 3).map((article, i) => (
                                    <div key={i} className="news-item">
                                        <span className={`news-dot ${article.sentiment?.toLowerCase()}`} />
                                        <div className="news-content">
                                            <p className="news-headline">{article.headline}</p>
                                            <span className="news-source">{article.source}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* 6. PORTFOLIO QUICK SUMMARY */}
                <div className="portfolio-quick glass-card animate-fadeInUp stagger-6">
                    <h2 className="section-title">💼 Portfolio Quick Summary</h2>
                    <div className="pq-stats">
                        <div className="pq-stat">
                            <span className="pq-label">Total Portfolio Value</span>
                            <span className="pq-value">₹{fmt(portfolio?.currentValue || 0)}</span>
                        </div>
                        <div className="pq-stat">
                            <span className="pq-label">Today's Gain/Loss</span>
                            <span className={`pq-value ${(portfolio?.profitLoss || 0) >= 0 ? 'positive' : 'negative'}`}>
                                {(portfolio?.profitLoss || 0) >= 0 ? '+' : ''}₹{fmt(portfolio?.profitLoss || 0)}
                            </span>
                        </div>
                        <div className="pq-stat">
                            <span className="pq-label">Risk Level</span>
                            <span className="pq-value pq-risk">{user?.riskProfile || 'Medium'}</span>
                        </div>
                        <div className="pq-stat">
                            <span className="pq-label">Holdings</span>
                            <span className="pq-value">{portfolio?.holdings?.length || 0} stocks</span>
                        </div>
                    </div>
                    <button className="pq-btn" onClick={() => navigate('/portfolio')}>
                        View Full Portfolio →
                    </button>
                </div>
            </div>

            {/* ── BOTTOM ROW: Alerts + AI Model Info ── */}
            <div className="bottom-grid">
                {/* 7. ALERTS & NOTIFICATIONS */}
                <div className="alerts-section glass-card animate-fadeInUp">
                    <h2 className="section-title">🔔 Alerts & Notifications</h2>
                    <div className="alerts-list">
                        {alerts.length > 0 ? alerts.map((alert, i) => (
                            <div key={i} className={`alert-item alert-${alert.type}`}>
                                <span className="alert-icon">{alert.icon}</span>
                                <div className="alert-content">
                                    <span className="alert-msg">{alert.message}</span>
                                    <span className="alert-time">{alert.time}</span>
                                </div>
                            </div>
                        )) : (
                            <div className="empty-alerts">No alerts right now</div>
                        )}
                    </div>
                </div>

                {/* 8. AI CONFIDENCE & MODEL INFO */}
                <div className="ai-model-section glass-card animate-fadeInUp">
                    <h2 className="section-title">🧠 AI Model Info</h2>
                    <div className="model-grid">
                        <div className="model-stat">
                            <div className="ms-icon">🎯</div>
                            <div className="ms-value">82%</div>
                            <div className="ms-label">Model Accuracy</div>
                            <div className="ms-bar"><div className="ms-fill" style={{ width: '82%' }}></div></div>
                        </div>
                        <div className="model-stat">
                            <div className="ms-icon">⏱️</div>
                            <div className="ms-value">{getTimeAgo()}</div>
                            <div className="ms-label">Last Updated</div>
                        </div>
                        <div className="model-stat">
                            <div className="ms-icon">🛡️</div>
                            <div className="ms-value">{user?.riskProfile || 'Medium'}</div>
                            <div className="ms-label">Risk Score</div>
                        </div>
                        <div className="model-stat">
                            <div className="ms-icon">📊</div>
                            <div className="ms-value">v2.4</div>
                            <div className="ms-label">Model Version</div>
                        </div>
                    </div>
                    <div className="model-footer">
                        <span className="mf-dot"></span>
                        Powered by Multi-Layer LSTM + Sentiment NLP Engine
                    </div>
                </div>
            </div>

            {/* ── STOCKS TABLE ── */}
            <div className="stocks-section glass-card animate-fadeInUp">
                <div className="stocks-header">
                    <h2 className="section-title">📋 Top Stocks — NSE</h2>
                    <span className="live-indicator">
                        <span className="live-dot" /> Live
                    </span>
                </div>
                <div className="stocks-table-wrap">
                    <table className="stocks-table">
                        <thead>
                            <tr>
                                <th>Symbol</th>
                                <th>Company</th>
                                <th>Price</th>
                                <th>Change</th>
                                <th>Volume</th>
                                <th>Market Cap</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stocks.map((stock, index) => (
                                <tr key={index} className="animate-fadeInUp" style={{ animationDelay: `${index * 0.05}s` }}>
                                    <td><span className="stock-symbol">{stock.symbol}</span></td>
                                    <td className="stock-company">{stock.companyName}</td>
                                    <td className="stock-price">₹{stock.currentPrice?.toFixed(2)}</td>
                                    <td>
                                        <span className={`stock-change ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                                            {stock.change >= 0 ? '▲' : '▼'} {Math.abs(stock.change)?.toFixed(2)} ({stock.changePercent?.toFixed(2)}%)
                                        </span>
                                    </td>
                                    <td className="stock-vol">{stock.volume?.toLocaleString()}</td>
                                    <td className="stock-mcap">{stock.marketCap}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Risk Warning */}
            <div className="risk-warning-bar">
                <span>⚠️</span> This is an AI-powered advisory system. Predictions are based on historical data and sentiment analysis. Not financial advice. Invest at your own risk.
            </div>
        </div>
    );
};

export default Dashboard;
