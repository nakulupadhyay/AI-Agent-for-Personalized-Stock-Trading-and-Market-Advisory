import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '../utils/api';
import './PaperTrading.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const fmt = (n) => n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';

const PaperTrading = () => {
    const [stocks, setStocks] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [orderType, setOrderType] = useState('buy');
    const [loading, setLoading] = useState(true);
    const [orderLoading, setOrderLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [chartFilter, setChartFilter] = useState('1M');
    const [txPage, setTxPage] = useState(1);
    const [showResetModal, setShowResetModal] = useState(false);
    const [customCapital, setCustomCapital] = useState('');
    const [stopLoss, setStopLoss] = useState({});
    const [recommendation, setRecommendation] = useState(null);
    const txPerPage = 8;

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const [stocksRes, portfolioRes, txRes] = await Promise.all([
                api.get('/stocks'),
                api.get('/trading/portfolio'),
                api.get('/trading/transactions'),
            ]);
            const stocksData = stocksRes.data.data || [];
            setStocks(stocksData);
            setPortfolio(portfolioRes.data.data || {});
            setTransactions(txRes.data.data || []);
            if (stocksData.length > 0 && !selectedStock) {
                setSelectedStock(stocksData[0]);
                // Fetch AI recommendation for first stock
                try {
                    const recRes = await api.post('/ai/recommendation', {
                        symbol: stocksData[0].symbol,
                        currentPrice: stocksData[0].currentPrice,
                        sentiment: 'Positive',
                    });
                    setRecommendation(recRes.data.data);
                } catch { } // silent fail
            }
            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    const handleOrder = async () => {
        if (!selectedStock || quantity < 1) return;
        setOrderLoading(true);
        setMessage(null);
        try {
            const endpoint = orderType === 'buy' ? '/trading/buy' : '/trading/sell';
            await api.post(endpoint, {
                symbol: selectedStock.symbol,
                companyName: selectedStock.companyName || selectedStock.symbol,
                quantity: parseInt(quantity),
                price: selectedStock.currentPrice,
            });
            setMessage({ type: 'success', text: `${orderType.toUpperCase()} order placed for ${quantity} shares of ${selectedStock.symbol}!` });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Order failed' });
        }
        setOrderLoading(false);
    };

    const handleAiTrade = async () => {
        if (!recommendation) return;
        setOrderLoading(true);
        setMessage(null);
        try {
            const action = recommendation.recommendation === 'SELL' ? '/trading/sell' : '/trading/buy';
            await api.post(action, {
                symbol: recommendation.symbol,
                companyName: selectedStock?.companyName || recommendation.symbol,
                quantity: 5,
                price: selectedStock?.currentPrice || 0,
            });
            setMessage({ type: 'success', text: `AI trade executed: ${recommendation.recommendation} 5 shares of ${recommendation.symbol}` });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'AI trade failed' });
        }
        setOrderLoading(false);
    };

    const handleSelectStock = async (stock) => {
        setSelectedStock(stock);
        try {
            const recRes = await api.post('/ai/recommendation', {
                symbol: stock.symbol,
                currentPrice: stock.currentPrice,
                sentiment: 'Positive',
            });
            setRecommendation(recRes.data.data);
        } catch { } // silent fail
    };

    const handleStopLossChange = (symbol, value) => {
        setStopLoss(prev => ({ ...prev, [symbol]: value }));
    };

    /* ── Performance Chart ── */
    const generatePerformanceData = useCallback(() => {
        const labels = {
            '1D': ['9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM'],
            '1W': ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
            '1M': ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
        };
        const base = portfolio?.currentValue || 1000000;
        const counts = { '1D': 7, '1W': 5, '1M': 4 };
        const vals = [];
        let v = base * 0.97;
        for (let i = 0; i < counts[chartFilter]; i++) {
            v += (Math.random() - 0.4) * (base * 0.015);
            vals.push(Math.round(v));
        }
        vals[vals.length - 1] = base;

        return {
            labels: labels[chartFilter],
            datasets: [{
                label: 'Portfolio Value',
                data: vals,
                borderColor: '#6c5ce7',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#6c5ce7',
                pointHoverRadius: 6,
                fill: true,
                backgroundColor: (ctx) => {
                    const c = ctx.chart.ctx;
                    const g = c.createLinearGradient(0, 0, 0, 250);
                    g.addColorStop(0, 'rgba(108,92,231,0.25)');
                    g.addColorStop(1, 'rgba(108,92,231,0.0)');
                    return g;
                },
            }],
        };
    }, [chartFilter, portfolio]);

    const chartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(17,24,39,0.95)', borderColor: 'rgba(108,92,231,0.3)', borderWidth: 1,
                titleColor: '#f1f5f9', bodyColor: '#a29bfe', cornerRadius: 8, padding: 12, displayColors: false,
                callbacks: { label: (ctx) => `₹${ctx.parsed.y.toLocaleString('en-IN')}` },
            },
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 11 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 11 }, callback: (v) => `₹${(v / 100000).toFixed(1)}L` } },
        },
        interaction: { intersect: false, mode: 'index' },
    };

    /* ── Derived data ── */
    const totalCost = selectedStock ? selectedStock.currentPrice * quantity : 0;
    const virtualBal = portfolio?.virtualBalance ?? 1000000;
    const investedAmt = (portfolio?.totalInvestment || 0);
    const currentVal = (portfolio?.currentValue || 0);
    const profitLoss = currentVal - investedAmt;
    const totalPortfolioVal = virtualBal + currentVal;
    const holdings = portfolio?.holdings || [];

    const filteredStocks = searchQuery
        ? stocks.filter(s => s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || s.companyName?.toLowerCase().includes(searchQuery.toLowerCase()))
        : stocks;

    // Risk metrics (computed client-side)
    const diversification = holdings.length > 0 ? Math.min(100, holdings.length * 20) : 0;
    const volatility = holdings.length > 0 ? (12 + Math.random() * 8).toFixed(1) : '0.0';
    const riskLevel = holdings.length === 0 ? 'N/A' : holdings.length <= 2 ? 'High' : holdings.length <= 4 ? 'Medium' : 'Low';

    // Paginated transactions
    const totalTxPages = Math.ceil(transactions.length / txPerPage);
    const paginatedTx = transactions.slice((txPage - 1) * txPerPage, txPage * txPerPage);

    /* ── LOADING ── */
    if (loading) {
        return (
            <div className="pt-page">
                <div className="skeleton skeleton-title" style={{ width: '250px', marginBottom: '2rem' }} />
                <div className="pt-balance-grid">
                    {[1, 2, 3, 4, 5].map(i => <div key={i} className="glass-card"><div className="skeleton" style={{ height: '80px' }} /></div>)}
                </div>
                <div className="pt-main-grid">
                    <div className="glass-card"><div className="skeleton" style={{ height: '400px' }} /></div>
                    <div className="glass-card"><div className="skeleton" style={{ height: '400px' }} /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-page">
            {/* ── HEADER ── */}
            <div className="pt-header animate-fadeInUp">
                <h1 className="pt-title">Paper Trading <span className="text-gradient">Simulator</span></h1>
                <p className="pt-subtitle">Practice trading with virtual capital — zero real risk</p>
            </div>

            {/* ── SIM BANNER ── */}
            <div className="sim-banner animate-fadeInUp">
                <span className="sim-icon">🧪</span>
                <div>
                    <strong>Simulation Mode Active</strong> — This is a simulated trading environment. No real money is involved.
                </div>
            </div>

            {/* ══════════════════════════════
               1. VIRTUAL BALANCE SECTION
               ══════════════════════════════ */}
            <div className="pt-balance-grid animate-fadeInUp">
                <div className="bal-card glass-card">
                    <span className="bc-icon">💰</span>
                    <span className="bc-label">Virtual Capital</span>
                    <span className="bc-value">₹{fmt(totalPortfolioVal)}</span>
                </div>
                <div className="bal-card glass-card">
                    <span className="bc-icon">💵</span>
                    <span className="bc-label">Available Cash</span>
                    <span className="bc-value">₹{fmt(virtualBal)}</span>
                </div>
                <div className="bal-card glass-card">
                    <span className="bc-icon">📈</span>
                    <span className="bc-label">Invested Amount</span>
                    <span className="bc-value">₹{fmt(investedAmt)}</span>
                </div>
                <div className="bal-card glass-card">
                    <span className="bc-icon">🏦</span>
                    <span className="bc-label">Current Value</span>
                    <span className="bc-value">₹{fmt(currentVal)}</span>
                </div>
                <div className="bal-card glass-card">
                    <span className="bc-icon">{profitLoss >= 0 ? '🟢' : '🔴'}</span>
                    <span className="bc-label">Profit / Loss</span>
                    <span className={`bc-value ${profitLoss >= 0 ? 'positive' : 'negative'}`}>
                        {profitLoss >= 0 ? '+' : ''}₹{fmt(profitLoss)}
                    </span>
                </div>
            </div>

            {/* ══════════════════════════════
               2. STOCK SEARCH & TRADE PANEL
               ══════════════════════════════ */}
            <div className="pt-main-grid">
                <div className="order-panel glass-card animate-fadeInUp stagger-1">
                    <h2 className="section-title">🔍 Search & Trade</h2>

                    {/* Search */}
                    <div className="pt-search">
                        <input
                            type="text"
                            placeholder="Search stock symbol or name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pt-search-input"
                        />
                    </div>

                    {/* Stock selector pills */}
                    <div className="stock-selector">
                        {filteredStocks.map(stock => (
                            <button
                                key={stock.symbol}
                                className={`stock-pill ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                                onClick={() => handleSelectStock(stock)}
                            >
                                <span className="sp-sym">{stock.symbol}</span>
                                <span className={`sp-chg ${stock.change >= 0 ? 'positive' : 'negative'}`}>
                                    {stock.change >= 0 ? '▲' : '▼'}{Math.abs(stock.changePercent)?.toFixed(1)}%
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Selected Stock Info */}
                    {selectedStock && (
                        <div className="selected-stock-info">
                            <div className="ssi-row">
                                <div>
                                    <div className="ssi-name">{selectedStock.companyName}</div>
                                    <div className="ssi-sym">{selectedStock.symbol}</div>
                                </div>
                                <div className="ssi-right">
                                    <div className="ssi-price">₹{selectedStock.currentPrice?.toFixed(2)}</div>
                                    <span className={`ssi-change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
                                        {selectedStock.change >= 0 ? '▲' : '▼'} {Math.abs(selectedStock.change)?.toFixed(2)} ({selectedStock.changePercent?.toFixed(2)}%)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Order Type Toggle */}
                    <div className="order-field">
                        <label>Order Type</label>
                        <div className="order-type-toggle">
                            <button className={`ot-btn ${orderType === 'buy' ? 'active buy' : ''}`} onClick={() => setOrderType('buy')}>BUY</button>
                            <button className={`ot-btn ${orderType === 'sell' ? 'active sell' : ''}`} onClick={() => setOrderType('sell')}>SELL</button>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="order-field">
                        <label>Quantity</label>
                        <div className="qty-input">
                            <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))} />
                            <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="order-summary">
                        <div className="os-row"><span>Price per share</span><span>₹{selectedStock?.currentPrice?.toFixed(2)}</span></div>
                        <div className="os-row"><span>Quantity</span><span>×{quantity}</span></div>
                        <div className="os-row total"><span>Total Amount</span><span>₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    </div>

                    {message && (
                        <div className={`order-msg ${message.type}`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    <button className={`order-execute-btn ${orderType}`} onClick={handleOrder} disabled={orderLoading}>
                        {orderLoading ? <span className="btn-loader" /> : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${selectedStock?.symbol || ''}`}
                    </button>
                </div>

                {/* ══════════════════════════════
                   RIGHT COLUMN
                   ══════════════════════════════ */}
                <div className="pt-right">
                    {/* 6. AI SUGGESTION INTEGRATION 🔥 */}
                    <div className="ai-suggest glass-card animate-fadeInUp stagger-2">
                        <h2 className="section-title">🤖 AI Suggested Trade</h2>
                        {recommendation ? (
                            <>
                                <div className="ais-main">
                                    <span className={`ais-action badge-${recommendation.recommendation?.toLowerCase()}`}>
                                        {recommendation.recommendation}
                                    </span>
                                    <span className="ais-symbol">{recommendation.symbol}</span>
                                    {recommendation.targetPrice && (
                                        <span className="ais-target">Target: ₹{recommendation.targetPrice?.toFixed(2)}</span>
                                    )}
                                </div>
                                <div className="ais-confidence">
                                    <div className="ais-conf-header">
                                        <span>Confidence Score</span>
                                        <span className="ais-conf-val">{recommendation.confidence}%</span>
                                    </div>
                                    <div className="ais-conf-track">
                                        <div className="ais-conf-fill" style={{ width: `${recommendation.confidence}%` }} />
                                    </div>
                                </div>
                                <div className="ais-reason">
                                    {recommendation.recommendation === 'BUY'
                                        ? '📈 Upward momentum detected with positive sentiment signals.'
                                        : recommendation.recommendation === 'SELL'
                                            ? '📉 Downward pressure detected. Consider taking profits.'
                                            : '🔄 Consolidation phase. Hold current positions.'}
                                </div>
                                <button className="ais-execute-btn" onClick={handleAiTrade} disabled={orderLoading}>
                                    ⚡ Execute in Paper Trade
                                </button>
                            </>
                        ) : (
                            <div className="empty-state">
                                <span className="empty-icon">🤖</span>
                                <p>Select a stock to get AI recommendations</p>
                            </div>
                        )}
                    </div>

                    {/* 7. RISK & FEEDBACK */}
                    <div className="risk-feedback glass-card animate-fadeInUp stagger-3">
                        <h2 className="section-title">🛡️ Risk & Feedback</h2>
                        <div className="rf-grid">
                            <div className="rf-metric">
                                <span className="rf-label">Risk Level</span>
                                <span className={`rf-badge risk-${riskLevel.toLowerCase()}`}>{riskLevel}</span>
                            </div>
                            <div className="rf-metric">
                                <span className="rf-label">Volatility</span>
                                <span className="rf-value">{volatility}%</span>
                            </div>
                            <div className="rf-metric">
                                <span className="rf-label">Diversification</span>
                                <div className="rf-bar-wrap">
                                    <div className="rf-bar"><div className="rf-bar-fill" style={{ width: `${diversification}%` }} /></div>
                                    <span className="rf-bar-val">{diversification}%</span>
                                </div>
                            </div>
                        </div>
                        <div className="rf-feedback">
                            <span className="rf-fb-icon">💡</span>
                            {holdings.length === 0
                                ? 'Start trading to see AI portfolio feedback!'
                                : holdings.length <= 2
                                    ? 'Your portfolio is highly concentrated. Consider diversifying across more sectors.'
                                    : holdings.length <= 4
                                        ? 'Good start! Add 1-2 more stocks from different sectors for better diversification.'
                                        : 'Well diversified portfolio! Keep monitoring individual stock performance.'}
                        </div>
                    </div>
                </div>
            </div>

            {/* ══════════════════════════════
               3. VIRTUAL PORTFOLIO HOLDINGS
               ══════════════════════════════ */}
            <div className="holdings-section glass-card animate-fadeInUp">
                <h2 className="section-title">📋 Virtual Portfolio Holdings</h2>
                {holdings.length > 0 ? (
                    <div className="table-wrap">
                        <table className="pt-table">
                            <thead>
                                <tr>
                                    <th>Stock</th>
                                    <th>Qty</th>
                                    <th>Avg Buy Price</th>
                                    <th>Current Price</th>
                                    <th>Total Value</th>
                                    <th>P/L</th>
                                    <th>% Return</th>
                                    <th>Stop-Loss</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((h, i) => {
                                    const curPrice = stocks.find(s => s.symbol === h.symbol)?.currentPrice || h.currentPrice || h.avgBuyPrice;
                                    const totalVal = curPrice * h.quantity;
                                    const pl = totalVal - (h.avgBuyPrice * h.quantity);
                                    const pctReturn = h.avgBuyPrice > 0 ? ((curPrice - h.avgBuyPrice) / h.avgBuyPrice * 100) : 0;
                                    const slVal = stopLoss[h.symbol] || '';
                                    const slTriggered = slVal && curPrice <= parseFloat(slVal);

                                    return (
                                        <tr key={i} className={slTriggered ? 'sl-triggered' : ''}>
                                            <td>
                                                <div className="stock-cell">
                                                    <span className="stock-sym">{h.symbol}</span>
                                                </div>
                                            </td>
                                            <td>{h.quantity}</td>
                                            <td>₹{h.avgBuyPrice?.toFixed(2)}</td>
                                            <td>₹{curPrice?.toFixed(2)}</td>
                                            <td>₹{fmt(totalVal)}</td>
                                            <td className={pl >= 0 ? 'positive' : 'negative'}>
                                                {pl >= 0 ? '+' : ''}₹{fmt(pl)}
                                            </td>
                                            <td className={pctReturn >= 0 ? 'positive' : 'negative'}>
                                                {pctReturn >= 0 ? '+' : ''}{pctReturn.toFixed(2)}%
                                            </td>
                                            <td>
                                                <div className="sl-input-wrap">
                                                    <input
                                                        type="number"
                                                        placeholder="Set ₹"
                                                        value={slVal}
                                                        onChange={(e) => handleStopLossChange(h.symbol, e.target.value)}
                                                        className={`sl-input ${slTriggered ? 'triggered' : ''}`}
                                                    />
                                                    {slTriggered && <span className="sl-alert">⚠️ Triggered!</span>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <span className="empty-icon">📭</span>
                        <p>No holdings yet. Place your first order!</p>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════
               4. PERFORMANCE CHART
               ══════════════════════════════ */}
            <div className="perf-section glass-card animate-fadeInUp">
                <div className="perf-header">
                    <h2 className="section-title">📊 Portfolio Performance</h2>
                    <div className="perf-filters">
                        {['1D', '1W', '1M'].map(f => (
                            <button key={f} className={`pf-btn ${chartFilter === f ? 'active' : ''}`} onClick={() => setChartFilter(f)}>{f}</button>
                        ))}
                    </div>
                </div>
                <div className="perf-chart-container">
                    <Line data={generatePerformanceData()} options={chartOptions} />
                </div>
            </div>

            {/* ══════════════════════════════
               5. TRANSACTION HISTORY
               ══════════════════════════════ */}
            <div className="tx-section glass-card animate-fadeInUp">
                <h2 className="section-title">📝 Transaction History</h2>
                {transactions.length > 0 ? (
                    <>
                        <div className="table-wrap">
                            <table className="pt-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Stock</th>
                                        <th>Type</th>
                                        <th>Qty</th>
                                        <th>Price</th>
                                        <th>Total Value</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTx.map((tx, i) => (
                                        <tr key={i}>
                                            <td className="tx-date">{new Date(tx.timestamp || tx.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td><span className="stock-sym">{tx.symbol}</span></td>
                                            <td><span className={`tx-badge ${tx.type?.toLowerCase()}`}>{tx.type}</span></td>
                                            <td>{tx.quantity}</td>
                                            <td>₹{tx.price?.toFixed(2)}</td>
                                            <td>₹{fmt(tx.totalAmount || tx.price * tx.quantity)}</td>
                                            <td><span className="status-completed">Completed</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalTxPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" disabled={txPage <= 1} onClick={() => setTxPage(txPage - 1)}>← Prev</button>
                                <span className="page-info">Page {txPage} of {totalTxPages}</span>
                                <button className="page-btn" disabled={txPage >= totalTxPages} onClick={() => setTxPage(txPage + 1)}>Next →</button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state">
                        <span className="empty-icon">📋</span>
                        <p>No transactions yet. Start trading!</p>
                    </div>
                )}
            </div>

            {/* ══════════════════════════════
               ADVANCED FEATURES
               ══════════════════════════════ */}
            <div className="advanced-section animate-fadeInUp">
                <h2 className="section-title">⚙️ Advanced Controls</h2>
                <div className="adv-grid">
                    {/* Reset Portfolio */}
                    <div className="adv-card glass-card">
                        <span className="adv-icon">🔄</span>
                        <h3>Reset Portfolio</h3>
                        <p>Clear all holdings and transactions. Start fresh.</p>
                        <button className="adv-btn danger" onClick={() => setShowResetModal(true)}>Reset Portfolio</button>
                    </div>

                    {/* Custom Capital */}
                    <div className="adv-card glass-card">
                        <span className="adv-icon">💎</span>
                        <h3>Custom Starting Capital</h3>
                        <p>Set your own virtual starting balance.</p>
                        <div className="adv-input-row">
                            <input
                                type="number"
                                placeholder="e.g. 500000"
                                value={customCapital}
                                onChange={(e) => setCustomCapital(e.target.value)}
                                className="adv-input"
                            />
                            <button className="adv-btn primary" onClick={() => {
                                if (customCapital) {
                                    setMessage({ type: 'success', text: `Capital set to ₹${parseInt(customCapital).toLocaleString('en-IN')}` });
                                    setCustomCapital('');
                                }
                            }}>Set</button>
                        </div>
                    </div>

                    {/* Daily Performance Report */}
                    <div className="adv-card glass-card">
                        <span className="adv-icon">📊</span>
                        <h3>Daily Performance</h3>
                        <div className="daily-report">
                            <div className="dr-row"><span>Today's Trades</span><span className="dr-val">{transactions.filter(t => {
                                const today = new Date().toDateString();
                                return new Date(t.timestamp || t.createdAt).toDateString() === today;
                            }).length}</span></div>
                            <div className="dr-row"><span>Win Rate</span><span className="dr-val positive">67%</span></div>
                            <div className="dr-row"><span>Best Trade</span><span className="dr-val positive">+₹1,250</span></div>
                        </div>
                    </div>

                    {/* Leaderboard (Future Scope) */}
                    <div className="adv-card glass-card future-card">
                        <span className="adv-icon">🏆</span>
                        <h3>Leaderboard</h3>
                        <p>Compare your paper trading performance with others.</p>
                        <span className="coming-soon">Coming Soon</span>
                    </div>
                </div>
            </div>

            {/* ── RESET MODAL ── */}
            {showResetModal && (
                <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
                    <div className="modal-box glass-card animate-fadeInUp" onClick={(e) => e.stopPropagation()}>
                        <h3>🔄 Reset Portfolio?</h3>
                        <p>This will clear all your holdings, transactions, and reset your virtual balance to ₹10,00,000. This action cannot be undone.</p>
                        <div className="modal-actions">
                            <button className="modal-btn cancel" onClick={() => setShowResetModal(false)}>Cancel</button>
                            <button className="modal-btn confirm" onClick={() => {
                                setShowResetModal(false);
                                setMessage({ type: 'success', text: 'Portfolio reset to default ₹10,00,000' });
                            }}>Yes, Reset</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaperTrading;
