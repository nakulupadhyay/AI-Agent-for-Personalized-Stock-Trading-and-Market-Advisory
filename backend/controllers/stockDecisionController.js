/**
 * Stock Decision Controller — AI Stock Advisor
 * ─────────────────────────────────────────────
 * Implements the full stock advisory rules:
 *  1. BUY query   → check uptrend → suggest if yes, warn if no
 *  2. SELL query  → check downtrend → confirm sell or suggest hold
 *  3. Always suggest one promising alternative stock
 *  4. Step-by-step reasoning: trend → sentiment → recommendation
 *
 * Multi-Model Priority:
 *   Gemini 2.0 Flash (key1) → Gemini 2.0 Flash (key2) → HuggingFace Mistral → Built-in Engine
 */

const axios = require('axios');

// ── API Clients ─────────────────────────────────────────────
const { GoogleGenAI } = require('@google/genai');

const gemini1 = process.env.GEMINI_API_KEY_1
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_1 })
    : null;
const gemini2 = process.env.GEMINI_API_KEY_2
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_2 })
    : null;
const HF_API_KEY = process.env.HF_API_KEY;
// HuggingFace router base — replaces deprecated api-inference.huggingface.co
const HF_ROUTER_URL = 'https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions';

// ── Yahoo Finance base ──
const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0' };

// ── Symbol alias map ─────────────────────────────────────────
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

// ── Peer suggestions map ──────────────────────────────────────
const PEER_SUGGESTIONS = {
    TCS: ['INFY', 'WIPRO', 'HCLTECH'],
    INFY: ['TCS', 'WIPRO', 'TECHM'],
    WIPRO: ['TCS', 'INFY', 'HCLTECH'],
    HCLTECH: ['TCS', 'INFY', 'TECHM'],
    TECHM: ['INFY', 'WIPRO', 'HCLTECH'],
    RELIANCE: ['ADANIENT', 'BHARTIARTL', 'ITC'],
    HDFCBANK: ['ICICIBANK', 'KOTAKBANK', 'AXISBANK'],
    ICICIBANK: ['HDFCBANK', 'KOTAKBANK', 'SBIN'],
    SBIN: ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
    KOTAKBANK: ['HDFCBANK', 'ICICIBANK', 'AXISBANK'],
    AXISBANK: ['HDFCBANK', 'ICICIBANK', 'KOTAKBANK'],
    BAJFINANCE: ['HDFCBANK', 'KOTAKBANK', 'ICICIBANK'],
    SUNPHARMA: ['TITAN', 'NESTLEIND', 'ASIANPAINT'],
    MARUTI: ['TATAMOTORS', 'BAJFINANCE', 'TITAN'],
    TATAMOTORS: ['MARUTI', 'BAJFINANCE', 'ADANIENT'],
    ADANIENT: ['RELIANCE', 'NTPC', 'POWERGRID'],
    BHARTIARTL: ['RELIANCE', 'ITC', 'ADANIENT'],
    ITC: ['HINDUNILVR', 'NESTLEIND', 'ASIANPAINT'],
    HINDUNILVR: ['ITC', 'NESTLEIND', 'ASIANPAINT'],
    TITAN: ['ASIANPAINT', 'NESTLEIND', 'BAJFINANCE'],
    LT: ['POWERGRID', 'NTPC', 'ADANIENT'],
    NTPC: ['POWERGRID', 'LT', 'ADANIENT'],
    ZOMATO: ['IRCTC', 'DMART', 'PAYTM'],
    IRCTC: ['ZOMATO', 'DMART', 'RELIANCE'],
};
const DEFAULT_SUGGESTIONS = ['RELIANCE', 'HDFCBANK', 'INFY'];

// ── Normalise symbol ─────────────────────────────────────────
const resolveSymbol = (text) => {
    const lower = (text || '').toLowerCase().trim();
    const keys = Object.keys(STOCK_ALIASES).sort((a, b) => b.length - a.length);
    for (const k of keys) if (lower.includes(k)) return STOCK_ALIASES[k];
    const m = text.match(/\b([A-Z]{2,15})\b/);
    return m ? m[1] : text.toUpperCase();
};

// ── Fetch live Yahoo quote ────────────────────────────────────
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

        // Build 5-day trend from timestamps
        const timestamps = result.timestamp || [];
        const closes = result.indicators?.quote?.[0]?.close || [];
        const trend5d = closes.filter(Boolean).slice(-5);
        const trendDir = trend5d.length >= 2
            ? trend5d[trend5d.length - 1] > trend5d[0] ? 'UP' : 'DOWN'
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

