import React, { useState, useEffect } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './Dashboard.css';

// Register Chart.js components
ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    ArcElement, Title, Tooltip, Legend, Filler
);

/* ========================================
   LOADING SKELETON COMPONENT
   ======================================== */
const SkeletonCard = () => (
    <div className="skeleton-wrapper">
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '80%' }} />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
    </div>
);

/* ========================================
   STAT CARD COMPONENT
   ======================================== */
const StatCard = ({ icon, label, value, change, changeType, delay }) => (
    <div className={`stat-card glass-card animate-fadeInUp stagger-${delay}`}>
        <div className="stat-card-header">
            <span className="stat-icon">{icon}</span>
            <span className={`stat-change ${changeType}`}>
                {changeType === 'positive' ? '▲' : changeType === 'negative' ? '▼' : '●'} {change}
            </span>
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
    </div>
);

/* ========================================
   MAIN DASHBOARD COMPONENT
   ======================================== */
const Dashboard = () => {
    const { user } = useAuth();
    const [stocks, setStocks] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [recommendation, setRecommendation] = useState(null);
    const [sentiment, setSentiment] = useState(null);
    const [loading, setLoading] = useState(true);
    const [chartTimeframe, setChartTimeframe] = useState('1M');
    const [showAiExplanation, setShowAiExplanation] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(new Date());

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds
        const interval = setInterval(() => {
            fetchData();
            setLastUpdated(new Date());
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchData = async () => {
        try {
            const [stocksRes, portfolioRes] = await Promise.all([
                api.get('/stocks'),
                api.get('/trading/portfolio'),
            ]);

            setStocks(stocksRes.data.data || []);
            setPortfolio(portfolioRes.data.data || {});

            if (stocksRes.data.data?.length > 0) {
                const firstStock = stocksRes.data.data[0];
                const [recRes, sentRes] = await Promise.all([
                    api.post('/ai/recommendation', {
                        symbol: firstStock.symbol,
                        currentPrice: firstStock.currentPrice,
                        sentiment: 'Positive',
                    }),
                    api.post('/ai/sentiment', { symbol: firstStock.symbol }),
                ]);
                setRecommendation(recRes.data.data);
                setSentiment(sentRes.data.data);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    // Generate chart data
    const generateChartData = () => {
        const labels = {
            '1D': ['9:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '1:00', '1:30', '2:00', '2:30', '3:00', '3:30'],
            '1W': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            '1M': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
            '1Y': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
        };

        const prices = {
            '1D': [2440, 2445, 2450, 2448, 2455, 2460, 2458, 2465, 2470, 2468, 2475, 2472, 2480],
            '1W': [2420, 2435, 2450, 2465, 2480],
            '1M': [2380, 2420, 2450, 2480],
            '1Y': [2200, 2250, 2300, 2280, 2350, 2400, 2380, 2420, 2390, 2450, 2480, 2500],
        };

        return {
            labels: labels[chartTimeframe],
            datasets: [{
                label: 'RELIANCE',
                data: prices[chartTimeframe],
                borderColor: '#6c5ce7',
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(108, 92, 231, 0.3)');
                    gradient.addColorStop(1, 'rgba(108, 92, 231, 0.0)');
                    return gradient;
                },
                fill: true,
                tension: 0.4,
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#6c5ce7',
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
            }],
        };
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                borderColor: 'rgba(108, 92, 231, 0.3)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#a29bfe',
                cornerRadius: 8,
                padding: 12,
                displayColors: false,
                callbacks: {
                    label: (ctx) => `₹${ctx.parsed.y.toLocaleString()}`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                ticks: { color: '#64748b', font: { size: 11 } },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false },
                ticks: {
                    color: '#64748b',
                    font: { size: 11 },
                    callback: (v) => `₹${v}`,
                },
            },
        },
        interaction: { intersect: false, mode: 'index' },
        animation: { duration: 800, easing: 'easeInOutQuart' },
    };

    // Portfolio Pie Chart
    const pieData = {
        labels: ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'Cash'],
        datasets: [{
            data: [30, 25, 20, 15, 10],
            backgroundColor: [
                'rgba(108, 92, 231, 0.8)',
                'rgba(0, 184, 148, 0.8)',
                'rgba(10, 189, 227, 0.8)',
                'rgba(255, 217, 61, 0.8)',
                'rgba(100, 116, 139, 0.5)',
            ],
            borderColor: 'transparent',
            borderWidth: 0,
            hoverOffset: 6,
        }],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    color: '#94a3b8',
                    padding: 16,
                    usePointStyle: true,
                    pointStyleWidth: 10,
                    font: { size: 11 },
                },
            },
            tooltip: {
                backgroundColor: 'rgba(17, 24, 39, 0.95)',
                borderColor: 'rgba(108, 92, 231, 0.3)',
                borderWidth: 1,
                titleColor: '#f1f5f9',
                bodyColor: '#a29bfe',
                cornerRadius: 8,
                callbacks: { label: (ctx) => `${ctx.label}: ${ctx.raw}%` },
            },
        },
        cutout: '65%',
    };

    // Timeago
    const getTimeAgo = () => {
        const diff = Math.floor((new Date() - lastUpdated) / 1000);
        if (diff < 60) return 'Just now';
        return `${Math.floor(diff / 60)} min ago`;
    };

    /* ========================================
       LOADING STATE
       ======================================== */
    if (loading) {
        return (
            <div className="dashboard">
                <div className="dashboard-header">
                    <div className="skeleton skeleton-title" style={{ width: '200px' }} />
                    <div className="skeleton skeleton-text" style={{ width: '300px' }} />
                </div>
                <div className="stats-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="glass-card"><SkeletonCard /></div>
                    ))}
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
            {/* Header */}
            <div className="dashboard-header animate-fadeInUp">
                <div>
                    <h1 className="dashboard-title">
                        Welcome back, <span className="text-gradient">{user?.name || 'Investor'}</span>
                    </h1>
                    <p className="dashboard-subtitle">
                        Here's your market summary and AI insights
                        <span className="update-time"> • Updated {getTimeAgo()}</span>
                    </p>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="stats-grid">
                <StatCard
                    icon="💰" label="Total Portfolio Value" delay={1}
                    value={`₹${(portfolio?.currentValue || 0).toLocaleString('en-IN')}`}
                    change="+2.4%" changeType="positive"
                />
                <StatCard
                    icon="📊" label="Today's Profit/Loss" delay={2}
                    value={`₹${(portfolio?.profitLoss || 0).toLocaleString('en-IN')}`}
                    change={portfolio?.profitLoss >= 0 ? '+1.8%' : '-1.2%'}
                    changeType={portfolio?.profitLoss >= 0 ? 'positive' : 'negative'}
                />
                <StatCard
                    icon="🤖" label="AI Recommendation" delay={3}
                    value={recommendation?.recommendation || 'HOLD'}
                    change={`${recommendation?.confidence || 0}% confidence`}
                    changeType="neutral"
                />
                <StatCard
                    icon="🎯" label="Risk Level" delay={4}
                    value={user?.riskProfile || 'Medium'}
                    change="Balanced" changeType="neutral"
                />
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Stock Price Chart */}
                <div className="chart-section glass-card animate-fadeInUp stagger-3">
                    <div className="chart-header">
                        <div className="chart-title-group">
                            <h2 className="section-title">Market Momentum Analysis</h2>
                            <div className="chart-stock-info">
                                <span className="chart-symbol">RELIANCE</span>
                                <span className="chart-price">₹2,480.00</span>
                                <span className="chart-change positive">+1.6%</span>
                            </div>
                        </div>
                        <div className="timeframe-buttons">
                            {['1D', '1W', '1M', '1Y'].map((t) => (
                                <button
                                    key={t}
                                    className={`tf-btn ${chartTimeframe === t ? 'active' : ''}`}
                                    onClick={() => setChartTimeframe(t)}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="chart-container">
                        <Line data={generateChartData()} options={chartOptions} />
                    </div>
                </div>

                {/* AI Recommendation Card */}
                <div className="ai-section glass-card animate-fadeInUp stagger-4">
                    <h2 className="section-title">AI Decision Engine</h2>
                    {recommendation && (
                        <>
                            <div className="ai-main-rec">
                                <span className={`ai-action badge-${recommendation.recommendation.toLowerCase()}`}>
                                    {recommendation.recommendation}
                                </span>
                                <span className="ai-symbol">{recommendation.symbol}</span>
                            </div>

                            {/* Confidence Meter */}
                            <div className="confidence-section">
                                <div className="confidence-header">
                                    <span>AI Confidence Level</span>
                                    <span className="confidence-value">{recommendation.confidence}%</span>
                                </div>
                                <div className="confidence-track">
                                    <div
                                        className="confidence-fill"
                                        style={{ width: `${recommendation.confidence}%` }}
                                    />
                                </div>
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

                            <div className="ai-metric-row">
                                <span className="metric-label">Sharpe Ratio</span>
                                <span className="metric-value">1.45</span>
                            </div>

                            {/* Expandable Explanation */}
                            <button
                                className="ai-explain-btn"
                                onClick={() => setShowAiExplanation(!showAiExplanation)}
                            >
                                {showAiExplanation ? '▲ Hide' : '▼ Why this recommendation?'}
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

                {/* Sentiment Analysis */}
                <div className="sentiment-section glass-card animate-fadeInUp stagger-5">
                    <h2 className="section-title">Sentiment Strength Index</h2>
                    {sentiment && (
                        <>
                            <div className="sentiment-main">
                                <div className={`sentiment-circle ${sentiment.overallSentiment.toLowerCase()}`}>
                                    <span className="sentiment-score">{sentiment.sentimentScore}</span>
                                    <span className="sentiment-label">/ 100</span>
                                </div>
                                <span className={`badge badge-${sentiment.overallSentiment.toLowerCase() === 'positive' ? 'buy' : sentiment.overallSentiment.toLowerCase() === 'negative' ? 'sell' : 'hold'}`}>
                                    {sentiment.overallSentiment}
                                </span>
                            </div>

                            {/* News Feed */}
                            <div className="news-feed">
                                <div className="news-header">Latest Headlines</div>
                                {sentiment.newsArticles?.map((article, i) => (
                                    <div key={i} className="news-item">
                                        <span className={`news-dot ${article.sentiment.toLowerCase()}`} />
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

                {/* Portfolio Allocation */}
                <div className="portfolio-section glass-card animate-fadeInUp stagger-6">
                    <h2 className="section-title">Portfolio Allocation</h2>
                    <div className="pie-container">
                        <Doughnut data={pieData} options={pieOptions} />
                    </div>
                    <div className="portfolio-metrics">
                        <div className="pm-item">
                            <span className="pm-label">CAGR</span>
                            <span className="pm-value positive">+14.2%</span>
                        </div>
                        <div className="pm-item">
                            <span className="pm-label">Volatility</span>
                            <span className="pm-value">12.8%</span>
                        </div>
                        <div className="pm-item">
                            <span className="pm-label">Beta</span>
                            <span className="pm-value">0.92</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stocks Table */}
            <div className="stocks-section glass-card animate-fadeInUp">
                <div className="stocks-header">
                    <h2 className="section-title">Top Stocks — NSE</h2>
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
                                    <td>
                                        <span className="stock-symbol">{stock.symbol}</span>
                                    </td>
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
            <div className="risk-warning">
                <span>⚠️</span> This is an AI-powered advisory system. Predictions are based on historical data and sentiment analysis. Not financial advice. Invest at your own risk.
            </div>
        </div>
    );
};

export default Dashboard;
