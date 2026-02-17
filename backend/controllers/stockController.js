/**
 * Stock Controller — Powered by Alpha Vantage API
 * Uses real-time stock data with in-memory caching to respect API rate limits
 * Free tier: 25 requests/day, so caching is critical
 */

const axios = require('axios');

const API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

// ── In-Memory Cache ──────────────────────────────
// Caches data for 5 minutes to avoid hitting rate limits
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

// ── Default Indian Stock Symbols (BSE/NSE) ──────
const DEFAULT_SYMBOLS = [
    { symbol: 'RELIANCE.BSE', displaySymbol: 'RELIANCE', companyName: 'Reliance Industries Ltd' },
    { symbol: 'TCS.BSE', displaySymbol: 'TCS', companyName: 'Tata Consultancy Services' },
    { symbol: 'INFY.BSE', displaySymbol: 'INFY', companyName: 'Infosys Limited' },
    { symbol: 'HDFCBANK.BSE', displaySymbol: 'HDFCBANK', companyName: 'HDFC Bank Limited' },
    { symbol: 'ICICIBANK.BSE', displaySymbol: 'ICICIBANK', companyName: 'ICICI Bank Limited' },
];

// ── Fallback Mock Data (when API is unavailable) ──
const FALLBACK_STOCKS = [
    { symbol: 'RELIANCE', companyName: 'Reliance Industries Ltd', currentPrice: 2456.75, change: 12.30, changePercent: 0.50, high: 2470.00, low: 2440.50, volume: 5234567, marketCap: '16.5L Cr' },
    { symbol: 'TCS', companyName: 'Tata Consultancy Services', currentPrice: 3678.90, change: -15.60, changePercent: -0.42, high: 3695.00, low: 3665.25, volume: 2345678, marketCap: '13.4L Cr' },
    { symbol: 'INFY', companyName: 'Infosys Limited', currentPrice: 1543.20, change: 8.75, changePercent: 0.57, high: 1550.00, low: 1535.50, volume: 4567890, marketCap: '6.4L Cr' },
    { symbol: 'HDFCBANK', companyName: 'HDFC Bank Limited', currentPrice: 1687.35, change: 5.40, changePercent: 0.32, high: 1692.00, low: 1680.00, volume: 3456789, marketCap: '12.8L Cr' },
    { symbol: 'ICICIBANK', companyName: 'ICICI Bank Limited', currentPrice: 1056.80, change: -3.25, changePercent: -0.31, high: 1062.00, low: 1052.50, volume: 5678901, marketCap: '7.4L Cr' },
];

/**
 * Fetch quote from Alpha Vantage GLOBAL_QUOTE
 */
const fetchQuote = async (avSymbol) => {
    try {
        const res = await axios.get(BASE_URL, {
            params: {
                function: 'GLOBAL_QUOTE',
                symbol: avSymbol,
                apikey: API_KEY,
            },
            timeout: 10000,
        });

        const quote = res.data['Global Quote'];
        if (!quote || !quote['05. price']) {
            return null;
        }

        return {
            currentPrice: parseFloat(quote['05. price']),
            change: parseFloat(quote['09. change']),
            changePercent: parseFloat(quote['10. change percent']?.replace('%', '')),
            high: parseFloat(quote['03. high']),
            low: parseFloat(quote['04. low']),
            volume: parseInt(quote['06. volume']),
            previousClose: parseFloat(quote['08. previous close']),
        };
    } catch (error) {
        console.error(`Alpha Vantage quote error for ${avSymbol}:`, error.message);
        return null;
    }
};

/**
 * @route   GET /api/stocks
 * @desc    Get live stock market data from Alpha Vantage
 * @access  Private
 */
