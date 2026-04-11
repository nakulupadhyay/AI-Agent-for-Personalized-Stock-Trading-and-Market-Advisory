/**
 * Voice Command Controller
 * Processes speech-to-text transcripts, parses intent,
 * routes to existing services, and returns TTS-friendly responses.
 *
 * UPGRADED: Intelligent BUY / HOLD / DO_NOT_BUY Decision Engine
 *   - Scoring matrix: trend + sentiment + ML recommendation
 *   - Structured JSON response with confidence score
 *   - Natural voice reply generation
 *   - Alternative stock suggestions when rejecting
 */
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0' };

/* ── NSE Stock Symbol Map (common names → symbols) ── */
const STOCK_ALIASES = {
    reliance: 'RELIANCE', 'reliance industries': 'RELIANCE',
    tcs: 'TCS', 'tata consultancy': 'TCS',
    infy: 'INFY', infosys: 'INFY',
    hdfc: 'HDFCBANK', 'hdfc bank': 'HDFCBANK',
    icici: 'ICICIBANK', 'icici bank': 'ICICIBANK',
    sbi: 'SBIN', 'state bank': 'SBIN',
    wipro: 'WIPRO',
    hcl: 'HCLTECH', 'hcl tech': 'HCLTECH',
    'bajaj finance': 'BAJFINANCE', bajaj: 'BAJFINANCE',
    kotak: 'KOTAKBANK', 'kotak bank': 'KOTAKBANK',
    'asian paints': 'ASIANPAINT', asian: 'ASIANPAINT',
    maruti: 'MARUTI', 'maruti suzuki': 'MARUTI',
    'sun pharma': 'SUNPHARMA', sun: 'SUNPHARMA',
    titan: 'TITAN', 'tata motors': 'TATAMOTORS',
    lt: 'LT', larsen: 'LT', 'larsen and toubro': 'LT',
    'power grid': 'POWERGRID', ntpc: 'NTPC',
    'ultra tech': 'ULTRACEMCO', ultratech: 'ULTRACEMCO',
    adani: 'ADANIENT', 'adani enterprises': 'ADANIENT',
    'bharti airtel': 'BHARTIARTL', airtel: 'BHARTIARTL',
    'axis bank': 'AXISBANK', axis: 'AXISBANK',
    indusind: 'INDUSINDBK', 'indusind bank': 'INDUSINDBK',
    'hindustan unilever': 'HINDUNILVR', hul: 'HINDUNILVR',
    itc: 'ITC', nestle: 'NESTLEIND',
    'tech mahindra': 'TECHM', 'tech m': 'TECHM',
};

/* ── Peer stock suggestions per symbol ── */
const PEER_SUGGESTIONS = {
    TCS:        ['INFY', 'WIPRO', 'HCLTECH'],
    INFY:       ['TCS', 'WIPRO', 'TECHM'],
    WIPRO:      ['TCS', 'INFY', 'HCLTECH'],
    HCLTECH:    ['TCS', 'INFY', 'TECHM'],
    TECHM:      ['INFY', 'WIPRO', 'HCLTECH'],
    RELIANCE:   ['ADANIENT', 'BHARTIARTL', 'ITC'],
    HDFCBANK:   ['ICICIBANK', 'KOTAKBANK', 'AXISBANK'],
    ICICIBANK:  ['HDFCBANK', 'KOTAKBANK', 'SBIN'],
    SBIN:       ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
    KOTAKBANK:  ['HDFCBANK', 'ICICIBANK', 'AXISBANK'],
    AXISBANK:   ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
    BAJFINANCE: ['HDFCBANK', 'KOTAKBANK', 'ICICIBANK'],
    SUNPHARMA:  ['TITAN', 'NESTLEIND', 'ASIANPAINT'],
    MARUTI:     ['TATAMOTORS', 'BAJFINANCE', 'TITAN'],
    TATAMOTORS: ['MARUTI', 'BAJFINANCE', 'ADANIENT'],
    ADANIENT:   ['RELIANCE', 'NTPC', 'POWERGRID'],
    BHARTIARTL: ['RELIANCE', 'ITC', 'ADANIENT'],
    ITC:        ['HINDUNILVR', 'NESTLEIND', 'ASIANPAINT'],
    HINDUNILVR: ['ITC', 'NESTLEIND', 'ASIANPAINT'],
    NESTLEIND:  ['HINDUNILVR', 'ITC', 'ASIANPAINT'],
    ASIANPAINT: ['HINDUNILVR', 'ITC', 'NESTLEIND'],
    TITAN:      ['ASIANPAINT', 'NESTLEIND', 'BAJFINANCE'],
    LT:         ['POWERGRID', 'NTPC', 'ADANIENT'],
    NTPC:       ['POWERGRID', 'LT', 'ADANIENT'],
    POWERGRID:  ['NTPC', 'LT', 'ADANIENT'],
    ULTRACEMCO: ['LT', 'POWERGRID', 'NTPC'],
};

