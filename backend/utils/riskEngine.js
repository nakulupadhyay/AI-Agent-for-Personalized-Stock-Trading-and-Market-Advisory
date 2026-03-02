/**
 * ═══════════════════════════════════════════════════════════════
 * Risk Engine — Quantitative Portfolio Risk Assessment
 * ═══════════════════════════════════════════════════════════════
 * 
 * Pure computation module (no DB/API dependencies).
 * Implements proper financial risk metrics:
 *   - Portfolio Volatility (annualized standard deviation)
 *   - Sharpe Ratio (risk-adjusted return)
 *   - Maximum Drawdown (worst peak-to-trough decline)
 *   - Beta (systematic risk vs benchmark)
 *   - Value at Risk (VaR) — historical simulation
 *   - Composite Risk Score (0–100) with classification
 */

// ── Constants ────────────────────────────────────────────────
const TRADING_DAYS_PER_YEAR = 252;
const RISK_FREE_RATE_ANNUAL = 0.06; // India 10Y gov bond ~6%
const VAR_CONFIDENCE = 0.95;        // 95% confidence for VaR

// ══════════════════════════════════════════════════════════════
// 1. DAILY RETURNS
// ══════════════════════════════════════════════════════════════

/**
 * Compute daily log returns from a price series.
 * Formula: rₜ = ln(Pₜ / Pₜ₋₁)
 *
 * @param {number[]} prices — Array of chronological prices
 * @returns {number[]} — Array of daily returns (length = prices.length - 1)
 */
function computeDailyReturns(prices) {
    if (!prices || prices.length < 2) return [];
    const returns = [];
    for (let i = 1; i < prices.length; i++) {
        if (prices[i - 1] > 0) {
            returns.push(Math.log(prices[i] / prices[i - 1]));
        }
    }
    return returns;
}

/**
 * Generate simulated daily portfolio values from transactions.
 * Since this is paper trading, we reconstruct a price history from
 * transactions and known current prices.
 *
 * @param {Object[]} transactions — Sorted chronologically
 * @param {Object[]} holdings — Current holdings with currentPrice
 * @param {number} numDays — Number of simulated days (default 90)
 * @returns {number[]} — Array of daily portfolio values
 */
function simulatePortfolioHistory(transactions, holdings, numDays = 90) {
    if (!holdings || holdings.length === 0) return [];

    const currentValue = holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);
    const totalInvested = holdings.reduce((sum, h) => sum + (h.quantity * h.averagePrice), 0);

    if (currentValue <= 0) return [];

    // Calculate overall portfolio return
    const totalReturn = totalInvested > 0 ? (currentValue - totalInvested) / totalInvested : 0;
    const dailyDrift = totalReturn / numDays;

    // Estimate daily volatility from individual holding returns
    const holdingReturns = holdings.map(h => {
        if (h.averagePrice > 0) {
            return (h.currentPrice - h.averagePrice) / h.averagePrice;
        }
        return 0;
    });

    const avgReturn = holdingReturns.reduce((s, r) => s + r, 0) / (holdingReturns.length || 1);
    const variance = holdingReturns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (holdingReturns.length || 1);
    const dailyVol = Math.sqrt(variance) / Math.sqrt(numDays) || 0.015; // fallback ~1.5% daily vol

    // Generate synthetic price path using geometric Brownian motion
    const values = [totalInvested];
    for (let i = 1; i <= numDays; i++) {
        // Box-Muller transform for normal random
        const u1 = Math.random();
        const u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);

        const dayReturn = dailyDrift + dailyVol * z;
        const prevValue = values[i - 1];
        values.push(prevValue * (1 + dayReturn));
    }

    // Ensure the last simulated value matches actual current value
    const scaleFactor = currentValue / values[values.length - 1];
    return values.map(v => v * scaleFactor);
}


// ══════════════════════════════════════════════════════════════
// 2. PORTFOLIO VOLATILITY
// ══════════════════════════════════════════════════════════════

/**
 * Compute annualized portfolio volatility (standard deviation of returns).
 *
 * Formula: σ_annual = σ_daily × √252
 * Where:  σ_daily = √( Σ(rᵢ - r̄)² / (n - 1) )
 *
 * @param {number[]} dailyReturns
 * @returns {number} — Annualized volatility as a decimal (e.g., 0.25 = 25%)
 */
