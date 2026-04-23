/**
 * Stock Assistant Controller — Zerodha Kite + ChatGPT Style
 * ──────────────────────────────────────────────────────────
 * Strict response format with BUY/SELL/HOLD signals, confidence,
 * structured reasoning, and Hinglish voice summaries.
 *
 * Endpoints:
 *   POST /api/stock-assistant/top-picks   → "Which stock should I buy today?"
 *   POST /api/stock-assistant/analyze     → "Should I buy [stock]?"
 *   POST /api/stock-assistant/chat        → Smart NLP router
 */

const axios = require('axios');

// ── Gemini AI Client ────────────────────────────────────────
const { GoogleGenAI } = require('@google/genai');

const gemini1 = process.env.GEMINI_API_KEY_1
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_1 })
    : null;
const gemini2 = process.env.GEMINI_API_KEY_2
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_2 })
    : null;

// ── Yahoo Finance ───────────────────────────────────────────
const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0' };

// ── NIFTY 50 Candidate Pool ─────────────────────────────────
const NIFTY_CANDIDATES = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK',
    'BHARTIARTL', 'ITC', 'SBIN', 'MARUTI', 'TITAN',
    'BAJFINANCE', 'WIPRO', 'HCLTECH', 'LT', 'SUNPHARMA',
    'NTPC', 'POWERGRID', 'TATAMOTORS', 'ADANIENT', 'KOTAKBANK',
];

// ── Stock Aliases ───────────────────────────────────────────
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
    'asian paints': 'ASIANPAINT',
    maruti: 'MARUTI', 'maruti suzuki': 'MARUTI',
    'sun pharma': 'SUNPHARMA', sun: 'SUNPHARMA',
    titan: 'TITAN', 'tata motors': 'TATAMOTORS',
    lt: 'LT', larsen: 'LT',
    'power grid': 'POWERGRID', ntpc: 'NTPC',
    ultratech: 'ULTRACEMCO',
    adani: 'ADANIENT',
    airtel: 'BHARTIARTL', 'bharti airtel': 'BHARTIARTL',
    'axis bank': 'AXISBANK', axis: 'AXISBANK',
    indusind: 'INDUSINDBK',
    hul: 'HINDUNILVR', 'hindustan unilever': 'HINDUNILVR',
    itc: 'ITC', nestle: 'NESTLEIND',
    'tech mahindra': 'TECHM',
    zomato: 'ZOMATO', paytm: 'PAYTM',
    irctc: 'IRCTC', dmart: 'DMART',
};

// ── Resolve symbol from text ────────────────────────────────
const resolveSymbol = (text) => {
    const lower = (text || '').toLowerCase().trim();
    const keys = Object.keys(STOCK_ALIASES).sort((a, b) => b.length - a.length);
    for (const k of keys) if (lower.includes(k)) return STOCK_ALIASES[k];
    const m = text.match(/\b([A-Z]{2,15})\b/);
    return m ? m[1] : text.toUpperCase().trim();
};

// ── Fetch live Yahoo quote ──────────────────────────────────
const fetchLiveQuote = async (symbol) => {
    try {
        const { data } = await axios.get(
            `${YAHOO_BASE}/v8/finance/chart/${symbol}.NS`,
            { params: { interval: '1d', range: '5d' }, headers: YAHOO_HEADERS, timeout: 8000 }
        );
        const result = data?.chart?.result?.[0];
        if (!result?.meta) return null;
        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prev = meta.chartPreviousClose || meta.previousClose || price;
        const chg = price - prev;
        const chgPct = prev > 0 ? (chg / prev) * 100 : 0;

        const closes = (result.indicators?.quote?.[0]?.close || []).filter(Boolean).slice(-5);
        const trendDir = closes.length >= 2
            ? closes[closes.length - 1] > closes[0] ? 'UP' : 'DOWN'
            : chgPct >= 0 ? 'UP' : 'DOWN';

        return {
            currentPrice: parseFloat(price.toFixed(2)),
            change: parseFloat(chg.toFixed(2)),
            changePercent: parseFloat(chgPct.toFixed(2)),
            high: meta.regularMarketDayHigh || price,
            low: meta.regularMarketDayLow || price,
            volume: meta.regularMarketVolume || 0,
            previousClose: prev,
            trend5d: trendDir,
            fiftyDayAvg: meta.fiftyDayAverage || price,
            twoHundredDayAvg: meta.twoHundredDayAverage || price,
        };
    } catch {
        return null;
    }
};

