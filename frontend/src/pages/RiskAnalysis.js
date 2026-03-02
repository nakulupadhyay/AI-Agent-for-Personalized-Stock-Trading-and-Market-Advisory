import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import RiskMeter from '../components/RiskMeter';
import './RiskAnalysis.css';

const MetricCard = ({ icon, label, value, unit, description, status }) => {
    const statusClass = status === 'good' ? 'ra-status--good'
        : status === 'warning' ? 'ra-status--warning'
            : status === 'danger' ? 'ra-status--danger'
                : '';

    return (
        <div className="ra-metric-card">
            <div className="ra-metric-header">
                <span className="ra-metric-icon">{icon}</span>
                <span className={`ra-metric-status ${statusClass}`}>
                    {status === 'good' ? '✓' : status === 'warning' ? '!' : status === 'danger' ? '✗' : '—'}
                </span>
            </div>
            <div className="ra-metric-value">
                {value}<span className="ra-metric-unit">{unit}</span>
            </div>
            <div className="ra-metric-label">{label}</div>
            <div className="ra-metric-desc">{description}</div>
        </div>
    );
};

const RiskAnalysis = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchRiskAnalysis();
    }, []);

    const fetchRiskAnalysis = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await api.get('/risk-analysis');
            setData(res.data.data);
        } catch (err) {
            console.error('Risk analysis fetch error:', err);
            setError('Failed to load risk analysis. Make sure you have holdings in your portfolio.');
        } finally {
            setLoading(false);
        }
    };

    // Rating helpers
    const getVolatilityStatus = (v) => v < 15 ? 'good' : v < 30 ? 'warning' : 'danger';
    const getSharpeStatus = (s) => s > 1 ? 'good' : s > 0 ? 'warning' : 'danger';
    const getDrawdownStatus = (d) => d < 10 ? 'good' : d < 20 ? 'warning' : 'danger';
    const getBetaStatus = (b) => b < 0.8 ? 'good' : b < 1.2 ? 'warning' : 'danger';
    const getVarStatus = (v) => v < 2 ? 'good' : v < 3.5 ? 'warning' : 'danger';
    const getSortinoStatus = (s) => s > 1.5 ? 'good' : s > 0.5 ? 'warning' : 'danger';

    if (loading) {
        return (
            <div className="ra-page">
                <div className="ra-header">
                    <h1 className="ra-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                </div>
                <div className="ra-loading-grid">
                    {[...Array(6)].map((_, i) => (
                        <div key={i} className="ra-skeleton-card">
                            <div className="skeleton" style={{ height: '140px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="ra-page">
                <div className="ra-header">
                    <h1 className="ra-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                </div>
                <div className="ra-empty-state">
                    <span className="ra-empty-icon">📊</span>
                    <h2>No Data Available</h2>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchRiskAnalysis}>Try Again</button>
                </div>
            </div>
        );
    }

    if (!data || data.isEmpty) {
        return (
            <div className="ra-page">
                <div className="ra-header">
                    <h1 className="ra-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                </div>
                <div className="ra-empty-state">
                    <span className="ra-empty-icon">📈</span>
                    <h2>Start Investing</h2>
                    <p>Buy some stocks in Paper Trading to see your portfolio risk analysis here.</p>
                </div>
            </div>
        );
    }

    const { metrics, diversification, scoreBreakdown, explanations, mlPrediction, userRiskProfile, portfolioSummary, stressTest, sectorBreakdown } = data;

    return (
        <div className="ra-page">
            {/* Header */}
            <div className="ra-header">
                <h1 className="ra-title">Portfolio Risk <span className="text-gradient">Analysis</span></h1>
                <p className="ra-subtitle">Quantitative risk assessment powered by financial mathematics & AI</p>
            </div>

            {/* Risk Score Section */}
            <div className="ra-score-section">
                <div className="ra-score-card glass-card">
                    <RiskMeter
                        score={data.riskScore}
                        category={data.riskCategory}
                        size={220}
                    />
                    <div className="ra-score-meta">
                        {userRiskProfile && (
                            <div className="ra-profile-badge">
                                <span className="ra-profile-label">Your Risk Profile:</span>
                                <span className={`ra-profile-value ra-profile--${userRiskProfile.toLowerCase()}`}>
                                    {userRiskProfile}
                                </span>
                            </div>
                        )}
                        {mlPrediction && (
                            <div className="ra-ml-badge">
                                <span className="ra-ml-label">🤖 ML Prediction:</span>
                                <span className={`ra-ml-value ra-profile--${mlPrediction.category.toLowerCase()}`}>
                                    {mlPrediction.category}
                                </span>
                                <span className="ra-ml-conf">({mlPrediction.confidence.toFixed(0)}% confidence)</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Score Breakdown */}
                <div className="ra-breakdown-card glass-card">
                    <h3 className="ra-section-title">Score Breakdown</h3>
                    <div className="ra-breakdown-list">
                        {scoreBreakdown && (
                            <>
                                <BreakdownBar label="Volatility" score={scoreBreakdown.volatilityScore} weight="35%" />
                                <BreakdownBar label="Sharpe Ratio" score={scoreBreakdown.sharpeScore} weight="25%" />
                                <BreakdownBar label="Max Drawdown" score={scoreBreakdown.drawdownScore} weight="25%" />
                                <BreakdownBar label="Value at Risk" score={scoreBreakdown.varScore} weight="15%" />
                            </>
                        )}
                    </div>
                    <div className="ra-breakdown-formula">
                        <strong>Formula:</strong> Score = 0.35×Vol + 0.25×Sharpe + 0.25×DD + 0.15×VaR
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="ra-metrics-grid">
                <MetricCard
                    icon="📊"
                    label="Annualized Volatility"
                    value={metrics.volatility}
                    unit="%"
                    status={getVolatilityStatus(metrics.volatility)}
                    description="Standard deviation of returns × √252. Measures how much your portfolio value fluctuates."
                />
                <MetricCard
                    icon="⚖️"
                    label="Sharpe Ratio"
                    value={metrics.sharpeRatio}
                    unit=""
                    status={getSharpeStatus(metrics.sharpeRatio)}
                    description="(Return − Risk-free rate) / Volatility. Higher = better risk-adjusted performance."
                />
                <MetricCard
                    icon="📉"
                    label="Maximum Drawdown"
                    value={metrics.maxDrawdown}
                    unit="%"
                    status={getDrawdownStatus(metrics.maxDrawdown)}
                    description="Largest peak-to-trough decline. Shows worst-case historical loss."
                />
                <MetricCard
                    icon="📈"
                    label="Beta"
                    value={metrics.beta}
                    unit=""
                    status={getBetaStatus(metrics.beta)}
                    description="Sensitivity to market movements. β > 1 = more volatile than market."
                />
                <MetricCard
                    icon="⚠️"
                    label="Daily VaR (95%)"
                    value={metrics.varDaily}
                    unit="%"
                    status={getVarStatus(metrics.varDaily)}
                    description={`Max daily loss with 95% confidence. Amount at risk: ₹${(metrics.varAmount || 0).toLocaleString('en-IN')}`}
                />
                <MetricCard
                    icon="🏭"
                    label="Sector Concentration"
                    value={diversification?.sectorConcentration || 0}
                    unit="%"
                    status={diversification?.sectorConcentration > 60 ? 'danger' : diversification?.sectorConcentration > 40 ? 'warning' : 'good'}
                    description={`HHI: ${diversification?.hhi || 0} | Diversification ratio: ${diversification?.diversificationRatio || 0}`}
                />
                <MetricCard
                    icon="📉"
                    label="Sortino Ratio"
                    value={metrics.sortinoRatio || 0}
                    unit=""
                    status={getSortinoStatus(metrics.sortinoRatio)}
                    description="Like Sharpe but only penalizes downside volatility. Higher = better downside protection."
                />
            </div>

            {/* Sector Pie Chart */}
            {sectorBreakdown && sectorBreakdown.length > 0 && (
                <div className="ra-sector-section glass-card">
                    <h3 className="ra-section-title">🏭 Sector Diversification</h3>
                    <div className="ra-sector-layout">
                        <div className="ra-pie-container">
                            <SectorPieChart sectors={sectorBreakdown} />
                        </div>
                        <div className="ra-sector-legend">
                            {sectorBreakdown.map((s, i) => (
                                <div key={i} className="ra-legend-item">
                                    <span className="ra-legend-dot" style={{ backgroundColor: s.color }}></span>
                                    <span className="ra-legend-label">{s.sector}</span>
                                    <span className="ra-legend-pct">{s.percent}%</span>
                                    <span className="ra-legend-val">₹{s.value.toLocaleString('en-IN')}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Stress Test */}
            {stressTest && stressTest.length > 0 && (
                <div className="ra-stress-section glass-card">
                    <h3 className="ra-section-title">💥 Stress Test Scenarios</h3>
                    <p className="ra-stress-desc">Simulated portfolio impact under different market crash scenarios, adjusted for portfolio beta and sector sensitivity.</p>
                    <div className="ra-stress-grid">
                        {stressTest.map((scenario, i) => (
                            <div key={i} className={`ra-stress-card ra-stress--${i}`}>
                                <div className="ra-stress-header">
                                    <span className="ra-stress-name">{scenario.scenario}</span>
                                    <span className="ra-stress-drop">{scenario.marketDrop}%</span>
                                </div>
                                <div className="ra-stress-bar">
                                    <div className="ra-stress-fill" style={{ width: `${Math.min(100, Math.abs(scenario.portfolioDropPercent))}%` }}></div>
                                </div>
                                <div className="ra-stress-values">
                                    <div>
                                        <span className="ra-stress-label">Portfolio Drop</span>
                                        <span className="ra-stress-val ra-neg">{scenario.portfolioDropPercent}%</span>
                                    </div>
                                    <div>
                                        <span className="ra-stress-label">Estimated Loss</span>
                                        <span className="ra-stress-val ra-neg">₹{Math.abs(scenario.portfolioLoss).toLocaleString('en-IN')}</span>
                                    </div>
                                    <div>
                                        <span className="ra-stress-label">Remaining</span>
                                        <span className="ra-stress-val">₹{scenario.portfolioProjectedValue.toLocaleString('en-IN')}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI Explanations */}
            <div className="ra-insights-section glass-card">
                <h3 className="ra-section-title">🤖 AI Risk Assessment</h3>
                <div className="ra-insights-list">
                    {explanations && explanations.map((insight, i) => (
                        <div key={i} className="ra-insight-item">
                            <span className="ra-insight-text">{insight}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Portfolio Summary */}
            {portfolioSummary && (
                <div className="ra-portfolio-summary glass-card">
                    <h3 className="ra-section-title">Portfolio Summary</h3>
                    <div className="ra-summary-grid">
                        <div className="ra-summary-item">
                            <span className="ra-summary-label">Total Invested</span>
                            <span className="ra-summary-value">₹{portfolioSummary.totalInvested?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="ra-summary-item">
                            <span className="ra-summary-label">Current Value</span>
                            <span className="ra-summary-value">₹{portfolioSummary.currentValue?.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="ra-summary-item">
                            <span className="ra-summary-label">Holdings</span>
                            <span className="ra-summary-value">{portfolioSummary.holdingCount} stocks</span>
                        </div>
                        <div className="ra-summary-item">
                            <span className="ra-summary-label">Current Drawdown</span>
                            <span className="ra-summary-value">{metrics.currentDrawdown}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* ML Model Info (if available) */}
            {mlPrediction && (
                <div className="ra-ml-section glass-card">
                    <h3 className="ra-section-title">🧠 ML Model Prediction</h3>
                    <div className="ra-ml-probs">
                        <ProbabilityBar label="Low Risk" value={mlPrediction.probabilities?.Low} color="#22c55e" />
                        <ProbabilityBar label="Medium Risk" value={mlPrediction.probabilities?.Medium} color="#f59e0b" />
                        <ProbabilityBar label="High Risk" value={mlPrediction.probabilities?.High} color="#ef4444" />
                    </div>
                    <p className="ra-ml-note">
                        Random Forest classifier trained on financial heuristics.
                        Confidence: {mlPrediction.confidence?.toFixed(1)}%
                    </p>
                </div>
            )}

            {/* Formulas Reference */}
            <div className="ra-formulas glass-card">
                <h3 className="ra-section-title">📐 Mathematical Formulas</h3>
                <div className="ra-formula-grid">
                    <div className="ra-formula-item">
                        <h4>Volatility</h4>
                        <code>σ = √(Σ(rᵢ − r̄)² / (n−1)) × √252</code>
                    </div>
                    <div className="ra-formula-item">
                        <h4>Sharpe Ratio</h4>
                        <code>SR = (R̄ₚ − Rₑ) / σₚ</code>
                    </div>
                    <div className="ra-formula-item">
                        <h4>Max Drawdown</h4>
                        <code>MDD = max((peak − trough) / peak)</code>
                    </div>
                    <div className="ra-formula-item">
                        <h4>Beta</h4>
                        <code>β = Cov(Rₚ,Rₘ) / Var(Rₘ)</code>
                    </div>
                    <div className="ra-formula-item">
                        <h4>VaR (95%)</h4>
                        <code>VaR = 5th percentile of sorted returns</code>
                    </div>
                    <div className="ra-formula-item">
                        <h4>Risk Score</h4>
                        <code>S = 0.35V + 0.25SR + 0.25DD + 0.15VaR</code>
                    </div>
                </div>
            </div>

            <p className="ra-timestamp">
                Analysis computed at: {data.computedAt ? new Date(data.computedAt).toLocaleString() : 'N/A'}
            </p>
        </div>
    );
};

/* Sub-components */

const BreakdownBar = ({ label, score, weight }) => {
    const getBarColor = (s) => s <= 33 ? '#22c55e' : s <= 66 ? '#f59e0b' : '#ef4444';
    return (
        <div className="ra-breakdown-item">
            <div className="ra-breakdown-meta">
                <span className="ra-breakdown-label">{label}</span>
                <span className="ra-breakdown-score">{score}/100 ({weight})</span>
            </div>
            <div className="ra-breakdown-track">
                <div
                    className="ra-breakdown-fill"
                    style={{ width: `${score}%`, backgroundColor: getBarColor(score) }}
                />
            </div>
        </div>
    );
};

const ProbabilityBar = ({ label, value, color }) => (
    <div className="ra-prob-item">
        <div className="ra-prob-meta">
            <span className="ra-prob-label">{label}</span>
            <span className="ra-prob-value">{(value || 0).toFixed(1)}%</span>
        </div>
        <div className="ra-prob-track">
            <div className="ra-prob-fill" style={{ width: `${value || 0}%`, backgroundColor: color }} />
        </div>
    </div>
);

const SectorPieChart = ({ sectors }) => {
    // Build conic-gradient from sector data
    let cumulative = 0;
    const stops = sectors.map(s => {
        const start = cumulative;
        cumulative += s.percent;
        return `${s.color} ${start}% ${cumulative}%`;
    });
    const gradient = `conic-gradient(${stops.join(', ')})`;

    return (
        <div className="ra-pie-chart" style={{ background: gradient }}>
            <div className="ra-pie-inner">
                <span className="ra-pie-count">{sectors.length}</span>
                <span className="ra-pie-label">Sectors</span>
            </div>
        </div>
    );
};

export default RiskAnalysis;