function computeVolatility(dailyReturns) {
    if (!dailyReturns || dailyReturns.length < 2) return 0;

    const n = dailyReturns.length;
    const mean = dailyReturns.reduce((s, r) => s + r, 0) / n;
    const sumSquaredDev = dailyReturns.reduce((s, r) => s + Math.pow(r - mean, 2), 0);
    const dailyStdDev = Math.sqrt(sumSquaredDev / (n - 1)); // sample std dev

    return dailyStdDev * Math.sqrt(TRADING_DAYS_PER_YEAR); // annualize
}


// ══════════════════════════════════════════════════════════════
// 3. SHARPE RATIO
// ══════════════════════════════════════════════════════════════

/**
 * Compute annualized Sharpe Ratio.
 *
 * Formula: SR = (R̄ₚ - Rₑ) / σₚ
 * Where:
 *   R̄ₚ = annualized portfolio return
 *   Rₑ = risk-free rate (annual)
 *   σₚ = annualized portfolio volatility
 *
 * @param {number[]} dailyReturns
 * @param {number} riskFreeRate — Annual risk-free rate (default 6%)
 * @returns {number}
 */
function computeSharpeRatio(dailyReturns, riskFreeRate = RISK_FREE_RATE_ANNUAL) {
    if (!dailyReturns || dailyReturns.length < 2) return 0;

    const annualizedVol = computeVolatility(dailyReturns);
    if (annualizedVol === 0) return 0;

    const meanDailyReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const annualizedReturn = meanDailyReturn * TRADING_DAYS_PER_YEAR;

    return (annualizedReturn - riskFreeRate) / annualizedVol;
}


// ══════════════════════════════════════════════════════════════
// 4. MAXIMUM DRAWDOWN
// ══════════════════════════════════════════════════════════════

/**
 * Compute Maximum Drawdown — the largest peak-to-trough decline.
 *
 * Formula: MDD = max( (peak - trough) / peak ) for all rolling windows
 *
 * @param {number[]} portfolioValues — Chronological portfolio values
 * @returns {{ maxDrawdown: number, currentDrawdown: number }}
 *   maxDrawdown as decimal (e.g., 0.15 = 15%)
 */