// ── Score a stock (0-9 scale) ───────────────────────────────
const scoreStock = (quote) => {
    if (!quote) return { score: 0, signals: ['no live data available'], trend: 'unknown', strength: 'unknown', risk: 'unknown' };
    let score = 0;
    const signals = [];

    // 1. Daily change
    if (quote.changePercent > 2) { score += 3; signals.push(`Strong upward move (+${quote.changePercent.toFixed(2)}%)`); }
    else if (quote.changePercent > 0.5) { score += 2; signals.push(`Mild upward (+${quote.changePercent.toFixed(2)}%)`); }
    else if (quote.changePercent > -0.5) { score += 0; signals.push(`Sideways (${quote.changePercent.toFixed(2)}%)`); }
    else if (quote.changePercent > -2) { score -= 2; signals.push(`Mild decline (${quote.changePercent.toFixed(2)}%)`); }
    else { score -= 3; signals.push(`Significant drop (${quote.changePercent.toFixed(2)}%)`); }

    // 2. 5-day trend
    if (quote.trend5d === 'UP') { score += 2; signals.push('5-day bullish trend'); }
    else { score -= 2; signals.push('5-day bearish trend'); }

    // 3. Price vs 50-day MA
    if (quote.currentPrice > quote.fiftyDayAvg * 1.02) { score += 1; signals.push('Above 50-day moving average'); }
    else if (quote.currentPrice < quote.fiftyDayAvg * 0.98) { score -= 1; signals.push('Below 50-day moving average'); }

    // 4. Volume
    if (quote.volume > 1_000_000) { score += 1; signals.push('Good volume'); }

    // Derive trend, strength, risk
    const trend = quote.trend5d === 'UP' ? 'Uptrend' : 'Downtrend';
    const strength = score >= 4 ? 'Strong' : score >= 2 ? 'Moderate' : score >= 0 ? 'Weak' : 'Very Weak';
    const risk = score >= 4 ? 'Low' : score >= 1 ? 'Medium' : 'High';

    return { score, signals, trend, strength, risk };
};

// ── Score → Signal & Confidence ─────────────────────────────
const scoreToSignal = (score) => {
    if (score >= 4) return { signal: 'BUY', confidence: Math.min(92, 65 + score * 4) };
    if (score >= 2) return { signal: 'BUY', confidence: Math.min(78, 55 + score * 5) };
    if (score >= 0) return { signal: 'HOLD', confidence: Math.min(65, 45 + score * 4) };
    if (score >= -2) return { signal: 'HOLD', confidence: Math.min(55, 40 + Math.abs(score) * 3) };
    return { signal: 'SELL', confidence: Math.min(80, 50 + Math.abs(score) * 5) };
};

// ── Build Hinglish voice summary (specific stock) ───────────
const buildVoiceSummary = (symbol, signal, reason) => {
    if (signal === 'BUY') {
        return `${symbol} ke liye BUY signal hai. ${reason}. Yeh stock abhi buying opportunity de raha hai.`;
    }
    if (signal === 'SELL') {
        return `${symbol} ke liye SELL signal hai. ${reason}. Abhi sell karna safe rahega.`;
    }
    return `${symbol} ke liye HOLD signal hai. ${reason}. Abhi wait karna better hoga.`;
};

// ── Build Hinglish voice summary (top picks) ────────────────
const buildTopPicksVoice = (picks) => {
    if (!picks.length) return 'Abhi koi clear buying opportunity nahi hai. Market uncertain hai.';
    const names = picks.map(p => p.stock).join(' aur ');
    const reasons = picks.map(p => `${p.stock} mein ${p.reason.toLowerCase()}`).join(', ');
    return `Aaj ke liye top stocks hain ${names}. Inmein buying opportunity hai because ${reasons}.`;
};

// ── Try Gemini for AI-enhanced reasoning ────────────────────
const tryGeminiForAnalysis = async (prompt) => {
    const clients = [gemini1, gemini2].filter(Boolean);
    for (const client of clients) {
        try {
            const response = await client.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: prompt,
            });
            let text = typeof response.text === 'function' ? response.text() : response.text;
            if (!text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
                text = response.candidates[0].content.parts[0].text;
            }
            if (text && text.length > 10) return text;
        } catch (e) {
            console.warn('Gemini failed for stock assistant:', e.message);
        }
    }
    return null;
};

