/**
 * AI Controller - Integrates with HuggingFace Mistral-7B & Python ML Service
 */
const axios = require('axios');
const { HfInference } = require('@huggingface/inference');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';

// ── HuggingFace AI Setup ────────────────────────────────
const hf = new HfInference(process.env.HF_API_KEY);

const SYSTEM_PROMPT = {
    role: 'system',
    content: `You are "CapitalWave AI Advisor", a smart AI assistant for Indian stock market guidance and financial advisory.

Your expertise includes:
- Indian stock market (NSE/BSE), Nifty 50, Sensex
- Stock analysis (fundamental & technical)
- Portfolio management & diversification
- Mutual funds, SIPs, ETFs
- Risk management (stop-loss, position sizing)
- Trading strategies (intraday, swing, long-term)
- Financial concepts (P/E ratio, market cap, EPS, etc.)

Guidelines:
1. Explain concepts in simple terms and provide balanced insights.
2. Use emojis for headings (📊, 📈, 💡, ⚠️) to make responses readable.
3. When discussing a specific stock, mention its sector, recent trends, and key factors.
4. Always include a short disclaimer at the end: "⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing."
5. Keep responses concise but informative (under 300 words).
6. If the user greets you, respond warmly and tell them what you can help with.
7. Use INR (₹) for all monetary values.
8. If asked about something outside finance/stocks, politely redirect.`,
};

// Store conversation history per user (in-memory)
const conversationHistory = new Map();
const MAX_HISTORY = 20;

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
        let recommendation, confidence, reasoning;
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

        // Fallback: Mock sentiment
        const sentiments = ['Positive', 'Negative', 'Neutral'];
        const randomSentiment = sentiments[Math.floor(Math.random() * sentiments.length)];
        const sentimentScore = randomSentiment === 'Positive'
            ? (0.6 + Math.random() * 0.4)
            : randomSentiment === 'Negative'
                ? (Math.random() * 0.4)
                : (0.4 + Math.random() * 0.2);

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
 * @desc    AI Chat Advisor powered by HuggingFace Mistral-7B
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

        // Get or create conversation history for this user
        const userId = req.user?._id?.toString() || 'anonymous';
        if (!conversationHistory.has(userId)) {
            conversationHistory.set(userId, []);
        }
        const history = conversationHistory.get(userId);

        // Add user message to history
        history.push({ role: 'user', content: message });

        // Build full messages array with system prompt
        const fullMessages = [SYSTEM_PROMPT, ...history];

        // Call HuggingFace Mistral-7B
        const chatCompletion = await hf.chatCompletion({
            model: 'mistralai/Mistral-7B-Instruct-v0.3',
            messages: fullMessages,
            max_tokens: 512,
            temperature: 0.7,
            top_p: 0.95,
            stream: false,
        });

        const aiReply = chatCompletion.choices[0].message.content;

        // Save assistant reply to history
        history.push({ role: 'assistant', content: aiReply });

        // Trim history if too long
        if (history.length > MAX_HISTORY * 2) {
            history.splice(0, history.length - MAX_HISTORY * 2);
        }

        res.status(200).json({
            success: true,
            data: {
                userMessage: message,
                response: aiReply,
                aiResponse: aiReply,
                source: 'huggingface_mistral',
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('HuggingFace Chat error:', error);

        // Friendly error messages for common free-tier issues
        if (error.message?.includes('rate limit') || error.status === 429) {
            return res.status(429).json({
                success: false,
                message: 'Too many requests. Please wait 10-15 seconds and try again.',
            });
        }
        if (error.message?.includes('model is currently loading')) {
            return res.status(503).json({
                success: false,
                message: 'AI model is warming up. Please try again in a few seconds.',
            });
        }

        res.status(500).json({
            success: false,
            message: "I couldn't process your request right now. Please try again.",
            error: error.message,
        });
    }
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
