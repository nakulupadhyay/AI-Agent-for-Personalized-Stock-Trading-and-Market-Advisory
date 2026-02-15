import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './TopNavbar.css';

const TopNavbar = () => {
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState(new Date());
    const [isMarketOpen, setIsMarketOpen] = useState(false);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now);

            // Indian market hours: 9:15 AM - 3:30 PM IST, Mon-Fri
            const hours = now.getHours();
            const mins = now.getMinutes();
            const day = now.getDay();
            const timeVal = hours * 60 + mins;
            const isWeekday = day >= 1 && day <= 5;
            const inMarketHours = timeVal >= 555 && timeVal <= 930; // 9:15 to 15:30
            setIsMarketOpen(isWeekday && inMarketHours);
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <header className="top-navbar">
            <div className="navbar-left">
                <div className="search-box">
                    <svg className="search-icon" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search stocks, indices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <kbd className="search-shortcut">⌘K</kbd>
                </div>
            </div>

            <div className="navbar-right">
                {/* Market Status */}
                <div className="market-status">
                    <span className={`market-dot ${isMarketOpen ? 'open' : 'closed'}`} />
                    <span className="market-text">
                        {isMarketOpen ? 'Market Open' : 'Market Closed'}
                    </span>
                </div>

                {/* Time */}
                <div className="navbar-time">
                    {currentTime.toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })}
                </div>

                {/* Notifications */}
                <button className="navbar-icon-btn" title="Notifications">
                    <svg viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                    </svg>
                    <span className="notification-badge">3</span>
                </button>

                {/* User Profile */}
                <div className="navbar-user">
                    <div className="user-avatar">
                        {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                        <span className="user-name">{user?.name || 'User'}</span>
                        <span className="user-role">Investor</span>
                    </div>
                </div>
            </div>
        </header>
    );
};

export default TopNavbar;
