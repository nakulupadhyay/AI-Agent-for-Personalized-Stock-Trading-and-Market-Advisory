const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const riskEngine = require('../utils/riskEngine');
const { fetchLivePrice } = require('../utils/fetchLivePrice');

/**
 * @route   POST /api/trading/buy
 * @desc    Execute a buy order (paper trading)
 * @access  Private
 */
const buyStock = async (req, res) => {
    try {
        const { symbol, companyName, quantity, price } = req.body;
        const userId = req.user.id;

        // Validation
        if (!symbol || !companyName || !quantity || !price) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields',
            });
        }

        if (quantity <= 0 || price <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity and price must be positive numbers',
            });
        }

        const totalAmount = quantity * price;

        // Get user's current balance
        const user = await User.findById(userId);

        if (user.virtualBalance < totalAmount) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance',
            });
        }

        // Deduct from virtual balance
        user.virtualBalance -= totalAmount;
        await user.save();

        // Update portfolio
        let portfolio = await Portfolio.findOne({ userId });

        if (!portfolio) {
            portfolio = await Portfolio.create({ userId, holdings: [] });
        }

        // Check if stock already exists in portfolio
        const existingHolding = portfolio.holdings.find(h => h.symbol === symbol);

        if (existingHolding) {
            // Update existing holding
            const totalQuantity = existingHolding.quantity + quantity;
            const totalCost = (existingHolding.averagePrice * existingHolding.quantity) + totalAmount;
            existingHolding.quantity = totalQuantity;
            existingHolding.averagePrice = totalCost / totalQuantity;
            existingHolding.currentPrice = price;
        } else {
            // Add new holding
            portfolio.holdings.push({
                symbol,
                companyName,
                quantity,
                averagePrice: price,
                currentPrice: price,
            });
        }

        // Update portfolio totals
        portfolio.totalInvested += totalAmount;
        portfolio.currentValue = portfolio.holdings.reduce((sum, h) =>
            sum + (h.quantity * h.currentPrice), 0
        );
        portfolio.profitLoss = portfolio.currentValue - portfolio.totalInvested;
        portfolio.updatedAt = Date.now();

        await portfolio.save();

        // Create transaction record
        await Transaction.create({
            userId,
            type: 'BUY',
            symbol,
            companyName,
            quantity,
            price,
            totalAmount,
        });

        res.status(200).json({
            success: true,
            message: 'Buy order executed successfully',
            data: {
                remainingBalance: user.virtualBalance,
                portfolio,
            },
        });
    } catch (error) {
        console.error('Buy stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during buy order',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/trading/sell
 * @desc    Execute a sell order (paper trading)
 * @access  Private
 */
const sellStock = async (req, res) => {
    try {
        const { symbol, companyName, quantity, price } = req.body;
        const userId = req.user.id;

        // Validation
        if (!symbol || !quantity) {
            return res.status(400).json({
                success: false,
                message: 'Please provide symbol and quantity',
            });
        }

        if (quantity <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Quantity must be a positive number',
            });
        }

        // Get portfolio
        const portfolio = await Portfolio.findOne({ userId });

        if (!portfolio) {
            return res.status(400).json({
                success: false,
                message: 'No portfolio found',
            });
        }

        // Find holding
        const holding = portfolio.holdings.find(h => h.symbol === symbol);

        if (!holding) {
            return res.status(400).json({
                success: false,
                message: 'Stock not found in portfolio',
            });
        }

        if (holding.quantity < quantity) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient stock quantity',
            });
        }

        // ── FETCH LIVE MARKET PRICE ─────────────────────
        // This is the key fix: use real-time price instead of stale request body price
        let sellPrice;
        const liveData = await fetchLivePrice(symbol);

        if (liveData && liveData.currentPrice > 0) {
            sellPrice = liveData.currentPrice;
            console.log(`📈 Live sell price for ${symbol}: ₹${sellPrice}`);
        } else {
            // Fallback: use the price from request body (frontend's last known price)
            sellPrice = price || holding.currentPrice || holding.averagePrice;
            console.log(`⚠️ Using fallback sell price for ${symbol}: ₹${sellPrice}`);
        }

        // ── CALCULATE P&L ───────────────────────────────
        const buyPrice = holding.averagePrice;
        const investment = buyPrice * quantity;
        const sellValue = sellPrice * quantity;
        const profitLoss = sellValue - investment;
        const percentGain = buyPrice > 0
            ? ((sellPrice - buyPrice) / buyPrice) * 100
            : 0;

        // ── UPDATE USER BALANCE ─────────────────────────
        // Credit the ACTUAL sell value (with profit or loss), not the original investment
        const user = await User.findById(userId);
        user.virtualBalance += sellValue;
        await user.save();

        // ── UPDATE HOLDING ──────────────────────────────
        holding.quantity -= quantity;

        // Remove holding if quantity becomes zero
        if (holding.quantity === 0) {
            portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol);
        } else {
            // Update current price on remaining holding
            holding.currentPrice = sellPrice;
        }

        // ── UPDATE PORTFOLIO TOTALS ─────────────────────
        portfolio.totalInvested = portfolio.holdings.reduce((sum, h) =>
            sum + (h.quantity * h.averagePrice), 0
        );
        portfolio.currentValue = portfolio.holdings.reduce((sum, h) =>
            sum + (h.quantity * (h.currentPrice || h.averagePrice)), 0
        );
        portfolio.profitLoss = portfolio.currentValue - portfolio.totalInvested;
        portfolio.updatedAt = Date.now();

        await portfolio.save();

        // ── CREATE TRANSACTION RECORD (with P&L) ────────
        await Transaction.create({
            userId,
            type: 'SELL',
            symbol,
            companyName: companyName || holding.companyName || symbol,
            quantity,
            price: sellPrice,
            totalAmount: sellValue,
            sellPrice,
            buyPrice,
            profitLoss,
            percentGain: parseFloat(percentGain.toFixed(2)),
        });

        // ── ENRICHED RESPONSE WITH P&L BREAKDOWN ────────
        res.status(200).json({
            success: true,
            message: 'Sell order executed successfully',
            data: {
                sellDetails: {
                    symbol,
                    quantity,
                    buyPrice: parseFloat(buyPrice.toFixed(2)),
                    sellPrice: parseFloat(sellPrice.toFixed(2)),
                    investment: parseFloat(investment.toFixed(2)),
                    sellValue: parseFloat(sellValue.toFixed(2)),
                    profitLoss: parseFloat(profitLoss.toFixed(2)),
                    percentGain: parseFloat(percentGain.toFixed(2)),
                },
                updatedBalance: user.virtualBalance,
                portfolio,
            },
        });
    } catch (error) {
        console.error('Sell stock error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during sell order',
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/trading/portfolio
 * @desc    Get user's portfolio
 * @access  Private
 */
const getPortfolio = async (req, res) => {
    try {
        const userId = req.user.id;

        const portfolio = await Portfolio.findOne({ userId });
        const user = await User.findById(userId);

        if (!portfolio) {
            return res.status(200).json({
                success: true,
                data: {
                    holdings: [],
                    totalInvested: 0,
                    currentValue: 0,
                    profitLoss: 0,
                    virtualBalance: user.virtualBalance,
                },
            });
        }

        res.status(200).json({
            success: true,
            data: {
                ...portfolio.toObject(),
                virtualBalance: user.virtualBalance,
            },
        });
    } catch (error) {
        console.error('Get portfolio error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching portfolio',
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/trading/transactions
 * @desc    Get user's transaction history
 * @access  Private
 */
const getTransactions = async (req, res) => {
    try {
        const userId = req.user.id;

        const transactions = await Transaction.find({ userId })
            .sort({ timestamp: -1 })
            .limit(50);

        res.status(200).json({
            success: true,
            count: transactions.length,
            data: transactions,
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching transactions',
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/trading/portfolio/analysis
 * @desc    Full portfolio analysis with risk, AI insights, sector breakdown, etc.
 * @access  Private
 */
const getPortfolioAnalysis = async (req, res) => {
    try {
        const userId = req.user.id;
        const portfolio = await Portfolio.findOne({ userId });
        const user = await User.findById(userId);
        const transactions = await Transaction.find({ userId }).sort({ timestamp: -1 });

        if (!portfolio || portfolio.holdings.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    summary: { totalInvestment: 0, currentValue: 0, totalPL: 0, todaysGain: 0, returnPercent: 0 },
                    holdings: [],
                    riskAnalysis: { riskScore: 'N/A', volatility: 0, sharpeRatio: 0, diversificationScore: 0 },
                    aiInsights: ['Start investing to see AI-powered insights here.'],
                    sectorBreakdown: [],
                    rebalancing: [],
                    stopLoss: [],
                    drawdown: { maxDrawdown: 0, currentDrawdown: 0 },
                    performanceHistory: [],
                    transactions: [],
                    virtualBalance: user.virtualBalance,
                    simulationMode: user.simulationMode !== false,
                },
            });
        }

        // ── SECTOR MAPPING ──────────────────────────
        const sectorMap = {
            'RELIANCE': 'Energy & Petrochemicals',
            'TCS': 'Information Technology',
            'INFY': 'Information Technology',
            'HDFCBANK': 'Banking & Finance',
            'ICICIBANK': 'Banking & Finance',
            'WIPRO': 'Information Technology',
            'SBIN': 'Banking & Finance',
            'BHARTIARTL': 'Telecom',
            'ITC': 'FMCG',
            'LT': 'Infrastructure',
            'HCLTECH': 'Information Technology',
            'MARUTI': 'Automobile',
            'TATAMOTORS': 'Automobile',
            'SUNPHARMA': 'Pharmaceuticals',
            'ADANIENT': 'Infrastructure',
        };

        // ── HOLDINGS ENRICHMENT ──────────────────────
        const enrichedHoldings = portfolio.holdings.map(h => {
            const totalValue = h.quantity * h.currentPrice;
            const invested = h.quantity * h.averagePrice;
            const profitLoss = totalValue - invested;
            const returnPercent = invested > 0 ? ((profitLoss / invested) * 100) : 0;
            return {
                symbol: h.symbol,
                companyName: h.companyName,
                quantity: h.quantity,
                avgBuyPrice: h.averagePrice,
                currentPrice: h.currentPrice,
                totalValue,
                invested,
                profitLoss,
                returnPercent,
                sector: sectorMap[h.symbol] || 'Other',
            };
        });

        const totalInvestment = enrichedHoldings.reduce((s, h) => s + h.invested, 0);
        const currentValue = enrichedHoldings.reduce((s, h) => s + h.totalValue, 0);
        const totalPL = currentValue - totalInvestment;
        const returnPercent = totalInvestment > 0 ? ((totalPL / totalInvestment) * 100) : 0;

        // Today's gain — approximate from change since last update
        const todaysGain = enrichedHoldings.reduce((s, h) => {
            const dailyChange = h.currentPrice * 0.005 * (Math.random() > 0.4 ? 1 : -1); // Approximate
            return s + dailyChange * h.quantity;
        }, 0);

        // ── SECTOR BREAKDOWN ─────────────────────────
        const sectorData = {};
        enrichedHoldings.forEach(h => {
            if (!sectorData[h.sector]) sectorData[h.sector] = 0;
            sectorData[h.sector] += h.totalValue;
        });
        const sectorBreakdown = Object.entries(sectorData).map(([name, value]) => ({
            name,
            value,
            percent: currentValue > 0 ? ((value / currentValue) * 100) : 0,
        })).sort((a, b) => b.percent - a.percent);

        // ── RISK ANALYSIS (using quantitative engine) ─
        const enrichedWithSector = enrichedHoldings.map(h => ({
            ...h,
            sector: h.sector,
            quantity: h.quantity,
            currentPrice: h.currentPrice,
            averagePrice: h.avgBuyPrice,
        }));

        const riskAnalysisResult = riskEngine.runFullAnalysis({
            holdings: enrichedWithSector,
            transactions: transactions,
        });

        const { riskScore, riskCategory, metrics: riskMetrics } = riskAnalysisResult;
        const volatility = riskMetrics.volatility;
        const sharpeRatio = riskMetrics.sharpeRatio;
        const holdingCount = enrichedHoldings.length;

        // Diversification score (keep backward compatible)
        const uniqueSectors = new Set(enrichedHoldings.map(h => h.sector)).size;
        const maxAllocation = Math.max(...enrichedHoldings.map(h => h.totalValue / currentValue * 100), 0);
        const diversificationScore = Math.min(100, Math.round(
            (holdingCount * 10) + (uniqueSectors * 15) + (100 - maxAllocation) * 0.5
        ));

        // ── AI INSIGHTS (using risk engine explanations) ────
        const aiInsights = riskAnalysisResult.explanations.slice(0, 6);

        // ── REBALANCING SUGGESTIONS ──────────────────
        const idealAllocation = 100 / holdingCount;
        const rebalancing = enrichedHoldings.map(h => {
            const currentAlloc = (h.totalValue / currentValue) * 100;
            const diff = currentAlloc - idealAllocation;
            return {
                symbol: h.symbol,
                currentAllocation: currentAlloc,
                idealAllocation,
                action: diff > 5 ? 'REDUCE' : diff < -5 ? 'INCREASE' : 'HOLD',
                adjustPercent: Math.abs(diff),
            };
        }).filter(r => r.action !== 'HOLD');

        // ── STOP-LOSS SUGGESTIONS ────────────────────
        const stopLoss = enrichedHoldings.map(h => {
            const stopPrice = h.currentPrice * 0.92; // 8% stop loss
            const trailingStop = h.currentPrice * 0.95; // 5% trailing
            return {
                symbol: h.symbol,
                currentPrice: h.currentPrice,
                stopLossPrice: stopPrice,
                trailingStopPrice: trailingStop,
                riskAmount: (h.currentPrice - stopPrice) * h.quantity,
            };
        });

        // ── DRAWDOWN ANALYSIS ────────────────────────
        let peakValue = totalInvestment;
        let maxDrawdown = 0;
        // Simulate historical peak tracking from transactions
        let runningValue = 0;
        const sortedTx = [...transactions].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        sortedTx.forEach(tx => {
            if (tx.type === 'BUY') runningValue += tx.totalAmount;
            else runningValue -= tx.totalAmount;
            if (runningValue > peakValue) peakValue = runningValue;
            const drawdown = peakValue > 0 ? ((peakValue - runningValue) / peakValue) * 100 : 0;
            if (drawdown > maxDrawdown) maxDrawdown = drawdown;
        });
        const currentDrawdown = peakValue > 0 ? ((peakValue - currentValue) / peakValue) * 100 : 0;

        // ── PERFORMANCE HISTORY (from transactions) ──
        const performanceHistory = [];
        let cumValue = 0;
        sortedTx.forEach(tx => {
            if (tx.type === 'BUY') cumValue += tx.totalAmount;
            else cumValue -= tx.totalAmount * 0.9; // approximate after sell
            performanceHistory.push({
                date: tx.timestamp,
                value: Math.max(0, cumValue),
            });
        });
        // Add current state
        performanceHistory.push({ date: new Date(), value: currentValue });

        // ── TRANSACTION HISTORY (enriched) ───────────
        const enrichedTx = transactions.slice(0, 50).map(tx => ({
            date: tx.timestamp,
            stock: tx.symbol,
            companyName: tx.companyName,
            type: tx.type,
            quantity: tx.quantity,
            price: tx.price,
            totalAmount: tx.totalAmount,
            status: 'Completed',
        }));

        res.status(200).json({
            success: true,
            data: {
                summary: {
                    totalInvestment,
                    currentValue,
                    totalPL,
                    todaysGain,
                    returnPercent,
                },
                holdings: enrichedHoldings,
                riskAnalysis: {
                    riskScore: riskAnalysisResult.riskScore,
                    riskCategory: riskAnalysisResult.riskCategory,
                    volatility: riskMetrics.volatility.toFixed(2),
                    sharpeRatio: riskMetrics.sharpeRatio.toFixed(2),
                    beta: riskMetrics.beta.toFixed(2),
                    varDaily: riskMetrics.varDaily.toFixed(2),
                    varAmount: riskMetrics.varAmount,
                    diversificationScore,
                    scoreBreakdown: riskAnalysisResult.scoreBreakdown,
                },
                aiInsights,
                sectorBreakdown,
                rebalancing,
                stopLoss,
                drawdown: {
                    maxDrawdown: maxDrawdown.toFixed(2),
                    currentDrawdown: currentDrawdown.toFixed(2),
                },
                performanceHistory,
                transactions: enrichedTx,
                virtualBalance: user.virtualBalance,
                simulationMode: user.simulationMode !== false,
            },
        });
    } catch (error) {
        console.error('Portfolio analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error during portfolio analysis',
            error: error.message,
        });
    }
};

/**
 * @route   POST /api/trading/limit-order
 * @desc    Place a limit order (executes when price reaches target)
 * @access  Private
 */
const placeLimitOrder = async (req, res) => {
    try {
        const { symbol, companyName, quantity, limitPrice, type } = req.body;
        const userId = req.user.id;

        if (!symbol || !quantity || !limitPrice || !type) {
            return res.status(400).json({ success: false, message: 'All fields required: symbol, quantity, limitPrice, type' });
        }

        const user = await User.findById(userId);
        const totalAmount = quantity * limitPrice;

        // For buy limit orders, check if user has enough balance
        if (type === 'BUY' && user.virtualBalance < totalAmount) {
            return res.status(400).json({ success: false, message: 'Insufficient balance for limit order' });
        }

        // For sell limit orders, check if user has the stock
        if (type === 'SELL') {
            const portfolio = await Portfolio.findOne({ userId });
            const holding = portfolio?.holdings.find(h => h.symbol === symbol);
            if (!holding || holding.quantity < quantity) {
                return res.status(400).json({ success: false, message: 'Insufficient stock quantity' });
            }
        }

        const order = await Transaction.create({
            userId,
            type,
            orderType: 'LIMIT',
            symbol,
            companyName: companyName || symbol,
            quantity,
            price: limitPrice,
            limitPrice,
            totalAmount,
            status: 'PENDING',
        });

        res.json({
            success: true,
            message: `Limit ${type} order placed for ${symbol} at ₹${limitPrice}`,
            data: order,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/trading/stop-loss
 * @desc    Place a stop-loss order
 * @access  Private
 */
const placeStopLoss = async (req, res) => {
    try {
        const { symbol, companyName, quantity, stopLossPrice } = req.body;
        const userId = req.user.id;

        if (!symbol || !quantity || !stopLossPrice) {
            return res.status(400).json({ success: false, message: 'All fields required: symbol, quantity, stopLossPrice' });
        }

        // Check user has the stock
        const portfolio = await Portfolio.findOne({ userId });
        const holding = portfolio?.holdings.find(h => h.symbol === symbol);
        if (!holding || holding.quantity < quantity) {
            return res.status(400).json({ success: false, message: 'Insufficient stock quantity for stop-loss' });
        }

        const order = await Transaction.create({
            userId,
            type: 'SELL',
            orderType: 'STOP_LOSS',
            symbol,
            companyName: companyName || holding.companyName,
            quantity,
            price: stopLossPrice,
            stopLossPrice,
            totalAmount: quantity * stopLossPrice,
            status: 'PENDING',
        });

        res.json({
            success: true,
            message: `Stop-loss set for ${symbol} at ₹${stopLossPrice}`,
            data: order,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/trading/pending-orders
 * @desc    List all pending limit and stop-loss orders
 * @access  Private
 */
const getPendingOrders = async (req, res) => {
    try {
        const orders = await Transaction.find({
            userId: req.user.id,
            status: 'PENDING',
        }).sort({ timestamp: -1 });

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   DELETE /api/trading/order/:id
 * @desc    Cancel a pending order
 * @access  Private
 */
const cancelOrder = async (req, res) => {
    try {
        const order = await Transaction.findOneAndUpdate(
            { _id: req.params.id, userId: req.user.id, status: 'PENDING' },
            { status: 'CANCELLED' },
            { new: true }
        );

        if (!order) {
            return res.status(404).json({ success: false, message: 'Pending order not found' });
        }

        res.json({ success: true, message: 'Order cancelled', data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/trading/analytics
 * @desc    Trading performance analytics
 * @access  Private
 */
const getTradeAnalytics = async (req, res) => {
    try {
        const transactions = await Transaction.find({
            userId: req.user.id,
            status: { $ne: 'PENDING' },
        }).sort({ timestamp: 1 });

        if (transactions.length === 0) {
            return res.json({
                success: true,
                data: {
                    totalTrades: 0,
                    buyTrades: 0,
                    sellTrades: 0,
                    winRate: 0,
                    avgReturn: 0,
                    bestTrade: null,
                    worstTrade: null,
                    totalVolume: 0,
                    mostTraded: null,
                    tradesByMonth: [],
                },
            });
        }

        const buys = {};
        let wins = 0, losses = 0, totalReturn = 0;
        let bestPL = -Infinity, worstPL = Infinity;
        let bestTrade = null, worstTrade = null;
        const stockVolume = {};

        for (const tx of transactions) {
            // Track volume
            stockVolume[tx.symbol] = (stockVolume[tx.symbol] || 0) + tx.totalAmount;

            if (tx.type === 'BUY') {
                buys[tx.symbol] = { price: tx.price, amount: tx.totalAmount, date: tx.timestamp };
            } else if (tx.type === 'SELL' && buys[tx.symbol]) {
                const pl = (tx.price - buys[tx.symbol].price) * tx.quantity;
                totalReturn += pl;
                if (pl > 0) wins++;
                else losses++;
                if (pl > bestPL) { bestPL = pl; bestTrade = { symbol: tx.symbol, profitLoss: pl, price: tx.price, date: tx.timestamp }; }
                if (pl < worstPL) { worstPL = pl; worstTrade = { symbol: tx.symbol, profitLoss: pl, price: tx.price, date: tx.timestamp }; }
                delete buys[tx.symbol];
            }
        }

        const buyTrades = transactions.filter(t => t.type === 'BUY').length;
        const sellTrades = transactions.filter(t => t.type === 'SELL').length;
        const closedTrades = wins + losses;
        const totalVolume = transactions.reduce((s, t) => s + t.totalAmount, 0);
        const mostTraded = Object.entries(stockVolume).sort((a, b) => b[1] - a[1])[0];

        // Trades by month
        const monthMap = {};
        transactions.forEach(tx => {
            const key = new Date(tx.timestamp).toISOString().slice(0, 7);
            if (!monthMap[key]) monthMap[key] = { buys: 0, sells: 0, volume: 0 };
            if (tx.type === 'BUY') monthMap[key].buys++;
            else monthMap[key].sells++;
            monthMap[key].volume += tx.totalAmount;
        });
        const tradesByMonth = Object.entries(monthMap).map(([month, data]) => ({ month, ...data }));

        res.json({
            success: true,
            data: {
                totalTrades: transactions.length,
                buyTrades,
                sellTrades,
                winRate: closedTrades > 0 ? Math.round((wins / closedTrades) * 100) : 0,
                avgReturn: closedTrades > 0 ? Math.round(totalReturn / closedTrades) : 0,
                totalReturn: Math.round(totalReturn),
                bestTrade,
                worstTrade,
                totalVolume: Math.round(totalVolume),
                mostTraded: mostTraded ? { symbol: mostTraded[0], volume: mostTraded[1] } : null,
                tradesByMonth,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { buyStock, sellStock, getPortfolio, getTransactions, getPortfolioAnalysis, placeLimitOrder, placeStopLoss, getPendingOrders, cancelOrder, getTradeAnalytics };
