const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getLeaderboard, getTraderProfile, followTrader, unfollowTrader, getFollowing, getMyRank } = require('../controllers/socialController');

router.get('/leaderboard', protect, getLeaderboard);
router.get('/my-rank', protect, getMyRank);
router.get('/following', protect, getFollowing);
router.get('/trader/:id', protect, getTraderProfile);
router.post('/follow/:id', protect, followTrader);
router.delete('/unfollow/:id', protect, unfollowTrader);

module.exports = router;
