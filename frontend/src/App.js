import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import PaperTrading from './pages/PaperTrading';
import RiskProfile from './pages/RiskProfile';
import RiskAnalysis from './pages/RiskAnalysis';
import ChatAdvisor from './pages/ChatAdvisor';
import Settings from './pages/Settings';
import Portfolio from './pages/Portfolio';
import Watchlist from './pages/Watchlist';
import BrokerIntegration from './pages/BrokerIntegration';
import SocialTrading from './pages/SocialTrading';
import Education from './pages/Education';

import './App.css';

/**
 * Dashboard Layout — Sidebar + TopNavbar
 */
const DashboardLayout = ({ children }) => (
    <div className="app-layout">
        <Sidebar />
        <div className="app-main">
            <TopNavbar />
            <main className="app-content">
                <ErrorBoundary fallbackMessage="This section encountered an error. Please try refreshing.">
                    {children}
                </ErrorBoundary>
            </main>
            <footer className="risk-warning">
                <span>⚠️</span> This is an AI-powered advisory system. Not financial advice. Invest at your own risk.
            </footer>
        </div>
    </div>
);

/**
 * Route configuration
 */
const routeConfig = [
    { path: '/dashboard', Component: Dashboard },
    { path: '/paper-trading', Component: PaperTrading },
    { path: '/portfolio', Component: Portfolio },
    { path: '/watchlist', Component: Watchlist },
    { path: '/risk-profile', Component: RiskProfile },
    { path: '/risk-analysis', Component: RiskAnalysis },
    { path: '/chat-advisor', Component: ChatAdvisor },
    { path: '/settings', Component: Settings },
    { path: '/broker-integration', Component: BrokerIntegration },
    { path: '/social-trading', Component: SocialTrading },
    { path: '/education', Component: Education },
];

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Public routes */}
            <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes with dashboard layout */}
            {routeConfig.map(({ path, Component }) => (
                <Route
                    key={path}
                    path={path}
                    element={
                        <ProtectedRoute>
                            <DashboardLayout>
                                <Component />
                            </DashboardLayout>
                        </ProtectedRoute>
                    }
                />
            ))}
        </Routes>
    );
}

function App() {
    return (
        <ErrorBoundary fallbackMessage="The application encountered a critical error. Please refresh the page.">
            <ThemeProvider>
                <Router>
                    <AuthProvider>
                        <AppRoutes />
                    </AuthProvider>
                </Router>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;
