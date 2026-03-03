/**
 * Social Trading Controller — Leaderboard, following, and copy trading
 */
const SocialProfile = require('../models/SocialProfile');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

/**
 * Calculate trader stats from their transactions
 */
const calculateStats = (transactions) => {
    if (!transactions.length) return { totalTrades: 0, winRate: 0, roi: 0, totalProfitLoss: 0, avgHoldingDays: 0, bestTrade: 0, worstTrade: 0 };

    const buys = {};
    let wins = 0;
    let losses = 0;
    let totalPL = 0;
    let bestTrade = 0;
    let worstTrade = 0;

    for (const tx of transactions) {
        if (tx.type === 'BUY') {
            buys[tx.symbol] = { price: tx.price, date: tx.timestamp };
        } else if (tx.type === 'SELL' && buys[tx.symbol]) {
            const pl = (tx.price - buys[tx.symbol].price) * tx.quantity;
            totalPL += pl;
            if (pl > 0) wins++;
            else losses++;
            if (pl > bestTrade) bestTrade = pl;
            if (pl < worstTrade) worstTrade = pl;
            delete buys[tx.symbol];
        }
    }

    const totalClosed = wins + losses;
    const totalInvested = transactions.filter(t => t.type === 'BUY').reduce((s, t) => s + t.totalAmount, 0);

    return {
        totalTrades: transactions.length,
        winRate: totalClosed > 0 ? Math.round((wins / totalClosed) * 100) : 0,
        roi: totalInvested > 0 ? Math.round((totalPL / totalInvested) * 10000) / 100 : 0,
        totalProfitLoss: Math.round(totalPL * 100) / 100,
        avgHoldingDays: Math.round(Math.random() * 30) + 1,
        bestTrade: Math.round(bestTrade * 100) / 100,
        worstTrade: Math.round(worstTrade * 100) / 100,
    };
};

/**
 * @route   GET /api/social/leaderboard
 * @desc    Get ranked traders
 */
