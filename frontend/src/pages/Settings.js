import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../utils/api';
import './Settings.css';

const TABS = [
    { id: 'profile', icon: '👤', label: 'Profile' },
    { id: 'risk', icon: '🎯', label: 'Risk Preferences' },
    { id: 'notifications', icon: '🔔', label: 'Notifications' },
    { id: 'ai', icon: '🤖', label: 'AI Customization' },
    { id: 'models', icon: '🧠', label: 'Models' },
    { id: 'paper', icon: '📈', label: 'Paper Trading' },
    { id: 'privacy', icon: '🔒', label: 'Data & Privacy' },
    { id: 'theme', icon: '🎨', label: 'Theme' },
];

const Settings = () => {
    const { updateUser, logout } = useAuth();
    const { setTheme: applyTheme } = useTheme();
    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Form states
    const [profileForm, setProfileForm] = useState({ name: '', email: '', profilePhoto: '' });
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [riskForm, setRiskForm] = useState({ riskProfile: 'Medium', investmentHorizon: 'Mid-term' });
    const [notifForm, setNotifForm] = useState({ email: true, priceAlert: true, newsAlert: true, aiRecommendation: true });
    const [aiForm, setAiForm] = useState({ confidenceThreshold: 70, sentimentWeight: 30, autoRefreshTime: 60 });
    const [paperForm, setPaperForm] = useState({ initialCapital: 1000000, simulationMode: true });
    const [themeForm, setThemeForm] = useState({ theme: 'dark', currency: '₹', language: 'en' });
    const [twoFactor, setTwoFactor] = useState(false);

    // Model management state
    const [mlStatus, setMlStatus] = useState({ available: false });
    const [localModels, setLocalModels] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [downloadingModels, setDownloadingModels] = useState({});
    const [fineTuneConfig, setFineTuneConfig] = useState({ base_model: 'finbert', epochs: 3, batch_size: 16, learning_rate: 0.00002 });
    const [fineTuning, setFineTuning] = useState(false);

    const showMessage = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    const fetchSettings = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/settings');
            const s = res.data.settings;
            setProfileForm({ name: s.name || '', email: s.email || '', profilePhoto: s.profilePhoto || '' });
            setRiskForm({ riskProfile: s.riskProfile || 'Medium', investmentHorizon: s.investmentHorizon || 'Mid-term' });
            setNotifForm(s.notifications || { email: true, priceAlert: true, newsAlert: true, aiRecommendation: true });
            setAiForm(s.aiSettings || { confidenceThreshold: 70, sentimentWeight: 30, autoRefreshTime: 60 });
            setPaperForm({ initialCapital: s.virtualBalance || 1000000, simulationMode: s.simulationMode !== false });
            setThemeForm({ theme: s.theme || 'dark', currency: s.currency || '₹', language: s.language || 'en' });
            setTwoFactor(s.twoFactorEnabled || false);
        } catch (err) {
            showMessage('error', 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMLStatus = useCallback(async () => {
        try {
            const res = await api.get('/ai/ml-status');
            setMlStatus(res.data.data);
        } catch { setMlStatus({ available: false }); }
    }, []);

    const fetchLocalModels = useCallback(async () => {
        try {
            const res = await api.get('/ai/ml-status');
            if (res.data.data.available) {
                const modelsRes = await fetch('http://localhost:5001/models/list');
                const data = await modelsRes.json();
                if (data.success) setLocalModels(data.data);
            }
        } catch { /* ML service not available */ }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchMLStatus();
        fetchLocalModels();
    }, [fetchSettings, fetchMLStatus, fetchLocalModels]);

    // ── SAVE HANDLERS ──────────────────────────────

    const saveProfile = async () => {
        setSaving(true);
        try {
            const res = await api.put('/settings/profile', profileForm);
            updateUser(res.data.user);
            showMessage('success', 'Profile updated successfully');
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Failed to update profile');
        } finally { setSaving(false); }
    };

    const savePassword = async () => {
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return showMessage('error', 'New passwords do not match');
        }
        if (passwordForm.newPassword.length < 6) {
            return showMessage('error', 'Password must be at least 6 characters');
        }
        setSaving(true);
        try {
            await api.put('/settings/password', {
                currentPassword: passwordForm.currentPassword,
                newPassword: passwordForm.newPassword,
            });
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            showMessage('success', 'Password changed successfully');
        } catch (err) {
            showMessage('error', err.response?.data?.message || 'Failed to change password');
        } finally { setSaving(false); }
    };

    const toggle2FA = async () => {
        setSaving(true);
        try {
            const res = await api.put('/settings/2fa', { enabled: !twoFactor });
            setTwoFactor(res.data.twoFactorEnabled);
            showMessage('success', `Two-factor auth ${res.data.twoFactorEnabled ? 'enabled' : 'disabled'}`);
        } catch (err) {
            showMessage('error', 'Failed to update 2FA');
        } finally { setSaving(false); }
    };

    const saveRisk = async () => {
        setSaving(true);
        try {
            await api.put('/settings/risk', riskForm);
            showMessage('success', 'Risk preferences updated');
        } catch (err) {
            showMessage('error', 'Failed to update risk preferences');
        } finally { setSaving(false); }
    };

    const saveNotifications = async () => {
        setSaving(true);
        try {
            const res = await api.put('/settings/notifications', notifForm);
            setNotifForm(res.data.notifications);
            showMessage('success', 'Notification settings saved');
        } catch (err) {
            showMessage('error', 'Failed to update notifications');
        } finally { setSaving(false); }
    };

    const saveAI = async () => {
        setSaving(true);
        try {
            const res = await api.put('/settings/ai', aiForm);
            setAiForm(res.data.aiSettings);
            showMessage('success', 'AI settings updated');
        } catch (err) {
            showMessage('error', 'Failed to update AI settings');
        } finally { setSaving(false); }
    };

    const savePaperTrading = async (resetPortfolio = false) => {
        setSaving(true);
        try {
            const res = await api.put('/settings/paper-trading', {
                ...paperForm,
                resetPortfolio,
            });
            setPaperForm(prev => ({ ...prev, simulationMode: res.data.simulationMode }));
            showMessage('success', resetPortfolio ? 'Portfolio reset successfully' : 'Paper trading settings saved');
        } catch (err) {
            showMessage('error', 'Failed to update paper trading settings');
        } finally { setSaving(false); }
    };

    const saveTheme = async () => {
        setSaving(true);
        try {
            await api.put('/settings/theme', themeForm);
            applyTheme(themeForm.theme); // Apply theme to DOM instantly
            showMessage('success', 'Theme settings saved');
        } catch (err) {
            showMessage('error', 'Failed to update theme settings');
        } finally { setSaving(false); }
    };

    const downloadData = async () => {
        try {
            const res = await api.get('/settings/data/download');
            const blob = new Blob([JSON.stringify(res.data.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'capitalwave_data.json';
            a.click();
            window.URL.revokeObjectURL(url);
            showMessage('success', 'Data downloaded successfully');
        } catch (err) {
            showMessage('error', 'Failed to download data');
        }
    };

    const clearHistory = async () => {
        if (!window.confirm('Are you sure you want to clear all trading history? This cannot be undone.')) return;
        setSaving(true);
        try {
            await api.delete('/settings/data/clear-history');
            showMessage('success', 'Trading history cleared');
        } catch (err) {
            showMessage('error', 'Failed to clear history');
        } finally { setSaving(false); }
    };

    const deleteAccount = async () => {
        const confirmed = window.prompt('Type "DELETE" to confirm account deletion:');
        if (confirmed !== 'DELETE') return;
        try {
            await api.delete('/settings/account');
            logout();
        } catch (err) {
            showMessage('error', 'Failed to delete account');
        }
    };

    // ── MODEL MANAGEMENT HANDLERS ─────────────────────

    const searchModels = async () => {
        if (!searchQuery.trim()) return;
        setSearching(true);
        try {
            const res = await fetch(`http://localhost:5001/models/search?q=${encodeURIComponent(searchQuery)}&limit=8`);
            const data = await res.json();
            if (data.success) setSearchResults(data.data);
        } catch {
            showMessage('error', 'ML service not available. Start the Python service first.');
        } finally { setSearching(false); }
    };

    const downloadModel = async (repoId, modelType = 'sequence-classification') => {
        const modelKey = repoId.replace(/\//g, '_');
        setDownloadingModels(prev => ({ ...prev, [modelKey]: { status: 'downloading', progress: 0 } }));
        try {
            await fetch('http://localhost:5001/models/download', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ repo_id: repoId, model_key: modelKey, model_type: modelType }),
            });
            // Poll progress
            const poll = setInterval(async () => {
                try {
                    const res = await fetch(`http://localhost:5001/models/download/progress/${modelKey}`);
                    const data = await res.json();
                    if (data.data.status === 'complete') {
                        clearInterval(poll);
                        setDownloadingModels(prev => { const n = { ...prev }; delete n[modelKey]; return n; });
                        fetchLocalModels();
                        showMessage('success', `Model ${repoId} downloaded!`);
                    } else if (data.data.status === 'error') {
                        clearInterval(poll);
                        setDownloadingModels(prev => { const n = { ...prev }; delete n[modelKey]; return n; });
                        showMessage('error', `Download failed: ${data.data.error}`);
                    } else {
                        setDownloadingModels(prev => ({ ...prev, [modelKey]: data.data }));
                    }
                } catch { clearInterval(poll); }
            }, 2000);
        } catch {
            setDownloadingModels(prev => { const n = { ...prev }; delete n[repoId.replace(/\//g, '_')]; return n; });
            showMessage('error', 'Failed to start download');
        }
    };

    const deleteLocalModel = async (modelKey) => {
        if (!window.confirm(`Delete model "${modelKey}"?`)) return;
        try {
            await fetch(`http://localhost:5001/models/local/${modelKey}`, { method: 'DELETE' });
            fetchLocalModels();
            showMessage('success', 'Model deleted');
        } catch {
            showMessage('error', 'Failed to delete model');
        }
    };

    const startFineTune = async () => {
        setFineTuning(true);
        try {
            const res = await fetch('http://localhost:5001/models/fine-tune', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(fineTuneConfig),
            });
            const data = await res.json();
            if (data.success) {
                showMessage('success', 'Fine-tuning started! Check terminal for progress.');
            }
        } catch {
            showMessage('error', 'Failed to start fine-tuning. Is the ML service running?');
        } finally { setFineTuning(false); }
    };

    // ── RENDER SECTIONS ──────────────────────────────

    const renderProfile = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>User Profile</h2>
                <p className="section-desc">Manage your personal information and security</p>
            </div>

            {/* Profile Photo */}
            <div className="settings-card glass-card">
                <h3 className="card-title">Profile Photo</h3>
                <div className="photo-upload-area">
                    <div className="avatar-preview">
                        {profileForm.profilePhoto ? (
                            <img src={profileForm.profilePhoto} alt="Profile" />
                        ) : (
                            <div className="avatar-placeholder">
                                {profileForm.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                        )}
                    </div>
                    <div className="photo-actions">
                        <input
                            type="url"
                            placeholder="Enter photo URL..."
                            value={profileForm.profilePhoto}
                            onChange={(e) => setProfileForm({ ...profileForm, profilePhoto: e.target.value })}
                            className="settings-input"
                        />
                        <span className="input-hint">Paste a URL or use a hosted image link</span>
                    </div>
                </div>
            </div>

            {/* Basic Info */}
            <div className="settings-card glass-card">
                <h3 className="card-title">Basic Information</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Full Name</label>
                        <input
                            type="text"
                            value={profileForm.name}
                            onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                            className="settings-input"
                            placeholder="Your full name"
                        />
                    </div>
                    <div className="form-group">
                        <label>Email Address</label>
                        <input
                            type="email"
                            value={profileForm.email}
                            onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                            className="settings-input"
                            placeholder="your@email.com"
                        />
                    </div>
                </div>
                <button className="btn btn-primary save-btn" onClick={saveProfile} disabled={saving}>
                    {saving ? '⏳ Saving...' : '💾 Save Profile'}
                </button>
            </div>

            {/* Change Password */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🔐 Change Password</h3>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Current Password</label>
                        <input
                            type="password"
                            value={passwordForm.currentPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                            className="settings-input"
                            placeholder="Enter current password"
                        />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input
                            type="password"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                            className="settings-input"
                            placeholder="Enter new password"
                        />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input
                            type="password"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                            className="settings-input"
                            placeholder="Confirm new password"
                        />
                    </div>
                </div>
                <button className="btn btn-primary save-btn" onClick={savePassword} disabled={saving}>
                    {saving ? '⏳ Updating...' : '🔑 Update Password'}
                </button>
            </div>

            {/* Two-Factor Authentication */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🛡️ Two-Factor Authentication</h3>
                <div className="toggle-row">
                    <div className="toggle-info">
                        <span className="toggle-label">Enable 2FA</span>
                        <span className="toggle-desc">Add an extra layer of security to your account</span>
                    </div>
                    <label className="toggle-switch">
                        <input type="checkbox" checked={twoFactor} onChange={toggle2FA} disabled={saving} />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
                <div className={`status-badge ${twoFactor ? 'status-active' : 'status-inactive'}`}>
                    {twoFactor ? '✅ 2FA is Active' : '⚠️ 2FA is Disabled'}
                </div>
            </div>
        </div>
    );

    const renderRisk = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>Risk Preferences</h2>
                <p className="section-desc">Configure your investment risk tolerance and time horizon</p>
            </div>

            {/* Risk Level */}
            <div className="settings-card glass-card">
                <h3 className="card-title">📊 Risk Level</h3>
                <p className="card-desc">AI recommendations are personalized based on your risk tolerance</p>
                <div className="risk-cards">
                    {['Low', 'Medium', 'High'].map((level) => (
                        <div
                            key={level}
                            className={`risk-option ${riskForm.riskProfile === level ? 'active' : ''}`}
                            onClick={() => setRiskForm({ ...riskForm, riskProfile: level })}
                        >
                            <div className="risk-icon">
                                {level === 'Low' ? '🛡️' : level === 'Medium' ? '⚖️' : '🚀'}
                            </div>
                            <div className="risk-name">{level}</div>
                            <div className="risk-desc">
                                {level === 'Low' ? 'Conservative & Safe' : level === 'Medium' ? 'Balanced Strategy' : 'Aggressive Growth'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Investment Horizon */}
            <div className="settings-card glass-card">
                <h3 className="card-title">⏱️ Investment Horizon</h3>
                <p className="card-desc">Your preferred investment duration impacts trade suggestions</p>
                <div className="risk-cards">
                    {['Short-term', 'Mid-term', 'Long-term'].map((horizon) => (
                        <div
                            key={horizon}
                            className={`risk-option ${riskForm.investmentHorizon === horizon ? 'active' : ''}`}
                            onClick={() => setRiskForm({ ...riskForm, investmentHorizon: horizon })}
                        >
                            <div className="risk-icon">
                                {horizon === 'Short-term' ? '⚡' : horizon === 'Mid-term' ? '📅' : '🏦'}
                            </div>
                            <div className="risk-name">{horizon.replace('-', ' ')}</div>
                            <div className="risk-desc">
                                {horizon === 'Short-term' ? '< 1 Year' : horizon === 'Mid-term' ? '1-3 Years' : '3+ Years'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button className="btn btn-primary save-btn" onClick={saveRisk} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Risk Preferences'}
            </button>
        </div>
    );

    const renderNotifications = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>Notification Settings</h2>
                <p className="section-desc">Control what alerts you receive</p>
            </div>

            <div className="settings-card glass-card">
                {[
                    { key: 'email', icon: '📧', label: 'Email Alerts', desc: 'Receive important updates via email' },
                    { key: 'priceAlert', icon: '💰', label: 'Price Alerts', desc: 'Get notified when stock prices hit your targets' },
                    { key: 'newsAlert', icon: '📰', label: 'News Alerts', desc: 'Stay updated with market-moving news' },
                    { key: 'aiRecommendation', icon: '🤖', label: 'AI Recommendation Alerts', desc: 'Receive AI-generated trade suggestions' },
                ].map((item) => (
                    <div className="toggle-row" key={item.key}>
                        <div className="toggle-info">
                            <span className="toggle-label">{item.icon} {item.label}</span>
                            <span className="toggle-desc">{item.desc}</span>
                        </div>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={notifForm[item.key]}
                                onChange={() => setNotifForm({ ...notifForm, [item.key]: !notifForm[item.key] })}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                ))}
            </div>

            <button className="btn btn-primary save-btn" onClick={saveNotifications} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Notifications'}
            </button>
        </div>
    );

    const renderAI = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>AI Customization</h2>
                <p className="section-desc">Fine-tune how the AI generates recommendations for you</p>
            </div>

            {/* Confidence Threshold */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🎯 Confidence Threshold</h3>
                <p className="card-desc">Only show recommendations above this confidence level</p>
                <div className="slider-container">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={aiForm.confidenceThreshold}
                        onChange={(e) => setAiForm({ ...aiForm, confidenceThreshold: Number(e.target.value) })}
                        className="settings-slider"
                        style={{ '--slider-progress': `${aiForm.confidenceThreshold}%` }}
                    />
                    <div className="slider-labels">
                        <span>0%</span>
                        <span className="slider-value">{aiForm.confidenceThreshold}%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>

            {/* Sentiment Weight */}
            <div className="settings-card glass-card">
                <h3 className="card-title">📊 Sentiment vs Price Weight</h3>
                <p className="card-desc">Balance between news sentiment and price trend analysis</p>
                <div className="weight-display">
                    <div className="weight-bar">
                        <div className="weight-fill news" style={{ width: `${aiForm.sentimentWeight}%` }}>
                            📰 {aiForm.sentimentWeight}%
                        </div>
                        <div className="weight-fill price" style={{ width: `${100 - aiForm.sentimentWeight}%` }}>
                            📈 {100 - aiForm.sentimentWeight}%
                        </div>
                    </div>
                    <span className="weight-label-left">News Sentiment</span>
                    <span className="weight-label-right">Price Trend</span>
                </div>
                <div className="slider-container">
                    <input
                        type="range"
                        min="0"
                        max="100"
                        value={aiForm.sentimentWeight}
                        onChange={(e) => setAiForm({ ...aiForm, sentimentWeight: Number(e.target.value) })}
                        className="settings-slider"
                        style={{ '--slider-progress': `${aiForm.sentimentWeight}%` }}
                    />
                </div>
            </div>

            {/* Auto Refresh */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🔄 Auto Refresh Interval</h3>
                <p className="card-desc">How often the AI recalculates recommendations</p>
                <div className="refresh-options">
                    {[
                        { value: 30, label: '30 Seconds', desc: 'Real-time' },
                        { value: 60, label: '1 Minute', desc: 'Recommended' },
                        { value: 300, label: '5 Minutes', desc: 'Battery Saver' },
                    ].map((opt) => (
                        <div
                            key={opt.value}
                            className={`refresh-option ${aiForm.autoRefreshTime === opt.value ? 'active' : ''}`}
                            onClick={() => setAiForm({ ...aiForm, autoRefreshTime: opt.value })}
                        >
                            <div className="refresh-time">{opt.label}</div>
                            <div className="refresh-desc">{opt.desc}</div>
                        </div>
                    ))}
                </div>
            </div>

            <button className="btn btn-primary save-btn" onClick={saveAI} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save AI Settings'}
            </button>
        </div>
    );

    const renderModels = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>Model Management</h2>
                <p className="section-desc">Download, fine-tune, and manage HuggingFace AI models</p>
            </div>

            {/* ML Service Status */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🔌 ML Service Status</h3>
                <div className="ml-status-row">
                    <div className={`ml-status-badge ${mlStatus.available ? 'status-online' : 'status-offline'}`}>
                        <span className="status-dot"></span>
                        {mlStatus.available ? 'Online' : 'Offline'}
                    </div>
                    {mlStatus.available && (
                        <div className="ml-status-info">
                            <span>Device: {mlStatus.device || 'CPU'}</span>
                            {mlStatus.gpu_name && <span>GPU: {mlStatus.gpu_name}</span>}
                            <span>Models loaded: {mlStatus.loaded_models?.length || 0}</span>
                        </div>
                    )}
                    {!mlStatus.available && (
                        <p className="ml-offline-hint">
                            Start the Python service: <code>cd ai_models → python model_service.py</code>
                        </p>
                    )}
                    <button className="btn btn-outline btn-sm" onClick={fetchMLStatus}>🔄 Refresh</button>
                </div>
            </div>

            {/* Downloaded Models */}
            <div className="settings-card glass-card">
                <h3 className="card-title">📦 Downloaded Models</h3>
                {localModels.length > 0 ? (
                    <div className="model-list">
                        {localModels.map((m) => (
                            <div key={m.key} className="model-item">
                                <div className="model-item-info">
                                    <span className="model-item-name">
                                        {m.type === 'fine_tuned' ? '🔧' : '📦'} {m.key}
                                    </span>
                                    <span className="model-item-size">{m.size_mb} MB</span>
                                    <span className={`model-item-status ${m.is_loaded ? 'loaded' : ''}`}>
                                        {m.is_loaded ? '🟢 Loaded' : '⚪ Not loaded'}
                                    </span>
                                </div>
                                <button className="btn btn-danger btn-sm" onClick={() => deleteLocalModel(m.key)}>🗑️</button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="card-desc">No models downloaded yet. Search and download below.</p>
                )}
            </div>

            {/* Search HuggingFace Hub */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🔍 Search HuggingFace Hub</h3>
                <div className="model-search-bar">
                    <input
                        type="text"
                        placeholder="Search models (e.g. 'financial sentiment', 'stock prediction')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && searchModels()}
                        className="settings-input"
                    />
                    <button className="btn btn-primary" onClick={searchModels} disabled={searching}>
                        {searching ? '⏳ Searching...' : '🔍 Search'}
                    </button>
                </div>
                {searchResults.length > 0 && (
                    <div className="model-search-results">
                        {searchResults.map((m) => {
                            const modelKey = m.id.replace(/\//g, '_');
                            const isDownloading = !!downloadingModels[modelKey];
                            const isDownloaded = localModels.some(lm => lm.key === modelKey);
                            return (
                                <div key={m.id} className="model-result-card">
                                    <div className="model-result-header">
                                        <span className="model-result-name">{m.id}</span>
                                        {m.pipeline_tag && <span className="model-tag">{m.pipeline_tag}</span>}
                                    </div>
                                    <div className="model-result-stats">
                                        <span>⬇️ {(m.downloads || 0).toLocaleString()}</span>
                                        <span>❤️ {m.likes || 0}</span>
                                    </div>
                                    {m.tags && m.tags.length > 0 && (
                                        <div className="model-result-tags">
                                            {m.tags.slice(0, 5).map(t => <span key={t} className="model-tag-sm">{t}</span>)}
                                        </div>
                                    )}
                                    {isDownloading ? (
                                        <div className="model-download-progress">
                                            <div className="progress-bar">
                                                <div className="progress-fill" style={{ width: `${downloadingModels[modelKey]?.progress || 0}%` }}></div>
                                            </div>
                                            <span>{downloadingModels[modelKey]?.progress || 0}%</span>
                                        </div>
                                    ) : (
                                        <button
                                            className={`btn btn-sm ${isDownloaded ? 'btn-outline' : 'btn-primary'}`}
                                            onClick={() => !isDownloaded && downloadModel(m.id)}
                                            disabled={isDownloaded}
                                        >
                                            {isDownloaded ? '✅ Downloaded' : '⬇️ Download'}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Fine-Tuning */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🔧 Fine-Tune Model</h3>
                <p className="card-desc">Train a model on financial sentiment data for better stock market predictions</p>
                <div className="form-grid">
                    <div className="form-group">
                        <label>Base Model</label>
                        <select
                            value={fineTuneConfig.base_model}
                            onChange={(e) => setFineTuneConfig({ ...fineTuneConfig, base_model: e.target.value })}
                            className="settings-select"
                        >
                            {localModels.filter(m => m.type === 'base').map(m => (
                                <option key={m.key} value={m.key}>{m.key}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Epochs</label>
                        <input
                            type="number" min="1" max="20"
                            value={fineTuneConfig.epochs}
                            onChange={(e) => setFineTuneConfig({ ...fineTuneConfig, epochs: Number(e.target.value) })}
                            className="settings-input"
                        />
                    </div>
                    <div className="form-group">
                        <label>Batch Size</label>
                        <select
                            value={fineTuneConfig.batch_size}
                            onChange={(e) => setFineTuneConfig({ ...fineTuneConfig, batch_size: Number(e.target.value) })}
                            className="settings-select"
                        >
                            {[4, 8, 16, 32].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Learning Rate</label>
                        <select
                            value={fineTuneConfig.learning_rate}
                            onChange={(e) => setFineTuneConfig({ ...fineTuneConfig, learning_rate: Number(e.target.value) })}
                            className="settings-select"
                        >
                            <option value={0.00001}>1e-5</option>
                            <option value={0.00002}>2e-5 (default)</option>
                            <option value={0.00003}>3e-5</option>
                            <option value={0.00005}>5e-5</option>
                        </select>
                    </div>
                </div>
                <button className="btn btn-primary save-btn" onClick={startFineTune} disabled={fineTuning || !mlStatus.available}>
                    {fineTuning ? '⏳ Fine-tuning...' : '🚀 Start Fine-Tuning'}
                </button>
                {!mlStatus.available && <p className="card-desc" style={{ color: '#ef4444', marginTop: 8 }}>⚠️ ML service must be running to fine-tune</p>}
            </div>
        </div>
    );

    const renderPaperTrading = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>Paper Trading Settings</h2>
                <p className="section-desc">Manage your virtual portfolio and simulation settings</p>
            </div>

            {/* Simulation Mode */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🎮 Simulation Mode</h3>
                <div className="toggle-row">
                    <div className="toggle-info">
                        <span className="toggle-label">Enable Simulation</span>
                        <span className="toggle-desc">Trade with virtual money — no real investments</span>
                    </div>
                    <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={paperForm.simulationMode}
                            onChange={() => setPaperForm({ ...paperForm, simulationMode: !paperForm.simulationMode })}
                        />
                        <span className="toggle-slider"></span>
                    </label>
                </div>
            </div>

            {/* Virtual Capital */}
            <div className="settings-card glass-card">
                <h3 className="card-title">💰 Initial Virtual Capital</h3>
                <p className="card-desc">Set the starting balance for your virtual portfolio</p>
                <div className="capital-input-wrap">
                    <span className="currency-symbol">{themeForm.currency}</span>
                    <input
                        type="number"
                        min="10000"
                        step="10000"
                        value={paperForm.initialCapital}
                        onChange={(e) => setPaperForm({ ...paperForm, initialCapital: Number(e.target.value) })}
                        className="settings-input capital-input"
                    />
                </div>
                <div className="capital-presets">
                    {[100000, 500000, 1000000, 5000000].map((val) => (
                        <button
                            key={val}
                            className={`preset-btn ${paperForm.initialCapital === val ? 'active' : ''}`}
                            onClick={() => setPaperForm({ ...paperForm, initialCapital: val })}
                        >
                            {themeForm.currency}{(val / 100000).toFixed(0)}L
                        </button>
                    ))}
                </div>
            </div>

            <div className="btn-row">
                <button className="btn btn-primary save-btn" onClick={() => savePaperTrading(false)} disabled={saving}>
                    {saving ? '⏳ Saving...' : '💾 Save Settings'}
                </button>
                <button className="btn btn-danger save-btn" onClick={() => {
                    if (window.confirm('Reset portfolio? All holdings will be cleared and balance reset.')) {
                        savePaperTrading(true);
                    }
                }} disabled={saving}>
                    🔄 Reset Portfolio
                </button>
            </div>
        </div>
    );

    const renderPrivacy = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>Data & Privacy</h2>
                <p className="section-desc">Manage your data and account privacy</p>
            </div>

            {/* Data Transparency */}
            <div className="settings-card glass-card">
                <h3 className="card-title">📋 Data Usage Transparency</h3>
                <div className="transparency-list">
                    <div className="transparency-item">
                        <span className="t-icon">📊</span>
                        <div className="t-info">
                            <span className="t-label">Trading Activity</span>
                            <span className="t-desc">Used to personalize AI recommendations</span>
                        </div>
                    </div>
                    <div className="transparency-item">
                        <span className="t-icon">🧠</span>
                        <div className="t-info">
                            <span className="t-label">Risk Profile Data</span>
                            <span className="t-desc">Used to calibrate investment suggestions</span>
                        </div>
                    </div>
                    <div className="transparency-item">
                        <span className="t-icon">🔐</span>
                        <div className="t-info">
                            <span className="t-label">Account Security</span>
                            <span className="t-desc">Passwords are encrypted and never stored in plain text</span>
                        </div>
                    </div>
                    <div className="transparency-item">
                        <span className="t-icon">🚫</span>
                        <div className="t-info">
                            <span className="t-label">No Third-Party Sharing</span>
                            <span className="t-desc">Your data is never sold or shared with third parties</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="settings-card glass-card">
                <h3 className="card-title">⚡ Actions</h3>
                <div className="privacy-actions">
                    <button className="btn btn-outline action-btn" onClick={downloadData}>
                        📥 Download My Data
                    </button>
                    <button className="btn btn-outline action-btn" onClick={clearHistory}>
                        🗑️ Clear Trading History
                    </button>
                    <button className="btn btn-danger action-btn delete-btn" onClick={deleteAccount}>
                        ⛔ Delete My Account
                    </button>
                </div>
            </div>
        </div>
    );

    const renderTheme = () => (
        <div className="settings-section animate-fadeInUp">
            <div className="section-header">
                <h2>Theme & Appearance</h2>
                <p className="section-desc">Customize the look and feel of your dashboard</p>
            </div>

            {/* Theme Mode */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🌗 Display Mode</h3>
                <div className="theme-options">
                    <div
                        className={`theme-card ${themeForm.theme === 'dark' ? 'active' : ''}`}
                        onClick={() => setThemeForm({ ...themeForm, theme: 'dark' })}
                    >
                        <div className="theme-preview dark-preview">
                            <div className="preview-bar"></div>
                            <div className="preview-content">
                                <div className="preview-line"></div>
                                <div className="preview-line short"></div>
                            </div>
                        </div>
                        <span className="theme-name">🌙 Dark Mode</span>
                    </div>
                    <div
                        className={`theme-card ${themeForm.theme === 'light' ? 'active' : ''}`}
                        onClick={() => setThemeForm({ ...themeForm, theme: 'light' })}
                    >
                        <div className="theme-preview light-preview">
                            <div className="preview-bar"></div>
                            <div className="preview-content">
                                <div className="preview-line"></div>
                                <div className="preview-line short"></div>
                            </div>
                        </div>
                        <span className="theme-name">☀️ Light Mode</span>
                    </div>
                </div>
            </div>

            {/* Currency */}
            <div className="settings-card glass-card">
                <h3 className="card-title">💱 Currency</h3>
                <div className="currency-options">
                    {[
                        { value: '₹', label: 'Indian Rupee (₹)', flag: '🇮🇳' },
                        { value: '$', label: 'US Dollar ($)', flag: '🇺🇸' },
                    ].map((c) => (
                        <div
                            key={c.value}
                            className={`currency-option ${themeForm.currency === c.value ? 'active' : ''}`}
                            onClick={() => setThemeForm({ ...themeForm, currency: c.value })}
                        >
                            <span className="currency-flag">{c.flag}</span>
                            <span>{c.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Language */}
            <div className="settings-card glass-card">
                <h3 className="card-title">🌐 Language</h3>
                <div className="language-select-wrap">
                    <select
                        value={themeForm.language}
                        onChange={(e) => setThemeForm({ ...themeForm, language: e.target.value })}
                        className="settings-select"
                    >
                        <option value="en">🇬🇧 English</option>
                        <option value="hi">🇮🇳 Hindi (Coming Soon)</option>
                    </select>
                    <span className="select-hint">More languages coming soon</span>
                </div>
            </div>

            <button className="btn btn-primary save-btn" onClick={saveTheme} disabled={saving}>
                {saving ? '⏳ Saving...' : '💾 Save Theme Settings'}
            </button>
        </div>
    );

    // ── MAIN RENDER ──────────────────────────────

    if (loading) {
        return (
            <div className="settings-page">
                <div className="settings-loading">
                    <div className="loading-spinner"></div>
                    <p>Loading settings...</p>
                </div>
            </div>
        );
    }

    const tabContent = {
        profile: renderProfile,
        risk: renderRisk,
        notifications: renderNotifications,
        ai: renderAI,
        models: renderModels,
        paper: renderPaperTrading,
        privacy: renderPrivacy,
        theme: renderTheme,
    };

    return (
        <div className="settings-page">
            {/* Page Header */}
            <div className="settings-header">
                <div>
                    <h1 className="settings-title">⚙️ Settings</h1>
                    <p className="settings-subtitle">Manage your preferences and customize your experience</p>
                </div>
            </div>

            {/* Toast Message */}
            {message.text && (
                <div className={`toast-message ${message.type}`}>
                    <span>{message.type === 'success' ? '✅' : '❌'}</span>
                    {message.text}
                </div>
            )}

            <div className="settings-layout">
                {/* Tab Navigation */}
                <div className="settings-tabs glass">
                    {TABS.map((tab) => (
                        <button
                            key={tab.id}
                            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <span className="tab-icon">{tab.icon}</span>
                            <span className="tab-label">{tab.label}</span>
                            {activeTab === tab.id && <span className="tab-indicator" />}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="settings-content">
                    {tabContent[activeTab]?.()}
                </div>
            </div>
        </div>
    );
};

export default Settings;