function computeMaxDrawdown(portfolioValues) {
    if (!portfolioValues || portfolioValues.length < 2) {
        return { maxDrawdown: 0, currentDrawdown: 0 };
    }

    let peak = portfolioValues[0];
    let maxDrawdown = 0;

    for (let i = 1; i < portfolioValues.length; i++) {
        if (portfolioValues[i] > peak) {
            peak = portfolioValues[i];
        }
        const drawdown = (peak - portfolioValues[i]) / peak;
        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    // Current drawdown
    const currentPeak = Math.max(...portfolioValues);
    const currentValue = portfolioValues[portfolioValues.length - 1];
    const currentDrawdown = currentPeak > 0 ? (currentPeak - currentValue) / currentPeak : 0;

    return {
        maxDrawdown: Math.max(0, maxDrawdown),
        currentDrawdown: Math.max(0, currentDrawdown),
    };
}


// ══════════════════════════════════════════════════════════════
// 5. BETA
// ══════════════════════════════════════════════════════════════

/**
 * Compute Beta — sensitivity of portfolio returns to market returns.
 *
 * Formula: β = Cov(Rₚ, Rₘ) / Var(Rₘ)
 *
 * If no benchmark data is available, estimates beta from portfolio
 * characteristics (sector weights).
 *
 * @param {number[]} portfolioReturns
 * @param {number[]} benchmarkReturns — Market index returns (e.g., Nifty 50)
 * @returns {number}
 */
function computeBeta(portfolioReturns, benchmarkReturns) {
    // If we have both series of equal length, compute proper beta
    if (portfolioReturns && benchmarkReturns &&
        portfolioReturns.length > 1 &&
        portfolioReturns.length === benchmarkReturns.length) {

        const n = portfolioReturns.length;
        const meanP = portfolioReturns.reduce((s, r) => s + r, 0) / n;
        const meanM = benchmarkReturns.reduce((s, r) => s + r, 0) / n;

        let covariance = 0;
        let varianceM = 0;

        for (let i = 0; i < n; i++) {
            covariance += (portfolioReturns[i] - meanP) * (benchmarkReturns[i] - meanM);
            varianceM += Math.pow(benchmarkReturns[i] - meanM, 2);
        }

        covariance /= (n - 1);
        varianceM /= (n - 1);

        return varianceM > 0 ? covariance / varianceM : 1.0;
    }

    // Fallback: estimate beta from portfolio volatility vs typical market vol
    if (portfolioReturns && portfolioReturns.length > 1) {
        const portfolioVol = computeVolatility(portfolioReturns);
        const marketVol = 0.18; // Nifty 50 typical annualized vol ~18%
        const assumedCorrelation = 0.75; // typical equity correlation with market
        return (portfolioVol / marketVol) * assumedCorrelation;
    }

    return 1.0; // default market beta
}


// ══════════════════════════════════════════════════════════════
// 6. VALUE AT RISK (VaR) — Historical Simulation
// ══════════════════════════════════════════════════════════════

/**
 * Compute Historical VaR at given confidence level.
 *
 * Method: Sort historical returns → take the (1 - confidence) percentile.
 * Example: 95% VaR → 5th percentile of daily returns.
 *
 * @param {number[]} dailyReturns
 * @param {number} confidence — Confidence level (default 0.95)
 * @param {number} portfolioValue — Current portfolio value for ₹ amount
 * @returns {{ varPercent: number, varAmount: number }}
 */
function computeVaR(dailyReturns, confidence = VAR_CONFIDENCE, portfolioValue = 0) {
    if (!dailyReturns || dailyReturns.length < 5) {
        return { varPercent: 0, varAmount: 0 };
    }

    const sorted = [...dailyReturns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidence) * sorted.length);
    const varReturn = sorted[Math.max(0, index)];

    return {
        varPercent: Math.abs(varReturn) * 100, // express as positive %
        varAmount: Math.abs(varReturn) * portfolioValue,
    };
}


// ══════════════════════════════════════════════════════════════
// 7. DIVERSIFICATION METRICS
// ══════════════════════════════════════════════════════════════

/**
 * Compute Herfindahl-Hirschman Index (HHI) for sector concentration.
 * HHI = Σ(wᵢ²) where wᵢ is the weight of each sector.
 * Range: 0 (perfectly diversified) to 1 (single sector).
 *
 * @param {Object[]} holdings — Holdings with sector and totalValue
 * @param {number} totalPortfolioValue
 * @returns {{ hhi: number, sectorConcentration: number, diversificationRatio: number }}
 */
function computeDiversificationMetrics(holdings, totalPortfolioValue) {
    if (!holdings || holdings.length === 0 || totalPortfolioValue <= 0) {
        return { hhi: 1, sectorConcentration: 100, diversificationRatio: 0 };
    }

    // Sector weights
    const sectorWeights = {};
    holdings.forEach(h => {
        const sector = h.sector || 'Other';
        const value = h.quantity * (h.currentPrice || 0);
        sectorWeights[sector] = (sectorWeights[sector] || 0) + value;
    });

    // HHI
    const hhi = Object.values(sectorWeights).reduce((sum, val) => {
        const weight = val / totalPortfolioValue;
        return sum + Math.pow(weight, 2);
    }, 0);

    // Max single-sector concentration
    const maxSectorWeight = Math.max(...Object.values(sectorWeights)) / totalPortfolioValue;

    // Diversification ratio = # unique stocks / # unique sectors (higher = more diversified)
    const numStocks = holdings.length;
    const numSectors = Object.keys(sectorWeights).length;
    const diversificationRatio = numSectors > 0 ? numStocks / numSectors : 0;

    return {
        hhi: parseFloat(hhi.toFixed(4)),
        sectorConcentration: parseFloat((maxSectorWeight * 100).toFixed(2)),
        diversificationRatio: parseFloat(diversificationRatio.toFixed(2)),
    };
}


// ══════════════════════════════════════════════════════════════
// 8. COMPOSITE RISK SCORE (0–100)
// ══════════════════════════════════════════════════════════════

