import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { SkeletonStatCards, SkeletonTable } from '../components/LoadingSkeleton';
import './Watchlist.css';

const Watchlist = () => {
    const [watchlist, setWatchlist] = useState(() => {
        const saved = localStorage.getItem('watchlist');
        return saved ? JSON.parse(saved) : ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN'];
    });
    const [stockData, setStockData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const fetchWatchlistData = useCallback(async () => {
        if (watchlist.length === 0) { setLoading(false); return; }
        try {
            setError(null);
            const response = await api.get('/stocks');
            const allStocks = response.data.data || [];
            const dataMap = {};
            allStocks.forEach(s => { dataMap[s.symbol] = s; });

            // Fetch details for watchlist items not in the main list
            for (const sym of watchlist) {
                if (!dataMap[sym]) {
                    try {
                        const detail = await api.get(`/stocks/${sym}`);
                        if (detail.data?.data?.prices?.length > 0) {
                            const latest = detail.data.data.prices[detail.data.data.prices.length - 1];
                            dataMap[sym] = { symbol: sym, currentPrice: latest.price, change: 0, changePercent: 0 };
                        }
                    } catch { /* ignore */ }
                }
            }
            setStockData(dataMap);
        } catch (err) {
            setError('Failed to fetch stock data');
        } finally {
            setLoading(false);
        }
    }, [watchlist]);

    useEffect(() => { fetchWatchlistData(); }, [fetchWatchlistData]);

    useEffect(() => {
        localStorage.setItem('watchlist', JSON.stringify(watchlist));
    }, [watchlist]);

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length < 2) { setSearchResults([]); return; }
        setSearching(true);
        try {
            const res = await api.get(`/stocks/search/${query}`);
            setSearchResults(res.data.data?.slice(0, 8) || []);
        } catch {
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    };

    const addToWatchlist = (symbol) => {
        if (!watchlist.includes(symbol)) {
            setWatchlist(prev => [...prev, symbol]);
        }
        setSearchQuery('');
        setSearchResults([]);
    };

    const removeFromWatchlist = (symbol) => {
        setWatchlist(prev => prev.filter(s => s !== symbol));
    };

    const formatPrice = (price) => price ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 2 })}` : '—';
    const formatChange = (val) => val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);

    return (
        <div className="watchlist-page animate-fadeInUp">
            {/* Header */}
            <div className="watchlist-header">
                <div>
                    <h2>My Watchlist</h2>
                    <p className="text-muted">{watchlist.length} stocks tracked</p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={fetchWatchlistData}>
                    🔄 Refresh Prices
                </button>
            </div>

            {/* Search */}
            <div className="watchlist-search">
                <input
                    type="text"
                    className="input-field"
                    placeholder="🔍 Search stocks to add (e.g. TCS, Reliance, Wipro)..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
                {searchResults.length > 0 && (
                    <div className="search-dropdown">
                        {searchResults.map((s, i) => (
                            <div key={i} className="search-result" onClick={() => addToWatchlist(s.symbol)}>
                                <div>
                                    <span className="result-symbol">{s.symbol}</span>
                                    <span className="result-name">{s.companyName || s.name}</span>
                                </div>
                                {watchlist.includes(s.symbol) ? (
                                    <span className="badge badge-info">Added</span>
                                ) : (
                                    <span className="add-icon">+ Add</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Content */}
            {loading ? (
                <div style={{ marginTop: '1.5rem' }}>
                    <SkeletonStatCards count={3} />
                    <div style={{ marginTop: '1.5rem' }}><SkeletonTable rows={5} /></div>
                </div>
            ) : error ? (
                <div className="error-state" style={{ marginTop: '1.5rem' }}>
                    <div className="error-icon">❌</div>
                    <h3>Error Loading Data</h3>
                    <p>{error}</p>
                    <button className="btn btn-primary" onClick={fetchWatchlistData} style={{ marginTop: '1rem' }}>
                        Try Again
                    </button>
                </div>
            ) : watchlist.length === 0 ? (
                <div className="empty-state" style={{ marginTop: '2rem' }}>
                    <div className="empty-icon">⭐</div>
                    <h3>Your watchlist is empty</h3>
                    <p>Search and add stocks above to start tracking them.</p>
                </div>
            ) : (
                <div className="watchlist-grid">
                    {watchlist.map((symbol, idx) => {
                        const data = stockData[symbol];
                        const isUp = (data?.change || 0) >= 0;
                        return (
                            <div key={symbol} className={`watchlist-card animate-fadeInUp stagger-${idx + 1}`}>
                                <div className="wc-header">
                                    <div className="wc-symbol">{symbol}</div>
                                    <button className="wc-remove" onClick={() => removeFromWatchlist(symbol)} title="Remove">
                                        ✕
                                    </button>
                                </div>
                                <div className="wc-company">{data?.companyName || symbol}</div>
                                <div className="wc-price">{formatPrice(data?.currentPrice)}</div>
                                <div className={`wc-change ${isUp ? 'positive' : 'negative'}`}>
                                    {isUp ? '▲' : '▼'} {formatChange(data?.change || 0)} ({formatChange(data?.changePercent || 0)}%)
                                </div>
                                {data?.volume && (
                                    <div className="wc-volume">Vol: {(data.volume / 1e6).toFixed(1)}M</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Watchlist;
