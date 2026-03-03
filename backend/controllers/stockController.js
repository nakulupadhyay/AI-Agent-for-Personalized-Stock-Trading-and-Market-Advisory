/**
 * Stock Controller — Powered by Yahoo Finance API
 * Uses Yahoo Finance v8 chart API for real-time & historical stock data
 * No API key required — free unlimited access via public endpoints
 */

const axios = require('axios');

const YAHOO_BASE = 'https://query1.finance.yahoo.com';
const YAHOO_HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' };

// ── In-Memory Cache ──────────────────────────────
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCached = (key) => {
    const entry = cache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
    }
    cache.delete(key);
    return null;
};

const setCache = (key, data) => {
    cache.set(key, { data, timestamp: Date.now() });
};

// ── Default Indian Stock Symbols (NSE) ───────────
// Yahoo Finance uses .NS suffix for NSE stocks
const DEFAULT_SYMBOLS = [
    { yahoo: 'RELIANCE.NS', display: 'RELIANCE', name: 'Reliance Industries Ltd' },
    { yahoo: 'TCS.NS', display: 'TCS', name: 'Tata Consultancy Services' },
    { yahoo: 'INFY.NS', display: 'INFY', name: 'Infosys Limited' },
    { yahoo: 'HDFCBANK.NS', display: 'HDFCBANK', name: 'HDFC Bank Limited' },
    { yahoo: 'ICICIBANK.NS', display: 'ICICIBANK', name: 'ICICI Bank Limited' },
    { yahoo: 'WIPRO.NS', display: 'WIPRO', name: 'Wipro Limited' },
    { yahoo: 'SBIN.NS', display: 'SBIN', name: 'State Bank of India' },
    { yahoo: 'BHARTIARTL.NS', display: 'BHARTIARTL', name: 'Bharti Airtel Limited' },
    { yahoo: 'ITC.NS', display: 'ITC', name: 'ITC Limited' },
    { yahoo: 'LT.NS', display: 'LT', name: 'Larsen & Toubro Limited' },
];

// ── Fallback Mock Data ───────────────────────────
const FALLBACK_STOCKS = [
    { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', currentPrice: 2456.75, change: 12.30, changePercent: 0.50, high: 2470.00, low: 2440.50, volume: 5234567, marketCap: '16.5L Cr' },
    { symbol: 'TCS', companyName: 'Tata Consultancy Services', currentPrice: 3678.90, change: -15.60, changePercent: -0.42, high: 3695.00, low: 3665.25, volume: 2345678, marketCap: '13.4L Cr' },
    { symbol: 'INFY', companyName: 'Infosys Limited', currentPrice: 1543.20, change: 8.75, changePercent: 0.57, high: 1550.00, low: 1535.50, volume: 4567890, marketCap: '6.4L Cr' },
    { symbol: 'HDFCBANK', companyName: 'HDFC Bank Limited', currentPrice: 1687.35, change: 5.40, changePercent: 0.32, high: 1692.00, low: 1680.00, volume: 3456789, marketCap: '12.8L Cr' },
    { symbol: 'ICICIBANK', companyName: 'ICICI Bank Limited', currentPrice: 1056.80, change: -3.25, changePercent: -0.31, high: 1062.00, low: 1052.50, volume: 5678901, marketCap: '7.4L Cr' },
];

/**
 * Format market cap for display (₹ in Crores)
 */
const formatMarketCap = (cap) => {
    if (!cap) return '—';
    const crore = cap / 10000000;
    if (crore >= 100000) return `${(crore / 100000).toFixed(1)}L Cr`;
    if (crore >= 1000) return `${(crore / 1000).toFixed(1)}K Cr`;
    return `${crore.toFixed(0)} Cr`;
};

/**
 * Fetch a single stock quote from Yahoo Finance v8 chart API
 */
const fetchYahooQuote = async (yahooSymbol) => {
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

        return {
            currentPrice: price,
            change: parseFloat(change.toFixed(2)),
            changePercent: parseFloat(changePercent.toFixed(2)),
            high: meta.regularMarketDayHigh || price,
            low: meta.regularMarketDayLow || price,
            volume: meta.regularMarketVolume || 0,
            previousClose: prevClose,
            open: meta.regularMarketDayHigh ? price : price, // approximation
        };
    } catch (error) {
        console.error(`Yahoo Finance quote error for ${yahooSymbol}:`, error.message);
        return null;
    }
};

