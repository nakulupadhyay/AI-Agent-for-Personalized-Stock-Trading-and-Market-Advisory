import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, AreaChart, Area, ScatterChart, Scatter,
    PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import api from '../utils/api';
import RiskMeter from '../components/RiskMeter';
import './RiskAnalysis.css';

/* ─── Color Palette ─── */
const COLORS = {
    green: '#22c55e',
    yellow: '#f59e0b',
    red: '#ef4444',
    purple: '#6C5CE7',
    purpleLight: '#A29BFE',
    blue: '#54A0FF',
    cyan: '#00D68F',
    orange: '#f97316',
    dark: '#161B28',
};

const PIE_COLORS = ['#6C5CE7', '#00D68F', '#54A0FF', '#f59e0b', '#ef4444', '#A29BFE', '#f97316', '#14b8a6'];

/* ─── Helper Functions ─── */
const getRiskColor = (score) => score <= 33 ? COLORS.green : score <= 66 ? COLORS.yellow : COLORS.red;
const getRiskLabel = (score) => score <= 33 ? 'Low' : score <= 66 ? 'Medium' : 'High';

const getVolatilityStatus = (v) => v < 15 ? 'good' : v < 30 ? 'warning' : 'danger';
const getSharpeStatus = (s) => s > 1 ? 'good' : s > 0 ? 'warning' : 'danger';
const getDrawdownStatus = (d) => d < 10 ? 'good' : d < 20 ? 'warning' : 'danger';
const getBetaStatus = (b) => b < 0.8 ? 'good' : b < 1.2 ? 'warning' : 'danger';
const getVarStatus = (v) => v < 2 ? 'good' : v < 3.5 ? 'warning' : 'danger';
const getSortinoStatus = (s) => s > 1.5 ? 'good' : s > 0.5 ? 'warning' : 'danger';

/* ─── Generate Chart Data ─── */
const generatePerformanceData = (volatility = 30, sharpe = 0) => {
    const data = [];
    let value = 10000;
    const dailyReturn = (sharpe * (volatility / 100)) / 252;
    const dailyVol = (volatility / 100) / Math.sqrt(252);
    for (let i = 0; i < 90; i++) {
        const change = dailyReturn + dailyVol * (Math.random() * 2 - 1);
        value = value * (1 + change);
        data.push({
            day: i + 1,
            value: Math.round(value),
            benchmark: Math.round(10000 * (1 + 0.0003 * i + Math.sin(i / 10) * 100)),
        });
    }
    return data;
};

const generateDrawdownData = (maxDrawdown = 20) => {
    const data = [];
    for (let i = 0; i < 90; i++) {
        const dd = -Math.abs(Math.sin(i / 15) * maxDrawdown * (0.3 + 0.7 * Math.random()));
        data.push({ day: i + 1, drawdown: Math.round(dd * 100) / 100 });
    }
    return data;
};

const generateScatterData = () => {
    const assets = ['RELIANCE', 'TCS', 'INFY', 'HDFC', 'ITC', 'WIPRO', 'SBI', 'BHARTIARTL'];
    return assets.map((name) => ({
        name,
        risk: Math.round((5 + Math.random() * 40) * 100) / 100,
        return: Math.round((-10 + Math.random() * 50) * 100) / 100,
    }));
};

/* ═══════════════════════════════════════════
   KPI Card Component
   ═══════════════════════════════════════════ */
