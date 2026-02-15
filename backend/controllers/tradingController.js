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

module.exports = { buyStock, sellStock, getPortfolio, getTransactions };
