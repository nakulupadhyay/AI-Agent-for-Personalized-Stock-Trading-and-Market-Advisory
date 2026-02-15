import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const result = await login(formData.email, formData.password);
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-effects">
                <div className="auth-orb orb-1" />
                <div className="auth-orb orb-2" />
                <div className="auth-orb orb-3" />
            </div>

            <div className="auth-card glass">
                <div className="auth-logo">
                    <svg viewBox="0 0 32 32" fill="none" width="40" height="40">
                        <rect width="32" height="32" rx="8" fill="url(#lg)" />
                        <path d="M8 22L14 14L18 18L24 10" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        <defs>
                            <linearGradient id="lg" x1="0" y1="0" x2="32" y2="32">
                                <stop stopColor="#6c5ce7" />
                                <stop offset="1" stopColor="#a29bfe" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>

                <h1 className="auth-title">Welcome Back</h1>
                <p className="auth-subtitle">Log in to your CapitalWave account</p>

                {error && <div className="auth-error"><span>⚠️</span>{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label>Email Address</label>
                        <div className="input-wrapper">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="input-icon">
                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            <input
                                type="email" name="email" placeholder="you@email.com"
                                value={formData.email} onChange={handleChange} required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label>Password</label>
                        <div className="input-wrapper">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="input-icon">
                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                            </svg>
                            <input
                                type="password" name="password" placeholder="••••••••"
                                value={formData.password} onChange={handleChange} required
                            />
                        </div>
                    </div>

                    <button type="submit" className="auth-btn" disabled={loading}>
                        {loading ? (
                            <span className="btn-loader" />
                        ) : (
                            'Login'
                        )}
                    </button>
                </form>

                <div className="auth-footer">
                    Don't have an account? <Link to="/signup">Create one</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