// ── Decision scoring engine ──────────────────────────────────
const scoreStock = (quote) => {
    if (!quote) return { score: 0, signals: ['no live data available'] };
    let score = 0;
    const signals = [];

    // 1. Daily change
    if (quote.changePercent > 2) { score += 3; signals.push(`Strong upward move today (+${quote.changePercent.toFixed(2)}%)`); }
    else if (quote.changePercent > 0.5) { score += 2; signals.push(`Mild upward movement (+${quote.changePercent.toFixed(2)}%)`); }
    else if (quote.changePercent > -0.5) { score += 0; signals.push(`Sideways/flat today (${quote.changePercent.toFixed(2)}%)`); }
    else if (quote.changePercent > -2) { score -= 2; signals.push(`Mild downward pressure (${quote.changePercent.toFixed(2)}%)`); }
    else { score -= 3; signals.push(`Significant decline today (${quote.changePercent.toFixed(2)}%)`); }

    // 2. 5-day trend
    if (quote.trend5d === 'UP') { score += 2; signals.push('5-day trend is bullish (upward)'); }
    else { score -= 2; signals.push('5-day trend is bearish (downward)'); }

    // 3. Price vs 50-day MA
    if (quote.currentPrice > quote.fiftyDayAvg * 1.02) { score += 1; signals.push('Trading above 50-day moving average'); }
    else if (quote.currentPrice < quote.fiftyDayAvg * 0.98) { score -= 1; signals.push('Trading below 50-day moving average'); }

    // 4. Volume
    if (quote.volume > 1_000_000) { score += 1; signals.push('Good trading volume'); }

    return { score, signals };
};

// ── Build structured advisory prompt for AI ──────────────────
const buildAdvisoryPrompt = (symbol, action, quote, scoreResult) => {
    const price = quote ? `₹${quote.currentPrice}` : 'unavailable';
    const chg = quote ? `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent}%` : 'N/A';
    const trend = quote?.trend5d || 'unknown';
    const ma50 = quote ? `₹${quote.fiftyDayAvg?.toFixed(2)}` : 'N/A';
    const vol = quote ? quote.volume.toLocaleString('en-IN') : 'N/A';

    return `You are CapitalWave AI Advisor, an expert in Indian stock markets (NSE/BSE).

A user wants to know: "${action === 'sell' ? `Should I sell ${symbol}?` : `Should I buy ${symbol}?`}"

REAL-TIME MARKET DATA for ${symbol} (NSE):
- Current Price: ${price}
- Today's Change: ${chg}
- 5-Day Trend: ${trend}
- 50-Day Moving Average: ${ma50}
- Volume: ${vol}
- Technical Score: ${scoreResult.score}/9
- Key Signals: ${scoreResult.signals.join('; ')}

RULES YOU MUST FOLLOW:
${action === 'buy'
        ? `1. If score >= 3 (trending up): RECOMMEND BUYING with confidence and step-by-step reasoning.
2. If score < 3 (trending down/sideways): WARN against buying and explain why.`
        : `1. If score < 0 (trending down): RECOMMEND SELLING and explain why.
2. If score >= 0 (trending up/sideways): RECOMMEND HOLDING instead of selling.`}
3. Always suggest ONE alternative promising Indian stock to watch.
4. Provide a step-by-step breakdown:
   Step 1: Current Trend Analysis
   Step 2: Market Sentiment
   Step 3: Final Recommendation

RESPONSE FORMAT (use exactly this JSON structure):
{
  "decision": "BUY" | "SELL" | "HOLD" | "DO_NOT_BUY",
  "confidence": <number 0-100>,
  "reasoning": "<2-3 sentence summary>",
  "steps": {
    "trend": "<trend analysis>",
    "sentiment": "<market sentiment assessment>",
    "recommendation": "<final clear recommendation>"
  },
  "alternativeStock": {
    "symbol": "<NSE symbol>",
    "reason": "<why this alternative looks promising>"
  },
  "riskWarning": "<brief risk warning>"
}

Respond ONLY with valid JSON. No extra text.`;
};

// ── Try Gemini ───────────────────────────────────────────────
const tryGemini = async (prompt, keyIndex = 1) => {
    const client = keyIndex === 1 ? gemini1 : gemini2;
    if (!client) return null;
    try {
        const response = await client.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });
        let text = typeof response.text === 'function' ? response.text() : response.text;
        if (!text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        }
        if (text && text.length > 10) return { text, source: `gemini_key${keyIndex}` };
        return null;
    } catch (e) {
        console.warn(`Gemini key ${keyIndex} failed:`, e.message);
        return null;
    }
};

