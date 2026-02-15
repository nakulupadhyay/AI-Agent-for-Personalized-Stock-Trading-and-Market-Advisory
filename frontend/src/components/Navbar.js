import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-logo">
                    📈 AI Stock Advisor
                </Link>

                <ul className="navbar-menu">
                    {isAuthenticated ? (
                        <>
                            <li><Link to="/dashboard" className="navbar-link">Dashboard</Link></li>
                            <li><Link to="/paper-trading" className="navbar-link">Paper Trading</Link></li>
                            <li><Link to="/risk-profile" className="navbar-link">Risk Profile</Link></li>
                            <li><Link to="/chat-advisor" className="navbar-link">AI Chat</Link></li>
                            <li className="navbar-user">
                                <span>👤 {user?.name}</span>
                            </li>
                            <li>
                                <button onClick={handleLogout} className="navbar-btn logout-btn">
                                    Logout
                                </button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/login" className="navbar-btn">Login</Link></li>
                            <li><Link to="/signup" className="navbar-btn signup-btn">Sign Up</Link></li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;
