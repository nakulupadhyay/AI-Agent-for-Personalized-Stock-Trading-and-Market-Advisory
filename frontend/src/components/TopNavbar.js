import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useLocation } from 'react-router-dom';
import './TopNavbar.css';

const pageTitles = {
    '/dashboard': { title: 'Dashboard', subtitle: 'Market overview & portfolio summary' },
    '/paper-trading': { title: 'Paper Trading', subtitle: 'Practice trading with virtual money' },
    '/portfolio': { title: 'Portfolio', subtitle: 'Holdings, P&L & analytics' },
    '/watchlist': { title: 'Watchlist', subtitle: 'Track your favorite stocks' },
    '/risk-analysis': { title: 'Risk Analysis', subtitle: 'Portfolio risk assessment' },
    '/risk-profile': { title: 'Risk Profile', subtitle: 'Your investment risk tolerance' },
    '/chat-advisor': { title: 'AI Advisor', subtitle: 'AI-powered market insights' },
    '/education': { title: 'Education', subtitle: 'Learn trading & finance' },
    '/social-trading': { title: 'Social Trading', subtitle: 'Follow top traders' },
    '/broker-integration': { title: 'Broker', subtitle: 'Connect your broker account' },
    '/settings': { title: 'Settings', subtitle: 'Account & preferences' },
};

const TopNavbar = () => {
    const { user } = useAuth();
    const { isDark } = useTheme();
    const location = useLocation();

    const pageInfo = pageTitles[location.pathname] || { title: 'CapitalWave', subtitle: '' };

    const formatBalance = (balance) => {
        if (!balance) return '₹0';
        return '₹' + balance.toLocaleString('en-IN');
    };

    return (
        <header className="top-navbar">
            <div className="navbar-left">
                <div>
                    <h1 className="page-title">{pageInfo.title}</h1>
                    {pageInfo.subtitle && (
                        <p className="page-subtitle">{pageInfo.subtitle}</p>
                    )}
                </div>
            </div>

            <div className="navbar-right">
                <div className="navbar-balance" title="Virtual Balance">
                    <span className="balance-label">Balance</span>
                    <span className="balance-value">{formatBalance(user?.virtualBalance)}</span>
                </div>

                <div className="navbar-status">
                    <span className="live-dot" />
                    <span className="status-text">Live</span>
                </div>

                <div className="navbar-user">
                    <div className="user-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <span className="user-name hide-mobile">{user?.name || 'User'}</span>
                </div>
            </div>
        </header>
    );
};

export default TopNavbar;