// ── Try HuggingFace Mistral (via router.huggingface.co) ─────
const tryHuggingFace = async (prompt) => {
    if (!HF_API_KEY) return null;
    try {
        const { data } = await axios.post(
            HF_ROUTER_URL,
            {
                model: 'mistralai/Mistral-7B-Instruct-v0.3',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 600,
                temperature: 0.3,
            },
            {
                headers: {
                    Authorization: `Bearer ${HF_API_KEY}`,
                    'Content-Type': 'application/json',
                },
                timeout: 20000,
            }
        );
        const text = data.choices?.[0]?.message?.content;
        if (text && text.length > 10) return { text, source: 'huggingface_mistral' };
        return null;
    } catch (e) {
        console.warn('HuggingFace failed:', e.message);
        return null;
    }
};

// ── Parse JSON from AI response (robust) ────────────────────
const parseAIJson = (text) => {
    try {
        // Try to extract JSON block
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return null;
    } catch {
        return null;
    }
};

// ── Built-in fallback decision engine ────────────────────────
const builtInDecision = (symbol, action, quote, scoreResult) => {
    const { score, signals } = scoreResult;
    const peers = (PEER_SUGGESTIONS[symbol] || DEFAULT_SUGGESTIONS).filter(s => s !== symbol);
    const alt = peers[0] || 'RELIANCE';

    let decision, confidence, reasoning;

    if (action === 'buy') {
        if (score >= 3) {
            decision = 'BUY';
            confidence = Math.min(85, 50 + score * 5);
            reasoning = `${symbol} shows a strong upward trend today with bullish technical signals. The stock is performing well relative to recent averages.`;
        } else if (score >= 0) {
            decision = 'HOLD';
            confidence = 55;
            reasoning = `${symbol} shows mixed signals. Neither clearly bullish nor bearish. Waiting for a clearer trend is advisable.`;
        } else {
            decision = 'DO_NOT_BUY';
            confidence = Math.min(80, 50 + Math.abs(score) * 5);
            reasoning = `${symbol} is in a downtrend. Buying now may result in losses. Wait for reversal signals.`;
        }
    } else {
        if (score < 0) {
            decision = 'SELL';
            confidence = Math.min(80, 50 + Math.abs(score) * 5);
            reasoning = `${symbol} is showing weakness. Selling now to protect your capital may be wise.`;
        } else {
            decision = 'HOLD';
            confidence = 60;
            reasoning = `${symbol} is still performing reasonably well. Selling now may mean missing further upside.`;
        }
    }

    const changeStr = quote ? `${quote.changePercent > 0 ? '+' : ''}${quote.changePercent?.toFixed(2)}%` : 'N/A';

    return {
        decision,
        confidence,
        reasoning,
        steps: {
            trend: `${symbol} is ${quote?.trend5d === 'UP' ? 'in an uptrend' : 'in a downtrend'} over the past 5 days. Today's change: ${changeStr}.`,
            sentiment: signals.join('. ') + '.',
            recommendation: decision === 'BUY'
                ? `✅ Based on strong technical signals, BUY ${symbol} with a stop-loss at 3-5% below current price.`
                : decision === 'SELL'
                    ? `🔴 Based on bearish signals, SELL ${symbol} to protect capital.`
                    : decision === 'HOLD'
                        ? `⚠️ Mixed signals suggest HOLDing your current position.`
                        : `❌ Do not buy ${symbol} now — wait for trend reversal.`,
        },
        alternativeStock: {
            symbol: alt,
            reason: `${alt} is a sector peer with stronger recent momentum and better technical setup.`,
        },
        riskWarning: '⚠️ This is AI-generated analysis, not financial advice. Always consult a SEBI-registered advisor before investing.',
        source: 'built_in_engine',
    };
};