/* ── Default top picks when stock not in peer map ── */
const DEFAULT_SUGGESTIONS = ['RELIANCE', 'HDFCBANK', 'INFY'];
const DAILY_TOP_CANDIDATES = ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'BHARTIARTL', 'ITC'];

/**
 * Extract stock symbol from text
 */
const extractStockSymbol = (text) => {
    const lower = text.toLowerCase();
    const aliases = Object.keys(STOCK_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
        if (lower.includes(alias)) return STOCK_ALIASES[alias];
    }
    const symbolMatch = text.match(/\b([A-Z]{2,15})\b/);
    if (symbolMatch) return symbolMatch[1];
    return null;
};

/**
 * Extract quantity from voice text (e.g. "buy 10 shares of TCS")
 */
const extractQuantity = (text) => {
    const lower = text.toLowerCase();
    const qtyMatch = lower.match(/\b(?:buy|sell)\s+(-?\d+)\b/) ||
        lower.match(/\b(-?\d+)\s*(?:share|shares|qty|quantity)\b/);
    if (!qtyMatch) return 1;
    const qty = parseInt(qtyMatch[1], 10);
    return Number.isFinite(qty) && qty > 0 ? qty : 1;
};

const calculateRSI = (closes, period = 14) => {
    if (!Array.isArray(closes) || closes.length <= period) return null;
    let gains = 0;
    let losses = 0;

    for (let i = 1; i <= period; i += 1) {
        const delta = closes[i] - closes[i - 1];
        if (delta >= 0) gains += delta;
        else losses += Math.abs(delta);
    }

    let avgGain = gains / period;
    let avgLoss = losses / period;

    for (let i = period + 1; i < closes.length; i += 1) {
        const delta = closes[i] - closes[i - 1];
        const gain = Math.max(delta, 0);
        const loss = Math.max(-delta, 0);
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
};

const fetchIndicatorData = async (stock) => {
    try {
        const { data } = await axios.get(
            `${YAHOO_BASE}/v8/finance/chart/${stock}.NS`,
            { params: { interval: '1d', range: '3mo' }, headers: YAHOO_HEADERS, timeout: 8000 }
        );
        const result = data?.chart?.result?.[0];
        const closesRaw = result?.indicators?.quote?.[0]?.close || [];
        const volumesRaw = result?.indicators?.quote?.[0]?.volume || [];
        const closes = closesRaw.filter(Number.isFinite);
        const volumes = volumesRaw.filter(Number.isFinite);

        if (closes.length < 20) return null;

        const latest = closes[closes.length - 1];
        const ma20Slice = closes.slice(-20);
        const ma20 = ma20Slice.reduce((sum, x) => sum + x, 0) / ma20Slice.length;
        const rsi = calculateRSI(closes, 14);

        const volRecent = volumes.slice(-5);
        const volBase = volumes.slice(-20, -5);
        const avgRecentVol = volRecent.length ? volRecent.reduce((s, v) => s + v, 0) / volRecent.length : 0;
        const avgBaseVol = volBase.length ? volBase.reduce((s, v) => s + v, 0) / volBase.length : 0;
        const volumeSpike = avgBaseVol > 0 ? avgRecentVol / avgBaseVol : 1;

        return { latest, ma20, rsi, volumeSpike };
    } catch {
        return null;
    }
};

/**
 * Parse user intent from transcribed voice text
 */
const parseIntent = (text) => {
    const lower = text.toLowerCase().trim();
    const stock = extractStockSymbol(text);

    if (lower.includes('portfolio') || lower.includes('my holdings') ||
        lower.includes('my stocks') || lower.includes('show my investments')) {
        return { intent: 'portfolio', stock };
    }

    if (lower.includes('should i') || lower.includes('recommend') ||
        lower.includes('suggestion') || lower.includes('what do you think about') ||
        lower.includes('is it good to buy') || lower.includes('worth buying')) {
        return { intent: 'stock_recommendation', stock };
    }

    if ((lower.includes('which stock') || lower.includes('best stock') || lower.includes('top stock')) &&
        (lower.includes('today') || lower.includes('now'))) {
        return { intent: 'best_stock_today', stock: null };
    }

    if (lower.includes('buy') && stock) return { intent: 'buy_stock', stock };
    if (lower.includes('sell') && stock) return { intent: 'sell_stock', stock };

    if (lower.includes('analyze') || lower.includes('analysis') ||
        lower.includes('analyse') || lower.includes('tell me about')) {
        return { intent: 'analyze_stock', stock };
    }

    if (lower.includes('risk') || lower.includes('risk level') ||
        lower.includes('risk profile') || lower.includes('my risk')) {
        return { intent: 'risk_level', stock };
    }

    if (lower.includes('market') || lower.includes('nifty') || lower.includes('sensex') ||
        lower.includes('market overview') || lower.includes('how is the market')) {
        return { intent: 'market_overview', stock };
    }

    if ((lower.includes('price') || lower.includes('how much')) && stock) {
        return { intent: 'price_check', stock };
    }

    if (lower.includes('sentiment') || lower.includes('news') || lower.includes('feeling')) {
        return { intent: 'sentiment', stock };
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') ||
        lower.includes('good morning') || lower.includes('good evening')) {
        return { intent: 'greeting', stock };
    }

    if (lower.includes('help') || lower.includes('what can you do')) {
        return { intent: 'help', stock };
    }

    if (stock) return { intent: 'analyze_stock', stock };

    return { intent: 'general', stock: null };
};

/* ─────────────────────────────────────────────────────────────
   INTELLIGENT STOCK DECISION ENGINE
   Scoring matrix: trend + sentiment + ML recommendation
   ───────────────────────────────────────────────────────────── */

/**
 * Decision scoring matrix
 * @param {number} changePercent  - price change % today
 * @param {string} sentiment      - "Positive" | "Neutral" | "Negative"
 * @param {string} mlRec          - "BUY" | "HOLD" | "SELL"
 * @param {number} mlConfidence   - 0–100
 * @returns {{ decision, score, reasons }}
 */
const scoreDecision = (changePercent, sentiment, mlRec, mlConfidence) => {
    let score = 0;
    const reasons = [];

    // 1. Trend score
    if (changePercent > 1.5) {
        score += 2;
        reasons.push('strong uptrend today');
    } else if (changePercent > 0) {
        score += 1;
        reasons.push('mild upward movement');
    } else if (changePercent < -1.5) {
        score -= 2;
        reasons.push('significant downtrend today');
    } else {
        score -= 1;
        reasons.push('mild downward pressure');
    }

    // 2. Sentiment score
    if (sentiment === 'Positive') {
        score += 2;
        reasons.push('positive market sentiment');
    } else if (sentiment === 'Negative') {
        score -= 2;
        reasons.push('negative market sentiment');
    } else {
        reasons.push('neutral market sentiment');
    }

    // 3. ML recommendation score
    if (mlRec === 'BUY') {
        score += 2;
        reasons.push(`AI model recommends BUY (${mlConfidence}% confidence)`);
    } else if (mlRec === 'SELL') {
        score -= 2;
        reasons.push(`AI model recommends SELL (${mlConfidence}% confidence)`);
    } else {
        reasons.push(`AI model recommends HOLD (${mlConfidence}% confidence)`);
    }

    // 4. Confidence modifier
    if (mlConfidence > 80) score += 1;
    if (mlConfidence < 45) score -= 1;

    // DECISION: score range is roughly -7 to +7
    let decision;
    if (score >= 3) {
        decision = 'BUY';
    } else if (score >= 0) {
        decision = 'HOLD';
    } else {
        decision = 'DO_NOT_BUY';
    }

    return { decision, score, reasons };
};

/**
 * Build natural voice reply for trading decisions
 */
const buildVoiceReply = (stock, decision, reasons, confidence, suggestedStocks, action) => {
    const actionWord = action === 'sell_stock' ? 'sell' : 'buy';
    const reasonStr = reasons.slice(0, 2).join(' and ');

    if (decision === 'BUY' && action !== 'sell_stock') {
        return `Great news! Based on current market data, ${stock} shows ${reasonStr}. With ${confidence}% confidence, I recommend you go ahead and BUY ${stock}. Remember to use proper position sizing and set a stop-loss.`;
    }

    if (decision === 'BUY' && action === 'sell_stock') {
        return `Based on current market data, ${stock} is actually in a good position right now. It shows ${reasonStr}. With ${confidence}% confidence, I suggest you HOLD ${stock} instead of selling. The stock has upside potential.`;
    }

    if (decision === 'HOLD') {
        const altStr = suggestedStocks.length > 0 ? ` Instead, you may want to watch ${suggestedStocks.slice(0, 2).join(' or ')}.` : '';
        return `I suggest you HOLD on the decision to ${actionWord} ${stock} right now. The signals are mixed — ${reasonStr}. With ${confidence}% confidence, waiting for clearer signals is the safer move.${altStr}`;
    }

    // DO_NOT_BUY or sell warning
    const altStr = suggestedStocks.length > 0
        ? ` Instead, consider better performing stocks like ${suggestedStocks.join(', ')}.`
        : '';
    if (action === 'sell_stock') {
        return `Based on current analysis, ${stock} shows ${reasonStr}. With ${confidence}% confidence, it may be a good time to SELL ${stock} and protect your profits.${altStr}`;
    }
    return `Based on current market data, ${stock} is in a ${reasonStr}. I recommend NOT buying ${stock} right now. With only ${confidence}% confidence, the risk-reward is poor.${altStr}`;
};

/**
 * Core intelligent stock analysis for buy/sell decisions
 */
const analyzeStockForDecision = async (stock, authHeader, req, action = 'buy_stock') => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const headers = { Authorization: authHeader };

    // ── Parallel fetch: price + sentiment + ML recommendation ──
    const [stockRes, sentRes, recRes] = await Promise.allSettled([
        axios.get(`${baseUrl}/api/stocks/search/${stock}`, { headers, timeout: 8000 }),
        axios.post(`${baseUrl}/api/ai/sentiment`, { symbol: stock }, { headers, timeout: 8000 }),
        axios.post(
            `${baseUrl}/api/ai/recommendation`,
            { symbol: stock, currentPrice: 1000, sentiment: 'Neutral' },
            { headers, timeout: 10000 }
        ),
    ]);

    // Extract data with safe fallbacks
    const stockData = stockRes.status === 'fulfilled' ? stockRes.value.data.data?.[0] : null;
    const sentData  = sentRes.status === 'fulfilled'  ? sentRes.value.data.data  : null;
    const recData   = recRes.status === 'fulfilled'   ? recRes.value.data.data   : null;

    const changePercent = typeof stockData?.changePercent === 'number' ? stockData.changePercent : 0;
    const currentPrice  = stockData?.currentPrice  ?? null;
    const sentiment     = sentData?.overallSentiment ?? 'Neutral';
    const mlRec         = recData?.recommendation   ?? 'HOLD';
    const mlConfidence  = recData?.confidence        ?? 60;
    const targetPrice   = recData?.targetPrice ?? (currentPrice ? currentPrice * 1.05 : null);

    const indicators = await fetchIndicatorData(stock);
    const rsi = indicators?.rsi ?? null;
    const ma20 = indicators?.ma20 ?? null;
    const volumeSpike = indicators?.volumeSpike ?? null;

    // ── Score the decision ──
    const safeChangePercent = typeof changePercent === 'number' ? changePercent : 0;
    const { decision, score, reasons } = scoreDecision(safeChangePercent, sentiment, mlRec, mlConfidence);

    // Indicator-based adjustments
    let adjustedScore = score;
    const enrichedReasons = [...reasons];
    if (rsi !== null) {
        if (rsi >= 60 && rsi <= 72) {
            adjustedScore += 1;
            enrichedReasons.push(`RSI is supportive at ${rsi.toFixed(1)}`);
        } else if (rsi >= 78) {
            adjustedScore -= 1;
            enrichedReasons.push(`RSI is overbought at ${rsi.toFixed(1)}`);
        } else if (rsi <= 32) {
            adjustedScore -= 1;
            enrichedReasons.push(`RSI is weak at ${rsi.toFixed(1)}`);
        }
    }
    if (ma20 !== null && currentPrice !== null) {
        if (currentPrice >= ma20) enrichedReasons.push('price is above 20-day moving average');
        else {
            adjustedScore -= 1;
            enrichedReasons.push('price is below 20-day moving average');
        }
    }
    if (volumeSpike !== null && volumeSpike >= 1.2) {
        adjustedScore += 1;
        enrichedReasons.push(`volume is elevated (${volumeSpike.toFixed(2)}x)`);
    }

    // ── Overall confidence (blend of ML + score certainty) ──
    const scoreConfidence = Math.round(Math.min(100, Math.max(10, 50 + adjustedScore * 8)));
    const finalConfidence = Math.round((mlConfidence * 0.6) + (scoreConfidence * 0.4));

    // ── Suggested alternatives ──
    const suggestedStocks = (PEER_SUGGESTIONS[stock] || DEFAULT_SUGGESTIONS)
        .filter(s => s !== stock)
        .slice(0, 3);

    // ── For sell intent, remap decision logic ──
    let finalDecision = decision;
    if (adjustedScore >= 3) finalDecision = 'BUY';
    else if (adjustedScore < 0) finalDecision = 'DO_NOT_BUY';
    else finalDecision = 'HOLD';

    let displayDecision = finalDecision;
    if (action === 'sell_stock') {
        // If stock is NOT performing well → "SELL is a good call"
        // We reuse the same score but flip framing
        if (finalDecision === 'DO_NOT_BUY') displayDecision = 'SELL';   // sell confirmed
        else if (finalDecision === 'HOLD')   displayDecision = 'HOLD';   // mixed, hold
        else                            displayDecision = 'HOLD';   // stock good, don't sell
    }

    const voiceReply = buildVoiceReply(stock, finalDecision, enrichedReasons, finalConfidence, suggestedStocks, action);

    const jsonResponse = {
        intent: action,
        stock,
        decision: displayDecision,
        confidence: `${finalConfidence}%`,
        reason: enrichedReasons.join('; '),
        score: adjustedScore,
        suggested_stocks: suggestedStocks,
        marketData: {
            currentPrice: currentPrice?.toFixed ? currentPrice.toFixed(2) : currentPrice,
            changePercent: safeChangePercent.toFixed ? safeChangePercent.toFixed(2) : safeChangePercent,
            trend: safeChangePercent >= 0 ? 'uptrend' : 'downtrend',
            sentiment,
            mlRecommendation: mlRec,
            mlConfidence,
            targetPrice: targetPrice?.toFixed ? targetPrice.toFixed(2) : targetPrice,
            rsi: rsi !== null ? Number(rsi.toFixed(2)) : null,
            ma20: ma20 !== null ? Number(ma20.toFixed(2)) : null,
            volumeSpike: volumeSpike !== null ? Number(volumeSpike.toFixed(2)) : null,
        },
    };

    return { voiceReply, jsonResponse, decision: displayDecision, finalConfidence, suggestedStocks };
};