const getStocks = async (req, res) => {
    try {
        // Check cache first
        const cacheKey = 'stocks_list';
        const cached = getCached(cacheKey);
        if (cached) {
            console.log('📦 Serving stocks from cache');
            return res.status(200).json({ success: true, count: cached.length, data: cached, source: 'cache' });
        }

        console.log('🌐 Fetching stocks from Alpha Vantage...');
        const results = [];
        let usedFallback = false;

        // Fetch quotes sequentially to avoid rate-limiting
        for (const stock of DEFAULT_SYMBOLS) {
            const quote = await fetchQuote(stock.symbol);
            if (quote) {
                results.push({
                    symbol: stock.displaySymbol,
                    companyName: stock.companyName,
                    currentPrice: quote.currentPrice,
                    change: quote.change,
                    changePercent: quote.changePercent,
                    high: quote.high,
                    low: quote.low,
                    volume: quote.volume,
                    marketCap: '—', // Alpha Vantage GLOBAL_QUOTE does not include market cap
                });
            } else {
                // If any single fetch fails, use fallback for that stock
                const fb = FALLBACK_STOCKS.find(f => f.symbol === stock.displaySymbol);
                if (fb) {
                    results.push(fb);
                    usedFallback = true;
                }
            }
        }

        // If all API calls failed, return full fallback
        if (results.length === 0) {
            console.log('⚠️ All API calls failed, using fallback data');
            setCache(cacheKey, FALLBACK_STOCKS);
            return res.status(200).json({ success: true, count: FALLBACK_STOCKS.length, data: FALLBACK_STOCKS, source: 'fallback' });
        }

        setCache(cacheKey, results);
        res.status(200).json({
            success: true,
            count: results.length,
            data: results,
            source: usedFallback ? 'partial_api' : 'alpha_vantage',
        });
    } catch (error) {
        console.error('Get stocks error:', error);
        // Graceful degradation — return fallback data
        res.status(200).json({
            success: true,
            count: FALLBACK_STOCKS.length,
            data: FALLBACK_STOCKS,
            source: 'fallback',
        });
    }
};

/**
 * @route   GET /api/stocks/:symbol
 * @desc    Get detailed stock data with historical prices from Alpha Vantage
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

        // Look up the Alpha Vantage symbol mapping
        const mapping = DEFAULT_SYMBOLS.find(s => s.displaySymbol === symbol.toUpperCase());
        const avSymbol = mapping ? mapping.symbol : `${symbol}.BSE`;

        console.log(`🌐 Fetching ${avSymbol} historical data from Alpha Vantage...`);
        const response = await axios.get(BASE_URL, {
            params: {
                function: 'TIME_SERIES_DAILY',
                symbol: avSymbol,
                outputsize: 'compact', // Last 100 data points
                apikey: API_KEY,
            },
            timeout: 15000,
        });

        const timeSeries = response.data['Time Series (Daily)'];

        if (!timeSeries) {
            // API limit reached or symbol not found — return mock data
            console.log(`⚠️ No data for ${symbol}, using mock historical data`);
            const mockData = {
                symbol,
                prices: generateMockPrices(symbol),
                source: 'fallback',
            };
            return res.status(200).json({ success: true, data: mockData });
        }

        // Convert to array format sorted by date ascending
        const prices = Object.entries(timeSeries)
            .map(([date, values]) => ({
                date,
                open: parseFloat(values['1. open']),
                high: parseFloat(values['2. high']),
                low: parseFloat(values['3. low']),
                price: parseFloat(values['4. close']),
                volume: parseInt(values['5. volume']),
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date));

        const result = {
            symbol,
            prices,
            source: 'alpha_vantage',
        };

        setCache(cacheKey, result);

        res.status(200).json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('Get stock details error:', error);
        // Fallback mock historical data
        res.status(200).json({
            success: true,
            data: {
                symbol: req.params.symbol,
                prices: generateMockPrices(req.params.symbol),
                source: 'fallback',
            },
        });
    }
};

/**
 * @route   GET /api/stocks/search/:query
 * @desc    Search for stocks using Alpha Vantage SYMBOL_SEARCH
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

        const response = await axios.get(BASE_URL, {
            params: {
                function: 'SYMBOL_SEARCH',
                keywords: query,
                apikey: API_KEY,
            },
            timeout: 10000,
        });

        const matches = response.data.bestMatches || [];
        const results = matches.map(m => ({
            symbol: m['1. symbol'],
            name: m['2. name'],
            type: m['3. type'],
            region: m['4. region'],
            currency: m['8. currency'],
        }));

        setCache(cacheKey, results);

        res.status(200).json({
            success: true,
            data: results,
        });
    } catch (error) {
        console.error('Search stocks error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search stocks',
            error: error.message,
        });
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
        // Skip weekends
        if (date.getDay() === 0 || date.getDay() === 6) continue;
        prices.push({
            date: date.toISOString().split('T')[0],
            price: basePrice + (Math.random() - 0.45) * 100,
        });
    }
    return prices;
};

module.exports = { getStocks, getStockDetails, searchStocks };
