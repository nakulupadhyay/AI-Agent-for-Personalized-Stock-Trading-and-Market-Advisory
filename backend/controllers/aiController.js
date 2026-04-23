/**
 * AI Controller - Multi-Model with Triple Fallback
 * Priority: Google Gemini → HuggingFace Mistral → Built-in Knowledge Engine
 * HuggingFace: uses router.huggingface.co (replaces deprecated api-inference endpoint)
 */
const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const HF_API_KEY = process.env.HF_API_KEY;
const HF_ROUTER_URL = 'https://router.huggingface.co/hf-inference/models/mistralai/Mistral-7B-Instruct-v0.3/v1/chat/completions';

// ── Gemini Setup — try key_1 first, fall back to key_2 ────
const gemini = process.env.GEMINI_API_KEY_1
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_1 })
    : process.env.GEMINI_API_KEY
        ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
        : null;

const SYSTEM_PROMPT_TEXT = `You are "CapitalWave AI Advisor", a smart AI assistant for Indian stock market guidance and financial advisory.

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
8. If asked about something outside finance/stocks, politely redirect.`;

const SYSTEM_PROMPT = { role: 'system', content: SYSTEM_PROMPT_TEXT };

// Store conversation history per user (in-memory)
const conversationHistory = new Map();
const MAX_HISTORY = 20;

