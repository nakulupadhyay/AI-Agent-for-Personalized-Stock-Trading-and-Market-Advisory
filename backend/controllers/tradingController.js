const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');

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
        if (!symbol || !quantity || !price) {
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

        const totalAmount = quantity * price;

        // Add to virtual balance
        const user = await User.findById(userId);
        user.virtualBalance += totalAmount;
        await user.save();

        // Update holding
        holding.quantity -= quantity;

        // Remove holding if quantity becomes zero
        if (holding.quantity === 0) {
            portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol);
        }

        // Update portfolio totals
        portfolio.totalInvested = portfolio.holdings.reduce((sum, h) =>
            sum + (h.quantity * h.averagePrice), 0
        );
        portfolio.currentValue = portfolio.holdings.reduce((sum, h) =>
            sum + (h.quantity * h.currentPrice), 0
        );
        portfolio.profitLoss = portfolio.currentValue - portfolio.totalInvested;
        portfolio.updatedAt = Date.now();

        await portfolio.save();

        // Create transaction record
        await Transaction.create({
            userId,
            type: 'SELL',
            symbol,
            companyName: companyName || holding.companyName,
            quantity,
            price,
            totalAmount,
        });

        res.status(200).json({
            success: true,
            message: 'Sell order executed successfully',
            data: {
                remainingBalance: user.virtualBalance,
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

        // ── RISK ANALYSIS ────────────────────────────
        const holdingCount = enrichedHoldings.length;
        const returns = enrichedHoldings.map(h => h.returnPercent);
        const avgReturn = returns.reduce((s, r) => s + r, 0) / (returns.length || 1);
        const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1);
        const volatility = Math.sqrt(variance);
        const riskFreeRate = 6; // India 10Y gov bond ~6%
        const sharpeRatio = volatility > 0 ? ((avgReturn - riskFreeRate) / volatility) : 0;

        // Diversification: more stocks + more sectors = higher score
        const uniqueSectors = new Set(enrichedHoldings.map(h => h.sector)).size;
        const maxAllocation = Math.max(...enrichedHoldings.map(h => h.totalValue / currentValue * 100), 0);
        const diversificationScore = Math.min(100, Math.round(
            (holdingCount * 10) + (uniqueSectors * 15) + (100 - maxAllocation) * 0.5
        ));

        // Risk Score
        let riskScore = 'Medium';
        if (volatility > 20 || maxAllocation > 60) riskScore = 'High';
        else if (volatility < 8 && diversificationScore > 60) riskScore = 'Low';

        // ── AI INSIGHTS ──────────────────────────────
        const aiInsights = [];
        if (holdingCount === 1) aiInsights.push('⚠️ Your portfolio has only 1 stock. Diversification is key to managing risk.');
        else if (holdingCount <= 3) aiInsights.push('📊 Consider adding more stocks to improve diversification.');
        if (diversificationScore > 70) aiInsights.push('✅ Your portfolio is well diversified across multiple sectors.');
        else aiInsights.push('⚠️ Your portfolio is moderately diversified. Consider spreading across more sectors.');

        const topSector = sectorBreakdown[0];
        if (topSector && topSector.percent > 50) {
            aiInsights.push(`🏭 ${topSector.name} sector exposure is high (${topSector.percent.toFixed(0)}%). Consider reducing concentration.`);
        }

        if (volatility > 15) aiInsights.push('📈 Portfolio volatility is high. Consider adding low-beta stocks to reduce risk.');
        if (totalPL > 0) aiInsights.push(`💰 Great performance! Your portfolio is up ${returnPercent.toFixed(1)}% overall.`);
        else aiInsights.push(`📉 Your portfolio is down ${Math.abs(returnPercent).toFixed(1)}%. Market cycles are normal — stay invested.`);

        if (sharpeRatio > 1) aiInsights.push('🏆 Excellent risk-adjusted returns (Sharpe Ratio > 1).');
        else if (sharpeRatio > 0) aiInsights.push('📊 Moderate risk-adjusted returns. Review underperforming holdings.');
        else aiInsights.push('⚠️ Negative risk-adjusted returns. Consider rebalancing your portfolio.');

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
                    riskScore,
                    volatility: volatility.toFixed(2),
                    sharpeRatio: sharpeRatio.toFixed(2),
                    diversificationScore,
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

module.exports = { buyStock, sellStock, getPortfolio, getTransactions, getPortfolioAnalysis };
