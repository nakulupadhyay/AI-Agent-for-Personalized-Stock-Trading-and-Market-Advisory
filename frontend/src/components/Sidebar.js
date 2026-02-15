import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const menuItems = [
        { path: '/dashboard', icon: '📊', label: 'Dashboard' },
        { path: '/portfolio', icon: '💼', label: 'Portfolio' },
        { path: '/risk-profile', icon: '🎯', label: 'Risk Profile' },
        { path: '/paper-trading', icon: '📈', label: 'Paper Trading' },
        { path: '/chat-advisor', icon: '🤖', label: 'AI Chat' },
    ];

    return (
        <aside className="sidebar">
            {/* Logo */}
            <div className="sidebar-logo">
                <div className="logo-icon">
                    <svg viewBox="0 0 32 32" fill="none">
                        <rect width="32" height="32" rx="8" fill="url(#logo-gradient)" />
                        <path d="M8 22L14 14L18 18L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="logo-gradient" x1="0" y1="0" x2="32" y2="32">
                                <stop stopColor="#6c5ce7" />
                                <stop offset="1" stopColor="#a29bfe" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
                <div className="logo-text">
                    <span className="logo-name">CapitalWave</span>
                    <span className="logo-tagline">AI Stock Advisor</span>
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="sidebar-nav">
                <div className="nav-label">MAIN MENU</div>
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `sidebar-link ${isActive ? 'active' : ''}`
                        }
                    >
                        <span className="link-icon">{item.icon}</span>
                        <span className="link-text">{item.label}</span>
                        <span className="link-indicator" />
                    </NavLink>
                ))}
            </nav>

            {/* Bottom Section */}
            <div className="sidebar-bottom">
                <div className="nav-label">SETTINGS</div>
                <NavLink to="/settings" className="sidebar-link">
                    <span className="link-icon">⚙️</span>
                    <span className="link-text">Settings</span>
                </NavLink>
                <button onClick={handleLogout} className="sidebar-link logout-link">
                    <span className="link-icon">🚪</span>
                    <span className="link-text">Logout</span>
                </button>

                {/* Upcoming Features Card */}
                <div className="upcoming-card">
                    <div className="upcoming-badge">Coming Soon</div>
                    <p className="upcoming-text">Auto Portfolio Rebalancing & Multi-Agent AI Strategy</p>
                </div>
            </div>
        </aside>
    );
};

export default Sidebar;
