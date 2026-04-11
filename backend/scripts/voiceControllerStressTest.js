const assert = require('assert');
const { __testables } = require('../controllers/voiceController');

const { parseIntent, extractStockSymbol, extractQuantity, scoreDecision, calculateRSI } = __testables;

const run = () => {
    // Intent and symbol extraction stress tests
    const commands = [
        ['Buy 10 shares of TCS immediately', 'buy_stock', 'TCS', 10],
        ['sell 5 shares of infosys now', 'sell_stock', 'INFY', 5],
        ['Should I buy Reliance?', 'stock_recommendation', 'RELIANCE', 1],
        ['Which stock is best today?', 'best_stock_today', null, 1],
        ['price of HDFC bank', 'price_check', 'HDFCBANK', 1],
        ['hello assistant', 'greeting', null, 1],
        ['I want risk profile details', 'risk_level', null, 1],
        ['analyze tech mahindra', 'analyze_stock', 'TECHM', 1],
        ['Buy -5 shares of TCS', 'buy_stock', 'TCS', 1],
        ['Sell zero shares of INFY', 'sell_stock', 'INFY', 1],
        ['Top stock now', 'best_stock_today', null, 1],
    ];

    commands.forEach(([text, expectedIntent, expectedSymbol, expectedQty]) => {
        const parsed = parseIntent(text);
        assert.strictEqual(parsed.intent, expectedIntent, `Intent mismatch for: "${text}"`);
        if (expectedSymbol) {
            assert.strictEqual(extractStockSymbol(text), expectedSymbol, `Symbol mismatch for: "${text}"`);
        }
        assert.strictEqual(extractQuantity(text), expectedQty, `Quantity mismatch for: "${text}"`);
    });

    // Decision engine edge cases
    const bullish = scoreDecision(3.2, 'Positive', 'BUY', 89);
    assert.strictEqual(bullish.decision, 'BUY', 'Bullish case should produce BUY');
    assert.ok(bullish.score >= 3, 'Bullish score expected >= 3');

    const bearish = scoreDecision(-3.1, 'Negative', 'SELL', 82);
    assert.strictEqual(bearish.decision, 'DO_NOT_BUY', 'Bearish case should produce DO_NOT_BUY');
    assert.ok(bearish.score < 0, 'Bearish score expected < 0');

    const mixed = scoreDecision(0.1, 'Neutral', 'HOLD', 42);
    assert.ok(['HOLD', 'DO_NOT_BUY'].includes(mixed.decision), 'Mixed case should be cautious');

    // RSI correctness sanity: monotonic up should be high RSI, down should be low RSI
    const upSeries = Array.from({ length: 30 }, (_, i) => 100 + i);
    const downSeries = Array.from({ length: 30 }, (_, i) => 130 - i);
    const rsiUp = calculateRSI(upSeries);
    const rsiDown = calculateRSI(downSeries);
    assert.ok(rsiUp !== null && rsiUp > 70, 'RSI should be high on persistent uptrend');
    assert.ok(rsiDown !== null && rsiDown < 30, 'RSI should be low on persistent downtrend');

    console.log('Voice controller stress tests passed.');
};

try {
    run();
    process.exit(0);
} catch (error) {
    console.error('Voice controller stress tests failed:', error.message);
    process.exit(1);
}