// ── Built-in Financial Knowledge Engine (fallback) ────────────────
const KNOWLEDGE_BASE = {
    'stock market': `📊 **What is the Stock Market?**\n\nThe stock market is a marketplace where shares of publicly listed companies are bought and sold. In India, the two main exchanges are:\n\n📈 **NSE** (National Stock Exchange) — Tracks the Nifty 50 index\n📈 **BSE** (Bombay Stock Exchange) — Tracks the Sensex (30 stocks)\n\n**How it works:**\n1. Companies list their shares through an IPO\n2. Investors buy/sell shares through brokers\n3. Prices move based on supply & demand\n4. You can make money through capital gains and dividends\n\n💡 **Key tip:** Start with index funds (Nifty 50 ETF) if you're a beginner — they offer diversification at low cost.\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'portfolio risk': `📊 **Understanding Portfolio Risk**\n\nPortfolio risk is the chance that your investments may lose value. Key types:\n\n🔴 **Market Risk** — Overall market downturns (systematic risk)\n🟡 **Concentration Risk** — Too much invested in one stock/sector\n🟢 **Liquidity Risk** — Difficulty selling an investment quickly\n\n**How to measure risk:**\n- **Standard Deviation** — Higher = more volatile\n- **Beta** — >1 means more volatile than the market\n- **Value at Risk (VaR)** — Maximum expected loss\n\n💡 **Risk Management Tips:**\n1. Diversify across 8-12 stocks from different sectors\n2. Never invest more than 5-10% in a single stock\n3. Use stop-loss orders to limit downside\n4. Rebalance your portfolio quarterly\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'sharpe ratio': `📊 **What is the Sharpe Ratio?**\n\nThe Sharpe Ratio measures risk-adjusted returns. It tells you how much extra return you earn for each unit of risk.\n\n**Formula:** (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation\n\n**How to interpret:**\n- **< 1.0** — Suboptimal (risk isn't worth the return)\n- **1.0 - 2.0** — Good\n- **2.0 - 3.0** — Very Good\n- **> 3.0** — Excellent\n\n**Example:**\nIf your portfolio returns 15%, the risk-free rate (FD) is 7%, and standard deviation is 10%:\nSharpe = (15 - 7) / 10 = **0.8** (needs improvement)\n\n💡 **Tip:** Compare Sharpe ratios of different investments to find the best risk-adjusted option.\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'volatility': `📊 **Volatility Explained Simply**\n\nVolatility = how much a stock's price jumps around.\n\n**Think of it like weather:**\n- ☀️ Low volatility = calm, steady price movement (e.g., HDFC Bank)\n- 🌪️ High volatility = wild price swings (e.g., small-cap stocks)\n\n**How to measure:**\n- **India VIX** — Market fear gauge. <15 = calm, >20 = nervous, >30 = panic\n- **Standard Deviation** — Mathematical measure of price spread\n- **Beta** — Stock vs market volatility\n\n💡 **Tips:**\n1. High volatility ≠ bad. It creates buying opportunities for long-term investors\n2. Use SIP (Systematic Investment Plan) to ride out volatility\n3. Avoid trading during high volatility if you're a beginner\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'risk score': `📊 **Understanding Risk Scores**\n\nRisk scores help you understand your investment personality.\n\n**Common Scale (1-10):**\n- 🟢 **1-3 (Conservative):** Prefer FDs, bonds, debt funds. Target: 6-8% annual returns\n- 🟡 **4-6 (Moderate):** Mix of equity + debt. Target: 10-14% annual returns\n- 🔴 **7-10 (Aggressive):** Mostly equity, can handle volatility. Target: 15%+\n\n**A good risk score depends on:**\n1. Your age (younger = can take more risk)\n2. Income stability\n3. Financial goals timeline\n4. Emergency fund status\n\n💡 **Ideal allocation by risk level:**\n- Conservative: 30% equity, 70% debt\n- Moderate: 60% equity, 40% debt\n- Aggressive: 80% equity, 20% debt\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'hello': `👋 Hello! I'm **CapitalWave AI Advisor**, your smart assistant for Indian stock market guidance!\n\n**Here's what I can help you with:**\n📈 Stock analysis & recommendations\n📊 Portfolio management tips\n💡 Financial concepts explained simply\n🧠 Risk assessment & management\n📰 Market trends & sentiment\n\nJust ask me anything about stocks, investing, or financial concepts! For example:\n- "Should I invest in RELIANCE?"\n- "What is Sharpe ratio?"\n- "Explain volatility"\n\nLet's get started! What would you like to know? 🚀`,

    'guaranteed profit': `⚠️ **Important: No Guaranteed Profits Exist**\n\nI cannot and should not provide any "guaranteed profit" strategy because:\n\n🚫 **No investment is risk-free** — Even fixed deposits carry inflation risk\n🚫 **Anyone promising guaranteed returns is likely a scammer**\n🚫 **Past performance doesn't guarantee future results**\n\n**What smart investors do instead:**\n1. 📊 Diversify across asset classes\n2. 📈 Invest for the long term (5+ years)\n3. 💡 Use SIPs to average out market volatility\n4. 🛡️ Set stop-losses to protect capital\n5. 📚 Continuously educate themselves\n\n**Safe(r) options for capital preservation:**\n- Government bonds (PPF — ~7.1%)\n- Fixed deposits with large banks\n- Liquid mutual funds\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'insider trading': `🚫 **Insider Trading is ILLEGAL**\n\nI cannot provide insider trading tips. Here's why:\n\n⚖️ **SEBI (Securities and Exchange Board of India)** strictly prohibits insider trading under the SEBI (Prohibition of Insider Trading) Regulations.\n\n**Penalties include:**\n- ₹25 crore fine or 3x profits (whichever is higher)\n- Up to 10 years imprisonment\n- Lifetime ban from securities markets\n\n**What IS legal:**\n✅ Analyzing publicly available financial data\n✅ Reading company annual reports\n✅ Following market news and expert analysis\n✅ Technical and fundamental analysis\n✅ Using screeners and stock research tools\n\n💡 **Tip:** Focus on building genuine analytical skills instead of shortcuts.\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'portfolio dropped': `📊 **Portfolio Down 20%? Here's What to Do:**\n\n**Step 1: Don't Panic Sell** 🧘\n- Emotional selling during dips locks in losses\n- Markets have always recovered historically\n\n**Step 2: Analyze WHY it dropped**\n- Market-wide correction? → Usually temporary\n- Company-specific bad news? → Review fundamentals\n- Sector rotation? → Check if the sector is still viable\n\n**Step 3: Review Your Holdings** 📋\n- Are the fundamentals still strong?\n- Has the investment thesis changed?\n- Is the company still profitable?\n\n**Step 4: Consider Actions**\n- 🟢 If fundamentals are strong → Consider buying more (averaging down)\n- 🟡 If uncertain → Hold and wait for clarity\n- 🔴 If fundamentals have deteriorated → Consider cutting losses\n\n**Step 5: Rebalance** ⚖️\n- Ensure no single stock is >10% of portfolio\n- Check asset allocation is aligned with your risk profile\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'high volatility negative sharpe': `📊 **High Volatility + Negative Sharpe Ratio = RED FLAG** 🚩\n\n**What this means:**\n- High volatility = the stock swings wildly\n- Negative Sharpe ratio = you're earning LESS than a risk-free investment (like FD) for MORE risk\n\n**Should you buy?** Probably NOT. Here's the reasoning:\n\n🔴 **Against buying:**\n1. Negative Sharpe means risk isn't being rewarded\n2. High volatility can wipe out capital quickly\n3. Better risk-adjusted options likely exist\n\n🟡 **Exception cases:**\n1. If this is a turnaround candidate with improving fundamentals\n2. If the negative Sharpe is temporary (e.g., sector-wide dip)\n3. If you have a very long time horizon (5+ years)\n\n**What to do instead:**\n1. Look for stocks with Sharpe > 1.0 and moderate volatility\n2. Compare with index funds (Nifty 50 has Sharpe ~1.2)\n3. If you still like the company, wait for better entry point\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'invest reliance': `📊 **Analyzing RELIANCE Industries**\n\n**Sector:** Conglomerate (Oil & Gas, Telecom, Retail, Digital)\n\n**Bull Case (Reasons to consider):**\n📈 Jio platform - India's largest telecom & digital ecosystem\n📈 Retail expansion - JioMart & Reliance Retail growth\n📈 Green energy transition - ₹75,000 crore investment planned\n📈 Strong balance sheet & management\n\n**Bear Case (Risks):**\n📉 High valuations compared to sector peers\n📉 Oil & gas segment facing energy transition risks\n📉 Execution risk on new ventures\n📉 Regulatory uncertainties in telecom\n\n**Key Metrics to Watch:**\n- P/E Ratio vs industry average\n- Jio subscriber growth & ARPU\n- Debt-to-equity ratio\n- Free cash flow trend\n\n💡 **Suggestion:** Don't put all eggs in one basket. Even for strong companies like Reliance, limit to 5-10% of your portfolio.\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,

    'tcs vs reliance': `### Stock Comparison: TCS vs. Reliance Industries

**Disclaimer:** This analysis is for educational purposes only and is not personalized financial advice. Stock markets are volatile, and past performance does not guarantee future results. Always consult a qualified financial advisor, conduct your own research, and consider your risk tolerance, investment goals, and market conditions before making any decisions. The information provided here is based on general knowledge and publicly available data as of April 2026; actual figures may vary.

You're considering TCS (Tata Consultancy Services) and Reliance Industries (Reliance) as potential investments. Both are prominent Indian companies, but they operate in different sectors with distinct risk profiles. TCS is a pure-play IT services firm, while Reliance is a diversified conglomerate. Below, I'll provide a balanced comparison covering their sectors, bull/bear cases, key metrics, and a neutral suggestion to help you decide. This corrects the oversight in the original response, which focused solely on Reliance.

#### TCS (Tata Consultancy Services) Analysis
**Sector:** Information Technology (IT) and Software Services. TCS is one of India's largest IT outsourcing and consulting companies, providing digital transformation, cloud computing, cybersecurity, and AI solutions to global clients.

**Bull Case (Reasons to Consider Buying):**
- 📈 Strong demand for IT services driven by digital transformation, cloud adoption, and AI integration across industries.
- 📈 Robust track record of revenue growth, with a focus on high-margin services like consulting and software development.
- 📈 Diversified client base (including Fortune 500 companies) reduces dependency on any single market or sector.
- 📈 Positive sentiment from India's growing tech ecosystem and government initiatives like Digital India.

**Bear Case (Reasons to Be Cautious):**
- 📉 Intense competition from global players (e.g., Accenture, IBM) and domestic rivals (e.g., Infosys, Wipro) could pressure margins.
- 📉 Economic slowdowns or recessions often hit IT spending first, leading to delayed projects or contract cancellations.
- 📉 Regulatory changes, such as data privacy laws (e.g., GDPR equivalents in India) or geopolitical tensions, could increase compliance costs.
- 📉 Over-reliance on exports; currency fluctuations (e.g., USD/INR) can impact profitability.

**Key Metrics (Approximate as of April 2026, based on recent trends):**
- **Market Cap:** ~₹14-15 lakh crore (around $170-180 billion).
- **P/E Ratio:** 25-30 (indicating moderate valuation; lower is generally better for growth stocks).
- **ROE (Return on Equity):** 35-40% (strong efficiency in generating profits from equity).
- **Revenue Growth (YoY):** 8-12% (steady but not explosive).
- **Debt-to-Equity:** Low (around 0.1-0.2), showing financial stability.
- **Dividend Yield:** 2-3% (attractive for income-focused investors).

#### Reliance Industries Analysis
**Sector:** Diversified Conglomerate (Energy, Telecom, Retail, and more). Reliance is India's largest private-sector company, with major operations in oil refining, petrochemicals, telecommunications (Jio), retail (Reliance Retail), and emerging areas like digital services.

**Bull Case (Reasons to Consider Buying):**
- 📈 Diversification across high-growth sectors like telecom and retail provides resilience against sector-specific downturns.
- 📈 Reliance Jio has revolutionized India's telecom market with affordable data plans, driving subscriber growth and revenue.
- 📈 Strong balance sheet and cash flows from energy operations support expansion into new areas like renewables and e-commerce.
- 📈 Leadership under Mukesh Ambani and strategic acquisitions (e.g., in retail) position it for long-term growth in India's consumption story.

**Bear Case (Reasons to Be Cautious):**
- 📉 Exposure to volatile oil and gas prices; geopolitical events (e.g., Middle East tensions) can spike input costs and squeeze margins.
- 📉 Regulatory scrutiny in telecom (e.g., spectrum auctions, competition from rivals like Airtel) and retail could lead to higher expenses.
- 📉 Conglomerate structure means performance is tied to multiple sectors, amplifying risks if one underperforms (e.g., energy downturns).
- 📉 High debt levels in some subsidiaries (though overall manageable) and competition in retail/e-commerce from global players.

**Key Metrics (Approximate as of April 2026, based on recent trends):**
- **Market Cap:** ~₹18-20 lakh crore (around $220-240 billion), making it India's most valuable company.
- **P/E Ratio:** 20-25 (relatively attractive for a large-cap stock).
- **ROE (Return on Equity):** 10-15% (solid but lower than TCS due to diversification).
- **Revenue Growth (YoY):** 10-15% (driven by telecom and retail segments).
- **Debt-to-Equity:** Moderate (around 0.4-0.6), higher than TCS but backed by strong cash flows.
- **Dividend Yield:** 0.5-1% (lower, as profits are reinvested for growth).

#### Comparison and Choice Guidance
- **Sector and Risk Profile:** TCS is a focused IT play, ideal for investors bullish on technology trends but sensitive to economic cycles. Reliance offers broader diversification, making it more stable during downturns but exposed to commodity and regulatory risks. TCS might appeal to growth-oriented investors, while Reliance suits those seeking exposure to India's consumption and energy sectors.
- **Performance Potential:** TCS has higher ROE and growth in IT services, but Reliance's scale and market leadership could yield better long-term returns if diversification pays off. Historically, IT stocks like TCS have outperformed during tech booms, while Reliance has benefited from India's GDP growth.
- **Valuation and Suitability:** TCS trades at a premium (higher P/E) due to its growth narrative, while Reliance is more reasonably valued. If you're risk-averse and prefer stability, Reliance might edge out; if you believe in IT's future, TCS could be preferable.
- 💡 **Suggestion:** Don't put all eggs in one basket. Even for strong companies like TCS or Reliance, limit to 5-10% of your portfolio. If confused, consider your time horizon: short-term (1-3 years) might favor TCS for tech momentum, while long-term (5+ years) could lean toward Reliance for diversification. Allocate based on risk (e.g., 50/50 if unsure) and monitor trends. As an alternative, explore peers like Infosys for TCS or Adani Enterprises for Reliance. Always backtest with tools like technical analysis or sentiment indicators before investing. If possible, review their latest quarterly reports for the most current data.

⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`,
};

/**
 * Search the built-in knowledge base for matching content
 */
const searchKnowledgeBase = (message) => {
    const lower = message.toLowerCase();

    // Direct keyword matches (check longest first)
    const keys = Object.keys(KNOWLEDGE_BASE).sort((a, b) => b.length - a.length);
    for (const key of keys) {
        if (lower.includes(key)) return KNOWLEDGE_BASE[key];
    }

    // Fuzzy intent matches
    if (lower.includes('tcs') && lower.includes('reliance')) return KNOWLEDGE_BASE['tcs vs reliance'];
    if (lower.includes('buy') && lower.includes('reliance')) return KNOWLEDGE_BASE['invest reliance'];
    if (lower.includes('invest') && lower.includes('reliance')) return KNOWLEDGE_BASE['invest reliance'];
    if (lower.includes('should i buy')) return KNOWLEDGE_BASE['invest reliance'];
    if (lower.includes('guaranteed') || lower.includes('100%') || lower.includes('sure profit')) return KNOWLEDGE_BASE['guaranteed profit'];
    if (lower.includes('insider')) return KNOWLEDGE_BASE['insider trading'];
    if (lower.includes('dropped') || lower.includes('fell') || lower.includes('crash') || lower.includes('down 20')) return KNOWLEDGE_BASE['portfolio dropped'];
    if (lower.includes('volatility') || lower.includes('volatile')) return KNOWLEDGE_BASE['volatility'];
    if (lower.includes('negative sharpe') || (lower.includes('high volatility') && lower.includes('sharpe'))) return KNOWLEDGE_BASE['high volatility negative sharpe'];
    if (/\b(hi|hey|hii)\b/.test(lower) || lower.includes('good morning') || lower.includes('good evening')) return KNOWLEDGE_BASE['hello'];
    if (lower.includes('risk') && (lower.includes('score') || lower.includes('level') || lower.includes('profile'))) return KNOWLEDGE_BASE['risk score'];

    return null;
};

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
 * Try Google Gemini API
 */
const tryGemini = async (message, history) => {
    if (!gemini) return null;

    try {
        const conversationContext = history.length > 0
            ? '\n\nConversation so far:\n' + history.map(m => `${m.role}: ${m.content}`).join('\n')
            : '';

        const prompt = `${SYSTEM_PROMPT_TEXT}${conversationContext}\n\nUser: ${message}\n\nAssistant:`;

        const response = await gemini.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: prompt,
        });

        // Handle both SDK versions: .text (property) and .text() (method)
        let text = typeof response.text === 'function' ? response.text() : response.text;
        if (!text && response.candidates?.[0]?.content?.parts?.[0]?.text) {
            text = response.candidates[0].content.parts[0].text;
        }
        console.log('Gemini response received, length:', text?.length || 0);
        if (text && text.trim().length > 10) {
            return { reply: text.trim(), source: 'google_gemini' };
        }
        return null;
    } catch (error) {
        console.warn('Gemini API failed:', error.message);
        return null;
    }
};

/**
 * Try HuggingFace Mistral-7B via router.huggingface.co
 */
const tryHuggingFace = async (message, history) => {
    if (!HF_API_KEY) return null;
    try {
        const fullMessages = [
            SYSTEM_PROMPT,
            ...history,
            { role: 'user', content: message },
        ];

        const { data } = await axios.post(
            HF_ROUTER_URL,
            {
                model: 'mistralai/Mistral-7B-Instruct-v0.3',
                messages: fullMessages,
                max_tokens: 512,
                temperature: 0.7,
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
        if (text && text.trim().length > 10) {
            return { reply: text.trim(), source: 'huggingface_mistral' };
        }
        return null;
    } catch (error) {
        console.warn('HuggingFace API failed:', error.message);
        return null;
    }
};

/**
 * Try Local RAG Engine (FastAPI)
 */
const tryLocalRAG = async (message) => {
    try {
        const { data } = await axios.post('http://127.0.0.1:8000/api/query', {
            question: message
        }, { timeout: 8000 });
        
        if (data && data.status === 'success' && data.answer) {
            return { reply: data.answer, source: 'rag_local_engine' };
        }
        return null;
    } catch (error) {
        console.warn('Local RAG API failed or is not running:', error.message);
        return null;
    }
};

/**
 * Try user's custom Gradio Model
 */
const tryGradioModel = async (message, history) => {
    try {
        const { Client } = require("@gradio/client");
        const client = await Client.connect("https://f896084feffc452d95.gradio.live/");
        
        const formattedHistory = history.map(h => ({
            role: h.role,
            metadata: null,
            content: h.content,
            options: null
        }));

        const result = await client.predict("/respond", { 		
            question: message, 		
            history: formattedHistory, 
        });

        if (result && result.data && Array.isArray(result.data[1])) {
            const updatedHistory = result.data[1];
            if (updatedHistory.length > 0) {
                const botReply = updatedHistory[updatedHistory.length - 1].content;
                if (botReply) {
                    
                    let finalReply = botReply;
                    
                    // Intercept and format raw unreadable data if gemini is available
                    if (gemini && botReply.length > 50) {
                        try {
                            const formattingPrompt = `You are a financial formatting assistant. The following text contains stock market data from a raw AI source.
Please reformat this data into a highly readable and understandable markdown format.
Provide exactly two distinct sections:
1. "🟢 **For Beginners:**" (Explain the data in extremely simple, easy-to-understand terms, assuming no financial background at all.)
2. "🔵 **For Advanced Investors:**" (Provide the technical metrics, numbers, and facts clearly formatted using bullet points for quick scanning.)

Make the response clean, well-structured, and use emojis. Do NOT make up any numbers; use only the facts provided in the raw text.

Raw Text:
${botReply}`;

                            const fpResponse = await gemini.models.generateContent({
                                model: 'gemini-2.0-flash',
                                contents: formattingPrompt,
                            });
                            
                            let cleanText = typeof fpResponse.text === 'function' ? fpResponse.text() : fpResponse.text;
                            if (!cleanText && fpResponse.candidates?.[0]?.content?.parts?.[0]?.text) {
                                cleanText = fpResponse.candidates[0].content.parts[0].text;
                            }
                            
                            if (cleanText && cleanText.trim().length > 10) {
                                finalReply = cleanText.trim();
                            }
                        } catch (fmtErr) {
                            console.warn("Gradio output formatting failed:", fmtErr.message);
                        }
                    }

                    return { reply: finalReply, source: 'gradio_custom_model' };
                }
            }
        }
        return null;
    } catch (error) {
        console.warn('Gradio Model API failed:', error.message);
        return null;
    }
};

/**
 * @route   POST /api/ai/chat
 * @desc    AI Chat Advisor — Triple Fallback: Gemini → HuggingFace → Built-in Knowledge
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

        let aiReply = null;
        let source = 'built_in';

        // ── Attempt 1: Local RAG API (Primary Engine) ──
        const ragResult = await tryLocalRAG(message);
        if (ragResult) {
            aiReply = ragResult.reply;
            source = ragResult.source;
        }

        // ── Attempt 2: Custom Gradio Model ──
        if (!aiReply) {
            const gradioResult = await tryGradioModel(message, history);
            if (gradioResult) {
                aiReply = gradioResult.reply;
                source = gradioResult.source;
            }
        }

        // ── Attempt 3: Google Gemini (fastest, most reliable) ──
        if (!aiReply) {
            const geminiResult = await tryGemini(message, history);
            if (geminiResult) {
                aiReply = geminiResult.reply;
                source = geminiResult.source;
            }
        }

        // ── Attempt 4: HuggingFace Mistral-7B ──
        if (!aiReply) {
            const hfResult = await tryHuggingFace(message, history);
            if (hfResult) {
                aiReply = hfResult.reply;
                source = hfResult.source;
            }
        }

        // ── Attempt 4: Built-in Financial Knowledge Engine ──
        if (!aiReply) {
            const kbResult = searchKnowledgeBase(message);
            if (kbResult) {
                aiReply = kbResult;
                source = 'built_in_knowledge';
            }
        }

        // ── Final fallback ──
        if (!aiReply) {
            aiReply = `I appreciate your question! While I couldn't connect to my AI models right now, here's what I can help you with:\n\n📈 Stock market concepts & analysis\n📊 Portfolio management & risk\n💡 Financial terms (Sharpe ratio, P/E, volatility)\n🛡️ Risk management strategies\n\nTry asking:\n• "What is stock market?"\n• "Explain volatility"\n• "What is Sharpe ratio?"\n• "What is portfolio risk?"\n\n⚠️ This is not financial advice. Consult a SEBI-registered advisor before investing.`;
            source = 'fallback';
        }

        // Save to conversation history
        history.push({ role: 'user', content: message });
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
                source,
                timestamp: new Date().toISOString(),
            },
        });
    } catch (error) {
        console.error('Chat advisor error:', error);

        // Even on total failure, try the knowledge base
        const { message: msg } = req.body;
        const kbFallback = msg ? searchKnowledgeBase(msg) : null;

        if (kbFallback) {
            return res.status(200).json({
                success: true,
                data: {
                    userMessage: msg,
                    response: kbFallback,
                    aiResponse: kbFallback,
                    source: 'emergency_fallback',
                    timestamp: new Date().toISOString(),
                },
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
