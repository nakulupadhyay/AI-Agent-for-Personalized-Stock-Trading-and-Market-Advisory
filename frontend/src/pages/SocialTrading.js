import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import './SocialTrading.css';

const SocialTrading = () => {
    const [activeTab, setActiveTab] = useState('leaderboard');
    const [leaderboard, setLeaderboard] = useState([]);
    const [following, setFollowing] = useState([]);
    const [myRank, setMyRank] = useState(null);
    const [selectedTrader, setSelectedTrader] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    const fetchLeaderboard = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/social/leaderboard');
            setLeaderboard(res.data.data);
        } catch (err) {
            console.error('Failed to fetch leaderboard:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMyRank = useCallback(async () => {
        try {
            const res = await api.get('/social/my-rank');
            setMyRank(res.data.data);
        } catch (err) {
            console.error('Failed to fetch rank:', err);
        }
    }, []);

    const fetchFollowing = useCallback(async () => {
        try {
            const res = await api.get('/social/following');
            setFollowing(res.data.data);
        } catch (err) {
            console.error('Failed to fetch following:', err);
        }
    }, []);

    useEffect(() => {
        fetchLeaderboard();
        fetchMyRank();
        fetchFollowing();
    }, [fetchLeaderboard, fetchMyRank, fetchFollowing]);

    const handleFollow = async (userId) => {
        try {
            await api.post(`/social/follow/${userId}`);
            setMessage({ type: 'success', text: 'Now following this trader!' });
            fetchFollowing();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to follow' });
        }
    };

    const handleUnfollow = async (userId) => {
        try {
            await api.delete(`/social/unfollow/${userId}`);
            setMessage({ type: 'success', text: 'Unfollowed trader' });
            fetchFollowing();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to unfollow' });
        }
    };

    const viewTraderProfile = async (userId) => {
        try {
            const res = await api.get(`/social/trader/${userId}`);
            setSelectedTrader(res.data.data);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load profile' });
        }
    };

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const isFollowing = (userId) => following.some(f => f.userId === userId);

    return (
        <div className="social-page">
            <div className="page-header">
                <h1>🏆 Social Trading</h1>
                <p className="page-subtitle">Join the community, follow top traders, and learn from the best</p>
            </div>

            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
            )}

            {/* My Stats */}
            {myRank && (
                <div className="my-stats-card">
                    <div className="stat-item">
                        <span className="stat-label">Your Rank</span>
                        <span className="stat-value">#{myRank.rank}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">ROI</span>
                        <span className={`stat-value ${myRank.stats.roi >= 0 ? 'positive' : 'negative'}`}>
                            {myRank.stats.roi >= 0 ? '+' : ''}{myRank.stats.roi}%
                        </span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Win Rate</span>
                        <span className="stat-value">{myRank.stats.winRate}%</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Total Trades</span>
                        <span className="stat-value">{myRank.stats.totalTrades}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Followers</span>
                        <span className="stat-value">{myRank.followers}</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-label">Following</span>
                        <span className="stat-value">{myRank.following}</span>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}>
                    🏅 Leaderboard
                </button>
                <button className={`tab ${activeTab === 'following' ? 'active' : ''}`} onClick={() => setActiveTab('following')}>
                    👥 Following ({following.length})
                </button>
            </div>

            {/* Trader Profile Modal */}
            {selectedTrader && (
                <div className="modal-overlay" onClick={() => setSelectedTrader(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-close" onClick={() => setSelectedTrader(null)}>✕</button>
                        <h2>{selectedTrader.alias}</h2>
                        <p className="trader-bio">{selectedTrader.bio || 'No bio yet'}</p>

                        <div className="profile-stats">
                            <div className="p-stat"><span className="p-label">Rank</span><span className="p-value">#{selectedTrader.rank}</span></div>
                            <div className="p-stat"><span className="p-label">ROI</span><span className={`p-value ${selectedTrader.stats.roi >= 0 ? 'positive' : 'negative'}`}>{selectedTrader.stats.roi}%</span></div>
                            <div className="p-stat"><span className="p-label">Win Rate</span><span className="p-value">{selectedTrader.stats.winRate}%</span></div>
                            <div className="p-stat"><span className="p-label">Total Trades</span><span className="p-value">{selectedTrader.stats.totalTrades}</span></div>
                            <div className="p-stat"><span className="p-label">Followers</span><span className="p-value">{selectedTrader.followers}</span></div>
                        </div>

                        {selectedTrader.holdings.length > 0 && (
                            <>
                                <h3>Portfolio Composition</h3>
                                <div className="holdings-list">
                                    {selectedTrader.holdings.map((h, i) => (
                                        <div key={i} className="holding-item">
                                            <span>{h.symbol}</span>
                                            <span className="holding-weight">{h.weight}%</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {selectedTrader.recentTrades.length > 0 && (
                            <>
                                <h3>Recent Trades</h3>
                                <div className="trades-list">
                                    {selectedTrader.recentTrades.map((t, i) => (
                                        <div key={i} className="trade-item">
                                            <span className={`trade-type ${t.type}`}>{t.type}</span>
                                            <span>{t.symbol}</span>
                                            <span>{t.quantity} shares</span>
                                            <span>₹{t.price}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Content */}
            {activeTab === 'leaderboard' && (
                <div className="leaderboard-table">
                    {loading ? (
                        <div className="loading-rows">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton-row"></div>)}
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Trader</th>
                                    <th>ROI</th>
                                    <th>Win Rate</th>
                                    <th>Trades</th>
                                    <th>Followers</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((trader) => (
                                    <tr key={trader.rank} className={trader.rank <= 3 ? 'top-trader' : ''}>
                                        <td>
                                            <span className="rank-badge">{trader.badge || `#${trader.rank}`}</span>
                                        </td>
                                        <td>
                                            <button className="trader-link" onClick={() => viewTraderProfile(trader.userId)}>
                                                {trader.alias}
                                            </button>
                                        </td>
                                        <td>
                                            <span className={trader.stats.roi >= 0 ? 'positive' : 'negative'}>
                                                {trader.stats.roi >= 0 ? '+' : ''}{trader.stats.roi}%
                                            </span>
                                        </td>
                                        <td>{trader.stats.winRate}%</td>
                                        <td>{trader.stats.totalTrades}</td>
                                        <td>{trader.followers}</td>
                                        <td>
                                            {isFollowing(trader.userId) ? (
                                                <button className="btn-unfollow" onClick={() => handleUnfollow(trader.userId)}>Unfollow</button>
                                            ) : (
                                                <button className="btn-follow" onClick={() => handleFollow(trader.userId)}>Follow</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {activeTab === 'following' && (
                <div className="following-grid">
                    {following.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">👥</span>
                            <h3>Not following anyone yet</h3>
                            <p>Go to the Leaderboard tab to find and follow top traders</p>
                        </div>
                    ) : (
                        following.map((trader, i) => (
                            <div key={i} className="following-card">
                                <div className="fc-header">
                                    <h3>{trader.alias || trader.name}</h3>
                                    <span className="fc-rank">#{trader.rank}</span>
                                </div>
                                <div className="fc-stats">
                                    <span className={trader.stats?.roi >= 0 ? 'positive' : 'negative'}>
                                        ROI: {trader.stats?.roi || 0}%
                                    </span>
                                    <span>Win: {trader.stats?.winRate || 0}%</span>
                                </div>
                                <div className="fc-actions">
                                    <button className="btn-view" onClick={() => viewTraderProfile(trader.userId)}>View Profile</button>
                                    <button className="btn-unfollow-sm" onClick={() => handleUnfollow(trader.userId)}>Unfollow</button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SocialTrading;
