import React, { useState, useEffect, useCallback } from 'react';
import { Doughnut, Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale, LinearScale, PointElement, LineElement,
    ArcElement, BarElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import api from '../utils/api';
import './Portfolio.css';

ChartJS.register(
    CategoryScale, LinearScale, PointElement, LineElement,
    ArcElement, BarElement, Title, Tooltip, Legend, Filler
);

/* ── HELPERS ──────────────────────────────── */
const fmt = (n) => n?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00';
const fmtInt = (n) => n?.toLocaleString('en-IN') || '0';

/* ── SKELETON ─────────────────────────────── */
const Skeleton = ({ h = '20px', w = '100%' }) => (
    <div className="skeleton" style={{ height: h, width: w, borderRadius: '8px' }} />
);

/* ── MAIN COMPONENT ───────────────────────── */
const Portfolio = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [perfFilter, setPerfFilter] = useState('1M');
    const [txPage, setTxPage] = useState(0);
    const TX_PER_PAGE = 8;

    const fetchAnalysis = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/trading/portfolio/analysis');
            setData(res.data.data);
        } catch (err) {
            console.error('Portfolio fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

    /* ── LOADING STATE ─────────────────────── */
    if (loading) {
        return (
            <div className="portfolio-page">
                <div className="pf-header"><Skeleton h="36px" w="300px" /><Skeleton h="20px" w="400px" /></div>
                <div className="summary-grid">{[1, 2, 3, 4, 5].map(i => <div key={i} className="glass-card"><Skeleton h="100px" /></div>)}</div>
                <div className="glass-card"><Skeleton h="350px" /></div>
            </div>
        );
    }

    if (!data) return <div className="portfolio-page"><p style={{ color: 'var(--text-muted)' }}>Failed to load portfolio data.</p></div>;

    const { summary, holdings, riskAnalysis, aiInsights, sectorBreakdown, rebalancing, stopLoss, drawdown, performanceHistory, transactions, simulationMode } = data;
    const hasHoldings = holdings && holdings.length > 0;

    /* ── CHART CONFIGS ─────────────────────── */

    // Allocation Pie
    const pieColors = [
        'rgba(108, 92, 231, 0.85)', 'rgba(0, 184, 148, 0.85)',
        'rgba(10, 189, 227, 0.85)', 'rgba(255, 217, 61, 0.85)',
        'rgba(255, 107, 107, 0.85)', 'rgba(162, 155, 254, 0.85)',
        'rgba(100, 116, 139, 0.6)',
    ];
    const allocationData = {
        labels: [...holdings.map(h => h.symbol), 'Cash'],
        datasets: [{
            data: [...holdings.map(h => h.totalValue), data.virtualBalance],
            backgroundColor: pieColors,
            borderColor: 'transparent',
            borderWidth: 0,
            hoverOffset: 8,
        }],
    };
    const pieOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right', labels: { color: '#94a3b8', padding: 14, usePointStyle: true, pointStyleWidth: 10, font: { size: 11 } } },
            tooltip: {
                backgroundColor: 'rgba(17,24,39,0.95)', borderColor: 'rgba(108,92,231,0.3)', borderWidth: 1,
                titleColor: '#f1f5f9', bodyColor: '#a29bfe', cornerRadius: 8,
                callbacks: { label: (ctx) => `${ctx.label}: ₹${fmtInt(ctx.raw)} (${((ctx.raw / (summary.currentValue + data.virtualBalance)) * 100).toFixed(1)}%)` },
            },
        },
        cutout: '62%',
    };

    // Performance Line
    const perfData = () => {
        const points = performanceHistory || [];
        let filtered = points;
        const now = new Date();
        if (perfFilter === '1D') filtered = points.filter(p => new Date(p.date) >= new Date(now - 86400000));
        else if (perfFilter === '1W') filtered = points.filter(p => new Date(p.date) >= new Date(now - 7 * 86400000));
        else if (perfFilter === '1M') filtered = points.filter(p => new Date(p.date) >= new Date(now - 30 * 86400000));
        if (filtered.length === 0) filtered = points;

        return {
            labels: filtered.map(p => new Date(p.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })),
            datasets: [{
                label: 'Portfolio Value',
                data: filtered.map(p => p.value),
                borderColor: '#6c5ce7', borderWidth: 2, tension: 0.4, pointRadius: 0, pointHoverRadius: 6,
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
    };
    const lineOpts = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor: 'rgba(17,24,39,0.95)', borderColor: 'rgba(108,92,231,0.3)', borderWidth: 1, titleColor: '#f1f5f9', bodyColor: '#a29bfe', cornerRadius: 8, displayColors: false, callbacks: { label: (ctx) => `₹${fmt(ctx.parsed.y)}` } },
        },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 } } },
            y: { grid: { color: 'rgba(255,255,255,0.03)', drawBorder: false }, ticks: { color: '#64748b', font: { size: 10 }, callback: (v) => `₹${fmtInt(v)}` } },
        },
        interaction: { intersect: false, mode: 'index' },
    };

    // Sector Bar
    const sectorBarData = {
        labels: sectorBreakdown.map(s => s.name),
        datasets: [{
            data: sectorBreakdown.map(s => s.percent),
            backgroundColor: sectorBreakdown.map((_, i) => pieColors[i % pieColors.length]),
            borderColor: 'transparent',
            borderWidth: 0,
            borderRadius: 6,
            barThickness: 28,
        }],
    };
    const barOpts = {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.x.toFixed(1)}%` } } },
        scales: {
            x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#64748b', callback: (v) => `${v}%` }, max: 100 },
            y: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 11 } } },
        },
    };

    /* ── PAGINATION ─────────────────────────── */
    const paginatedTx = (transactions || []).slice(txPage * TX_PER_PAGE, (txPage + 1) * TX_PER_PAGE);
    const totalPages = Math.ceil((transactions || []).length / TX_PER_PAGE);

    /* ── RENDER ─────────────────────────────── */
    return (
        <div className="portfolio-page">
            {/* Paper Trading Banner */}
            {simulationMode && (
                <div className="sim-banner animate-fadeInUp">
                    <span className="sim-icon">🎮</span>
                    <span>This is a <strong>Simulated Portfolio</strong> — No real money is involved. All trades are paper trades.</span>
                </div>
            )}

            {/* Header */}
            <div className="pf-header animate-fadeInUp">
                <h1 className="pf-title">💼 Portfolio <span className="text-gradient">Overview</span></h1>
                <p className="pf-subtitle">Comprehensive view of your investments, performance, and AI-powered insights</p>
            </div>

            {/* ── 1. PORTFOLIO SUMMARY ─────────── */}
            <div className="summary-grid animate-fadeInUp">
                <div className="summary-card glass-card">
                    <div className="sc-icon">💰</div>
                    <div className="sc-label">Total Investment</div>
                    <div className="sc-value">₹{fmt(summary.totalInvestment)}</div>
                </div>
                <div className="summary-card glass-card">
                    <div className="sc-icon">📈</div>
                    <div className="sc-label">Current Value</div>
                    <div className="sc-value">₹{fmt(summary.currentValue)}</div>
                </div>
                <div className="summary-card glass-card">
                    <div className="sc-icon">{summary.totalPL >= 0 ? '📊' : '📉'}</div>
                    <div className="sc-label">Total Profit / Loss</div>
                    <div className={`sc-value ${summary.totalPL >= 0 ? 'positive' : 'negative'}`}>
                        {summary.totalPL >= 0 ? '+' : ''}₹{fmt(summary.totalPL)}
                    </div>
                </div>
                <div className="summary-card glass-card">
                    <div className="sc-icon">📅</div>
                    <div className="sc-label">Today's Gain / Loss</div>
                    <div className={`sc-value ${summary.todaysGain >= 0 ? 'positive' : 'negative'}`}>
                        {summary.todaysGain >= 0 ? '+' : ''}₹{fmt(summary.todaysGain)}
                    </div>
                </div>
                <div className="summary-card glass-card">
                    <div className="sc-icon">📉</div>
                    <div className="sc-label">Portfolio Return</div>
                    <div className={`sc-value ${summary.returnPercent >= 0 ? 'positive' : 'negative'}`}>
                        {summary.returnPercent >= 0 ? '+' : ''}{summary.returnPercent?.toFixed(2)}%
                    </div>
                </div>
            </div>

            {/* ── 2. ASSET HOLDINGS TABLE ──────── */}
            <div className="glass-card section-card animate-fadeInUp">
                <h2 className="section-title">📋 Asset Holdings</h2>
                {hasHoldings ? (
                    <div className="table-wrap">
                        <table className="pf-table">
                            <thead>
                                <tr>
                                    <th>Stock Name</th>
                                    <th>Qty</th>
                                    <th>Avg Buy Price</th>
                                    <th>Current Price</th>
                                    <th>Total Value</th>
                                    <th>Profit / Loss</th>
                                    <th>% Return</th>
                                </tr>
                            </thead>
                            <tbody>
                                {holdings.map((h, i) => (
                                    <tr key={i} className="animate-fadeInUp" style={{ animationDelay: `${i * 0.05}s` }}>
                                        <td>
                                            <div className="stock-cell">
                                                <span className="stock-sym">{h.symbol}</span>
                                                <span className="stock-name">{h.companyName}</span>
                                            </div>
                                        </td>
                                        <td>{h.quantity}</td>
                                        <td>₹{fmt(h.avgBuyPrice)}</td>
                                        <td>₹{fmt(h.currentPrice)}</td>
                                        <td>₹{fmt(h.totalValue)}</td>
                                        <td className={h.profitLoss >= 0 ? 'positive' : 'negative'}>
                                            {h.profitLoss >= 0 ? '+' : ''}₹{fmt(h.profitLoss)}
                                        </td>
                                        <td className={h.returnPercent >= 0 ? 'positive' : 'negative'}>
                                            {h.returnPercent >= 0 ? '▲' : '▼'} {Math.abs(h.returnPercent).toFixed(2)}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state"><span className="empty-icon">📭</span><p>No holdings yet. Start trading to see your assets here.</p></div>
                )}
            </div>

            {/* ── CHARTS ROW ──────────────────── */}
            <div className="charts-grid">
                {/* 3. Allocation Pie */}
                <div className="glass-card section-card animate-fadeInUp">
                    <h2 className="section-title">🥧 Portfolio Allocation</h2>
                    {hasHoldings ? (
                        <div className="chart-box" style={{ height: '300px' }}>
                            <Doughnut data={allocationData} options={pieOpts} />
                        </div>
                    ) : (
                        <div className="empty-state"><span className="empty-icon">📊</span><p>Add stocks to see allocation</p></div>
                    )}
                </div>

                {/* 4. Performance Line */}
                <div className="glass-card section-card animate-fadeInUp">
                    <div className="chart-header">
                        <h2 className="section-title">📈 Performance Over Time</h2>
                        <div className="filter-pills">
                            {['1D', '1W', '1M', '1Y'].map(f => (
                                <button key={f} className={`pill ${perfFilter === f ? 'active' : ''}`} onClick={() => setPerfFilter(f)}>{f}</button>
                            ))}
                        </div>
                    </div>
                    {performanceHistory?.length > 1 ? (
                        <div className="chart-box" style={{ height: '280px' }}>
                            <Line data={perfData()} options={lineOpts} />
                        </div>
                    ) : (
                        <div className="empty-state"><span className="empty-icon">📉</span><p>Make trades to see performance</p></div>
                    )}
                </div>
            </div>

            {/* ── 5. RISK ANALYSIS ─────────────── */}
            <div className="glass-card section-card animate-fadeInUp">
                <h2 className="section-title">🛡️ AI Risk Analysis</h2>
                <div className="risk-grid">
                    <div className="risk-metric">
                        <div className={`risk-badge risk-${(riskAnalysis.riskCategory || 'medium').toLowerCase()}`}>{riskAnalysis.riskScore}</div>
                        <span className="rm-label">Risk Score</span>
                    </div>
                    <div className="risk-metric">
                        <div className="rm-value">{riskAnalysis.volatility}%</div>
                        <span className="rm-label">Volatility</span>
                    </div>
                    <div className="risk-metric">
                        <div className="rm-value">{riskAnalysis.sharpeRatio}</div>
                        <span className="rm-label">Sharpe Ratio</span>
                    </div>
                    <div className="risk-metric">
                        <div className="rm-value">
                            <div className="divers-bar">
                                <div className="divers-fill" style={{ width: `${riskAnalysis.diversificationScore}%` }}></div>
                            </div>
                            <span className="divers-num">{riskAnalysis.diversificationScore}/100</span>
                        </div>
                        <span className="rm-label">Diversification</span>
                    </div>
                </div>
            </div>

            {/* ── 6. AI INSIGHTS ────────────────── */}
            <div className="glass-card section-card animate-fadeInUp">
                <h2 className="section-title">🤖 AI Insights</h2>
                <div className="insights-list">
                    {aiInsights.map((insight, i) => (
                        <div key={i} className="insight-item animate-fadeInUp" style={{ animationDelay: `${i * 0.08}s` }}>
                            <span className="insight-text">{insight}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── SECTOR + ADVANCED ROW ─────────── */}
            <div className="charts-grid">
                {/* Sector Breakdown */}
                <div className="glass-card section-card animate-fadeInUp">
                    <h2 className="section-title">🏭 Sector Breakdown</h2>
                    {sectorBreakdown.length > 0 ? (
                        <div className="chart-box" style={{ height: `${Math.max(200, sectorBreakdown.length * 50)}px` }}>
                            <Bar data={sectorBarData} options={barOpts} />
                        </div>
                    ) : (
                        <div className="empty-state"><span className="empty-icon">🏗️</span><p>Add stocks to see sector analysis</p></div>
                    )}
                </div>

                {/* Drawdown Analysis */}
                <div className="glass-card section-card animate-fadeInUp">
                    <h2 className="section-title">📉 Drawdown Analysis</h2>
                    <div className="drawdown-grid">
                        <div className="dd-card">
                            <div className="dd-label">Max Drawdown</div>
                            <div className={`dd-value ${parseFloat(drawdown.maxDrawdown) > 10 ? 'negative' : ''}`}>
                                {drawdown.maxDrawdown}%
                            </div>
                            <div className="dd-bar"><div className="dd-fill negative" style={{ width: `${Math.min(100, drawdown.maxDrawdown)}%` }}></div></div>
                        </div>
                        <div className="dd-card">
                            <div className="dd-label">Current Drawdown</div>
                            <div className={`dd-value ${parseFloat(drawdown.currentDrawdown) > 5 ? 'negative' : ''}`}>
                                {drawdown.currentDrawdown}%
                            </div>
                            <div className="dd-bar"><div className="dd-fill" style={{ width: `${Math.min(100, Math.abs(drawdown.currentDrawdown))}%` }}></div></div>
                        </div>
                        <div className="dd-hint">
                            💡 Drawdown measures the peak-to-trough decline. Lower is better.
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ADVANCED: Rebalancing + Stop-Loss ── */}
            <div className="charts-grid">
                {/* Rebalancing */}
                <div className="glass-card section-card animate-fadeInUp">
                    <h2 className="section-title">⚖️ Rebalancing Suggestions</h2>
                    {rebalancing.length > 0 ? (
                        <div className="rebal-list">
                            {rebalancing.map((r, i) => (
                                <div key={i} className="rebal-item">
                                    <span className="rebal-symbol">{r.symbol}</span>
                                    <span className={`rebal-badge ${r.action.toLowerCase()}`}>{r.action}</span>
                                    <div className="rebal-bars">
                                        <div className="rebal-bar-row">
                                            <span className="rb-label">Current</span>
                                            <div className="rb-track"><div className="rb-fill current" style={{ width: `${r.currentAllocation}%` }}></div></div>
                                            <span className="rb-pct">{r.currentAllocation.toFixed(1)}%</span>
                                        </div>
                                        <div className="rebal-bar-row">
                                            <span className="rb-label">Ideal</span>
                                            <div className="rb-track"><div className="rb-fill ideal" style={{ width: `${r.idealAllocation}%` }}></div></div>
                                            <span className="rb-pct">{r.idealAllocation.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state"><span className="empty-icon">✅</span><p>Your portfolio is well balanced!</p></div>
                    )}
                </div>

                {/* Stop-Loss */}
                <div className="glass-card section-card animate-fadeInUp">
                    <h2 className="section-title">🛑 Stop-Loss Suggestions</h2>
                    {stopLoss.length > 0 ? (
                        <div className="sl-list">
                            {stopLoss.map((s, i) => (
                                <div key={i} className="sl-item">
                                    <div className="sl-header">
                                        <span className="sl-symbol">{s.symbol}</span>
                                        <span className="sl-price">₹{fmt(s.currentPrice)}</span>
                                    </div>
                                    <div className="sl-levels">
                                        <div className="sl-level">
                                            <span className="sl-type stop">Stop Loss (8%)</span>
                                            <span className="sl-val">₹{fmt(s.stopLossPrice)}</span>
                                        </div>
                                        <div className="sl-level">
                                            <span className="sl-type trail">Trailing (5%)</span>
                                            <span className="sl-val">₹{fmt(s.trailingStopPrice)}</span>
                                        </div>
                                    </div>
                                    <div className="sl-risk">
                                        Risk: ₹{fmt(s.riskAmount)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state"><span className="empty-icon">🛡️</span><p>Add holdings to see stop-loss levels</p></div>
                    )}
                </div>
            </div>

            {/* ── 7. TRANSACTION HISTORY ────────── */}
            <div className="glass-card section-card animate-fadeInUp">
                <h2 className="section-title">📜 Transaction History</h2>
                {transactions && transactions.length > 0 ? (
                    <>
                        <div className="table-wrap">
                            <table className="pf-table tx-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Stock</th>
                                        <th>Buy/Sell</th>
                                        <th>Quantity</th>
                                        <th>Price</th>
                                        <th>Total</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedTx.map((tx, i) => (
                                        <tr key={i}>
                                            <td className="tx-date">{new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                            <td><span className="stock-sym">{tx.stock}</span></td>
                                            <td><span className={`tx-badge ${tx.type.toLowerCase()}`}>{tx.type}</span></td>
                                            <td>{tx.quantity}</td>
                                            <td>₹{fmt(tx.price)}</td>
                                            <td>₹{fmt(tx.totalAmount)}</td>
                                            <td><span className="status-badge completed">{tx.status}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {totalPages > 1 && (
                            <div className="pagination">
                                <button className="page-btn" disabled={txPage === 0} onClick={() => setTxPage(p => p - 1)}>← Prev</button>
                                <span className="page-info">Page {txPage + 1} of {totalPages}</span>
                                <button className="page-btn" disabled={txPage >= totalPages - 1} onClick={() => setTxPage(p => p + 1)}>Next →</button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="empty-state"><span className="empty-icon">📋</span><p>No transactions yet</p></div>
                )}
            </div>

            {/* ESG / Future Scope Badge */}
            <div className="glass-card section-card future-scope animate-fadeInUp">
                <h2 className="section-title">🌱 Coming Soon</h2>
                <div className="future-grid">
                    <div className="future-item"><span className="fi-icon">🌍</span><span>ESG Score Integration</span></div>
                    <div className="future-item"><span className="fi-icon">🤖</span><span>Multi-Agent AI Strategy</span></div>
                    <div className="future-item"><span className="fi-icon">📊</span><span>Advanced Technical Indicators</span></div>
                    <div className="future-item"><span className="fi-icon">🔄</span><span>Auto Rebalancing Engine</span></div>
                </div>
            </div>
        </div>
    );
};

export default Portfolio;