/* ════════════════════════════════════════════════════════════
   ENDPOINT 1: GET TOP PICKS TODAY
   "Which stock should I buy today?"
   ════════════════════════════════════════════════════════════ */
const getTopPicks = async (req, res) => {
    try {
        console.log('📊 [StockAssistant] Scanning top picks...');

        // Fetch quotes for all candidates in parallel
        const quotePromises = NIFTY_CANDIDATES.map(async (symbol) => {
            const quote = await fetchLiveQuote(symbol);
            const scoreResult = scoreStock(quote);
            const { signal, confidence } = scoreToSignal(scoreResult.score);
            return { symbol, quote, scoreResult, signal, confidence };
        });

        const results = await Promise.allSettled(quotePromises);
        const scored = results
            .filter(r => r.status === 'fulfilled' && r.value.quote)
            .map(r => r.value)
            .sort((a, b) => b.scoreResult.score - a.scoreResult.score);

        // Pick top 3 BUY-worthy stocks
        const topPicks = scored
            .filter(s => s.signal === 'BUY')
            .slice(0, 3)
            .map(s => {
                const shortReason = s.scoreResult.signals.slice(0, 2).join('. ');
                return {
                    stock: s.symbol,
                    signal: s.signal,
                    confidence: `${s.confidence}%`,
                    reason: shortReason,
                    price: `₹${s.quote.currentPrice}`,
                    change: `${s.quote.changePercent >= 0 ? '+' : ''}${s.quote.changePercent.toFixed(2)}%`,
                    trend: s.scoreResult.trend,
                    strength: s.scoreResult.strength,
                    risk: s.scoreResult.risk,
                };
            });

        // If no BUY signals, show top HOLD stocks
        if (topPicks.length === 0) {
            const holdPicks = scored.slice(0, 3).map(s => {
                const shortReason = s.scoreResult.signals.slice(0, 2).join('. ');
                return {
                    stock: s.symbol,
                    signal: s.signal,
                    confidence: `${s.confidence}%`,
                    reason: shortReason,
                    price: `₹${s.quote.currentPrice}`,
                    change: `${s.quote.changePercent >= 0 ? '+' : ''}${s.quote.changePercent.toFixed(2)}%`,
                    trend: s.scoreResult.trend,
                    strength: s.scoreResult.strength,
                    risk: s.scoreResult.risk,
                };
            });
            topPicks.push(...holdPicks);
        }

        const voiceSummary = buildTopPicksVoice(topPicks);

        return res.status(200).json({
            success: true,
            data: {
                type: 'top_picks',
                title: 'Top Picks Today',
                picks: topPicks,
                voiceSummary,
                scannedCount: scored.length,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('StockAssistant top-picks error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error scanning market for top picks',
            error: error.message,
        });
    }
};

/* ════════════════════════════════════════════════════════════
   ENDPOINT 2: ANALYZE SPECIFIC STOCK
   "Should I buy TCS?"
   ════════════════════════════════════════════════════════════ */
const analyzeStock = async (req, res) => {
    try {
        const { symbol: rawSymbol, query } = req.body;

        if (!rawSymbol && !query) {
            return res.status(400).json({
                success: false,
                message: 'Provide a stock symbol or query (e.g., "Should I buy TCS?")',
            });
        }

        const symbol = resolveSymbol(rawSymbol || query || '');
        console.log(`📊 [StockAssistant] Analyzing ${symbol}...`);

        // Fetch live data
        const quote = await fetchLiveQuote(symbol);
        const scoreResult = scoreStock(quote);
        const { signal, confidence } = scoreToSignal(scoreResult.score);

        // Build short reason
        const shortReason = scoreResult.signals.slice(0, 2).join('. ');

        // Try Gemini for enhanced reasoning
        let aiReasoning = null;
        if (quote) {
            const prompt = `You are an Indian stock market expert. Analyze ${symbol} (NSE).
Current Price: ₹${quote.currentPrice}, Change: ${quote.changePercent}%, 5-day trend: ${quote.trend5d}, Volume: ${quote.volume}.
Signal: ${signal}, Confidence: ${confidence}%.

Give a 2-sentence analysis covering trend & risk. Keep it simple. No disclaimers. No JSON.`;

            aiReasoning = await tryGeminiForAnalysis(prompt);
        }

        const result = {
            type: 'stock_analysis',
            stock: symbol,
            signal,
            confidence: `${confidence}%`,
            reason: {
                trend: scoreResult.trend,
                strength: scoreResult.strength,
                risk: scoreResult.risk,
                details: aiReasoning || shortReason,
            },
            marketData: quote ? {
                currentPrice: `₹${quote.currentPrice}`,
                change: `${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}%`,
                high: `₹${quote.high}`,
                low: `₹${quote.low}`,
                volume: quote.volume.toLocaleString('en-IN'),
                trend5d: quote.trend5d,
                fiftyDayAvg: `₹${quote.fiftyDayAvg?.toFixed(2)}`,
            } : null,
            voiceSummary: buildVoiceSummary(symbol, signal, shortReason),
            technicalScore: scoreResult.score,
            timestamp: new Date().toISOString(),
        };

        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('StockAssistant analyze error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error analyzing stock',
            error: error.message,
        });
    }
};

/* ════════════════════════════════════════════════════════════
   ENDPOINT 3: SMART CHAT
   Routes user messages to the appropriate handler
   ════════════════════════════════════════════════════════════ */
const smartChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message required' });
        }

        const lower = message.toLowerCase().trim();

        // ── Intent: "Which stock should I buy today?" ──
        const isTopPicksQuery =
            (lower.includes('which stock') && (lower.includes('buy') || lower.includes('today'))) ||
            (lower.includes('best stock') && lower.includes('today')) ||
            (lower.includes('top stock') || lower.includes('top picks')) ||
            (lower.includes('kya kharidun') || lower.includes('konsa stock')) ||
            lower.includes('recommend') && lower.includes('stock') ||
            lower === 'what should i buy today' ||
            lower === 'which stock should i buy today';

        if (isTopPicksQuery) {
            return getTopPicks(req, res);
        }

        // ── Intent: "Should I buy [stock]?" / Analyze specific stock ──
        const isSingleStockQuery =
            lower.includes('should i buy') ||
            lower.includes('should i sell') ||
            lower.includes('analyze') ||
            lower.includes('analyse') ||
            lower.includes('tell me about') ||
            lower.includes('how is') ||
            lower.includes('kya lagta hai');

        // Try to extract a stock symbol
        const symbolFromAlias = (() => {
            const keys = Object.keys(STOCK_ALIASES).sort((a, b) => b.length - a.length);
            for (const k of keys) if (lower.includes(k)) return STOCK_ALIASES[k];
            return null;
        })();
        const symbolFromCaps = message.match(/\b([A-Z]{2,15})\b/);
        const detectedSymbol = symbolFromAlias || (symbolFromCaps ? symbolFromCaps[1] : null);

        if (detectedSymbol && (isSingleStockQuery || detectedSymbol)) {
            req.body.symbol = detectedSymbol;
            return analyzeStock(req, res);
        }

        // ── Fallback: General financial chat via Gemini ──
        const chatPrompt = `You are CapitalWave AI, an expert Indian stock market advisor.
User asks: "${message}"

Respond concisely (under 200 words). Use emojis (📊📈💡⚠️).
Focus: Indian stocks, Nifty/Sensex, investing concepts.
End with: "⚠️ Not financial advice. Consult a SEBI-registered advisor."`;

        let reply = await tryGeminiForAnalysis(chatPrompt);

        if (!reply) {
            reply = `📊 I understand you're asking: "${message}"\n\nFor specific stock advice, try:\n• "Which stock should I buy today?"\n• "Should I buy TCS?"\n• "Analyze RELIANCE"\n\n⚠️ Not financial advice. Consult a SEBI-registered advisor.`;
        }

        return res.status(200).json({
            success: true,
            data: {
                type: 'general_chat',
                response: reply,
                voiceSummary: null,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('StockAssistant chat error:', error);
        return res.status(500).json({ success: false, message: 'Chat error', error: error.message });
    }
};

module.exports = { getTopPicks, analyzeStock, smartChat };