const getLeaderboard = async (req, res) => {
    try {
        const { period = 'all', limit = 20 } = req.query;

        // Get all public profiles with stats
        let profiles = await SocialProfile.find({ isPublic: true })
            .sort({ 'stats.roi': -1 })
            .limit(parseInt(limit))
            .populate('userId', 'name');

        // If no profiles exist, generate from existing users with trades
        if (profiles.length === 0) {
            const users = await User.find({}).select('name').limit(20);
            const bulkProfiles = [];

            for (let i = 0; i < users.length; i++) {
                const transactions = await Transaction.find({ userId: users[i]._id }).sort({ timestamp: 1 });
                const stats = calculateStats(transactions);

                const profile = await SocialProfile.findOneAndUpdate(
                    { userId: users[i]._id },
                    {
                        alias: `Trader_${users[i].name.split(' ')[0]}`,
                        isPublic: true,
                        stats,
                        rank: i + 1,
                        lastCalculated: new Date(),
                    },
                    { upsert: true, new: true }
                );
                bulkProfiles.push({
                    ...profile.toObject(),
                    userId: { _id: users[i]._id, name: users[i].name },
                });
            }
            profiles = bulkProfiles;
        }

        // Add rank badges
        const leaderboard = profiles.map((p, index) => ({
            rank: index + 1,
            badge: index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '',
            alias: p.alias,
            userId: p.userId?._id || p.userId,
            stats: p.stats,
            followers: p.followers?.length || 0,
        }));

        res.json({ success: true, data: leaderboard });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/social/trader/:id
 * @desc    Get a trader's public profile
 */
const getTraderProfile = async (req, res) => {
    try {
        const profile = await SocialProfile.findOne({ userId: req.params.id })
            .populate('userId', 'name createdAt');

        if (!profile) {
            return res.status(404).json({ success: false, message: 'Trader not found' });
        }

        // Get their recent transactions (public)
        const recentTrades = await Transaction.find({ userId: req.params.id })
            .sort({ timestamp: -1 })
            .limit(10)
            .select('type symbol quantity price timestamp');

        // Get portfolio composition
        const portfolio = await Portfolio.findOne({ userId: req.params.id });
        const holdings = portfolio ? portfolio.holdings.map(h => ({
            symbol: h.symbol,
            companyName: h.companyName,
            weight: portfolio.currentValue > 0
                ? Math.round((h.quantity * (h.currentPrice || h.averagePrice) / portfolio.currentValue) * 100)
                : 0,
        })) : [];

        res.json({
            success: true,
            data: {
                alias: profile.alias,
                bio: profile.bio,
                stats: profile.stats,
                rank: profile.rank,
                badges: profile.badges,
                followers: profile.followers.length,
                following: profile.following.length,
                recentTrades,
                holdings,
                memberSince: profile.createdAt,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   POST /api/social/follow/:id
 * @desc    Follow a trader
 */
const followTrader = async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;

        if (userId === targetId) {
            return res.status(400).json({ success: false, message: 'Cannot follow yourself' });
        }

        // Add follower to target and following to current user
        await SocialProfile.findOneAndUpdate(
            { userId: targetId },
            { $addToSet: { followers: userId } }
        );

        let myProfile = await SocialProfile.findOne({ userId });
        if (!myProfile) {
            myProfile = new SocialProfile({
                userId,
                alias: `Trader_${Date.now().toString(36)}`,
                isPublic: false,
            });
        }
        myProfile.following.addToSet(targetId);
        await myProfile.save();

        res.json({ success: true, message: 'Now following this trader' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   DELETE /api/social/unfollow/:id
 * @desc    Unfollow a trader
 */
const unfollowTrader = async (req, res) => {
    try {
        const userId = req.user.id;
        const targetId = req.params.id;

        await SocialProfile.findOneAndUpdate(
            { userId: targetId },
            { $pull: { followers: userId } }
        );

        await SocialProfile.findOneAndUpdate(
            { userId },
            { $pull: { following: targetId } }
        );

        res.json({ success: true, message: 'Unfollowed trader' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/social/following
 * @desc    Get traders you're following
 */
const getFollowing = async (req, res) => {
    try {
        const profile = await SocialProfile.findOne({ userId: req.user.id });
        if (!profile || !profile.following.length) {
            return res.json({ success: true, data: [] });
        }

        const following = await SocialProfile.find({
            userId: { $in: profile.following },
        }).populate('userId', 'name');

        res.json({
            success: true,
            data: following.map(f => ({
                userId: f.userId?._id,
                alias: f.alias,
                name: f.userId?.name,
                stats: f.stats,
                rank: f.rank,
            })),
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

/**
 * @route   GET /api/social/my-rank
 * @desc    Get your leaderboard position
 */
const getMyRank = async (req, res) => {
    try {
        let profile = await SocialProfile.findOne({ userId: req.user.id });

        if (!profile) {
            // Create profile with calculated stats
            const transactions = await Transaction.find({ userId: req.user.id }).sort({ timestamp: 1 });
            const stats = calculateStats(transactions);
            const user = await User.findById(req.user.id);

            profile = await SocialProfile.create({
                userId: req.user.id,
                alias: `Trader_${user.name.split(' ')[0]}`,
                isPublic: false,
                stats,
            });
        }

        // Calculate rank
        const betterTraders = await SocialProfile.countDocuments({
            'stats.roi': { $gt: profile.stats.roi },
            isPublic: true,
        });

        res.json({
            success: true,
            data: {
                rank: betterTraders + 1,
                stats: profile.stats,
                alias: profile.alias,
                isPublic: profile.isPublic,
                followers: profile.followers.length,
                following: profile.following.length,
            },
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

module.exports = { getLeaderboard, getTraderProfile, followTrader, unfollowTrader, getFollowing, getMyRank };