/**
 * Normalize a metric into a 0–100 score using a linear scale.
 * @param {number} value — The raw metric value
 * @param {number} low — The value at which the score is 0 (best/lowest risk)
 * @param {number} high — The value at which the score is 100 (worst/highest risk)
 * @returns {number} — Score clamped to [0, 100]
 */
function normalize(value, low, high) {
    if (high === low) return 50;
    const score = ((value - low) / (high - low)) * 100;
    return Math.max(0, Math.min(100, score));
}

/**
 * Compute composite risk score from individual metrics.
 *
 * Weighted formula:
 *   Score = 0.35 × VolatilityScore
 *         + 0.25 × SharpeScore (inverted — higher Sharpe = lower risk)
 *         + 0.25 × DrawdownScore
 *         + 0.15 × VaRScore
 *
 * Thresholds (derived from financial literature):
 *   Volatility:  5%–50% annual → 0–100
 *   Sharpe:      2.0 to -1.0 → 0–100 (inverted)
 *   Drawdown:    0%–30% → 0–100
 *   VaR (daily): 0%–5% → 0–100
 *
 * @param {Object} metrics — { volatility, sharpeRatio, maxDrawdown, varPercent }
 * @returns {{ riskScore: number, riskCategory: string, breakdown: Object }}
 */
function computeCompositeRiskScore(metrics) {
    const {
        volatility = 0,
        sharpeRatio = 0,
        maxDrawdown = 0,
        varPercent = 0,
    } = metrics;

    // Normalize each metric to 0–100 (higher = riskier)
    const volScore = normalize(volatility * 100, 5, 50);                // 5%–50%
    const sharpeScore = normalize(sharpeRatio, 2.0, -1.0);              // inverted
    const drawdownScore = normalize(maxDrawdown * 100, 0, 30);          // 0%–30%
    const varScore = normalize(varPercent, 0, 5);                       // 0%–5% daily

    // Weighted composite
    const weights = { volatility: 0.35, sharpe: 0.25, drawdown: 0.25, var: 0.15 };
    const compositeScore = (
        weights.volatility * volScore +
        weights.sharpe * sharpeScore +
        weights.drawdown * drawdownScore +
        weights.var * varScore
    );

    const riskScore = Math.round(Math.max(0, Math.min(100, compositeScore)));

    // Classify
    let riskCategory;
    if (riskScore <= 33) riskCategory = 'Low';
    else if (riskScore <= 66) riskCategory = 'Medium';
    else riskCategory = 'High';

    return {
        riskScore,
        riskCategory,
        breakdown: {
            volatilityScore: Math.round(volScore),
            sharpeScore: Math.round(sharpeScore),
            drawdownScore: Math.round(drawdownScore),
            varScore: Math.round(varScore),
            weights,
        },
    };
}


// ══════════════════════════════════════════════════════════════
// 9. AI-GENERATED EXPLANATION TEXT
// ══════════════════════════════════════════════════════════════

/**
 * Generate human-readable explanations for the risk assessment.
 *
 * @param {Object} params — All computed risk metrics
 * @returns {string[]} — Array of insight strings
 */