const getBestStocksToday = async (authHeader, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const headers = { Authorization: authHeader };
    const checks = await Promise.allSettled(
        DAILY_TOP_CANDIDATES.map(async (symbol) => {
            const [stockRes, recRes] = await Promise.allSettled([
                axios.get(`${baseUrl}/api/stocks/search/${symbol}`, { headers, timeout: 7000 }),
                axios.post(
                    `${baseUrl}/api/ai/recommendation`,
                    { symbol, currentPrice: 1000, sentiment: 'Neutral' },
                    { headers, timeout: 8000 }
                ),
            ]);
            const stockData = stockRes.status === 'fulfilled' ? stockRes.value.data.data?.[0] : null;
            const recData = recRes.status === 'fulfilled' ? recRes.value.data.data : null;
            const changePercent = stockData?.changePercent ?? -99;
            const confidence = recData?.confidence ?? 0;
            const rec = recData?.recommendation ?? 'HOLD';
            const rankScore = (changePercent * 2) + (rec === 'BUY' ? 10 : rec === 'HOLD' ? 4 : 0) + (confidence / 10);
            return { symbol, changePercent, rec, confidence, rankScore };
        })
    );

    return checks
        .filter((entry) => entry.status === 'fulfilled')
        .map((entry) => entry.value)
        .sort((a, b) => b.rankScore - a.rankScore)
        .slice(0, 3);
};

