import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import './BrokerIntegration.css';

const BrokerIntegration = () => {
    const [brokers, setBrokers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(null);
    const [connecting, setConnecting] = useState(null);
    const [message, setMessage] = useState(null);

    const fetchBrokers = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/broker/available');
            setBrokers(res.data.data);
        } catch (err) {
            console.error('Failed to fetch brokers:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchBrokers(); }, [fetchBrokers]);

    const handleConnect = async (brokerId) => {
        try {
            setConnecting(brokerId);
            const res = await api.post('/broker/connect', { broker: brokerId });
            setMessage({ type: 'success', text: res.data.message });
            fetchBrokers();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Connection failed' });
        } finally {
            setConnecting(null);
        }
    };

    const handleSync = async (brokerId) => {
        try {
            setSyncing(brokerId);
            const res = await api.post('/broker/sync', { broker: brokerId });
            setMessage({ type: 'success', text: res.data.message });
            fetchBrokers();
        } catch (err) {
            setMessage({ type: 'error', text: err.response?.data?.message || 'Sync failed' });
        } finally {
            setSyncing(null);
        }
    };

    const handleDisconnect = async (brokerId) => {
        try {
            await api.delete('/broker/disconnect', { data: { broker: brokerId } });
            setMessage({ type: 'success', text: 'Broker disconnected' });
            fetchBrokers();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to disconnect' });
        }
    };

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    if (loading) {
        return (
            <div className="broker-page">
                <div className="page-header">
                    <h1>🔗 Broker Integration</h1>
                    <p className="page-subtitle">Connect your brokerage accounts</p>
                </div>
                <div className="loading-grid">
                    {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-card"></div>)}
                </div>
            </div>
        );
    }

    return (
        <div className="broker-page">
            <div className="page-header">
                <h1>🔗 Broker Integration</h1>
                <p className="page-subtitle">Connect your brokerage accounts to import holdings and track performance</p>
                <span className="sim-badge">🧪 Simulated Mode</span>
            </div>

            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
            )}

            {/* How It Works */}
            <div className="how-it-works">
                <h3>How Broker Integration Works</h3>
                <div className="steps-row">
                    <div className="step">
                        <span className="step-num">1</span>
                        <span>Select your broker</span>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <span className="step-num">2</span>
                        <span>Click Connect (Simulated OAuth)</span>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <span className="step-num">3</span>
                        <span>Sync your portfolio holdings</span>
                    </div>
                    <div className="step-arrow">→</div>
                    <div className="step">
                        <span className="step-num">4</span>
                        <span>View merged portfolio</span>
                    </div>
                </div>
            </div>

            {/* Broker Cards */}
            <div className="broker-grid">
                {brokers.map(broker => (
                    <div key={broker.id} className={`broker-card ${broker.status === 'connected' ? 'connected' : ''}`}>
                        <div className="broker-header">
                            <span className="broker-logo">{broker.logo}</span>
                            <div className="broker-info">
                                <h3>{broker.name}</h3>
                                <p>{broker.description}</p>
                            </div>
                            <span className={`status-badge ${broker.status}`}>
                                {broker.status === 'connected' ? '● Connected' : '○ Available'}
                            </span>
                        </div>

                        {broker.status === 'connected' && (
                            <div className="connection-details">
                                <div className="detail-row">
                                    <span>Connected Since</span>
                                    <span>{new Date(broker.connectedAt).toLocaleDateString()}</span>
                                </div>
                                {broker.lastSyncAt && (
                                    <div className="detail-row">
                                        <span>Last Sync</span>
                                        <span>{new Date(broker.lastSyncAt).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="broker-actions">
                            {broker.status !== 'connected' ? (
                                <button
                                    className="btn-connect"
                                    onClick={() => handleConnect(broker.id)}
                                    disabled={connecting === broker.id}
                                >
                                    {connecting === broker.id ? '⏳ Connecting...' : '🔗 Connect'}
                                </button>
                            ) : (
                                <>
                                    <button
                                        className="btn-sync"
                                        onClick={() => handleSync(broker.id)}
                                        disabled={syncing === broker.id}
                                    >
                                        {syncing === broker.id ? '⏳ Syncing...' : '🔄 Sync Portfolio'}
                                    </button>
                                    <button
                                        className="btn-disconnect"
                                        onClick={() => handleDisconnect(broker.id)}
                                    >
                                        Disconnect
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Banner */}
            <div className="info-banner">
                <span className="info-icon">ℹ️</span>
                <div>
                    <strong>Note:</strong> This is a simulated broker integration for demonstration purposes.
                    In a production environment, this would use the broker's official OAuth 2.0 API for secure authentication.
                </div>
            </div>
        </div>
    );
};

export default BrokerIntegration;
