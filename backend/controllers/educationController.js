/**
 * Education Controller — Learning modules, quizzes, and progress tracking
 */
const EducationProgress = require('../models/EducationProgress');

// Course module definitions
const MODULES = [
    {
        id: 'stock-basics',
        name: 'Stock Market Basics',
        icon: '📊',
        category: 'Beginner',
        duration: '30 min',
        description: 'Learn the fundamentals of stock markets, exchanges, and how trading works.',
        topics: [
            'What is a stock market?',
            'How stock exchanges work (NSE, BSE)',
            'Types of stocks: Large-cap, Mid-cap, Small-cap',
            'Understanding stock symbols and indices',
            'Market hours and trading sessions',
        ],
        resources: [
            { title: 'Introduction to Stock Markets', type: 'article', url: 'https://www.investopedia.com/terms/s/stockmarket.asp' },
            { title: 'NSE India Official Guide', type: 'article', url: 'https://www.nseindia.com' },
        ],
    },
    {
        id: 'technical-analysis',
        name: 'Technical Analysis',
        icon: '📈',
        category: 'Intermediate',
        duration: '45 min',
        description: 'Master chart patterns, indicators, and technical signals for better trading decisions.',
        topics: [
            'Candlestick patterns explained',
            'Moving Averages (SMA, EMA)',
            'RSI (Relative Strength Index)',
            'MACD indicator',
            'Bollinger Bands',
            'Support and Resistance levels',
        ],
        resources: [
            { title: 'Technical Analysis Guide', type: 'article', url: 'https://www.investopedia.com/terms/t/technicalanalysis.asp' },
        ],
    },
    {
        id: 'fundamental-analysis',
        name: 'Fundamental Analysis',
        icon: '🔍',
        category: 'Intermediate',
        duration: '40 min',
        description: 'Evaluate stocks using financial statements, ratios, and company fundamentals.',
        topics: [
            'Reading financial statements (P&L, Balance Sheet)',
            'Key ratios: P/E, P/B, ROE, Debt-to-Equity',
            'Understanding EPS and dividends',
            'Valuation methods: DCF, Relative Valuation',
            'Sector analysis and industry comparison',
        ],
        resources: [
            { title: 'Fundamental Analysis Basics', type: 'article', url: 'https://www.investopedia.com/terms/f/fundamentalanalysis.asp' },
        ],
    },
    {
        id: 'risk-management',
        name: 'Risk Management',
        icon: '🛡️',
        category: 'Intermediate',
        duration: '35 min',
        description: 'Protect your portfolio with proper risk management strategies and position sizing.',
        topics: [
            'Understanding portfolio risk',
            'Diversification strategies',
            'Position sizing and the 2% rule',
            'Stop-loss and take-profit orders',
            'Sharpe Ratio and risk-adjusted returns',
            'Value at Risk (VaR)',
        ],
        resources: [
            { title: 'Risk Management in Trading', type: 'article', url: 'https://www.investopedia.com/terms/r/riskmanagement.asp' },
        ],
    },
    {
        id: 'ai-in-trading',
        name: 'AI in Stock Trading',
        icon: '🤖',
        category: 'Advanced',
        duration: '50 min',
        description: 'Explore how artificial intelligence and machine learning are transforming stock trading.',
        topics: [
            'How ML models predict stock prices',
            'Sentiment analysis for trading signals',
            'Random Forest vs LSTM models',
            'Feature engineering for stock data',
            'Backtesting and model evaluation',
            'Limitations of AI in finance',
        ],
        resources: [
            { title: 'Machine Learning in Finance', type: 'article', url: 'https://www.investopedia.com/terms/m/machine-learning.asp' },
        ],
    },
    {
        id: 'paper-trading-guide',
        name: 'Paper Trading Guide',
        icon: '📝',
        category: 'Beginner',
        duration: '20 min',
        description: 'Learn how to practice trading with virtual money before risking real capital.',
        topics: [
            'What is paper trading?',
            'Setting up your virtual portfolio',
            'Order types: Market, Limit, Stop-Loss',
            'Tracking performance metrics',
            'Transitioning to real trading',
        ],
        resources: [],
    },
];