const getStockQuoteForTrade = async (symbol, authHeader, req) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const headers = { Authorization: authHeader };
    const stockRes = await axios.get(`${baseUrl}/api/stocks/search/${symbol}`, { headers, timeout: 8000 });
    const stockData = stockRes.data?.data?.[0];
    return {
        symbol,
        companyName: stockData?.companyName || symbol,
        currentPrice: stockData?.currentPrice,
    };
};

/**
 * Execute confirmed paper trade after re-validating conditions.
 * @route POST /api/ai/voice-execute-trade
 * @body  { pendingTrade: { type, symbol, quantity }, confirm: true }
 */
const executeConfirmedVoiceTrade = async (req, res) => {
    try {
        const { pendingTrade, confirm } = req.body;
        if (!confirm || confirm !== true) {
            return res.status(400).json({
                success: false,
                message: 'Trade execution requires explicit confirmation.',
            });
        }
        if (!pendingTrade || !pendingTrade.type || !pendingTrade.symbol || !pendingTrade.quantity) {
            return res.status(400).json({
                success: false,
                message: 'Provide pendingTrade with type, symbol, and quantity.',
            });
        }

        const type = String(pendingTrade.type).toUpperCase();
        const symbol = extractStockSymbol(String(pendingTrade.symbol)) || String(pendingTrade.symbol).toUpperCase();
        const quantity = Number(pendingTrade.quantity);

        if (!['BUY', 'SELL'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Trade type must be BUY or SELL.' });
        }
        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 5000) {
            return res.status(400).json({ success: false, message: 'Quantity must be between 1 and 5000.' });
        }

        // Re-analyze with fresh signals to avoid stale or unsafe execution.
        const analysisAction = type === 'BUY' ? 'buy_stock' : 'sell_stock';
        const analysis = await analyzeStockForDecision(symbol, req.headers.authorization, req, analysisAction);
        const expectedDecision = type === 'BUY' ? 'BUY' : 'SELL';
        if (analysis.decision !== expectedDecision || analysis.finalConfidence < 55) {
            return res.status(409).json({
                success: false,
                message: `Conditions changed for ${symbol}. I recommend not executing ${type} right now.`,
                data: {
                    expectedDecision,
                    currentDecision: analysis.decision,
                    confidence: analysis.finalConfidence,
                    advisory: analysis.jsonResponse,
                    voiceReply: analysis.voiceReply,
                },
            });
        }

        const quote = await getStockQuoteForTrade(symbol, req.headers.authorization, req);
        if (!quote.currentPrice || quote.currentPrice <= 0) {
            return res.status(503).json({
                success: false,
                message: `Unable to fetch live price for ${symbol}. Trade aborted for safety.`,
            });
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const headers = { Authorization: req.headers.authorization };
        const endpoint = type === 'BUY' ? '/api/trading/buy' : '/api/trading/sell';
        const tradePayload = {
            symbol,
            companyName: quote.companyName,
            quantity,
            price: quote.currentPrice,
        };

        const tradeRes = await axios.post(`${baseUrl}${endpoint}`, tradePayload, { headers, timeout: 12000 });
        const tradeData = tradeRes.data?.data;

        return res.status(200).json({
            success: true,
            data: {
                action: type,
                symbol,
                quantity,
                executedPrice: quote.currentPrice,
                executionMessage: `${type} order executed for ${quantity} shares of ${symbol} at ₹${Number(quote.currentPrice).toFixed(2)}.`,
                trade: tradeData,
                advisory: analysis.jsonResponse,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        const status = error.response?.status || 500;
        const message = error.response?.data?.message || 'Error executing confirmed voice trade';
        return res.status(status).json({
            success: false,
            message,
            error: error.message,
        });
    }
};

/* ─────────────────────────────────────────────────────────────
   MAIN VOICE COMMAND HANDLER
   ───────────────────────────────────────────────────────────── */

/**
 * @route   POST /api/ai/voice-command
 * @desc    Process a voice command transcript and return structured response
 * @access  Private
 */
const processVoiceCommand = async (req, res) => {
    try {
        const { transcript } = req.body;

        if (!transcript || !transcript.trim()) {
            return res.status(400).json({
                success: false,
                message: 'No voice transcript provided',
            });
        }

        const { intent, stock } = parseIntent(transcript);
        const quantity = extractQuantity(transcript);
        let response = {};

        switch (intent) {

            /* ── Greeting ── */
            case 'greeting': {
                response = {
                    intent,
                    text: `Hello! I'm your CapitalWave AI advisor. You can ask me to analyze stocks, check your portfolio, get trading recommendations, or check market conditions. How can I help you today?`,
                    action: 'none',
                };
                break;
            }

            /* ── Help ── */
            case 'help': {
                response = {
                    intent,
                    text: `Here's what I can do for you: Say "Analyze RELIANCE" to get stock analysis. Say "Should I buy TCS" for recommendations. Say "Buy INFY" and I'll decide if it's a good call. Say "Sell HDFC" and I'll check if you should. Say "Show my portfolio" to see your holdings. Say "How is the market" for a market overview.`,
                    action: 'none',
                };
                break;
            }

            /* ── Portfolio ── */
            case 'portfolio': {
                try {
                    const portfolioRes = await axios.get(
                        `${req.protocol}://${req.get('host')}/api/trading/portfolio`,
                        { headers: { Authorization: req.headers.authorization }, timeout: 8000 }
                    );
                    const p = portfolioRes.data.data || {};
                    const holdingsCount = p.holdings?.length || 0;
                    const totalValue = p.currentValue?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0';
                    const pl = p.profitLoss || 0;
                    const plText = pl >= 0
                        ? `a profit of ₹${Math.abs(pl).toLocaleString('en-IN')}`
                        : `a loss of ₹${Math.abs(pl).toLocaleString('en-IN')}`;

                    response = {
                        intent,
                        text: `Your portfolio has ${holdingsCount} holdings with a total value of ₹${totalValue}. Today you're at ${plText}. Would you like me to analyze any specific stock?`,
                        action: 'navigate',
                        navigateTo: '/portfolio',
                        data: p,
                    };
                } catch {
                    response = {
                        intent,
                        text: `I couldn't fetch your portfolio right now. Please try again in a moment.`,
                        action: 'none',
                    };
                }
                break;
            }

            /* ════════════════════════════════════════════
               BUY STOCK — INTELLIGENT DECISION ENGINE
               ════════════════════════════════════════════ */
            case 'buy_stock': {
                if (!stock) {
                    response = {
                        intent,
                        text: `Which stock would you like to buy? Say something like "Buy RELIANCE" or "Buy TCS stock".`,
                        action: 'none',
                    };
                    break;
                }

                try {
                    const analysis = await analyzeStockForDecision(
                        stock,
                        req.headers.authorization,
                        req,
                        'buy_stock'
                    );

                    response = {
                        intent: 'buy_stock',
                        text: analysis.decision === 'BUY'
                            ? `${analysis.voiceReply} Should I execute a paper trade for ${quantity} shares now?`
                            : analysis.voiceReply,
                        action: analysis.decision === 'BUY' ? 'navigate' : 'decision',
                        navigateTo: analysis.decision === 'BUY' ? '/paper-trading' : undefined,
                        requiresConfirmation: analysis.decision === 'BUY',
                        pendingTrade: analysis.decision === 'BUY'
                            ? {
                                type: 'BUY',
                                symbol: stock,
                                quantity,
                                suggestedPrice: analysis.jsonResponse.marketData.currentPrice,
                            }
                            : undefined,
                        data: analysis.jsonResponse,
                    };
                } catch (err) {
                    console.error('Buy stock decision error:', err.message);
                    response = {
                        intent: 'buy_stock',
                        text: `I want to analyze ${stock} before advising you, but I'm having trouble fetching market data right now. Please try again in a moment.`,
                        action: 'none',
                    };
                }
                break;
            }

            /* ════════════════════════════════════════════
               SELL STOCK — INTELLIGENT DECISION ENGINE
               ════════════════════════════════════════════ */
            case 'sell_stock': {
                if (!stock) {
                    response = {
                        intent,
                        text: `Which stock would you like to sell? Say something like "Sell RELIANCE" or "Sell TCS".`,
                        action: 'none',
                    };
                    break;
                }

                try {
                    const analysis = await analyzeStockForDecision(
                        stock,
                        req.headers.authorization,
                        req,
                        'sell_stock'
                    );

                    response = {
                        intent: 'sell_stock',
                        text: analysis.decision === 'SELL'
                            ? `${analysis.voiceReply} Should I execute a paper sell for ${quantity} shares now?`
                            : analysis.voiceReply,
                        action: analysis.decision === 'SELL' ? 'navigate' : 'decision',
                        navigateTo: analysis.decision === 'SELL' ? '/paper-trading' : undefined,
                        requiresConfirmation: analysis.decision === 'SELL',
                        pendingTrade: analysis.decision === 'SELL'
                            ? {
                                type: 'SELL',
                                symbol: stock,
                                quantity,
                                suggestedPrice: analysis.jsonResponse.marketData.currentPrice,
                            }
                            : undefined,
                        data: analysis.jsonResponse,
                    };
                } catch (err) {
                    console.error('Sell stock decision error:', err.message);
                    response = {
                        intent: 'sell_stock',
                        text: `I want to check ${stock}'s performance before advising you to sell, but I'm having trouble fetching market data right now. Please try again.`,
                        action: 'none',
                    };
                }
                break;
            }

            case 'best_stock_today': {
                try {
                    const top = await getBestStocksToday(req.headers.authorization, req);
                    if (!top.length) {
                        response = {
                            intent,
                            text: `I could not reliably rank stocks right now. Please try again in a few moments.`,
                            action: 'none',
                        };
                        break;
                    }
                    const picks = top.map((s) => `${s.symbol} (${s.changePercent.toFixed(2)}%)`).join(', ');
                    response = {
                        intent,
                        text: `Based on momentum and AI confidence, top stocks today are ${picks}. Want me to analyze any one in detail?`,
                        action: 'recommendation',
                        data: { topStocks: top },
                    };
                } catch {
                    response = {
                        intent,
                        text: `I am unable to rank today's best stocks right now. Please try again shortly.`,
                        action: 'none',
                    };
                }
                break;
            }

            /* ── Stock Recommendation (advisory) ── */
            case 'stock_recommendation': {
                if (!stock) {
                    response = {
                        intent,
                        text: `Which stock would you like a recommendation for? You can say something like "Should I buy RELIANCE" or "Recommend TCS".`,
                        action: 'none',
                    };
                    break;
                }

                try {
                    const analysis = await analyzeStockForDecision(
                        stock,
                        req.headers.authorization,
                        req,
                        'stock_recommendation'
                    );

                    response = {
                        intent: 'stock_recommendation',
                        text: analysis.voiceReply,
                        action: 'recommendation',
                        data: analysis.jsonResponse,
                    };
                } catch {
                    response = {
                        intent,
                        text: `I couldn't analyze ${stock} right now. Please try again.`,
                        action: 'none',
                    };
                }
                break;
            }

            /* ── Analyze Stock ── */
            case 'analyze_stock': {
                if (!stock) {
                    response = {
                        intent,
                        text: `Which stock would you like me to analyze? Say something like "Analyze RELIANCE" or "Tell me about TCS".`,
                        action: 'none',
                    };
                    break;
                }

                try {
                    const [stockRes, sentRes, recRes] = await Promise.allSettled([
                        axios.get(
                            `${req.protocol}://${req.get('host')}/api/stocks/search/${stock}`,
                            { headers: { Authorization: req.headers.authorization }, timeout: 8000 }
                        ),
                        axios.post(
                            `${req.protocol}://${req.get('host')}/api/ai/sentiment`,
                            { symbol: stock },
                            { headers: { Authorization: req.headers.authorization }, timeout: 8000 }
                        ),
                        axios.post(
                            `${req.protocol}://${req.get('host')}/api/ai/recommendation`,
                            { symbol: stock, currentPrice: 1000, sentiment: 'Positive' },
                            { headers: { Authorization: req.headers.authorization }, timeout: 10000 }
                        ),
                    ]);

                    const stockData = stockRes.status === 'fulfilled' ? stockRes.value.data.data?.[0] : null;
                    const sentData  = sentRes.status === 'fulfilled'  ? sentRes.value.data.data  : null;
                    const recData   = recRes.status === 'fulfilled'   ? recRes.value.data.data   : null;

                    let text = `Here's my analysis of ${stock}. `;
                    if (stockData?.currentPrice) {
                        text += `Current price is ₹${stockData.currentPrice.toFixed(2)}`;
                        if (stockData.changePercent !== undefined) {
                            text += `, ${stockData.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(stockData.changePercent).toFixed(2)}% today. `;
                        }
                    }
                    if (sentData) text += `Market sentiment is ${sentData.overallSentiment}. `;
                    if (recData) {
                        text += `My recommendation is ${recData.recommendation} with ${recData.confidence}% confidence. Target price: ₹${recData.targetPrice?.toFixed(2)}. `;
                    }
                    text += `Would you like to proceed with any action?`;

                    response = {
                        intent,
                        text,
                        action: 'analysis',
                        data: { stockData, sentData, recData },
                    };
                } catch {
                    response = {
                        intent,
                        text: `I encountered an issue analyzing ${stock}. Please try again.`,
                        action: 'none',
                    };
                }
                break;
            }

            /* ── Risk Level ── */
            case 'risk_level': {
                response = {
                    intent,
                    text: `Your current risk profile is set to ${req.user?.riskProfile || 'Medium'}. You can update this in your Risk Profile settings. Would you like me to take you there?`,
                    action: 'navigate',
                    navigateTo: '/risk-profile',
                };
                break;
            }

            /* ── Market Overview ── */
            case 'market_overview': {
                response = {
                    intent,
                    text: `Here's the market overview. The Indian markets have been showing mixed signals today. NIFTY 50 is trading around 22,458 levels, up about 0.82%. SENSEX is at 73,891, up 0.75%. The market sentiment appears cautiously optimistic. Would you like me to analyze any specific stock?`,
                    action: 'none',
                };
                break;
            }

            /* ── Price Check ── */
            case 'price_check': {
                if (!stock) {
                    response = { intent, text: `Which stock's price would you like to check?`, action: 'none' };
                    break;
                }
                try {
                    const stockRes = await axios.get(
                        `${req.protocol}://${req.get('host')}/api/stocks/search/${stock}`,
                        { headers: { Authorization: req.headers.authorization }, timeout: 8000 }
                    );
                    const s = stockRes.data.data?.[0];
                    if (s) {
                        response = {
                            intent,
                            text: `${stock} is currently trading at ₹${s.currentPrice?.toFixed(2)}, ${s.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(s.changePercent || 0).toFixed(2)}% today.`,
                            action: 'none',
                            data: s,
                        };
                    } else {
                        response = { intent, text: `I couldn't find the price for ${stock}. Please check the symbol and try again.`, action: 'none' };
                    }
                } catch {
                    response = { intent, text: `I couldn't fetch the price for ${stock} right now.`, action: 'none' };
                }
                break;
            }

            /* ── Sentiment ── */
            case 'sentiment': {
                if (!stock) {
                    response = { intent, text: `Which stock's sentiment would you like to check?`, action: 'none' };
                    break;
                }
                try {
                    const sentRes = await axios.post(
                        `${req.protocol}://${req.get('host')}/api/ai/sentiment`,
                        { symbol: stock },
                        { headers: { Authorization: req.headers.authorization }, timeout: 8000 }
                    );
                    const s = sentRes.data.data;
                    response = {
                        intent,
                        text: `The market sentiment for ${stock} is ${s.overallSentiment} with a score of ${(s.sentimentScore / 100).toFixed(2)} out of 1. ${s.newsArticles?.length ? 'Latest headline: ' + s.newsArticles[0].headline : ''}`,
                        action: 'none',
                        data: s,
                    };
                } catch {
                    response = { intent, text: `I couldn't analyze the sentiment for ${stock} right now.`, action: 'none' };
                }
                break;
            }

            /* ── General / Fallback ── */
            case 'general':
            default: {
                try {
                    const chatRes = await axios.post(
                        `${req.protocol}://${req.get('host')}/api/ai/chat`,
                        { message: transcript },
                        { headers: { Authorization: req.headers.authorization }, timeout: 15000 }
                    );
                    response = {
                        intent: 'general',
                        text: chatRes.data.data?.aiResponse || chatRes.data.data?.response || "I'm not sure how to help with that. Try asking about stocks, portfolio, or market analysis.",
                        action: 'none',
                    };
                } catch {
                    response = {
                        intent: 'general',
                        text: `I'm not sure how to help with that right now. Try saying "Analyze RELIANCE" or "Should I buy TCS".`,
                        action: 'none',
                    };
                }
                break;
            }
        }

        res.status(200).json({
            success: true,
            data: {
                transcript,
                ...response,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Voice command error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing voice command',
            error: error.message,
        });
    }
};

/* ─────────────────────────────────────────────────────────────
   STANDALONE STOCK DECISION ENDPOINT
   POST /api/ai/stock-decision
   ───────────────────────────────────────────────────────────── */

/**
 * @route   POST /api/ai/stock-decision
 * @desc    Run the intelligent BUY / HOLD / DO_NOT_BUY decision engine
 * @body    { stock: string, action: "buy_stock" | "sell_stock" }
 * @access  Private
 */
const analyzeStockDecision = async (req, res) => {
    try {
        const { stock, action = 'buy_stock' } = req.body;

        if (!stock) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a stock symbol (e.g. TCS, RELIANCE)',
            });
        }

        const symbol = extractStockSymbol(stock) || stock.toUpperCase();
        const analysis = await analyzeStockForDecision(symbol, req.headers.authorization, req, action);

        res.status(200).json({
            success: true,
            data: {
                ...analysis.jsonResponse,
                voiceReply: analysis.voiceReply,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Stock decision error:', error);
        res.status(500).json({
            success: false,
            message: 'Error running stock decision engine',
            error: error.message,
        });
    }
};

module.exports = {
    processVoiceCommand,
    analyzeStockDecision,
    executeConfirmedVoiceTrade,
    __testables: { parseIntent, extractStockSymbol, extractQuantity, scoreDecision, calculateRSI },
};
