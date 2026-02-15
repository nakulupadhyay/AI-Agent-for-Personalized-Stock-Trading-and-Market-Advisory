import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './PaperTrading.css';

const PaperTrading = () => {
    const [stocks, setStocks] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [quantity, setQuantity] = useState(1);
    const [orderType, setOrderType] = useState('buy');
    const [loading, setLoading] = useState(true);
    const [orderLoading, setOrderLoading] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchData = async () => {
        try {
            const [stocksRes, portfolioRes, txRes] = await Promise.all([
                api.get('/stocks'),
                api.get('/trading/portfolio'),
                api.get('/trading/transactions'),
            ]);
            setStocks(stocksRes.data.data || []);
            setPortfolio(portfolioRes.data.data || {});
            setTransactions(txRes.data.data || []);
            if (stocksRes.data.data?.length > 0 && !selectedStock) {
                setSelectedStock(stocksRes.data.data[0]);
            }
            setLoading(false);
        } catch (error) {
            console.error('Error:', error);
            setLoading(false);
        }
    };

    const handleOrder = async () => {
        if (!selectedStock || quantity < 1) return;
        setOrderLoading(true);
        setMessage(null);
        try {
            const endpoint = orderType === 'buy' ? '/trading/buy' : '/trading/sell';
            await api.post(endpoint, {
                symbol: selectedStock.symbol,
                quantity: parseInt(quantity),
                price: selectedStock.currentPrice,
            });
            setMessage({ type: 'success', text: `${orderType.toUpperCase()} order placed for ${quantity} shares of ${selectedStock.symbol}!` });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error.response?.data?.message || 'Order failed' });
        }
        setOrderLoading(false);
    };

    const totalCost = selectedStock ? selectedStock.currentPrice * quantity : 0;

    if (loading) {
        return (
            <div className="pt-page">
                <div className="skeleton skeleton-title" style={{ width: '250px', marginBottom: '2rem' }} />
                <div className="pt-grid">
                    <div className="glass-card"><div className="skeleton" style={{ height: '300px' }} /></div>
                    <div className="glass-card"><div className="skeleton" style={{ height: '300px' }} /></div>
                </div>
            </div>
        );
    }

    return (
        <div className="pt-page">
            <div className="pt-header animate-fadeInUp">
                <h1 className="pt-title">Paper Trading <span className="text-gradient">Simulator</span></h1>
                <p className="pt-subtitle">Practice trading with ₹10,00,000 virtual capital — zero real risk</p>
            </div>

            <div className="pt-grid">
                {/* Order Panel */}
                <div className="order-panel glass-card animate-fadeInUp stagger-1">
                    <h2 className="section-title">Place Order</h2>

                    {/* Balance */}
                    <div className="balance-display">
                        <span className="bal-label">Available Balance</span>
                        <span className="bal-value">₹{(portfolio?.virtualBalance || 1000000).toLocaleString('en-IN')}</span>
                    </div>

                    {/* Stock Selector */}
                    <div className="order-field">
                        <label>Select Stock</label>
                        <div className="stock-selector">
                            {stocks.map(stock => (
                                <button
                                    key={stock.symbol}
                                    className={`stock-pill ${selectedStock?.symbol === stock.symbol ? 'active' : ''}`}
                                    onClick={() => setSelectedStock(stock)}
                                >
                                    {stock.symbol}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Stock Info */}
                    {selectedStock && (
                        <div className="selected-stock-info">
                            <div className="ssi-name">{selectedStock.companyName}</div>
                            <div className="ssi-price">₹{selectedStock.currentPrice?.toFixed(2)}</div>
                            <span className={`ssi-change ${selectedStock.change >= 0 ? 'positive' : 'negative'}`}>
                                {selectedStock.change >= 0 ? '▲' : '▼'} {Math.abs(selectedStock.change)?.toFixed(2)} ({selectedStock.changePercent?.toFixed(2)}%)
                            </span>
                        </div>
                    )}

                    {/* Order Type Toggle */}
                    <div className="order-field">
                        <label>Order Type</label>
                        <div className="order-type-toggle">
                            <button
                                className={`ot-btn ${orderType === 'buy' ? 'active buy' : ''}`}
                                onClick={() => setOrderType('buy')}
                            >
                                BUY
                            </button>
                            <button
                                className={`ot-btn ${orderType === 'sell' ? 'active sell' : ''}`}
                                onClick={() => setOrderType('sell')}
                            >
                                SELL
                            </button>
                        </div>
                    </div>

                    {/* Quantity */}
                    <div className="order-field">
                        <label>Quantity</label>
                        <div className="qty-input">
                            <button className="qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
                            <input
                                type="number" min="1" value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            />
                            <button className="qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="order-summary">
                        <div className="os-row">
                            <span>Price per share</span>
                            <span>₹{selectedStock?.currentPrice?.toFixed(2)}</span>
                        </div>
                        <div className="os-row">
                            <span>Quantity</span>
                            <span>×{quantity}</span>
                        </div>
                        <div className="os-row total">
                            <span>Total Amount</span>
                            <span>₹{totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {message && (
                        <div className={`order-msg ${message.type}`}>
                            {message.type === 'success' ? '✅' : '❌'} {message.text}
                        </div>
                    )}

                    <button
                        className={`order-execute-btn ${orderType}`}
                        onClick={handleOrder}
                        disabled={orderLoading}
                    >
                        {orderLoading ? <span className="btn-loader" /> : `${orderType === 'buy' ? 'BUY' : 'SELL'} ${selectedStock?.symbol || ''}`}
                    </button>
                </div>

                {/* Right Column */}
                <div className="pt-right">
                    {/* Holdings */}
                    <div className="holdings-card glass-card animate-fadeInUp stagger-2">
                        <h2 className="section-title">Current Holdings</h2>
                        {portfolio?.holdings?.length > 0 ? (
                            <div className="holdings-list">
                                {portfolio.holdings.map((h, i) => (
                                    <div key={i} className="holding-item">
                                        <div className="hi-left">
                                            <span className="hi-symbol">{h.symbol}</span>
                                            <span className="hi-qty">{h.quantity} shares @ ₹{h.avgBuyPrice?.toFixed(2)}</span>
                                        </div>
                                        <div className="hi-right">
                                            <span className="hi-value">₹{h.currentValue?.toLocaleString('en-IN')}</span>
                                            <span className={`hi-pl ${h.profitLoss >= 0 ? 'positive' : 'negative'}`}>
                                                {h.profitLoss >= 0 ? '+' : ''}₹{h.profitLoss?.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span className="empty-icon">📭</span>
                                <p>No holdings yet. Place your first order!</p>
                            </div>
                        )}
                    </div>

                    {/* Transaction History */}
                    <div className="tx-card glass-card animate-fadeInUp stagger-3">
                        <h2 className="section-title">Recent Transactions</h2>
                        {transactions.length > 0 ? (
                            <div className="tx-list">
                                {transactions.slice(0, 5).map((tx, i) => (
                                    <div key={i} className="tx-item">
                                        <span className={`tx-type ${tx.type?.toLowerCase()}`}>{tx.type}</span>
                                        <span className="tx-symbol">{tx.symbol}</span>
                                        <span className="tx-detail">{tx.quantity} × ₹{tx.price?.toFixed(2)}</span>
                                        <span className="tx-total">₹{tx.totalAmount?.toLocaleString('en-IN')}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-state">
                                <span className="empty-icon">📋</span>
                                <p>No transactions yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaperTrading;
