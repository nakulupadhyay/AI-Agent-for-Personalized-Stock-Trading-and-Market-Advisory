/**
 * Quick sanity test for riskEngine.js
 * Run: node utils/riskEngine.test.js
 */
const riskEngine = require('./riskEngine');

console.log('═══════════════════════════════════════');
console.log(' Risk Engine — Unit Tests');
console.log('═══════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function assert(label, condition) {
    if (condition) {
        console.log(`  ✅ ${label}`);
        passed++;
    } else {
        console.log(`  ❌ ${label}`);
        failed++;
    }
}

// 1. Daily Returns
console.log('1. computeDailyReturns');
const prices = [100, 102, 99, 105, 103];
const returns = riskEngine.computeDailyReturns(prices);
assert('Returns array length = prices.length - 1', returns.length === 4);
assert('First return is positive (100→102)', returns[0] > 0);
assert('Second return is negative (102→99)', returns[1] < 0);
assert('Empty input returns []', riskEngine.computeDailyReturns([]).length === 0);

// 2. Volatility
console.log('\n2. computeVolatility');
const testReturns = [0.01, -0.02, 0.015, -0.005, 0.008, -0.01, 0.003];
const vol = riskEngine.computeVolatility(testReturns);
assert('Volatility > 0', vol > 0);
assert('Volatility < 1 (reasonable)', vol < 1);
assert('Zero returns → 0 volatility', riskEngine.computeVolatility([0, 0, 0]) === 0);
console.log(`    Computed annualized volatility: ${(vol * 100).toFixed(2)}%`);

// 3. Sharpe Ratio
console.log('\n3. computeSharpeRatio');
const sharpe = riskEngine.computeSharpeRatio(testReturns);
assert('Sharpe is a number', typeof sharpe === 'number');
assert('Sharpe is finite', isFinite(sharpe));
console.log(`    Computed Sharpe Ratio: ${sharpe.toFixed(4)}`);

// 4. Max Drawdown
console.log('\n4. computeMaxDrawdown');
const values = [100, 110, 105, 95, 100, 90, 115];
const dd = riskEngine.computeMaxDrawdown(values);
assert('Max drawdown > 0', dd.maxDrawdown > 0);
assert('Max drawdown <= 1', dd.maxDrawdown <= 1);
// Peak = 110, trough = 90 → 18.18%
assert('Max drawdown ≈ 18.18%', Math.abs(dd.maxDrawdown - 0.1818) < 0.01);
console.log(`    Max drawdown: ${(dd.maxDrawdown * 100).toFixed(2)}%`);

// 5. Beta
console.log('\n5. computeBeta');
const portfolioRet = [0.01, -0.02, 0.015, -0.005, 0.008];
const marketRet = [0.005, -0.01, 0.01, -0.002, 0.006];
const beta = riskEngine.computeBeta(portfolioRet, marketRet);
assert('Beta is a number', typeof beta === 'number');
assert('Beta is reasonable (0-3)', beta > 0 && beta < 3);
console.log(`    Computed Beta: ${beta.toFixed(4)}`);

// 6. VaR
console.log('\n6. computeVaR');
const manyReturns = Array.from({ length: 100 }, (_, i) => (Math.sin(i) * 0.03));
const var95 = riskEngine.computeVaR(manyReturns, 0.95, 100000);
assert('VaR percent > 0', var95.varPercent > 0);
assert('VaR amount > 0', var95.varAmount > 0);
console.log(`    VaR(95%): ${var95.varPercent.toFixed(2)}%, ₹${var95.varAmount.toLocaleString()}`);

// 7. Diversification
console.log('\n7. computeDiversificationMetrics');
const holdings = [
    { symbol: 'TCS', sector: 'IT', quantity: 10, currentPrice: 3500 },
    { symbol: 'INFY', sector: 'IT', quantity: 20, currentPrice: 1500 },
    { symbol: 'HDFCBANK', sector: 'Banking', quantity: 15, currentPrice: 1600 },
];
const totalVal = holdings.reduce((s, h) => s + h.quantity * h.currentPrice, 0);
const divMetrics = riskEngine.computeDiversificationMetrics(holdings, totalVal);
assert('HHI between 0 and 1', divMetrics.hhi > 0 && divMetrics.hhi <= 1);
assert('Sector concentration < 100', divMetrics.sectorConcentration < 100);
console.log(`    HHI: ${divMetrics.hhi}, Concentration: ${divMetrics.sectorConcentration}%`);

// 8. Composite Score
console.log('\n8. computeCompositeRiskScore');
const score = riskEngine.computeCompositeRiskScore({
    volatility: 0.20,
    sharpeRatio: 0.5,
    maxDrawdown: 0.12,
    varPercent: 2.5,
});
assert('Score between 0-100', score.riskScore >= 0 && score.riskScore <= 100);
assert('Category is valid', ['Low', 'Medium', 'High'].includes(score.riskCategory));
console.log(`    Score: ${score.riskScore}/100 → ${score.riskCategory}`);

// 9. Full Analysis
console.log('\n9. runFullAnalysis');
const analysis = riskEngine.runFullAnalysis({
    holdings: holdings.map(h => ({ ...h, averagePrice: h.currentPrice * 0.95 })),
    transactions: [],
});
assert('Analysis has riskScore', typeof analysis.riskScore === 'number');
assert('Analysis has riskCategory', typeof analysis.riskCategory === 'string');
assert('Analysis has metrics', analysis.metrics !== undefined);
assert('Analysis has explanations', Array.isArray(analysis.explanations));
console.log(`    Full analysis score: ${analysis.riskScore}/100 (${analysis.riskCategory})`);

// Summary
console.log('\n═══════════════════════════════════════');
console.log(` Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════');
process.exit(failed > 0 ? 1 : 0);
