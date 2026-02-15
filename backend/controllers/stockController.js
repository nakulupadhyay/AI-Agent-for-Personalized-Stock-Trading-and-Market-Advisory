/**
 * Mock stock data controller
 * In production, replace with real API calls to Alpha Vantage, Yahoo Finance, etc.
 */

/**
 * @route   GET /api/stocks
 * @desc    Get stock market data
 * @access  Private
 */
const getStocks = async (req, res) => {
    try {
        // Mock stock data - Replace with real API integration
        const mockStocks = [
            {
                symbol: 'RELIANCE',
                companyName: 'Reliance Industries Ltd',
                currentPrice: 2456.75,
                change: 12.30,
                changePercent: 0.50,
                high: 2470.00,
                low: 2440.50,
                volume: 5234567,
                marketCap: '16.5L Cr',
            },
            {
                symbol: 'TCS',
                companyName: 'Tata Consultancy Services',
                currentPrice: 3678.90,
                change: -15.60,
                changePercent: -0.42,
                high: 3695.00,
                low: 3665.25,
                volume: 2345678,
                marketCap: '13.4L Cr',
            },
            {
                symbol: 'INFY',
                companyName: 'Infosys Limited',
                currentPrice: 1543.20,
                change: 8.75,
                changePercent: 0.57,
                high: 1550.00,
                low: 1535.50,
                volume: 4567890,
                marketCap: '6.4L Cr',
            },
            {
                symbol: 'HDFCBANK',
                companyName: 'HDFC Bank Limited',
                currentPrice: 1687.35,
                change: 5.40,
                changePercent: 0.32,
                high: 1692.00,
                low: 1680.00,
                volume: 3456789,
                marketCap: '12.8L Cr',
            },
            {
                symbol: 'ICICIBANK',
                companyName: 'ICICI Bank Limited',
                currentPrice: 1056.80,
                change: -3.25,
                changePercent: -0.31,
                high: 1062.00,
                low: 1052.50,
                volume: 5678901,
                marketCap: '7.4L Cr',
            },
        ];

        res.status(200).json({
            success: true,
            count: mockStocks.length,
            data: mockStocks,
        });
    } catch (error) {
        console.error('Get stocks error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching stocks',
            error: error.message,
        });
    }
};

/**
 * @route   GET /api/stocks/:symbol
 * @desc    Get detailed stock data with historical prices
 * @access  Private
 */
const getStockDetails = async (req, res) => {
    try {
        const { symbol } = req.params;

        // Mock historical data - Replace with real API
        const mockHistoricalData = {
            symbol,
            prices: [
                { date: '2024-02-01', price: 2400 },
                { date: '2024-02-02', price: 2415 },
                { date: '2024-02-03', price: 2408 },
                { date: '2024-02-04', price: 2425 },
                { date: '2024-02-05', price: 2430 },
                { date: '2024-02-06', price: 2443 },
                { date: '2024-02-07', price: 2456 },
            ],
        };

        res.status(200).json({
            success: true,
            data: mockHistoricalData,
        });
    } catch (error) {
        console.error('Get stock details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error while fetching stock details',
            error: error.message,
        });
    }
};

module.exports = { getStocks, getStockDetails };
