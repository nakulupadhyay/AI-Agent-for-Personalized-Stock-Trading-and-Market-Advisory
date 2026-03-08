/**
 * AI Controller - Integrates with Python ML Model Service
 * Falls back to mock data if the Python service is unavailable
 */
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

/**
 * Check if the Python ML service is running
 */
const isMLServiceAvailable = async () => {
    try {
        const res = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 2000 });
        return res.status === 200;
    } catch {
        return false;
    }
};

/**
 * @route   POST /api/ai/recommendation
 * @desc    Get AI-powered stock recommendation
 * @access  Private
 */
const getRecommendation = async (req, res) => {
    try {
        const { symbol, currentPrice, sentiment } = req.body;

        if (!symbol || !currentPrice) {
            return res.status(400).json({
                success: false,
                message: 'Please provide symbol and current price',
            });
        }

        // Try Python ML service first
        const mlAvailable = await isMLServiceAvailable();

        if (mlAvailable) {
            try {
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/recommendation`, {
                    symbol,
                    currentPrice,
                    sentimentText: `${symbol} stock market analysis. Current sentiment: ${sentiment || 'neutral'}`,
                    model: 'finbert',
                }, { timeout: 10000 });

                if (mlResponse.data.success) {
                    return res.status(200).json({
                        success: true,
                        data: {
                            symbol,
                            recommendation: mlResponse.data.data.recommendation,
                            confidence: mlResponse.data.data.confidence,
                            reasoning: mlResponse.data.data.reasoning,
                            targetPrice: mlResponse.data.data.targetPrice || currentPrice * 1.05,
                            sentimentBreakdown: mlResponse.data.data.sentimentBreakdown,
                            model: mlResponse.data.data.model,
                            source: 'ai_model',
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (mlError) {
                console.warn('ML service call failed, falling back to mock:', mlError.message);
            }
        }

        // Fallback: Mock AI logic
        const priceChange = Math.random() * 10 - 5;
        const sentimentScore = sentiment === 'Positive' ? 0.7 : sentiment === 'Negative' ? 0.3 : 0.5;

        let recommendation;
        let confidence;
        let reasoning;

        const combinedScore = (priceChange > 0 ? 0.6 : 0.4) + sentimentScore * 0.4;

        if (combinedScore > 0.65) {
            recommendation = 'BUY';
            confidence = Math.min(75 + Math.random() * 20, 95);
            reasoning = 'Strong upward trend detected with positive market sentiment';
        } else if (combinedScore < 0.45) {
            recommendation = 'SELL';
            confidence = Math.min(70 + Math.random() * 20, 90);
            reasoning = 'Bearish indicators and negative sentiment analysis';
        } else {
            recommendation = 'HOLD';
            confidence = Math.min(60 + Math.random() * 25, 85);
            reasoning = 'Mixed signals suggest maintaining current position';
        }

        res.status(200).json({
            success: true,
            data: {
                symbol,
                recommendation,
                confidence: Math.round(confidence),
                reasoning,
                targetPrice: currentPrice * (recommendation === 'BUY' ? 1.08 : recommendation === 'SELL' ? 0.92 : 1.02),
                source: 'mock',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Get recommendation error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while generating recommendation',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/ai/sentiment
 * @desc    Analyze news sentiment for a stock
 * @access  Private
 */
const getSentiment = async (req, res) => {
    try {
        const { symbol, text } = req.body;

        if (!symbol) {
            return res.status(400).json({
                success: false,
                message: 'Please provide stock symbol',
            });
        }

        // Try Python ML service first
        const mlAvailable = await isMLServiceAvailable();

        if (mlAvailable) {
            try {
                const analysisText = text || `${symbol} stock market news and analysis`;
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/sentiment`, {
                    text: analysisText,
                    model: 'finbert',
                }, { timeout: 10000 });

                if (mlResponse.data.success) {
                    const sentimentData = mlResponse.data.data;
                    const sentimentMap = {
                        'positive': 'Positive',
                        'negative': 'Negative',
                        'neutral': 'Neutral',
                    };

                    return res.status(200).json({
                        success: true,
                        data: {
                            symbol,
                            overallSentiment: sentimentMap[sentimentData.label.toLowerCase()] || sentimentData.label,
                            sentimentScore: sentimentData.confidence,
                            probabilities: sentimentData.probabilities,
                            model: sentimentData.model,
                            source: 'ai_model',
                            analysisDate: new Date().toISOString(),
                        },
                    });
                }
            } catch (mlError) {
                console.warn('ML service sentiment call failed, using mock:', mlError.message);
            }
        }

        // Fallback: Mock sentiment analysis
        const sentiments = ['Positive', 'Negative', 'Neutral'];
        const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];

        const sentimentScore = randomSentiment === 'Positive' ?
            (0.6 + Math.random() * 0.4) :
            randomSentiment === 'Negative' ?
                (Math.random() * 0.4) :
                (0.4 + Math.random() * 0.2);

        const mockNews = [
            { headline: `${symbol} reports strong quarterly earnings`, source: 'Economic Times', sentiment: 'Positive' },
            { headline: `Analysts bullish on ${symbol} stock`, source: 'Moneycontrol', sentiment: 'Positive' },
            { headline: `Market volatility affects ${symbol} performance`, source: 'Bloomberg', sentiment: 'Neutral' },
        ];

        res.status(200).json({
            success: true,
            data: {
                symbol,
                overallSentiment: randomSentiment,
                sentimentScore: Math.round(sentimentScore * 100),
                newsArticles: mockNews,
                source: 'mock',
                analysisDate: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Get sentiment error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while analyzing sentiment',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/ai/chat
 * @desc    AI Chat Advisor - Answer stock market queries
 * @access  Private
 */
const chatAdvisor = async (req, res) => {
    try {
        const { message } = req.body;

        if (!message) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a message',
            });
        }

        // Try Python ML service for sentiment-informed response
        const mlAvailable = await isMLServiceAvailable();

        if (mlAvailable) {
            try {
                const mlResponse = await axios.post(`${ML_SERVICE_URL}/predict/sentiment`, {
                    text: message,
                    model: 'finbert',
                }, { timeout: 10000 });

                if (mlResponse.data.success) {
                    const sentiment = mlResponse.data.data;

                    // Generate context-aware response based on sentiment
                    let aiResponse;
                    const label = sentiment.label.toLowerCase();

                    if (label === 'positive') {
                        aiResponse = `Based on my analysis, the sentiment in your query is positive (${sentiment.confidence}% confidence). The market indicators you're referring to show promising trends. However, always consider diversifying your portfolio and setting stop-loss orders to manage risk. Consider the current market cycle and your investment horizon before making decisions.`;
                    } else if (label === 'negative') {
                        aiResponse = `I detect a cautious tone in your query (${sentiment.confidence}% confidence). Market conditions can be challenging, but it's important not to make emotional decisions. Consider reviewing your risk tolerance, and if you're concerned about specific holdings, evaluate their fundamentals rather than short-term price movements. Dollar-cost averaging can help during volatile periods.`;
                    } else {
                        aiResponse = `Your question touches on balanced market dynamics (${sentiment.confidence}% confidence neutral). In such conditions, maintain your investment strategy and focus on fundamentals. Review your portfolio allocation to ensure it aligns with your goals, and consider opportunities in sectors showing relative strength.`;
                    }

                    return res.status(200).json({
                        success: true,
                        data: {
                            userMessage: message,
                            response: aiResponse,
                            aiResponse,
                            sentimentAnalysis: {
                                label: sentiment.label,
                                confidence: sentiment.confidence,
                            },
                            source: 'ai_model',
                            timestamp: new Date().toISOString(),
                        },
                    });
                }
            } catch (mlError) {
                console.warn('ML chat service failed, using smart fallback:', mlError.message);
            }
        }

        // ── SMART FALLBACK: Rule-based Financial Advisor ─────────

        // 1. Detect stock symbols from the user's message
        const detectedSymbol = detectStockSymbol(message);

        let responseText;

        if (detectedSymbol) {
            // 2. Fetch live price data for detected stock
            responseText = await generateStockAnalysis(detectedSymbol, message);
        } else {
            // 3. Handle general finance questions
            responseText = generateGeneralResponse(message);
        }

        res.status(200).json({
            success: true,
            data: {
                userMessage: message,
                response: responseText,
                aiResponse: responseText,
                detectedSymbol: detectedSymbol || null,
                source: detectedSymbol ? 'smart_analysis' : 'knowledge_base',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Chat advisor error:', error);
        res.status(500).json({
            success: false,
            message: "I couldn't analyze your query right now. Please try again in a moment.",
            error: error.message,
        });
    }
};

// ── STOCK SYMBOL DETECTION ──────────────────────────────
const KNOWN_SYMBOLS = [
    'RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK', 'WIPRO', 'SBIN',
    'BHARTIARTL', 'ITC', 'LT', 'HINDUNILVR', 'BAJFINANCE', 'MARUTI',
    'HCLTECH', 'AXISBANK', 'KOTAKBANK', 'TATAMOTORS', 'SUNPHARMA',
    'ADANIENT', 'NTPC', 'TITAN', 'POWERGRID', 'ASIANPAINT', 'TECHM',
    'ULTRACEMCO', 'TATASTEEL', 'BAJAJFINSV', 'COALINDIA', 'ONGC',
    'DRREDDY', 'DIVISLAB', 'JSWSTEEL', 'NESTLEIND', 'CIPLA', 'GRASIM',
    'HEROMOTOCO', 'EICHERMOT', 'APOLLOHOSP', 'BPCL', 'HINDALCO',
    'TATACONSUM', 'INDUSINDBK', 'ADANIPORTS', 'VEDL', 'ZOMATO',
    'PAYTM', 'IRCTC', 'DMART', 'PNB', 'BANKBARODA', 'IOC', 'HAL',
    'BEL', 'TATAPOWER', 'DABUR', 'PIDILITIND', 'BRITANNIA', 'GODREJCP',
    'SIEMENS', 'NIFTY', 'SENSEX',
];

// Common aliases to symbol mapping
const SYMBOL_ALIASES = {
    'reliance': 'RELIANCE', 'jio': 'RELIANCE', 'tata consultancy': 'TCS',
    'infosys': 'INFY', 'hdfc bank': 'HDFCBANK', 'icici bank': 'ICICIBANK',
    'wipro': 'WIPRO', 'sbi': 'SBIN', 'state bank': 'SBIN', 'airtel': 'BHARTIARTL',
    'bharti airtel': 'BHARTIARTL', 'itc': 'ITC', 'larsen': 'LT', 'hul': 'HINDUNILVR',
    'hindustan unilever': 'HINDUNILVR', 'bajaj finance': 'BAJFINANCE',
    'maruti suzuki': 'MARUTI', 'maruti': 'MARUTI', 'hcl tech': 'HCLTECH',
    'hcl': 'HCLTECH', 'axis bank': 'AXISBANK', 'kotak': 'KOTAKBANK',
    'tata motors': 'TATAMOTORS', 'sun pharma': 'SUNPHARMA', 'adani': 'ADANIENT',
    'titan': 'TITAN', 'asian paints': 'ASIANPAINT', 'tech mahindra': 'TECHM',
    'tata steel': 'TATASTEEL', 'coal india': 'COALINDIA', 'ongc': 'ONGC',
    'dr reddy': 'DRREDDY', 'cipla': 'CIPLA', 'hero motocorp': 'HEROMOTOCO',
    'apollo hospital': 'APOLLOHOSP', 'zomato': 'ZOMATO', 'paytm': 'PAYTM',
    'irctc': 'IRCTC', 'dmart': 'DMART', 'tata power': 'TATAPOWER',
    'dabur': 'DABUR', 'britannia': 'BRITANNIA', 'siemens': 'SIEMENS',
    'hal': 'HAL', 'bel': 'BEL', 'vedanta': 'VEDL', 'pnb': 'PNB',
    'nifty': 'NIFTY', 'sensex': 'SENSEX',
};

const detectStockSymbol = (message) => {
    const upperMsg = message.toUpperCase();
    const lowerMsg = message.toLowerCase();

    // Check direct symbol match (e.g., "TCS", "RELIANCE")
    for (const symbol of KNOWN_SYMBOLS) {
        // Match the symbol as a whole word
        const regex = new RegExp(`\\b${symbol}\\b`, 'i');
        if (regex.test(upperMsg)) {
            return symbol;
        }
    }

    // Check alias match (e.g., "Infosys", "SBI", "Tata Motors")
    for (const [alias, symbol] of Object.entries(SYMBOL_ALIASES)) {
        if (lowerMsg.includes(alias)) {
            return symbol;
        }
    }

    return null;
};

// ── COMPANY INFO DATABASE ───────────────────────────────
const COMPANY_INFO = {
    'RELIANCE': { name: 'Reliance Industries', sector: 'Energy & Petrochemicals', description: 'India\'s largest conglomerate with businesses in energy, petrochemicals, telecom (Jio), and retail.' },
    'TCS': { name: 'Tata Consultancy Services', sector: 'Information Technology', description: 'India\'s largest IT services company and a global leader in consulting and technology solutions.' },
    'INFY': { name: 'Infosys', sector: 'Information Technology', description: 'A leading global IT services and consulting company known for digital transformation services.' },
    'HDFCBANK': { name: 'HDFC Bank', sector: 'Banking & Finance', description: 'India\'s largest private sector bank, known for strong asset quality and consistent growth.' },
    'ICICIBANK': { name: 'ICICI Bank', sector: 'Banking & Finance', description: 'One of India\'s largest private banks offering a wide range of financial services.' },
    'WIPRO': { name: 'Wipro', sector: 'Information Technology', description: 'Major Indian IT company providing IT services, consulting, and business process solutions.' },
    'SBIN': { name: 'State Bank of India', sector: 'Banking & Finance', description: 'India\'s largest public sector bank with the most extensive branch and ATM network.' },
    'ITC': { name: 'ITC Limited', sector: 'FMCG', description: 'Diversified conglomerate with businesses in FMCG, hotels, paperboards, packaging, and agribusiness.' },
    'BHARTIARTL': { name: 'Bharti Airtel', sector: 'Telecom', description: 'One of India\'s largest telecom operators with a significant presence in Africa.' },
    'LT': { name: 'Larsen & Toubro', sector: 'Infrastructure', description: 'India\'s largest engineering and construction conglomerate with technology and financial services.' },
    'TATAMOTORS': { name: 'Tata Motors', sector: 'Automobile', description: 'India\'s largest auto manufacturer and owner of Jaguar Land Rover luxury brands.' },
    'MARUTI': { name: 'Maruti Suzuki', sector: 'Automobile', description: 'India\'s largest passenger car manufacturer with dominant market share.' },
    'SUNPHARMA': { name: 'Sun Pharmaceutical', sector: 'Pharmaceuticals', description: 'India\'s largest pharma company and the world\'s fourth-largest specialty generics company.' },
    'TITAN': { name: 'Titan Company', sector: 'Consumer Goods', description: 'India\'s leading lifestyle company known for Tanishq jewellery and Titan watches.' },
    'ZOMATO': { name: 'Zomato', sector: 'Technology', description: 'India\'s leading food delivery and restaurant discovery platform.' },
    'ADANIENT': { name: 'Adani Enterprises', sector: 'Infrastructure', description: 'Flagship company of the Adani Group with businesses in mining, energy, and infrastructure.' },
    'TATASTEEL': { name: 'Tata Steel', sector: 'Metals', description: 'One of the world\'s most geographically diversified steel producers.' },
    'HCLTECH': { name: 'HCL Technologies', sector: 'Information Technology', description: 'Major IT services company providing technology and engineering services globally.' },
};

// ── STOCK-SPECIFIC ANALYSIS GENERATOR ───────────────────
const generateStockAnalysis = async (symbol, userMessage) => {
    const { fetchLivePrice } = require('../utils/fetchLivePrice');
    const company = COMPANY_INFO[symbol] || { name: symbol, sector: 'Market', description: `${symbol} is a stock listed on Indian exchanges.` };

    let priceInfo = '';
    let trend = 'Neutral';
    let riskLevel = 'Medium';
    let suggestion = 'HOLD';
    let changePercent = 0;

    // Fetch live price data
    try {
        const liveData = await fetchLivePrice(symbol);
        if (liveData && liveData.currentPrice) {
            changePercent = liveData.changePercent || 0;
            const changeSign = liveData.change >= 0 ? '+' : '';
            priceInfo = `Current Price: ₹${liveData.currentPrice.toFixed(2)} (${changeSign}${liveData.change.toFixed(2)}, ${changeSign}${changePercent.toFixed(2)}%)`;

            // Determine trend from price change
            if (changePercent > 1.5) trend = 'Bullish (Strong)';
            else if (changePercent > 0.3) trend = 'Bullish (Moderate)';
            else if (changePercent > -0.3) trend = 'Neutral';
            else if (changePercent > -1.5) trend = 'Bearish (Moderate)';
            else trend = 'Bearish (Strong)';

            // Determine risk level
            if (Math.abs(changePercent) > 3) riskLevel = 'High';
            else if (Math.abs(changePercent) > 1) riskLevel = 'Medium';
            else riskLevel = 'Low';

            // Determine suggestion
            if (changePercent > 1.5) suggestion = 'BUY — Strong upward momentum detected';
            else if (changePercent > 0.3) suggestion = 'BUY on dips — Moderate positive trend, consider buying on small corrections';
            else if (changePercent > -0.3) suggestion = 'HOLD — Market is consolidating, wait for a clear direction';
            else if (changePercent > -1.5) suggestion = 'WAIT — Slight weakness detected, consider waiting for stabilization';
            else suggestion = 'SELL or WAIT — Significant downward pressure, reassess your position';
        }
    } catch (e) {
        console.warn('Live price fetch failed for chat analysis:', e.message);
    }

    // Detect user intent
    const lowerMsg = userMessage.toLowerCase();
    const isBuyQuery = /should i (buy|invest|purchase)|buy.*\?|good.*buy|worth.*buying/i.test(lowerMsg);
    const isSellQuery = /should i (sell|exit|book profit)|sell.*\?|time to sell/i.test(lowerMsg);
    const isPerformanceQuery = /how is|how's|performance|performing|doing|status|update/i.test(lowerMsg);

    // Build structured response
    let response = `📊 Stock: ${symbol} — ${company.name}\n\n`;

    response += `🏢 Market Insight:\n${company.description} It operates in the ${company.sector} sector.`;
    if (priceInfo) response += ` ${priceInfo}`;
    response += `\n\n`;

    response += `📈 Trend Analysis:\n`;
    if (priceInfo) {
        response += `The stock is currently showing ${trend.toLowerCase()} momentum based on today's price movement (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%).`;
    } else {
        response += `Real-time data is currently unavailable. Based on general market conditions, the stock shows moderate momentum.`;
    }
    response += `\n\n`;

    response += `⚠️ Risk Level: ${riskLevel}\n\n`;

    response += `💡 Suggestion: ${suggestion}\n\n`;

    response += `📝 Explanation:\n`;
    if (isBuyQuery) {
        if (changePercent > 0.3) {
            response += `${company.name} is showing positive momentum right now. If you're a long-term investor, this could be a good entry point. However, consider investing gradually (SIP approach) rather than putting all your capital at once. ${company.sector} sector stocks can be volatile in the short term, so keep a stop-loss at 5-8% below your buy price to manage risk.`;
        } else if (changePercent > -0.5) {
            response += `${company.name} is trading in a neutral zone. This is neither a strong buy nor a sell signal. If you believe in the long-term fundamentals of the ${company.sector} sector, you can start with a small position and add more on dips. Always diversify your portfolio across sectors.`;
        } else {
            response += `${company.name} is currently under some selling pressure. It may be wise to wait for the stock to stabilize before buying. Watch for support levels and consider setting price alerts. If you're already invested, hold your position if your investment horizon is long-term.`;
        }
    } else if (isSellQuery) {
        if (changePercent > 1) {
            response += `${company.name} has gained well. If you've achieved your target return, booking partial profits is a sensible strategy. You can sell 50% of your holdings to lock in gains and let the rest ride with a trailing stop-loss.`;
        } else if (changePercent < -1.5) {
            response += `${company.name} is facing downward pressure. If you're in profit, consider booking gains. If you're at a loss, evaluate whether the fundamentals have changed. Don't sell in panic — review the company's quarterly results and sector outlook first.`;
        } else {
            response += `${company.name} is in a consolidation phase. Unless you need the capital urgently, holding may be the better option. Monitor the stock's upcoming earnings and sector news for a clearer signal.`;
        }
    } else {
        response += `${company.name} in the ${company.sector} sector is a well-known stock among Indian investors. For best results, combine technical analysis (price charts) with fundamental analysis (earnings, revenue) before making decisions. Always invest based on your risk profile and investment horizon, and remember that past performance doesn't guarantee future results.`;
    }

    response += `\n\n⚠️ Disclaimer: This analysis is for educational purposes only. Stock markets are subject to market risks. Please consult a certified financial advisor before making investment decisions.`;

    return response;
};

// ── GENERAL FINANCE Q&A KNOWLEDGE BASE ──────────────────
const FINANCE_QA = [
    {
        keywords: ['p/e ratio', 'pe ratio', 'price to earning', 'price earning'],
        answer: `📚 P/E Ratio (Price-to-Earnings Ratio)\n\nThe P/E ratio measures a company's stock price relative to its earnings per share (EPS).\n\nFormula: P/E = Stock Price ÷ Earnings Per Share\n\nExample: If a stock trades at ₹500 and EPS is ₹25, then P/E = 20.\n\n• Low P/E (< 15): May indicate undervaluation or slow growth\n• Moderate P/E (15-25): Fairly valued\n• High P/E (> 25): May indicate overvaluation or high growth expectations\n\n💡 Tip: Compare P/E within the same sector. A tech stock with P/E of 30 may be normal, while the same for a utility stock could be overvalued.`,
    },
    {
        keywords: ['sip', 'systematic investment', 'monthly investment'],
        answer: `📚 SIP (Systematic Investment Plan)\n\nSIP is a method of investing a fixed amount regularly (usually monthly) in mutual funds or stocks.\n\nBenefits:\n• Rupee Cost Averaging: Buy more units when prices are low, fewer when high\n• Discipline: Automates your investment habit\n• Power of Compounding: Small regular investments grow significantly over time\n• No Need to Time the Market: Reduces the risk of investing at the wrong time\n\nExample: ₹5,000/month SIP at 12% annual returns for 20 years ≈ ₹49.4 lakhs (you invested only ₹12 lakhs)!\n\n💡 Tip: Start early, stay consistent, and increase your SIP amount annually by 10%.`,
    },
    {
        keywords: ['diversif', 'diversification', 'diversify', 'portfolio allocation'],
        answer: `📚 Portfolio Diversification\n\nDiversification means spreading your investments across different assets to reduce risk.\n\nHow to diversify:\n• Across sectors: IT, Banking, FMCG, Pharma, Energy\n• Across asset classes: Stocks, bonds, gold, real estate\n• Across market caps: Large-cap (stable), mid-cap (growth), small-cap (high risk/reward)\n\nIdeal allocation for moderate risk:\n• 50-60% Large-cap stocks\n• 20-25% Mid-cap stocks\n• 10-15% Bonds/Fixed Income\n• 5-10% Gold/Alternative investments\n\n💡 Tip: Don't put more than 10-15% of your portfolio in any single stock. Rebalance quarterly.`,
    },
    {
        keywords: ['stop loss', 'stoploss', 'stop-loss'],
        answer: `📚 Stop-Loss Order\n\nA stop-loss is a pre-set order to sell a stock when it falls to a certain price, limiting your loss.\n\nExample: You buy a stock at ₹100 and set a stop-loss at ₹92 (8% below). If the price drops to ₹92, it automatically sells, capping your loss at ₹8.\n\nTypes:\n• Fixed Stop-Loss: Set at a specific price (e.g., 8% below buy price)\n• Trailing Stop-Loss: Moves up with the stock price, locking in profits\n\n💡 Tip: Always set a stop-loss. A good rule is 5-8% for large-caps and 10-12% for mid/small-caps.`,
    },
    {
        keywords: ['bull', 'bullish', 'bull market', 'bear', 'bearish', 'bear market'],
        answer: `📚 Bull vs Bear Market\n\n🐂 Bull Market: A period when stock prices are rising (usually 20%+ from recent lows). Investor confidence is high, economy is growing.\n\n🐻 Bear Market: A period when stock prices are falling (usually 20%+ from recent highs). Investor confidence is low, economic slowdown.\n\nStrategies:\n• In a bull market: Stay invested, but don't be greedy. Book partial profits periodically.\n• In a bear market: Don't panic-sell. It may be a good opportunity to buy quality stocks at lower prices (SIP approach works great here).\n\n💡 Tip: Markets are cyclical. What goes down eventually comes up — if you hold quality stocks.`,
    },
    {
        keywords: ['mutual fund', 'mf', 'index fund', 'etf'],
        answer: `📚 Mutual Funds & ETFs\n\nMutual Funds pool money from many investors to invest in stocks, bonds, etc. managed by professionals.\n\nTypes:\n• Equity Funds: Invest in stocks (higher risk, higher return)\n• Debt Funds: Invest in bonds (lower risk, stable return)\n• Index Funds: Track an index like Nifty 50, low cost\n• ETFs: Trade like stocks on exchanges, track an index\n\nFor beginners: Start with a Nifty 50 Index Fund (low cost, diversified, tracks India's top 50 companies).\n\n💡 Tip: Check the expense ratio (lower is better). Index funds with < 0.3% expense ratio are ideal.`,
    },
    {
        keywords: ['intraday', 'day trading', 'swing trading', 'short term'],
        answer: `📚 Intraday vs Swing vs Long-term Trading\n\n• Intraday: Buy and sell within the same day. High risk, requires constant monitoring.\n• Swing Trading: Hold for a few days to weeks. Moderate risk.\n• Long-term: Hold for months to years. Lower risk, benefits from compounding.\n\nFor beginners, long-term investing in quality stocks is the safest approach. Intraday trading has a failure rate of 90%+ for retail traders.\n\n💡 Tip: If you're just starting, focus on long-term investing. Paper trading (like this platform!) is a great way to learn without real risk.`,
    },
    {
        keywords: ['nifty', 'sensex', 'index', 'market index'],
        answer: `📚 Market Indices: Nifty & Sensex\n\n• Nifty 50: Tracks the top 50 companies on NSE (National Stock Exchange)\n• Sensex (BSE 30): Tracks the top 30 companies on BSE (Bombay Stock Exchange)\n\nThey represent the overall health of the Indian stock market. If Nifty is up, the broader market is generally positive.\n\nUseful benchmarks: Compare your portfolio returns against Nifty. If your portfolio gives 12% and Nifty gave 15%, you underperformed — and a simple index fund would have been better!\n\n💡 Tip: For most investors, matching or slightly beating the Nifty is an excellent achievement.`,
    },
    {
        keywords: ['beginner', 'start investing', 'new to stock', 'how to invest', 'getting started'],
        answer: `📚 Getting Started with Investing\n\nStep-by-step guide for beginners:\n\n1️⃣ Open a Demat & Trading Account (Zerodha, Groww, Upstox)\n2️⃣ Start learning basics: P/E ratio, market cap, company fundamentals\n3️⃣ Begin with paper trading (like this platform!) to practice\n4️⃣ Start small: ₹500-₹5000/month via SIP in index funds\n5️⃣ Gradually add individual stocks (start with large-cap blue chips)\n6️⃣ Always diversify and set stop-losses\n7️⃣ Never invest money you can't afford to lose\n\n💡 Tip: The best time to start investing was yesterday. The second best time is today.`,
    },
];

const generateGeneralResponse = (message) => {
    const lowerMsg = message.toLowerCase();

    // Check knowledge base
    for (const qa of FINANCE_QA) {
        if (qa.keywords.some(kw => lowerMsg.includes(kw))) {
            return qa.answer;
        }
    }

    // Greeting
    if (/^(hi|hello|hey|good morning|good evening|namaste)/i.test(lowerMsg.trim())) {
        return `Hello! 👋 I'm your AI Financial Advisor.\n\nI can help you with:\n• Stock analysis — Ask "Should I buy TCS?" or "How is RELIANCE doing?"\n• Market concepts — Ask "What is P/E ratio?" or "Explain SIP"\n• Portfolio strategies — Ask "How should I diversify?" or "What is a stop-loss?"\n• Trading guidance — Ask about intraday, swing trading, or long-term investing\n\nWhat would you like to know today?`;
    }

    // Portfolio/investment queries (no specific stock)
    if (/portfolio|invest|allocation|where.*put.*money/i.test(lowerMsg)) {
        return `📊 Portfolio Advisory\n\nWithout knowing your specific risk profile, here's general guidance:\n\n• Conservative: 60% large-cap + 30% debt funds + 10% gold\n• Moderate: 50% large-cap + 25% mid-cap + 15% debt + 10% gold\n• Aggressive: 40% large-cap + 35% mid-cap + 15% small-cap + 10% alternatives\n\nKey principles:\n1. Never put all eggs in one basket\n2. Invest regularly via SIP\n3. Rebalance quarterly\n4. Keep 6 months' expenses as emergency fund before investing\n\n💡 Tip: Check your risk profile in the Risk Assessment section to get personalized advice!\n\n⚠️ This is general guidance. Consult a certified financial advisor for personalized recommendations.`;
    }

    // Market status
    if (/market.*today|market.*status|how.*market/i.test(lowerMsg)) {
        return `📊 Market Overview\n\nFor live market updates, check the Dashboard page where live stock prices are displayed.\n\nGeneral tips for reading market conditions:\n• Check Nifty 50 and Sensex movement for overall direction\n• Look at FII (Foreign Institutional Investor) buy/sell data\n• Monitor global cues (US markets, crude oil prices)\n• Check sector-wise performance for rotation opportunities\n\n💡 Tip: Markets are volatile in the short term but trend upward over the long term. Focus on fundamentals!\n\nWould you like me to analyze any specific stock? Just ask "How is [stock name] doing?"`;
    }

    // Unclear question — ask for more details
    return `🤔 I'd be happy to help! Could you tell me a bit more about what you'd like to know?\n\nI can assist with:\n\n📈 Stock Analysis: "Should I buy TCS?" or "How is RELIANCE performing?"\n📚 Market Concepts: "What is P/E ratio?" or "Explain SIP"\n🛡️ Risk Management: "What is a stop-loss?" or "How to diversify?"\n💰 Investment Strategy: "How should a beginner start investing?"\n\nJust type your question and I'll provide a detailed answer!`;
};

/**
 * @route   GET /api/ai/ml-status
 * @desc    Check if Python ML service is running
 * @access  Private
 */
const getMLStatus = async (req, res) => {
    try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
        res.status(200).json({
            success: true,
            data: {
                available: true,
                ...response.data,
            },
        });
    } catch (error) {
        res.status(200).json({
            success: true,
            data: {
                available: false,
                message: 'Python ML service is not running. Using mock predictions.',
            },
        });
    }
};

module.exports = { getRecommendation, getSentiment, chatAdvisor, getMLStatus };