function generateRiskExplanation(params) {
    const {
        riskScore,
        riskCategory,
        volatility,
        sharpeRatio,
        maxDrawdown,
        varPercent,
        varAmount,
        beta,
        diversification,
        holdingCount,
    } = params;

    const insights = [];

    // Overall risk assessment
    if (riskCategory === 'Low') {
        insights.push(`✅ Your portfolio has a Low Risk score of ${riskScore}/100. It is well-positioned for stable, long-term growth.`);
    } else if (riskCategory === 'Medium') {
        insights.push(`📊 Your portfolio has a Medium Risk score of ${riskScore}/100. It balances growth potential with moderate risk.`);
    } else {
        insights.push(`⚠️ Your portfolio has a High Risk score of ${riskScore}/100. Consider rebalancing to reduce downside exposure.`);
    }

    // Volatility
    const volPercent = (volatility * 100).toFixed(1);
    if (volatility * 100 > 30) {
        insights.push(`📈 Annualized volatility is ${volPercent}% — significantly above average. Your portfolio experiences large price swings.`);
    } else if (volatility * 100 > 15) {
        insights.push(`📊 Annualized volatility is ${volPercent}% — moderate. Typical for an equity-heavy portfolio.`);
    } else {
        insights.push(`✅ Annualized volatility is ${volPercent}% — below average. Your portfolio is relatively stable.`);
    }

    // Sharpe Ratio
    if (sharpeRatio > 1.5) {
        insights.push(`🏆 Sharpe Ratio of ${sharpeRatio.toFixed(2)} indicates excellent risk-adjusted performance.`);
    } else if (sharpeRatio > 0.5) {
        insights.push(`📊 Sharpe Ratio of ${sharpeRatio.toFixed(2)} shows adequate risk-adjusted returns.`);
    } else if (sharpeRatio > 0) {
        insights.push(`⚠️ Sharpe Ratio of ${sharpeRatio.toFixed(2)} is low — returns barely compensate for the risk taken.`);
    } else {
        insights.push(`🔴 Negative Sharpe Ratio (${sharpeRatio.toFixed(2)}) — you'd earn more from a risk-free government bond.`);
    }

    // Max Drawdown
    const mddPercent = (maxDrawdown * 100).toFixed(1);
    if (maxDrawdown * 100 > 20) {
        insights.push(`📉 Maximum Drawdown of ${mddPercent}% is significant. A 20%+ decline can be psychologically challenging.`);
    } else if (maxDrawdown * 100 > 10) {
        insights.push(`📊 Maximum Drawdown of ${mddPercent}% is within normal equity range.`);
    } else {
        insights.push(`✅ Maximum Drawdown is only ${mddPercent}% — excellent downside protection.`);
    }

    // VaR
    if (varPercent > 3) {
        insights.push(`⚠️ Daily Value at Risk (95%): You could lose up to ${varPercent.toFixed(1)}% (₹${Math.round(varAmount).toLocaleString('en-IN')}) on a bad day.`);
    } else {
        insights.push(`📊 Daily Value at Risk (95%): Maximum expected daily loss is ${varPercent.toFixed(1)}% (₹${Math.round(varAmount).toLocaleString('en-IN')}).`);
    }

    // Beta
    if (beta !== undefined && beta !== null) {
        if (beta > 1.2) {
            insights.push(`📈 Portfolio Beta of ${beta.toFixed(2)} — your portfolio is more volatile than the market.`);
        } else if (beta < 0.8) {
            insights.push(`✅ Portfolio Beta of ${beta.toFixed(2)} — your portfolio is less volatile than the market.`);
        } else {
            insights.push(`📊 Portfolio Beta of ${beta.toFixed(2)} — moves roughly in line with the market.`);
        }
    }

    // Diversification
    if (diversification) {
        if (diversification.sectorConcentration > 60) {
            insights.push(`🏭 Sector concentration is ${diversification.sectorConcentration.toFixed(0)}% — overly concentrated. Spread across more sectors.`);
        } else if (diversification.sectorConcentration > 40) {
            insights.push(`📊 Top sector holds ${diversification.sectorConcentration.toFixed(0)}% of your portfolio. Consider diversifying further.`);
        } else {
            insights.push(`✅ Good sector diversification — no single sector dominates your portfolio.`);
        }

        if (holdingCount < 3) {
            insights.push(`⚠️ Only ${holdingCount} stock(s) in your portfolio. Aim for 5–10 stocks for better diversification.`);
        } else if (holdingCount >= 5) {
            insights.push(`✅ ${holdingCount} stocks provides reasonable individual stock diversification.`);
        }
    }

    return insights;
}


// ══════════════════════════════════════════════════════════════
// 10. SORTINO RATIO
// ══════════════════════════════════════════════════════════════

/**
 * Compute Sortino Ratio — like Sharpe but only penalizes downside volatility.
 *
 * Formula: Sortino = (R̄ₚ - Rₑ) / σ_downside
 * Where σ_downside = √( Σ(min(rᵢ,0))² / n )
 *
 * @param {number[]} dailyReturns
 * @param {number} riskFreeRate — Annual risk-free rate
 * @returns {number}
 */
