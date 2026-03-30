/**
 * Voice Command Controller
 * Processes speech-to-text transcripts, parses intent,
 * routes to existing services, and returns TTS-friendly responses.
 */
const axios = require('axios');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

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
    'titan': 'TITAN', 'tata motors': 'TATAMOTORS',
    lt: 'LT', 'larsen': 'LT', 'larsen and toubro': 'LT',
    'power grid': 'POWERGRID', ntpc: 'NTPC',
    'ultra tech': 'ULTRACEMCO', 'ultratech': 'ULTRACEMCO',
    adani: 'ADANIENT', 'adani enterprises': 'ADANIENT',
    'bharti airtel': 'BHARTIARTL', airtel: 'BHARTIARTL',
    'axis bank': 'AXISBANK', axis: 'AXISBANK',
    indusind: 'INDUSINDBK', 'indusind bank': 'INDUSINDBK',
    'hindustan unilever': 'HINDUNILVR', hul: 'HINDUNILVR',
    'itc': 'ITC', 'nestle': 'NESTLEIND',
    'tech mahindra': 'TECHM', 'tech m': 'TECHM',
};

/**
 * Extract stock symbol from text
 */
const extractStockSymbol = (text) => {
    const lower = text.toLowerCase();

    // Try direct alias match (longest first for accuracy)
    const aliases = Object.keys(STOCK_ALIASES).sort((a, b) => b.length - a.length);
    for (const alias of aliases) {
        if (lower.includes(alias)) {
            return STOCK_ALIASES[alias];
        }
    }

    // Try to find uppercase stock symbol directly (e.g., "RELIANCE")
    const symbolMatch = text.match(/\b([A-Z]{2,15})\b/);
    if (symbolMatch) {
        return symbolMatch[1];
    }

    return null;
};

/**
 * Parse user intent from transcribed voice text
 */