/**
 * @route   GET /api/stocks
 * @desc    Get live stock market data from Yahoo Finance
 * @access  Private
 */
const getStocks = async (req, res) => {
    try {
        const cacheKey = 'stocks_list';
        const cached = getCached(cacheKey);
        if (cached) {
            console.log('📦 Serving stocks from cache');
            return res.status(200).json({ success: true, count: cached.length, data: cached, source: 'cache' });
        }

        console.log('🌐 Fetching stocks from Yahoo Finance...');
        const results = [];
        let usedFallback = false;

        // Fetch all quotes concurrently (Yahoo has no strict rate limit)
        const quotePromises = DEFAULT_SYMBOLS.map(async (stock) => {
            const quote = await fetchYahooQuote(stock.yahoo);
            if (quote) {
                return {
                    symbol: stock.display,
                    companyName: stock.name,
                    currentPrice: quote.currentPrice,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    high: quote.high,
                    low: quote.low,
                    volume: quote.volume,
                    marketCap: '—',
                    open: quote.open,
                    previousClose: quote.previousClose,
                };
            } else {
                const fb = FALLBACK_STOCKS.find(f => f.symbol === stock.display);
                if (fb) { usedFallback = true; return fb; }
                return null;
            }
        });

        const resolved = await Promise.all(quotePromises);
        resolved.forEach(r => { if (r) results.push(r); });

        if (results.length === 0) {
            console.log('⚠️ All Yahoo Finance calls failed, using fallback data');
            setCache(cacheKey, FALLBACK_STOCKS);
            return res.status(200).json({ success: true, count: FALLBACK_STOCKS.length, data: FALLBACK_STOCKS, source: 'fallback' });
        }

        setCache(cacheKey, results);
        res.status(200).json({
            success: true,
            count: results.length,
            data: results,
            source: usedFallback ? 'partial_api' : 'yahoo_finance',
        });
    } catch (error) {
        console.error('Get stocks error:', error);
        res.status(200).json({ success: true, count: FALLBACK_STOCKS.length, data: FALLBACK_STOCKS, source: 'fallback' });
    }
};

/**
 * @route   GET /api/stocks/:symbol
 * @desc    Get detailed stock data with historical prices from Yahoo Finance
 * @access  Private
 */
const getStockDetails = async (req, res) => {
    try {
        const { symbol } = req.params;
        const cacheKey = `stock_detail_${symbol}`;
        const cached = getCached(cacheKey);
        if (cached) {
            console.log(`📦 Serving ${symbol} details from cache`);
            return res.status(200).json({ success: true, data: cached, source: 'cache' });
        }

        const mapping = DEFAULT_SYMBOLS.find(s => s.display === symbol.toUpperCase());
        const yahooSymbol = mapping ? mapping.yahoo : `${symbol}.NS`;

        console.log(`🌐 Fetching ${yahooSymbol} historical data from Yahoo Finance...`);

        const response = await axios.get(`${YAHOO_BASE}/v8/finance/chart/${yahooSymbol}`, {
            params: { interval: '1d', range: '3mo' },
            headers: YAHOO_HEADERS,
            timeout: 15000,
        });

        const chartResult = response.data?.chart?.result?.[0];

        if (!chartResult || !chartResult.timestamp) {
            console.log(`⚠️ No data for ${symbol}, using mock historical data`);
            return res.status(200).json({
                success: true,
                data: { symbol, prices: generateMockPrices(symbol), source: 'fallback' },
            });
        }

        const timestamps = chartResult.timestamp;
        const quotes = chartResult.indicators?.quote?.[0] || {};

        const prices = timestamps.map((ts, i) => ({
            date: new Date(ts * 1000).toISOString().split('T')[0],
            open: parseFloat((quotes.open?.[i] || 0).toFixed(2)),
            high: parseFloat((quotes.high?.[i] || 0).toFixed(2)),
            low: parseFloat((quotes.low?.[i] || 0).toFixed(2)),
            price: parseFloat((quotes.close?.[i] || 0).toFixed(2)),
            volume: quotes.volume?.[i] || 0,
        })).filter(p => p.price > 0); // Remove invalid data points

        const result = { symbol, prices, source: 'yahoo_finance' };
        setCache(cacheKey, result);

        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error('Get stock details error:', error);
        res.status(200).json({
            success: true,
            data: { symbol: req.params.symbol, prices: generateMockPrices(req.params.symbol), source: 'fallback' },
        });
    }
};