function computeSortinoRatio(dailyReturns, riskFreeRate = RISK_FREE_RATE_ANNUAL) {
    if (!dailyReturns || dailyReturns.length < 2) return 0;

    const meanDailyReturn = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
    const annualizedReturn = meanDailyReturn * TRADING_DAYS_PER_YEAR;

    // Downside deviation: only count negative returns
    const negativeReturns = dailyReturns.filter(r => r < 0);
    if (negativeReturns.length === 0) return 3.0; // no downside → excellent

    const downsideVariance = negativeReturns.reduce((s, r) => s + r * r, 0) / dailyReturns.length;
    const downsideDeviation = Math.sqrt(downsideVariance) * Math.sqrt(TRADING_DAYS_PER_YEAR);

    if (downsideDeviation === 0) return 0;
    return (annualizedReturn - riskFreeRate) / downsideDeviation;
}


// ══════════════════════════════════════════════════════════════
// 11. STRESS TESTING
// ══════════════════════════════════════════════════════════════

/**
 * Simulate portfolio impact under market crash scenarios.
 *
 * Scenarios:
 *   - Mild correction:  -10%
 *   - Moderate crash:   -20%
 *   - Severe crash:     -30%
 *   - Black swan:       -50%
 *
 * Each holding's loss is amplified by its beta (higher beta → bigger loss).
 *
 * @param {Object[]} holdings — Holdings with currentPrice, quantity, sector
 * @param {number} beta — Portfolio beta
 * @returns {Object[]} — Array of scenario results
 */
function computeStressTest(holdings, beta = 1.0) {
    if (!holdings || holdings.length === 0) return [];

    const currentValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
    if (currentValue <= 0) return [];

    const scenarios = [
        { name: 'Mild Correction', marketDrop: -0.10, description: 'Market drops 10%' },
        { name: 'Moderate Crash', marketDrop: -0.20, description: 'Market drops 20%' },
        { name: 'Severe Crash', marketDrop: -0.30, description: 'Market drops 30%' },
        { name: 'Black Swan', marketDrop: -0.50, description: 'Market drops 50%' },
    ];

    // Sector beta multipliers (some sectors more volatile in crashes)
    const sectorMultiplier = {
        'Information Technology': 1.1,
        'Banking & Finance': 1.3,
        'Energy & Petrochemicals': 1.2,
        'Automobile': 1.15,
        'Pharmaceuticals': 0.7,
        'FMCG': 0.6,
        'Telecom': 0.85,
        'Infrastructure': 1.25,
        'Other': 1.0,
    };

    return scenarios.map(scenario => {
        let portfolioLoss = 0;
        const holdingImpacts = holdings.map(h => {
            const value = h.quantity * h.currentPrice;
            const sectorMult = sectorMultiplier[h.sector] || 1.0;
            const effectiveDrop = scenario.marketDrop * beta * sectorMult;
            const loss = value * effectiveDrop;
            const newValue = value + loss;

            portfolioLoss += loss;

            return {
                symbol: h.symbol,
                currentValue: Math.round(value),
                projectedValue: Math.round(Math.max(0, newValue)),
                loss: Math.round(loss),
                dropPercent: parseFloat((effectiveDrop * 100).toFixed(1)),
            };
        });

        return {
            scenario: scenario.name,
            description: scenario.description,
            marketDrop: scenario.marketDrop * 100,
            portfolioCurrentValue: Math.round(currentValue),
            portfolioProjectedValue: Math.round(Math.max(0, currentValue + portfolioLoss)),
            portfolioLoss: Math.round(portfolioLoss),
            portfolioDropPercent: parseFloat(((portfolioLoss / currentValue) * 100).toFixed(1)),
            holdingImpacts,
        };
    });
}


// ══════════════════════════════════════════════════════════════
// 12. WHAT-IF ANALYSIS
// ══════════════════════════════════════════════════════════════

/**
 * Analyze impact of adding or removing a stock on portfolio risk.
 *
 * @param {Object[]} currentHoldings — Current portfolio holdings
 * @param {Object} change — { action: 'ADD'|'REMOVE', symbol, sector, quantity, price }
 * @param {Object[]} transactions — Transaction history
 * @returns {Object} — Before/after risk comparison
 */