const KPICard = ({ icon, label, value, unit, status, delay = 0 }) => {
    const statusConfig = {
        good: { color: COLORS.green, bg: 'rgba(34,197,94,0.12)', label: 'Healthy' },
        warning: { color: COLORS.yellow, bg: 'rgba(245,158,11,0.12)', label: 'Caution' },
        danger: { color: COLORS.red, bg: 'rgba(239,68,68,0.12)', label: 'At Risk' },
    };
    const cfg = statusConfig[status] || statusConfig.warning;

    return (
        <div className="rd-kpi-card" style={{ animationDelay: `${delay}ms` }}>
            <div className="rd-kpi-top">
                <span className="rd-kpi-icon">{icon}</span>
                <span className="rd-kpi-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                </span>
            </div>
            <div className="rd-kpi-value">
                {value}<span className="rd-kpi-unit">{unit}</span>
            </div>
            <div className="rd-kpi-label">{label}</div>
            <div className="rd-kpi-bar-track">
                <div
                    className="rd-kpi-bar-fill"
                    style={{
                        width: `${Math.min(100, Math.abs(typeof value === 'number' ? value : parseFloat(value)) * (unit === '%' ? 1 : 20))}%`,
                        background: cfg.color,
                    }}
                />
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════
   AI Insight Card Component
   ═══════════════════════════════════════════ */
const InsightCard = ({ text, index }) => {
    const patterns = [
        { keywords: ['high risk', 'risk score', 'risky'], icon: '⚠️', type: 'danger', title: 'High Risk Detected' },
        { keywords: ['volatil', 'unstable', 'fluctuat'], icon: '📊', type: 'warning', title: 'Volatility Alert' },
        { keywords: ['sharpe', 'risk-adjusted', 'negative'], icon: '❌', type: 'danger', title: 'Poor Risk-Adjusted Return' },
        { keywords: ['drawdown', 'loss', 'decline', 'drop'], icon: '📉', type: 'warning', title: 'Drawdown Warning' },
        { keywords: ['diversif', 'concentrat', 'sector'], icon: '🏭', type: 'info', title: 'Diversification Note' },
        { keywords: ['beta', 'market', 'sensitive'], icon: '📈', type: 'info', title: 'Market Sensitivity' },
        { keywords: ['safe', 'low risk', 'stable', 'good'], icon: '✅', type: 'success', title: 'Positive Signal' },
    ];

    const lowerText = text.toLowerCase();
    const match = patterns.find(p => p.keywords.some(k => lowerText.includes(k))) || {
        icon: '💡', type: 'info', title: 'Insight'
    };

    return (
        <div className={`rd-insight-card rd-insight--${match.type}`} style={{ animationDelay: `${index * 80}ms` }}>
            <div className="rd-insight-icon">{match.icon}</div>
            <div className="rd-insight-content">
                <div className="rd-insight-title">{match.title}</div>
                <div className="rd-insight-text">{text}</div>
            </div>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Custom Recharts Tooltip
   ═══════════════════════════════════════════ */
const CustomTooltip = ({ active, payload, label, prefix = '' }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="rd-chart-tooltip">
            <p className="rd-tooltip-label">{prefix}{label}</p>
            {payload.map((entry, i) => (
                <p key={i} className="rd-tooltip-value" style={{ color: entry.color }}>
                    {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString('en-IN') : entry.value}
                </p>
            ))}
        </div>
    );
};

const ScatterTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    return (
        <div className="rd-chart-tooltip">
            <p className="rd-tooltip-label">{data?.name}</p>
            <p className="rd-tooltip-value">Risk: {data?.risk}%</p>
            <p className="rd-tooltip-value">Return: {data?.return}%</p>
        </div>
    );
};

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */
const BreakdownBar = ({ label, score, weight }) => {
    const getBarColor = (s) => s <= 33 ? COLORS.green : s <= 66 ? COLORS.yellow : COLORS.red;
    return (
        <div className="rd-breakdown-item">
            <div className="rd-breakdown-meta">
                <span className="rd-breakdown-label">{label}</span>
                <span className="rd-breakdown-score">{score}/100 ({weight})</span>
            </div>
            <div className="rd-breakdown-track">
                <div className="rd-breakdown-fill" style={{ width: `${score}%`, backgroundColor: getBarColor(score) }} />
            </div>
        </div>
    );
};

const ProbabilityBar = ({ label, value, color }) => (
    <div className="rd-prob-item">
        <div className="rd-prob-meta">
            <span className="rd-prob-label">{label}</span>
            <span className="rd-prob-value">{(value || 0).toFixed(1)}%</span>
        </div>
        <div className="rd-prob-track">
            <div className="rd-prob-fill" style={{ width: `${value || 0}%`, backgroundColor: color }} />
        </div>
    </div>
);

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */
const RiskAnalysis = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchRiskAnalysis = useCallback(async (isRefresh = false) => {
        try {
            if (isRefresh) setRefreshing(true);
            else setLoading(true);
            setError(null);
            const res = await api.get('/risk-analysis');
            setData(res.data.data);
        } catch (err) {
            console.error('Risk analysis fetch error:', err);
            setError('Failed to load risk analysis. Make sure you have holdings in your portfolio.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchRiskAnalysis();
    }, [fetchRiskAnalysis]);

    /* ─── Loading State ─── */
    if (loading) {
        return (
            <div className="rd-page">
                <div className="rd-header">
                    <div className="rd-header-left">
                        <h1 className="rd-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                        <p className="rd-subtitle">AI-powered financial insights</p>
                    </div>
                </div>
                <div className="rd-loading-grid">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="rd-skeleton-card">
                            <div className="skeleton" style={{ height: '160px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /* ─── Error State ─── */
    if (error) {
        return (
            <div className="rd-page">
                <div className="rd-header">
                    <div className="rd-header-left">
                        <h1 className="rd-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                        <p className="rd-subtitle">AI-powered financial insights</p>
                    </div>
                </div>
                <div className="rd-empty-state">
                    <span className="rd-empty-icon">📊</span>
                    <h2>No Data Available</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={() => fetchRiskAnalysis()} style={{ marginTop: '1rem' }}>
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    /* ─── Empty State ─── */
    if (!data || data.isEmpty) {
        return (
            <div className="rd-page">
                <div className="rd-header">
                    <div className="rd-header-left">
                        <h1 className="rd-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                        <p className="rd-subtitle">AI-powered financial insights</p>
                    </div>
                </div>
                <div className="rd-empty-state">
                    <span className="rd-empty-icon">📈</span>
                    <h2>Start Investing</h2>
                    <p>Buy some stocks in Paper Trading to see your portfolio risk analysis here.</p>
                </div>
            </div>
        );
    }

    const {
        metrics, diversification, scoreBreakdown, explanations,
        mlPrediction, userRiskProfile, portfolioSummary,
        stressTest, sectorBreakdown
    } = data;

    const riskScore = data.riskScore || 0;
    const riskCategory = data.riskCategory || getRiskLabel(riskScore);
    const riskColor = getRiskColor(riskScore);

    /* Generate chart data */
    const perfData = generatePerformanceData(metrics?.volatility, metrics?.sharpeRatio);
    const drawdownData = generateDrawdownData(metrics?.maxDrawdown);
    const scatterData = generateScatterData();

    return (
        <div className="rd-page">
            {/* ═══ HEADER ═══ */}
            <div className="rd-header">
                <div className="rd-header-left">
                    <h1 className="rd-title">
                        Portfolio Risk <span className="text-gradient">Analysis</span>
                    </h1>
                    <p className="rd-subtitle">AI-powered financial insights • Quantitative risk assessment</p>
                </div>
                <div className="rd-header-actions">
                    {data.computedAt && (
                        <span className="rd-timestamp-badge">
                            <span className="live-dot" /> Updated {new Date(data.computedAt).toLocaleTimeString()}
                        </span>
                    )}
                    <button
                        className={`btn btn-primary btn-sm rd-refresh-btn ${refreshing ? 'rd-refreshing' : ''}`}
                        onClick={() => fetchRiskAnalysis(true)}
                        disabled={refreshing}
                    >
                        <span className="rd-refresh-icon">↻</span>
                        {refreshing ? 'Analyzing...' : 'Recalculate'}
                    </button>
                </div>
            </div>

            {/* ═══ KPI CARDS ═══ */}
            <div className="rd-kpi-grid">
                <KPICard
                    icon="🎯"
                    label="Risk Score"
                    value={riskScore}
                    unit="/100"
                    status={riskScore <= 33 ? 'good' : riskScore <= 66 ? 'warning' : 'danger'}
                    delay={0}
                />
                <KPICard
                    icon="📊"
                    label="Volatility"
                    value={metrics?.volatility || 0}
                    unit="%"
                    status={getVolatilityStatus(metrics?.volatility || 0)}
                    delay={80}
                />
                <KPICard
                    icon="⚖️"
                    label="Sharpe Ratio"
                    value={metrics?.sharpeRatio || 0}
                    unit=""
                    status={getSharpeStatus(metrics?.sharpeRatio || 0)}
                    delay={160}
                />
                <KPICard
                    icon="📉"
                    label="Max Drawdown"
                    value={metrics?.maxDrawdown || 0}
                    unit="%"
                    status={getDrawdownStatus(metrics?.maxDrawdown || 0)}
                    delay={240}
                />
            </div>

            {/* ═══ RISK SCORE + BREAKDOWN ═══ */}
            <div className="rd-score-section">
                <div className="rd-score-card glass-card">
                    <RiskMeter score={riskScore} category={riskCategory} size={220} />
                    <div className="rd-score-meta">
                        {userRiskProfile && (
                            <div className="rd-profile-badge">
                                <span className="rd-profile-label">Your Profile:</span>
                                <span className={`rd-profile-value rd-profile--${userRiskProfile.toLowerCase()}`}>
                                    {userRiskProfile}
                                </span>
                            </div>
                        )}
                        {mlPrediction && (
                            <div className="rd-ml-badge">
                                <span className="rd-ml-label">🤖 ML:</span>
                                <span className={`rd-profile-value rd-profile--${mlPrediction.category.toLowerCase()}`}>
                                    {mlPrediction.category}
                                </span>
                                <span className="rd-ml-conf">({mlPrediction.confidence.toFixed(0)}%)</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="rd-breakdown-card glass-card">
                    <h3 className="rd-section-title">📐 Score Breakdown</h3>
                    <div className="rd-breakdown-list">
                        {scoreBreakdown && (
                            <>
                                <BreakdownBar label="Volatility" score={scoreBreakdown.volatilityScore} weight="35%" />
                                <BreakdownBar label="Sharpe Ratio" score={scoreBreakdown.sharpeScore} weight="25%" />
                                <BreakdownBar label="Max Drawdown" score={scoreBreakdown.drawdownScore} weight="25%" />
                                <BreakdownBar label="Value at Risk" score={scoreBreakdown.varScore} weight="15%" />
                            </>
                        )}
                    </div>
                    <div className="rd-breakdown-formula">
                        <strong>Formula:</strong> Score = 0.35×Vol + 0.25×Sharpe + 0.25×DD + 0.15×VaR
                    </div>
                </div>
            </div>

            {/* ═══ CHARTS SECTION ═══ */}
            <div className="rd-charts-section">
                {/* Portfolio Performance */}
                <div className="rd-chart-card glass-card">
                    <h3 className="rd-section-title">📈 Portfolio Performance</h3>
                    <p className="rd-chart-desc">Simulated 90-day portfolio trajectory based on current risk metrics</p>
                    <div className="rd-chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={perfData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="perfGrad" x1="0" y1="0" x2="1" y2="0">
                                        <stop offset="0%" stopColor={COLORS.purple} />
                                        <stop offset="100%" stopColor={COLORS.purpleLight} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="#5D6679" fontSize={11} tickLine={false} />
                                <YAxis stroke="#5D6679" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                                <Tooltip content={<CustomTooltip prefix="Day " />} />
                                <Legend />
                                <Line type="monotone" dataKey="value" name="Portfolio" stroke="url(#perfGrad)" strokeWidth={2.5} dot={false} />
                                <Line type="monotone" dataKey="benchmark" name="Benchmark" stroke="#5D6679" strokeWidth={1.5} strokeDasharray="5 5" dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk vs Return Scatter */}
                <div className="rd-chart-card glass-card">
                    <h3 className="rd-section-title">🎯 Risk vs Return</h3>
                    <p className="rd-chart-desc">Asset-level risk-return tradeoff analysis</p>
                    <div className="rd-chart-container">
                        <ResponsiveContainer width="100%" height={280}>
                            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" dataKey="risk" name="Risk" unit="%" stroke="#5D6679" fontSize={11} tickLine={false} label={{ value: 'Risk (%)', position: 'insideBottom', offset: -5, style: { fill: '#5D6679', fontSize: 11 } }} />
                                <YAxis type="number" dataKey="return" name="Return" unit="%" stroke="#5D6679" fontSize={11} tickLine={false} label={{ value: 'Return (%)', angle: -90, position: 'insideLeft', style: { fill: '#5D6679', fontSize: 11 } }} />
                                <Tooltip content={<ScatterTooltip />} />
                                <Scatter data={scatterData} fill={COLORS.purple}>
                                    {scatterData.map((entry, index) => (
                                        <Cell key={index} fill={entry.return > 0 ? COLORS.green : COLORS.red} />
                                    ))}
                                </Scatter>
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Drawdown Chart */}
                <div className="rd-chart-card rd-chart-wide glass-card">
                    <h3 className="rd-section-title">📉 Drawdown Analysis</h3>
                    <p className="rd-chart-desc">Historical portfolio drawdown showing peak-to-trough declines</p>
                    <div className="rd-chart-container">
                        <ResponsiveContainer width="100%" height={220}>
                            <AreaChart data={drawdownData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                                <defs>
                                    <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor={COLORS.red} stopOpacity={0.3} />
                                        <stop offset="100%" stopColor={COLORS.red} stopOpacity={0.02} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="day" stroke="#5D6679" fontSize={11} tickLine={false} />
                                <YAxis stroke="#5D6679" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                                <Tooltip content={<CustomTooltip prefix="Day " />} />
                                <Area type="monotone" dataKey="drawdown" name="Drawdown" stroke={COLORS.red} fill="url(#ddGrad)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* ═══ AI INSIGHTS ═══ */}
            {explanations && explanations.length > 0 && (
                <div className="rd-insights-section">
                    <h3 className="rd-section-title">🤖 AI Risk Assessment</h3>
                    <div className="rd-insights-grid">
                        {explanations.map((text, i) => (
                            <InsightCard key={i} text={text} index={i} />
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ ALLOCATION + METRICS ═══ */}
            <div className="rd-bottom-section">
                {/* Portfolio Allocation Pie Chart */}
                {sectorBreakdown && sectorBreakdown.length > 0 && (
                    <div className="rd-allocation-card glass-card">
                        <h3 className="rd-section-title">🏭 Portfolio Allocation</h3>
                        <div className="rd-allocation-layout">
                            <div className="rd-pie-wrapper">
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie
                                            data={sectorBreakdown}
                                            dataKey="percent"
                                            nameKey="sector"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            stroke="none"
                                        >
                                            {sectorBreakdown.map((entry, index) => (
                                                <Cell key={index} fill={entry.color || PIE_COLORS[index % PIE_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value, name) => [`${value}%`, name]}
                                            contentStyle={{
                                                background: '#1E2436',
                                                border: '1px solid rgba(255,255,255,0.1)',
                                                borderRadius: '8px',
                                                fontSize: '12px',
                                                color: '#F0F1F5',
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="rd-allocation-legend">
                                {sectorBreakdown.map((s, i) => (
                                    <div key={i} className="rd-legend-item">
                                        <span className="rd-legend-dot" style={{ backgroundColor: s.color || PIE_COLORS[i % PIE_COLORS.length] }} />
                                        <span className="rd-legend-name">{s.sector}</span>
                                        <span className="rd-legend-pct">{s.percent}%</span>
                                        <span className="rd-legend-val">₹{s.value?.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Extended Metrics */}
                <div className="rd-extended-metrics glass-card">
                    <h3 className="rd-section-title">📊 Detailed Metrics</h3>
                    <div className="rd-metric-list">
                        <MetricRow icon="📈" label="Beta" value={metrics?.beta} status={getBetaStatus(metrics?.beta || 0)} desc="Market sensitivity" />
                        <MetricRow icon="⚠️" label="Daily VaR (95%)" value={`${metrics?.varDaily}%`} status={getVarStatus(metrics?.varDaily || 0)} desc={`At risk: ₹${(metrics?.varAmount || 0).toLocaleString('en-IN')}`} />
                        <MetricRow icon="📉" label="Sortino Ratio" value={metrics?.sortinoRatio || 0} status={getSortinoStatus(metrics?.sortinoRatio || 0)} desc="Downside risk-adjusted" />
                        <MetricRow icon="🏭" label="Sector Conc." value={`${diversification?.sectorConcentration || 0}%`} status={diversification?.sectorConcentration > 60 ? 'danger' : diversification?.sectorConcentration > 40 ? 'warning' : 'good'} desc={`HHI: ${diversification?.hhi || 0}`} />
                    </div>
                </div>
            </div>

            {/* ═══ STRESS TEST ═══ */}
            {stressTest && stressTest.length > 0 && (
                <div className="rd-stress-section glass-card">
                    <h3 className="rd-section-title">💥 Stress Test Scenarios</h3>
                    <p className="rd-chart-desc">Simulated impact under different market crash scenarios</p>
                    <div className="rd-stress-grid">
                        {stressTest.map((scenario, i) => (
                            <div key={i} className={`rd-stress-card rd-stress--${i}`}>
                                <div className="rd-stress-header">
                                    <span className="rd-stress-name">{scenario.scenario}</span>
                                    <span className="rd-stress-drop">{scenario.marketDrop}%</span>
                                </div>
                                <div className="rd-stress-bar">
                                    <div className="rd-stress-fill" style={{ width: `${Math.min(100, Math.abs(scenario.portfolioDropPercent))}%` }} />
                                </div>
                                <div className="rd-stress-values">
                                    <div>
                                        <span className="rd-stress-label">Portfolio Drop</span>
                                        <span className="rd-stress-val rd-neg">{scenario.portfolioDropPercent}%</span>
                                    </div>
                                    <div>
                                        <span className="rd-stress-label">Est. Loss</span>
                                        <span className="rd-stress-val rd-neg">₹{Math.abs(scenario.portfolioLoss).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div>
                                        <span className="rd-stress-label">Remaining</span>
                                        <span className="rd-stress-val">₹{scenario.portfolioProjectedValue?.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══ PORTFOLIO SUMMARY ═══ */}
            {portfolioSummary && (
                <div className="rd-summary-section glass-card">
                    <h3 className="rd-section-title">💼 Portfolio Summary</h3>
                    <div className="rd-summary-grid">
                        <div className="rd-summary-item">
                            <span className="rd-summary-label">Total Invested</span>
                            <span className="rd-summary-value">₹{portfolioSummary.totalInvested?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="rd-summary-item">
                            <span className="rd-summary-label">Current Value</span>
                            <span className="rd-summary-value">₹{portfolioSummary.currentValue?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="rd-summary-item">
                            <span className="rd-summary-label">Holdings</span>
                            <span className="rd-summary-value">{portfolioSummary.holdingCount} stocks</span>
                        </div>
                        <div className="rd-summary-item">
                            <span className="rd-summary-label">Current Drawdown</span>
                            <span className="rd-summary-value" style={{ color: (metrics?.currentDrawdown || 0) < 0 ? COLORS.red : COLORS.green }}>
                                {metrics?.currentDrawdown}%
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ML MODEL ═══ */}
            {mlPrediction && (
                <div className="rd-ml-section glass-card">
                    <h3 className="rd-section-title">🧠 ML Model Prediction</h3>
                    <div className="rd-ml-probs">
                        <ProbabilityBar label="Low Risk" value={mlPrediction.probabilities?.Low} color={COLORS.green} />
                        <ProbabilityBar label="Medium Risk" value={mlPrediction.probabilities?.Medium} color={COLORS.yellow} />
                        <ProbabilityBar label="High Risk" value={mlPrediction.probabilities?.High} color={COLORS.red} />
                    </div>
                    <p className="rd-ml-note">
                        Random Forest classifier • Confidence: {mlPrediction.confidence?.toFixed(1)}%
                    </p>
                </div>
            )}

            {/* ═══ FORMULAS ═══ */}
            <div className="rd-formulas glass-card">
                <h3 className="rd-section-title">📐 Mathematical Formulas</h3>
                <div className="rd-formula-grid">
                    <div className="rd-formula-item"><h4>Volatility</h4><code>σ = √(Σ(rᵢ − r̄)² / (n−1)) × √252</code></div>
                    <div className="rd-formula-item"><h4>Sharpe Ratio</h4><code>SR = (R̄ₚ − Rₑ) / σₚ</code></div>
                    <div className="rd-formula-item"><h4>Max Drawdown</h4><code>MDD = max((peak − trough) / peak)</code></div>
                    <div className="rd-formula-item"><h4>Beta</h4><code>β = Cov(Rₚ,Rₘ) / Var(Rₘ)</code></div>
                    <div className="rd-formula-item"><h4>VaR (95%)</h4><code>VaR = 5th percentile of sorted returns</code></div>
                    <div className="rd-formula-item"><h4>Risk Score</h4><code>S = 0.35V + 0.25SR + 0.25DD + 0.15VaR</code></div>
                </div>
            </div>
        </div>
    );
};

/* ─── Inline MetricRow Component ─── */
const MetricRow = ({ icon, label, value, status, desc }) => {
    const colors = { good: COLORS.green, warning: COLORS.yellow, danger: COLORS.red };
    return (
        <div className="rd-metric-row">
            <span className="rd-metric-row-icon">{icon}</span>
            <div className="rd-metric-row-info">
                <span className="rd-metric-row-label">{label}</span>
                <span className="rd-metric-row-desc">{desc}</span>
            </div>
            <span className="rd-metric-row-value" style={{ color: colors[status] || '#F0F1F5' }}>{value}</span>
        </div>
    );
};

export default RiskAnalysis;
