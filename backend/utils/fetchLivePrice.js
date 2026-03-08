/**
 * Shared utility — Fetch live stock price from Yahoo Finance
 * Used by tradingController to get real-time prices for buy/sell orders
 */

const axios = require('axios');

const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

// ── Symbol → Yahoo Finance symbol mapping ────────────
const SYMBOL_MAP = {
    'RELIANCE': 'RELIANCE.NS', 'TCS': 'TCS.NS', 'INFY': 'INFY.NS',
    'HDFCBANK': 'HDFCBANK.NS', 'ICICIBANK': 'ICICIBANK.NS', 'WIPRO': 'WIPRO.NS',
    'SBIN': 'SBIN.NS', 'BHARTIARTL': 'BHARTIARTL.NS', 'ITC': 'ITC.NS',
    'LT': 'LT.NS', 'HINDUNILVR': 'HINDUNILVR.NS', 'BAJFINANCE': 'BAJFINANCE.NS',
    'MARUTI': 'MARUTI.NS', 'HCLTECH': 'HCLTECH.NS', 'AXISBANK': 'AXISBANK.NS',
    'KOTAKBANK': 'KOTAKBANK.NS', 'TATAMOTORS': 'TATAMOTORS.NS',
    'SUNPHARMA': 'SUNPHARMA.NS', 'ADANIENT': 'ADANIENT.NS', 'NTPC': 'NTPC.NS',
    'TITAN': 'TITAN.NS', 'POWERGRID': 'POWERGRID.NS', 'ASIANPAINT': 'ASIANPAINT.NS',
    'TECHM': 'TECHM.NS', 'ULTRACEMCO': 'ULTRACEMCO.NS', 'TATASTEEL': 'TATASTEEL.NS',
    'BAJAJFINSV': 'BAJAJFINSV.NS', 'COALINDIA': 'COALINDIA.NS', 'ONGC': 'ONGC.NS',
    'DRREDDY': 'DRREDDY.NS', 'DIVISLAB': 'DIVISLAB.NS', 'JSWSTEEL': 'JSWSTEEL.NS',
    'M&M': 'M&M.NS', 'NESTLEIND': 'NESTLEIND.NS', 'CIPLA': 'CIPLA.NS',
    'GRASIM': 'GRASIM.NS', 'HEROMOTOCO': 'HEROMOTOCO.NS', 'EICHERMOT': 'EICHERMOT.NS',
    'APOLLOHOSP': 'APOLLOHOSP.NS', 'BPCL': 'BPCL.NS', 'HINDALCO': 'HINDALCO.NS',
    'TATACONSUM': 'TATACONSUM.NS', 'INDUSINDBK': 'INDUSINDBK.NS',
    'ADANIPORTS': 'ADANIPORTS.NS', 'VEDL': 'VEDL.NS', 'ZOMATO': 'ZOMATO.NS',
    'PAYTM': 'PAYTM.NS', 'IRCTC': 'IRCTC.NS', 'DMART': 'DMART.NS',
    'PNB': 'PNB.NS', 'BANKBARODA': 'BANKBARODA.NS', 'IOC': 'IOC.NS',
    'HAL': 'HAL.NS', 'BEL': 'BEL.NS', 'TATAPOWER': 'TATAPOWER.NS',
    'DABUR': 'DABUR.NS', 'PIDILITIND': 'PIDILITIND.NS', 'BRITANNIA': 'BRITANNIA.NS',
    'GODREJCP': 'GODREJCP.NS', 'SIEMENS': 'SIEMENS.NS',
};

// ── Simple in-memory cache (short TTL for trading accuracy) ──
const priceCache = new Map();
const PRICE_CACHE_TTL = 60 * 1000; // 1 minute (shorter than stock list cache)

/**
 * Fetch the live market price for a given display symbol (e.g. 'TCS').
 * Returns { currentPrice, change, changePercent } or null on failure.
 */
const fetchLivePrice = async (symbol) => {
    // Check cache first
    const cached = priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_TTL) {
        return cached.data;
    }

    const yahooSymbol = SYMBOL_MAP[symbol.toUpperCase()] || `${symbol}.NS`;

    try {
        const response = await axios.get(`${YAHOO_BASE}/v8/finance/chart/${yahooSymbol}`, {
            params: { interval: '1d', range: '1d' },
            headers: YAHOO_HEADERS,
            timeout: 10000,
        });

        const result = response.data?.chart?.result?.[0];
        if (!result || !result.meta) return null;

        const meta = result.meta;
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose || price;
        const change = price - prevClose;
        const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

        const data = {
            currentPrice: price,
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
        };

        priceCache.set(symbol, { data, timestamp: Date.now() });
        return data;
    } catch (error) {
        console.error(`fetchLivePrice error for ${symbol}:`, error.message);
        return null;
    }
};

module.exports = { fetchLivePrice };