function computeWhatIf(currentHoldings, change, transactions = []) {
    // Compute current risk
    const currentAnalysis = runFullAnalysis({ holdings: currentHoldings, transactions });

    // Build modified holdings
    let modifiedHoldings = [...currentHoldings.map(h => ({ ...h }))];

    if (change.action === 'ADD') {
        const existing = modifiedHoldings.find(h => h.symbol === change.symbol);
        if (existing) {
            const totalQty = existing.quantity + change.quantity;
            const totalCost = (existing.averagePrice * existing.quantity) + (change.price * change.quantity);
            existing.quantity = totalQty;
            existing.averagePrice = totalCost / totalQty;
            existing.currentPrice = change.price;
        } else {
            modifiedHoldings.push({
                symbol: change.symbol,
                companyName: change.symbol,
                quantity: change.quantity,
                averagePrice: change.price,
                currentPrice: change.price,
                sector: change.sector || 'Other',
            });
        }
    } else if (change.action === 'REMOVE') {
        const idx = modifiedHoldings.findIndex(h => h.symbol === change.symbol);
        if (idx !== -1) {
            modifiedHoldings[idx].quantity -= change.quantity;
            if (modifiedHoldings[idx].quantity <= 0) {
                modifiedHoldings.splice(idx, 1);
            }
        }
    }

    // Compute new risk
    const newAnalysis = modifiedHoldings.length > 0
        ? runFullAnalysis({ holdings: modifiedHoldings, transactions })
        : { riskScore: 0, riskCategory: 'N/A', metrics: { volatility: 0, sharpeRatio: 0, maxDrawdown: 0, beta: 0, varDaily: 0 } };

    return {
        action: change.action,
        symbol: change.symbol,
        before: {
            riskScore: currentAnalysis.riskScore,
            riskCategory: currentAnalysis.riskCategory,
            volatility: currentAnalysis.metrics.volatility,
            sharpeRatio: currentAnalysis.metrics.sharpeRatio,
            holdingCount: currentHoldings.length,
        },
        after: {
            riskScore: newAnalysis.riskScore,
            riskCategory: newAnalysis.riskCategory,
            volatility: newAnalysis.metrics.volatility,
            sharpeRatio: newAnalysis.metrics.sharpeRatio,
            holdingCount: modifiedHoldings.length,
        },
        impact: {
            riskScoreChange: newAnalysis.riskScore - currentAnalysis.riskScore,
            volatilityChange: parseFloat((newAnalysis.metrics.volatility - currentAnalysis.metrics.volatility).toFixed(2)),
            recommendation: newAnalysis.riskScore < currentAnalysis.riskScore
                ? '✅ This change would reduce your portfolio risk.'
                : newAnalysis.riskScore > currentAnalysis.riskScore
                    ? '⚠️ This change would increase your portfolio risk.'
                    : '📊 This change has minimal impact on your risk.',
        },
    };
}


// ══════════════════════════════════════════════════════════════
// 13. SECTOR BREAKDOWN (for charting)
// ══════════════════════════════════════════════════════════════

/**
 * Build sector allocation data for pie chart visualization.
 *
 * @param {Object[]} holdings
 * @returns {Object[]} — Array of { sector, value, percent, color, stocks }
 */
function buildSectorBreakdown(holdings) {
    if (!holdings || holdings.length === 0) return [];

    const totalValue = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
    if (totalValue <= 0) return [];

    const sectorColors = {
        'Information Technology': '#3b82f6',
        'Banking & Finance': '#10b981',
        'Energy & Petrochemicals': '#f59e0b',
        'Automobile': '#8b5cf6',
        'Pharmaceuticals': '#ec4899',
        'FMCG': '#06b6d4',
        'Telecom': '#f97316',
        'Infrastructure': '#6366f1',
        'Other': '#94a3b8',
    };

    const sectorMap = {};
    holdings.forEach(h => {
        const sector = h.sector || 'Other';
        if (!sectorMap[sector]) sectorMap[sector] = { value: 0, stocks: [] };
        const value = h.quantity * h.currentPrice;
        sectorMap[sector].value += value;
        sectorMap[sector].stocks.push({ symbol: h.symbol, value: Math.round(value) });
    });

    return Object.entries(sectorMap)
        .map(([sector, data]) => ({
            sector,
            value: Math.round(data.value),
            percent: parseFloat(((data.value / totalValue) * 100).toFixed(1)),
            color: sectorColors[sector] || '#94a3b8',
            stocks: data.stocks,
        }))
        .sort((a, b) => b.value - a.value);
}


