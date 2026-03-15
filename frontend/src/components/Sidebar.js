import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Sidebar.css';

const menuItems = [
    { path: '/dashboard', icon: '📊', label: 'Dashboard' },
    { path: '/paper-trading', icon: '📈', label: 'Paper Trading' },
    { path: '/portfolio', icon: '💼', label: 'Portfolio' },
    { path: '/watchlist', icon: '⭐', label: 'Watchlist' },
    { path: '/risk-analysis', icon: '🛡️', label: 'Risk Analysis' },
    { path: '/risk-profile', icon: '🎯', label: 'Risk Profile' },
    { path: '/chat-advisor', icon: '🤖', label: 'AI Advisor' },
    { path: '/education', icon: '📚', label: 'Education' },
    { path: '/social-trading', icon: '👥', label: 'Social' },
    { path: '/broker-integration', icon: '🔗', label: 'Broker' },
    { path: '/settings', icon: '⚙️', label: 'Settings' },
];

const Sidebar = () => {
    const { user, logout } = useAuth();
    const { theme, toggleTheme, isDark } = useTheme();
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            {/* Brand */}
            <div className="sidebar-brand">
                <div className="brand-logo">CW</div>
                {!collapsed && <span className="brand-text">CapitalWave</span>}
                <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}
                    title={collapsed ? 'Expand' : 'Collapse'}>
                    {collapsed ? '→' : '←'}
                </button>
            </div>

            {/* Navigation */}
            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `nav-item ${isActive ? 'active' : ''}`
                        }
                        title={collapsed ? item.label : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                        {!collapsed && location.pathname === item.path && (
                            <span className="nav-indicator" />
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="sidebar-footer">
                <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
                    {isDark ? '☀️' : '🌙'} {!collapsed && (isDark ? 'Light' : 'Dark')}
                </button>
                <button className="logout-btn" onClick={logout} title="Logout">
                    🚪 {!collapsed && 'Logout'}
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;
