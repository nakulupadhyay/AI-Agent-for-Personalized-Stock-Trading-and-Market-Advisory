import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api, { AUTH_EVENTS } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    // Validate token against backend on mount
    useEffect(() => {
        const validateSession = async () => {
            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (!token || !savedUser) {
                setLoading(false);
                return;
            }

            try {
                // Verify token is still valid by hitting /auth/me
                const response = await api.get('/auth/me');
                if (response.data?.success && response.data?.user) {
                    // Use fresh data from server
                    const freshUser = response.data.user;
                    localStorage.setItem('user', JSON.stringify(freshUser));
                    setUser(freshUser);
                } else {
                    // Token invalid — clear session
                    logout();
                }
            } catch (error) {
                // If backend unreachable, use cached user (offline-friendly)
                if (!error.response) {
                    // Network error — trust localStorage
                    try {
                        setUser(JSON.parse(savedUser));
                    } catch {
                        logout();
                    }
                } else {
                    // Got a response (401, 403, etc.) — clear session
                    logout();
                }
            } finally {
                setLoading(false);
            }
        };

        validateSession();
    }, [logout]);

    // Listen for logout events from api.js interceptor
    useEffect(() => {
        const handleForceLogout = () => {
            logout();
        };

        window.addEventListener(AUTH_EVENTS.LOGOUT, handleForceLogout);
        return () => {
            window.removeEventListener(AUTH_EVENTS.LOGOUT, handleForceLogout);
        };
    }, [logout]);

    const login = async (email, password) => {
        try {
            const response = await api.post('/auth/login', { email, password });
            const { token, refreshToken, user: userData } = response.data;

            localStorage.setItem('token', token);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
            };
        }
    };

    const register = async (name, email, password) => {
        try {
            const response = await api.post('/auth/register', { name, email, password });
            const { token, refreshToken, user: userData } = response.data;

            localStorage.setItem('token', token);
            if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);

            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Registration failed',
            };
        }
    };

    const updateUser = (userData) => {
        const updatedUser = { ...user, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
    };

    const value = {
        user,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
        loading,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