// ── Main: Full advisory for a stock ─────────────────────────
const getStockAdvice = async (req, res) => {
    try {
        const { symbol: rawSymbol, action = 'buy', question } = req.body;

        if (!rawSymbol && !question) {
            return res.status(400).json({
                success: false,
                message: 'Provide a stock symbol and action (buy/sell), or a question.',
            });
        }

        const symbol = resolveSymbol(rawSymbol || question || '');
        const actNorm = (action || '').toLowerCase().includes('sell') ? 'sell' : 'buy';

        // 1. Fetch live market data from Yahoo Finance
        const quote = await fetchLiveQuote(symbol);
        const scoreResult = scoreStock(quote);

        console.log(`📊 [StockDecision] ${symbol} | action=${actNorm} | score=${scoreResult.score} | price=₹${quote?.currentPrice}`);

        // 2. Build advisory prompt
        const prompt = buildAdvisoryPrompt(symbol, actNorm, quote, scoreResult);

        // 3. Multi-model AI chain
        let aiResult = null;
        let aiSource = 'built_in_engine';

        // Try Gemini key 1
        if (!aiResult) {
            const r = await tryGemini(prompt, 1);
            if (r) { aiResult = parseAIJson(r.text); aiSource = r.source; }
        }

        // Try Gemini key 2
        if (!aiResult) {
            const r = await tryGemini(prompt, 2);
            if (r) { aiResult = parseAIJson(r.text); aiSource = r.source; }
        }

        // Try HuggingFace Mistral
        if (!aiResult) {
            const r = await tryHuggingFace(prompt);
            if (r) { aiResult = parseAIJson(r.text); aiSource = r.source; }
        }

        // Built-in fallback
        if (!aiResult) {
            aiResult = builtInDecision(symbol, actNorm, quote, scoreResult);
            aiSource = 'built_in_engine';
        }

        // Ensure all required fields exist
        const finalResult = {
            symbol,
            action: actNorm,
            decision: aiResult.decision || 'HOLD',
            confidence: aiResult.confidence ?? 60,
            reasoning: aiResult.reasoning || 'Analysis generated.',
            steps: aiResult.steps || {},
            alternativeStock: aiResult.alternativeStock || {
                symbol: 'RELIANCE',
                reason: 'Strong fundamentals and consistent performer.',
            },
            riskWarning: aiResult.riskWarning || '⚠️ Not financial advice. Consult a SEBI advisor.',
            marketData: quote
                ? {
                    currentPrice: quote.currentPrice,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    high: quote.high,
                    low: quote.low,
                    volume: quote.volume,
                    trend5d: quote.trend5d,
                    fiftyDayAvg: quote.fiftyDayAvg,
                }
                : null,
            technicalScore: scoreResult.score,
            technicalSignals: scoreResult.signals,
            suggestedPeers: (PEER_SUGGESTIONS[symbol] || DEFAULT_SUGGESTIONS)
                .filter(s => s !== symbol)
                .slice(0, 3),
            aiSource,
            timestamp: new Date().toISOString(),
        };

        return res.status(200).json({ success: true, data: finalResult });
    } catch (error) {
        console.error('StockDecision error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error running stock decision engine',
            error: error.message,
        });
    }
};

// ── Dedicated chat endpoint for the ChatAdvisor page ─────────
const advisorChat = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, message: 'Message required' });
        }

        // Detect intent from the message
        const lower = message.toLowerCase();
        const isBuy = lower.includes('buy') || lower.includes('should i invest') || lower.includes('purchase');
        const isSell = lower.includes('sell');
        const isAbout = lower.includes('about') || lower.includes('analyze') || lower.includes('analysis') || lower.includes('tell me');

        // Extract symbol from message
        const symbolMatch = message.match(/\b([A-Z]{2,15})\b/);
        const namedSymbol = symbolMatch ? symbolMatch[1] : null;
        const aliasSymbol = resolveSymbol(message);
        const symbol = namedSymbol || aliasSymbol;

        // If message involves a stock and an action, use the advisory engine
        if (symbol && (isBuy || isSell || isAbout)) {
            const action = isSell ? 'sell' : 'buy';
            req.body = { symbol, action, question: message };
            return getStockAdvice(req, res);
        }

        // Otherwise, use Gemini for general financial chat
        const chatPrompt = `You are CapitalWave AI Advisor, an expert on Indian stock markets (NSE/BSE).
User asks: "${message}"

Provide a concise, helpful response in simple English using emojis for clarity (📊📈💡⚠️).
Focus on: Indian stocks, Nifty/Sensex, investing concepts, portfolio management.
Keep it under 250 words.
End with: "⚠️ Not financial advice. Consult a SEBI-registered advisor."`;

        let reply = null;
        let source = 'built_in';

        const r1 = await tryGemini(chatPrompt, 1);
        if (r1) { reply = r1.text; source = r1.source; }

        if (!reply) {
            const r2 = await tryGemini(chatPrompt, 2);
            if (r2) { reply = r2.text; source = r2.source; }
        }

        if (!reply) {
            const rh = await tryHuggingFace(chatPrompt);
            if (rh) { reply = rh.text; source = rh.source; }
        }

        if (!reply) {
            reply = `📊 I understand you're asking about "${message}". Let me help!\n\nFor specific stock advice, try:\n• "Should I buy TCS?"\n• "Analyze RELIANCE"\n• "Should I sell INFY?"\n\nFor general concepts:\n• "What is Nifty 50?"\n• "How does SIP work?"\n\n⚠️ Not financial advice. Consult a SEBI-registered advisor.`;
        }

        return res.status(200).json({
            success: true,
            data: {
                type: 'chat',
                userMessage: message,
                response: reply,
                aiResponse: reply,
                source,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('AdvisorChat error:', error);
        return res.status(500).json({ success: false, message: 'Chat error', error: error.message });
    }
};

module.exports = { getStockAdvice, advisorChat };