// Quiz questions per module
const QUIZZES = {
    'stock-basics': [
        { question: 'What does NSE stand for?', options: ['National Stock Exchange', 'New Stock Exchange', 'National Securities Exchange', 'None of the above'], correct: 0 },
        { question: 'Which of these is a large-cap stock in India?', options: ['A small startup', 'Reliance Industries', 'A local business', 'None'], correct: 1 },
        { question: 'What is a stock index?', options: ['A single stock price', 'A basket of stocks representing a market segment', 'A bond', 'A mutual fund'], correct: 1 },
        { question: 'When is the Indian stock market open?', options: ['24/7', '9:15 AM - 3:30 PM (Mon-Fri)', '10 AM - 4 PM', '8 AM - 5 PM'], correct: 1 },
        { question: 'What does "market cap" mean?', options: ['A hat for traders', 'Total value of a company\'s shares', 'Maximum stock price', 'Trading fee cap'], correct: 1 },
    ],
    'technical-analysis': [
        { question: 'What does RSI measure?', options: ['Return on Investment', 'Momentum of price changes', 'Revenue per share', 'Risk score'], correct: 1 },
        { question: 'An RSI above 70 typically indicates?', options: ['Oversold', 'Overbought', 'Fair value', 'No signal'], correct: 1 },
        { question: 'What is a "golden cross"?', options: ['A stock reaching all-time high', 'Short-term MA crossing above long-term MA', 'When price hits support', 'A candlestick pattern'], correct: 1 },
        { question: 'Bollinger Bands measure?', options: ['Volume', 'Volatility', 'Trend direction', 'Market cap'], correct: 1 },
        { question: 'MACD stands for?', options: ['Market Average Change Daily', 'Moving Average Convergence Divergence', 'Maximum Asset Cash Distribution', 'None'], correct: 1 },
    ],
    'fundamental-analysis': [
        { question: 'P/E ratio measures?', options: ['Price to earnings', 'Profit to expense', 'Portfolio efficiency', 'None'], correct: 0 },
        { question: 'A high P/E ratio usually suggests?', options: ['Stock is cheap', 'Market expects high growth', 'Company is bankrupt', 'Low risk'], correct: 1 },
        { question: 'ROE stands for?', options: ['Return on Equity', 'Rate of Exchange', 'Revenue over Expenses', 'None'], correct: 0 },
        { question: 'What is EPS?', options: ['Exchange Per Share', 'Earnings Per Share', 'Equity Price Score', 'None'], correct: 1 },
        { question: 'DCF stands for?', options: ['Direct Cash Flow', 'Discounted Cash Flow', 'Daily Cash Factor', 'Dividend Cash Fund'], correct: 1 },
    ],
    'risk-management': [
        { question: 'What is diversification?', options: ['Buying one stock', 'Spreading investments across different assets', 'Day trading', 'None'], correct: 1 },
        { question: 'The 2% rule suggests?', options: ['Investing 2% of income', 'Never risk more than 2% per trade', 'Expecting 2% returns', 'None'], correct: 1 },
        { question: 'What is a stop-loss order?', options: ['An order to buy more', 'An order to automatically sell at a set loss', 'A market order', 'None'], correct: 1 },
        { question: 'Sharpe Ratio measures?', options: ['Total returns', 'Risk-adjusted returns', 'Volume', 'Market cap'], correct: 1 },
        { question: 'VaR tells you?', options: ['Value of all returns', 'Maximum expected loss in a period', 'Average stock value', 'None'], correct: 1 },
    ],
    'ai-in-trading': [
        { question: 'LSTM is best for?', options: ['Image classification', 'Sequential/time-series data', 'Database queries', 'None'], correct: 1 },
        { question: 'What is backtesting?', options: ['Testing code bugs', 'Testing a strategy on historical data', 'Reversing a trade', 'None'], correct: 1 },
        { question: 'Sentiment analysis helps predict?', options: ['Stock colors', 'Market mood from news/social media', 'Exact prices', 'None'], correct: 1 },
        { question: 'Feature engineering in ML means?', options: ['Building features in software', 'Creating meaningful input variables for models', 'Frontend design', 'None'], correct: 1 },
        { question: 'Random Forest is?', options: ['A park', 'An ensemble of decision trees', 'A single neural network', 'None'], correct: 1 },
    ],
    'paper-trading-guide': [
        { question: 'Paper trading uses?', options: ['Real money', 'Virtual/simulated money', 'Cryptocurrency', 'None'], correct: 1 },
        { question: 'A limit order executes when?', options: ['Immediately', 'When price reaches specified level', 'Never', 'At random'], correct: 1 },
        { question: 'What is a market order?', options: ['Buying at current market price', 'Buying at a specific price', 'Selling only', 'None'], correct: 0 },
        { question: 'Paper trading helps?', options: ['Make real money', 'Practice without risk', 'Nothing', 'Lose money'], correct: 1 },
        { question: 'Best practice after paper trading?', options: ['Skip to real trading', 'Review performance and learn', 'Give up', 'None'], correct: 1 },
    ],
};