// ── Comprehensive Indian Stock Database for Local Search ──
const INDIAN_STOCKS_DB = [
    { yahoo: 'RELIANCE.NS', symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
    { yahoo: 'TCS.NS', symbol: 'TCS', name: 'Tata Consultancy Services' },
    { yahoo: 'INFY.NS', symbol: 'INFY', name: 'Infosys Limited' },
    { yahoo: 'HDFCBANK.NS', symbol: 'HDFCBANK', name: 'HDFC Bank Limited' },
    { yahoo: 'ICICIBANK.NS', symbol: 'ICICIBANK', name: 'ICICI Bank Limited' },
    { yahoo: 'WIPRO.NS', symbol: 'WIPRO', name: 'Wipro Limited' },
    { yahoo: 'SBIN.NS', symbol: 'SBIN', name: 'State Bank of India' },
    { yahoo: 'BHARTIARTL.NS', symbol: 'BHARTIARTL', name: 'Bharti Airtel Limited' },
    { yahoo: 'ITC.NS', symbol: 'ITC', name: 'ITC Limited' },
    { yahoo: 'LT.NS', symbol: 'LT', name: 'Larsen & Toubro Limited' },
    { yahoo: 'HINDUNILVR.NS', symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
    { yahoo: 'BAJFINANCE.NS', symbol: 'BAJFINANCE', name: 'Bajaj Finance Limited' },
    { yahoo: 'MARUTI.NS', symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd' },
    { yahoo: 'HCLTECH.NS', symbol: 'HCLTECH', name: 'HCL Technologies Limited' },
    { yahoo: 'AXISBANK.NS', symbol: 'AXISBANK', name: 'Axis Bank Limited' },
    { yahoo: 'KOTAKBANK.NS', symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd' },
    { yahoo: 'TATAMOTORS.NS', symbol: 'TATAMOTORS', name: 'Tata Motors Limited' },
    { yahoo: 'SUNPHARMA.NS', symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Ind' },
    { yahoo: 'ADANIENT.NS', symbol: 'ADANIENT', name: 'Adani Enterprises Limited' },
    { yahoo: 'NTPC.NS', symbol: 'NTPC', name: 'NTPC Limited' },
    { yahoo: 'TITAN.NS', symbol: 'TITAN', name: 'Titan Company Limited' },
    { yahoo: 'POWERGRID.NS', symbol: 'POWERGRID', name: 'Power Grid Corp of India' },
    { yahoo: 'ASIANPAINT.NS', symbol: 'ASIANPAINT', name: 'Asian Paints Limited' },
    { yahoo: 'TECHM.NS', symbol: 'TECHM', name: 'Tech Mahindra Limited' },
    { yahoo: 'ULTRACEMCO.NS', symbol: 'ULTRACEMCO', name: 'UltraTech Cement Limited' },
    { yahoo: 'TATASTEEL.NS', symbol: 'TATASTEEL', name: 'Tata Steel Limited' },
    { yahoo: 'BAJAJFINSV.NS', symbol: 'BAJAJFINSV', name: 'Bajaj Finserv Limited' },
    { yahoo: 'COALINDIA.NS', symbol: 'COALINDIA', name: 'Coal India Limited' },
    { yahoo: 'ONGC.NS', symbol: 'ONGC', name: 'Oil & Natural Gas Corp' },
    { yahoo: 'DRREDDY.NS', symbol: 'DRREDDY', name: 'Dr Reddys Laboratories' },
    { yahoo: 'DIVISLAB.NS', symbol: 'DIVISLAB', name: 'Divis Laboratories Ltd' },
    { yahoo: 'JSWSTEEL.NS', symbol: 'JSWSTEEL', name: 'JSW Steel Limited' },
    { yahoo: 'M&M.NS', symbol: 'M&M', name: 'Mahindra & Mahindra Ltd' },
    { yahoo: 'NESTLEIND.NS', symbol: 'NESTLEIND', name: 'Nestle India Limited' },
    { yahoo: 'CIPLA.NS', symbol: 'CIPLA', name: 'Cipla Limited' },
    { yahoo: 'GRASIM.NS', symbol: 'GRASIM', name: 'Grasim Industries Limited' },
    { yahoo: 'HEROMOTOCO.NS', symbol: 'HEROMOTOCO', name: 'Hero MotoCorp Limited' },
    { yahoo: 'EICHERMOT.NS', symbol: 'EICHERMOT', name: 'Eicher Motors Limited' },
    { yahoo: 'APOLLOHOSP.NS', symbol: 'APOLLOHOSP', name: 'Apollo Hospitals Enterprise' },
    { yahoo: 'BPCL.NS', symbol: 'BPCL', name: 'Bharat Petroleum Corp' },
    { yahoo: 'HINDALCO.NS', symbol: 'HINDALCO', name: 'Hindalco Industries Ltd' },
    { yahoo: 'TATACONSUM.NS', symbol: 'TATACONSUM', name: 'Tata Consumer Products' },
    { yahoo: 'INDUSINDBK.NS', symbol: 'INDUSINDBK', name: 'IndusInd Bank Limited' },
    { yahoo: 'ADANIPORTS.NS', symbol: 'ADANIPORTS', name: 'Adani Ports & SEZ Ltd' },
    { yahoo: 'VEDL.NS', symbol: 'VEDL', name: 'Vedanta Limited' },
    { yahoo: 'ZOMATO.NS', symbol: 'ZOMATO', name: 'Zomato Limited' },
    { yahoo: 'PAYTM.NS', symbol: 'PAYTM', name: 'One 97 Communications (Paytm)' },
    { yahoo: 'IRCTC.NS', symbol: 'IRCTC', name: 'Indian Railway Catering & Tourism' },
    { yahoo: 'DMART.NS', symbol: 'DMART', name: 'Avenue Supermarts (DMart)' },
    { yahoo: 'PNB.NS', symbol: 'PNB', name: 'Punjab National Bank' },
    { yahoo: 'BANKBARODA.NS', symbol: 'BANKBARODA', name: 'Bank of Baroda' },
    { yahoo: 'IOC.NS', symbol: 'IOC', name: 'Indian Oil Corporation' },
    { yahoo: 'HAL.NS', symbol: 'HAL', name: 'Hindustan Aeronautics Ltd' },
    { yahoo: 'BEL.NS', symbol: 'BEL', name: 'Bharat Electronics Limited' },
    { yahoo: 'TATAPOWER.NS', symbol: 'TATAPOWER', name: 'Tata Power Company Ltd' },
    { yahoo: 'DABUR.NS', symbol: 'DABUR', name: 'Dabur India Limited' },
    { yahoo: 'PIDILITIND.NS', symbol: 'PIDILITIND', name: 'Pidilite Industries Ltd' },
    { yahoo: 'BRITANNIA.NS', symbol: 'BRITANNIA', name: 'Britannia Industries Ltd' },
    { yahoo: 'GODREJCP.NS', symbol: 'GODREJCP', name: 'Godrej Consumer Products' },
    { yahoo: 'SIEMENS.NS', symbol: 'SIEMENS', name: 'Siemens Limited' },
];

/**
 * Search stocks locally from the database
 */
const searchStocksLocally = (query) => {
    const q = query.toLowerCase().trim();
    return INDIAN_STOCKS_DB.filter(stock =>
        stock.symbol.toLowerCase().includes(q) ||
        stock.name.toLowerCase().includes(q)
    );
};

/**
 * @route   GET /api/stocks/search/:query
 * @desc    Search for stocks — tries Yahoo Finance API first, falls back to local DB with live prices
 * @access  Private
 */
const searchStocks = async (req, res) => {
    try {
        const { query } = req.params;
        const cacheKey = `search_${query}`;
        const cached = getCached(cacheKey);
        if (cached) {
            return res.status(200).json({ success: true, data: cached });
        }

        let results = [];

        // Strategy 1: Try Yahoo Finance search API
        try {
            const response = await axios.get('https://query2.finance.yahoo.com/v1/finance/search', {
                params: {
                    q: query,
                    quotesCount: 15,
                    newsCount: 0,
                    enableFuzzyQuery: true,
                    quotesQueryId: 'tss_match_phrase_query',
                },
                headers: YAHOO_HEADERS,
                timeout: 5000,
            });

            const quotes = response.data?.quotes || [];
            results = quotes
                .filter(q => q.quoteType === 'EQUITY')
                .map(q => ({
                    symbol: q.symbol.replace('.NS', '').replace('.BO', ''),
                    name: q.longname || q.shortname || q.symbol,
                    yahooSymbol: q.symbol,
                    type: q.quoteType,
                    region: q.exchDisp || q.exchange,
                    currency: q.currency || 'INR',
                    exchange: q.exchange,
                }));

            console.log(`🔍 Yahoo search for "${query}" returned ${results.length} results`);
        } catch (yahooError) {
            console.log(`⚠️ Yahoo search API failed for "${query}": ${yahooError.message}`);
        }

        // Strategy 2: If Yahoo search returned nothing, use local database
        if (results.length === 0) {
            console.log(`🔍 Using local stock database for "${query}"`);
            const localMatches = searchStocksLocally(query);
            results = localMatches.map(stock => ({
                symbol: stock.symbol,
                name: stock.name,
                yahooSymbol: stock.yahoo,
                type: 'EQUITY',
                region: 'NSE',
                currency: 'INR',
                exchange: 'NSI',
            }));
        }

        // Strategy 3: Fetch live prices for the top results using the reliable v8 chart API
        const topResults = results.slice(0, 10);
        const enrichedResults = await Promise.all(
            topResults.map(async (stock) => {
                try {
                    const yahooSym = stock.yahooSymbol || `${stock.symbol}.NS`;
                    const quote = await fetchYahooQuote(yahooSym);
                    if (quote) {
                        return {
                            ...stock,
                            symbol: stock.symbol,
                            companyName: stock.name,
                            currentPrice: quote.currentPrice,
                            change: quote.change,
                            changePercent: quote.changePercent,
                            high: quote.high,
                            low: quote.low,
                            volume: quote.volume,
                        };
                    }
                } catch (e) {
                    // ignore individual fetch errors
                }
                // Return basic info even without live price
                return {
                    ...stock,
                    companyName: stock.name,
                };
            })
        );

        setCache(cacheKey, enrichedResults);
        res.status(200).json({ success: true, data: enrichedResults });
    } catch (error) {
        console.error('Search stocks error:', error);

        // Final fallback: search locally and return without live prices
        try {
            const localResults = searchStocksLocally(req.params.query).slice(0, 10).map(stock => ({
                symbol: stock.symbol,
                companyName: stock.name,
                name: stock.name,
                type: 'EQUITY',
                region: 'NSE',
                currency: 'INR',
            }));
            return res.status(200).json({ success: true, data: localResults });
        } catch (fallbackError) {
            res.status(500).json({ success: false, message: 'Failed to search stocks', error: error.message });
        }
    }
};

/**
 * Generate mock price data when API is unavailable
 */
const generateMockPrices = (symbol) => {
    const basePrice = symbol === 'RELIANCE' ? 2450 : symbol === 'TCS' ? 3650 : symbol === 'INFY' ? 1540 : 1600;
    const prices = [];
    const now = new Date();

    for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        prices.push({
            date: date.toISOString().split('T')[0],
            price: basePrice + (Math.random() - 0.45) * 100,
        });
    }
    return prices;
};

module.exports = { getStocks, getStockDetails, searchStocks };