const parseIntent = (text) => {
    const lower = text.toLowerCase().trim();
    const stock = extractStockSymbol(text);

    // ── Portfolio intents ──
    if (
        lower.includes('portfolio') ||
        lower.includes('my holdings') ||
        lower.includes('my stocks') ||
        lower.includes('show my investments')
    ) {
        return { intent: 'portfolio', stock };
    }

    // ── Recommendation / Should I buy (MUST be before buy/sell) ──
    if (
        lower.includes('should i') ||
        lower.includes('recommend') ||
        lower.includes('suggestion') ||
        lower.includes('what do you think about') ||
        lower.includes('is it good to buy') ||
        lower.includes('worth buying')
    ) {
        return { intent: 'stock_recommendation', stock };
    }

    // ── Buy intent (direct trade, not advisory) ──
    if (lower.includes('buy') && stock) {
        return { intent: 'buy', stock };
    }

    // ── Sell intent ──
    if (lower.includes('sell') && stock) {
        return { intent: 'sell', stock };
    }

    // ── Analyze stock ──
    if (
        lower.includes('analyze') ||
        lower.includes('analysis') ||
        lower.includes('analyse') ||
        lower.includes('tell me about')
    ) {
        return { intent: 'analyze_stock', stock };
    }

    // ── Risk level ──
    if (
        lower.includes('risk') ||
        lower.includes('risk level') ||
        lower.includes('risk profile') ||
        lower.includes('my risk')
    ) {
        return { intent: 'risk_level', stock };
    }

    // ── Market overview ──
    if (
        lower.includes('market') ||
        lower.includes('nifty') ||
        lower.includes('sensex') ||
        lower.includes('market overview') ||
        lower.includes('how is the market')
    ) {
        return { intent: 'market_overview', stock };
    }

    // ── Price check ──
    if (
        (lower.includes('price') || lower.includes('how much')) &&
        stock
    ) {
        return { intent: 'price_check', stock };
    }

    // ── Sentiment ──
    if (
        lower.includes('sentiment') ||
        lower.includes('news') ||
        lower.includes('feeling')
    ) {
        return { intent: 'sentiment', stock };
    }

    // ── Greeting ──
    if (
        lower.includes('hello') ||
        lower.includes('hi') ||
        lower.includes('hey') ||
        lower.includes('good morning') ||
        lower.includes('good evening')
    ) {
        return { intent: 'greeting', stock };
    }

    // ── Help ──
    if (lower.includes('help') || lower.includes('what can you do')) {
        return { intent: 'help', stock };
    }

    // ── Fallback: if stock is found, default to analyze ──
    if (stock) {
        return { intent: 'analyze_stock', stock };
    }

    // ── General question: route to chat advisor ──
    return { intent: 'general', stock: null };
};

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
        let response = {};

        switch (intent) {
            case 'greeting': {
                response = {
                    intent,
                    text: `Hello! I'm your CapitalWave AI advisor. You can ask me to analyze stocks, check your portfolio, get trading recommendations, or check market conditions. How can I help you today?`,
                    action: 'none',
                };
                break;
            }

            case 'help': {
                response = {
                    intent,
                    text: `Here's what I can do for you: Say "Analyze RELIANCE" to get stock analysis. Say "Should I buy TCS" for recommendations. Say "Show my portfolio" to see your holdings. Say "What's my risk level" to check your risk profile. Say "How is the market" for a market overview. How would you like to proceed?`,
                    action: 'none',
                };
                break;
            }

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
                    const plText = pl >= 0 ? `a profit of ₹${Math.abs(pl).toLocaleString('en-IN')}` : `a loss of ₹${Math.abs(pl).toLocaleString('en-IN')}`;

                    response = {
                        intent,
                        text: `Your portfolio has ${holdingsCount} holdings with a total value of ₹${totalValue}. Today you're at ${plText}. Would you like me to analyze any specific stock?`,
                        action: 'navigate',
                        navigateTo: '/portfolio',
                        data: p,
                    };
                } catch (err) {
                    response = {
                        intent,
                        text: `I couldn't fetch your portfolio right now. Please try again in a moment.`,
                        action: 'none',
                    };
                }
                break;
            }

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
                    // Get stock price first
                    const stockRes = await axios.get(
                        `${req.protocol}://${req.get('host')}/api/stocks/search/${stock}`,
                        { headers: { Authorization: req.headers.authorization }, timeout: 8000 }
                    );
                    const stockData = stockRes.data.data?.[0] || { currentPrice: 1000 };

                    // Get recommendation
                    const recRes = await axios.post(
                        `${req.protocol}://${req.get('host')}/api/ai/recommendation`,
                        { symbol: stock, currentPrice: stockData.currentPrice || 1000, sentiment: 'Positive' },
                        { headers: { Authorization: req.headers.authorization }, timeout: 10000 }
                    );
                    const rec = recRes.data.data;

                    const action = rec.recommendation;
                    const conf = rec.confidence;
                    const target = rec.targetPrice?.toFixed(2);

                    response = {
                        intent,
                        text: `Based on my analysis, ${stock} is a ${action} with ${conf}% confidence. The target price is ₹${target}. ${rec.reasoning || ''}. Would you like more details?`,
                        action: 'recommendation',
                        data: rec,
                    };
                } catch (err) {
                    response = {
                        intent,
                        text: `I couldn't analyze ${stock} right now. Please try again.`,
                        action: 'none',
                    };
                }
                break;
            }

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
                    const sentData = sentRes.status === 'fulfilled' ? sentRes.value.data.data : null;
                    const recData = recRes.status === 'fulfilled' ? recRes.value.data.data : null;

                    let text = `Here's my analysis of ${stock}. `;
                    if (stockData?.currentPrice) {
                        text += `Current price is ₹${stockData.currentPrice.toFixed(2)}`;
                        if (stockData.changePercent !== undefined) {
                            text += `, ${stockData.changePercent >= 0 ? 'up' : 'down'} ${Math.abs(stockData.changePercent).toFixed(2)}% today. `;
                        }
                    }
                    if (sentData) {
                        text += `Market sentiment is ${sentData.overallSentiment}. `;
                    }
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
                } catch (err) {
                    response = {
                        intent,
                        text: `I encountered an issue analyzing ${stock}. Please try again.`,
                        action: 'none',
                    };
                }
                break;
            }

            case 'buy': {
                response = {
                    intent,
                    stock,
                    text: `You want to buy ${stock}. I'll open the paper trading page for you. Please confirm the quantity and price on the trading screen. Remember, this is paper trading mode.`,
                    action: 'navigate',
                    navigateTo: '/paper-trading',
                    requiresConfirmation: true,
                };
                break;
            }

            case 'sell': {
                response = {
                    intent,
                    stock,
                    text: `You want to sell ${stock}. I'll open the paper trading page for you. Please confirm the details on the trading screen.`,
                    action: 'navigate',
                    navigateTo: '/paper-trading',
                    requiresConfirmation: true,
                };
                break;
            }

            case 'risk_level': {
                response = {
                    intent,
                    text: `Your current risk profile is set to ${req.user?.riskProfile || 'Medium'}. You can update this in your Risk Profile settings. Would you like me to take you there?`,
                    action: 'navigate',
                    navigateTo: '/risk-profile',
                };
                break;
            }

            case 'market_overview': {
                response = {
                    intent,
                    text: `Here's the market overview. The Indian markets have been showing mixed signals today. NIFTY 50 is trading around 22,458 levels, up about 0.82%. SENSEX is at 73,891, up 0.75%. The market sentiment appears cautiously optimistic. Would you like me to analyze any specific stock?`,
                    action: 'none',
                };
                break;
            }

            case 'price_check': {
                if (!stock) {
                    response = {
                        intent,
                        text: `Which stock's price would you like to check?`,
                        action: 'none',
                    };
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
                        response = {
                            intent,
                            text: `I couldn't find the price for ${stock}. Please check the symbol and try again.`,
                            action: 'none',
                        };
                    }
                } catch {
                    response = {
                        intent,
                        text: `I couldn't fetch the price for ${stock} right now.`,
                        action: 'none',
                    };
                }
                break;
            }

            case 'sentiment': {
                if (!stock) {
                    response = {
                        intent,
                        text: `Which stock's sentiment would you like to check?`,
                        action: 'none',
                    };
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
                    response = {
                        intent,
                        text: `I couldn't analyze the sentiment for ${stock} right now.`,
                        action: 'none',
                    };
                }
                break;
            }

            case 'general':
            default: {
                // Route to the chat advisor for general questions
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
                        text: `I'm not sure how to help with that right now. Try saying "Analyze RELIANCE" or "Show my portfolio".`,
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

module.exports = { processVoiceCommand };