// ══════════════════════════════════════════════════════════════
// 14. FULL RISK ANALYSIS (Enhanced)
// ══════════════════════════════════════════════════════════════

/**
 * Run the complete risk analysis pipeline with all enhancements.
 *
 * @param {Object} params
 * @param {Object[]} params.holdings — Portfolio holdings with sector info
 * @param {Object[]} params.transactions — Transaction history
 * @param {number[]} params.benchmarkReturns — (optional) Market benchmark returns
 * @returns {Object} — Complete risk analysis result
 */
function runFullAnalysis({ holdings, transactions, benchmarkReturns = null }) {
    const currentValue = holdings.reduce((sum, h) => sum + (h.quantity * h.currentPrice), 0);

    // 1. Simulate portfolio history & compute daily returns
    const portfolioValues = simulatePortfolioHistory(transactions, holdings, 90);
    const dailyReturns = computeDailyReturns(portfolioValues);

    // 2. Compute all metrics
    const volatility = computeVolatility(dailyReturns);
    const sharpeRatio = computeSharpeRatio(dailyReturns);
    const sortinoRatio = computeSortinoRatio(dailyReturns);
    const { maxDrawdown, currentDrawdown } = computeMaxDrawdown(portfolioValues);
    const beta = computeBeta(dailyReturns, benchmarkReturns);
    const { varPercent, varAmount } = computeVaR(dailyReturns, VAR_CONFIDENCE, currentValue);
    const diversification = computeDiversificationMetrics(holdings, currentValue);

    // 3. Composite score
    const { riskScore, riskCategory, breakdown } = computeCompositeRiskScore({
        volatility,
        sharpeRatio,
        maxDrawdown,
        varPercent,
    });

    // 4. Generate explanations
    const explanations = generateRiskExplanation({
        riskScore,
        riskCategory,
        volatility,
        sharpeRatio,
        maxDrawdown,
        varPercent,
        varAmount,
        beta,
        diversification,
        holdingCount: holdings.length,
    });

    // 5. Stress testing
    const stressTest = computeStressTest(holdings, beta);

    // 6. Sector breakdown for charting
    const sectorBreakdown = buildSectorBreakdown(holdings);

    return {
        riskScore,
        riskCategory,
        metrics: {
            volatility: parseFloat((volatility * 100).toFixed(2)),
            sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
            sortinoRatio: parseFloat(sortinoRatio.toFixed(2)),
            maxDrawdown: parseFloat((maxDrawdown * 100).toFixed(2)),
            currentDrawdown: parseFloat((currentDrawdown * 100).toFixed(2)),
            beta: parseFloat(beta.toFixed(2)),
            varDaily: parseFloat(varPercent.toFixed(2)),
            varAmount: Math.round(varAmount),
        },
        diversification,
        sectorBreakdown,
        stressTest,
        scoreBreakdown: breakdown,
        explanations,
        portfolioValues: portfolioValues.map((v, i) => ({
            day: i,
            value: Math.round(v),
        })),
        computedAt: new Date().toISOString(),
    };
}


// ══════════════════════════════════════════════════════════════
// EXPORTS
// ══════════════════════════════════════════════════════════════

module.exports = {
    computeDailyReturns,
    simulatePortfolioHistory,
    computeVolatility,
    computeSharpeRatio,
    computeSortinoRatio,
    computeMaxDrawdown,
    computeBeta,
    computeVaR,
    computeDiversificationMetrics,
    computeCompositeRiskScore,
    computeStressTest,
    computeWhatIf,
    buildSectorBreakdown,
    generateRiskExplanation,
    runFullAnalysis,
    // Constants (for testing)
    TRADING_DAYS_PER_YEAR,
    RISK_FREE_RATE_ANNUAL,
    VAR_CONFIDENCE,
};