/**
 * @route   GET /api/education/modules
 * @desc    Get all learning modules with user progress
 */
const getModules = async (req, res) => {
    try {
        const progress = await EducationProgress.find({ userId: req.user.id });
        const progressMap = {};
        progress.forEach(p => { progressMap[p.moduleId] = p; });

        const modulesWithProgress = MODULES.map(m => ({
            ...m,
            progress: progressMap[m.id] ? {
                completed: progressMap[m.id].completed,
                quizScore: progressMap[m.id].quizScore,
                quizAttempts: progressMap[m.id].quizAttempts,
                bookmarked: progressMap[m.id].bookmarked,
            } : { completed: false, quizScore: 0, quizAttempts: 0, bookmarked: false },
        }));

        const totalModules = MODULES.length;
        const completedModules = progress.filter(p => p.completed).length;

        res.json({
            success: true,
            data: {
                modules: modulesWithProgress,
                overallProgress: {
                    total: totalModules,
                    completed: completedModules,
                    percent: Math.round((completedModules / totalModules) * 100),
                },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/education/module/:id
 * @desc    Get single module content
 */
const getModule = async (req, res) => {
    try {
        const module = MODULES.find(m => m.id === req.params.id);
        if (!module) {
            return res.status(404).json({ success: false, message: 'Module not found' });
        }

        const progress = await EducationProgress.findOne({ userId: req.user.id, moduleId: module.id });

        res.json({
            success: true,
            data: {
                ...module,
                progress: progress || { completed: false, quizScore: 0 },
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/education/progress
 * @desc    Update module progress (mark complete, bookmark, etc.)
 */
const updateProgress = async (req, res) => {
    try {
        const { moduleId, completed, bookmarked } = req.body;
        const module = MODULES.find(m => m.id === moduleId);
        if (!module) {
            return res.status(404).json({ success: false, message: 'Module not found' });
        }

        const update = {};
        if (completed !== undefined) {
            update.completed = completed;
            if (completed) update.completedAt = new Date();
        }
        if (bookmarked !== undefined) update.bookmarked = bookmarked;

        const progress = await EducationProgress.findOneAndUpdate(
            { userId: req.user.id, moduleId },
            { ...update, moduleName: module.name },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: progress });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/education/quiz/:moduleId
 * @desc    Get quiz questions for a module
 */
const getQuiz = async (req, res) => {
    try {
        const quiz = QUIZZES[req.params.moduleId];
        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found for this module' });
        }

        // Don't send correct answers to client
        const questions = quiz.map((q, i) => ({
            id: i,
            question: q.question,
            options: q.options,
        }));

        res.json({ success: true, data: { moduleId: req.params.moduleId, questions } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/education/quiz/:moduleId/submit
 * @desc    Submit quiz answers and get score
 */
const submitQuiz = async (req, res) => {
    try {
        const { answers } = req.body; // Array of { questionId, selectedOption }
        const quiz = QUIZZES[req.params.moduleId];

        if (!quiz) {
            return res.status(404).json({ success: false, message: 'Quiz not found' });
        }

        let correct = 0;
        const results = answers.map(a => {
            const isCorrect = quiz[a.questionId]?.correct === a.selectedOption;
            if (isCorrect) correct++;
            return {
                questionId: a.questionId,
                isCorrect,
                correctAnswer: quiz[a.questionId]?.correct,
            };
        });

        const score = Math.round((correct / quiz.length) * 100);
        const passed = score >= 60;

        // Update progress
        await EducationProgress.findOneAndUpdate(
            { userId: req.user.id, moduleId: req.params.moduleId },
            {
                quizScore: score,
                $inc: { quizAttempts: 1 },
                completed: passed,
                ...(passed ? { completedAt: new Date() } : {}),
                moduleName: MODULES.find(m => m.id === req.params.moduleId)?.name || '',
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            data: {
                score,
                passed,
                correct,
                total: quiz.length,
                results,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getModules, getModule, updateProgress, getQuiz, submitQuiz };
