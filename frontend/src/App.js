import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Sidebar from './components/Sidebar';
import TopNavbar from './components/TopNavbar';
import ProtectedRoute from './components/ProtectedRoute';

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

import './App.css';

/**
 * Layout wrapper for authenticated pages — sidebar + top navbar
 */
const DashboardLayout = ({ children }) => (
    <div className="app-layout">
        <Sidebar />
        <div className="app-main">
            <TopNavbar />
            <main className="app-content">
                {children}
            </main>
            {/* Footer Risk Warning */}
            <footer className="risk-warning">
                <span>⚠️</span> This is an AI-powered advisory system. Not financial advice. Invest at your own risk.
            </footer>
        </div>
    </div>
);

function AppRoutes() {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            {/* Public routes — no sidebar */}
            <Route
                path="/"
                element={isAuthenticated ? <Navigate to="/dashboard" /> : <LandingPage />}
            />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes — with sidebar layout */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <Dashboard />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/paper-trading"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <PaperTrading />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/risk-profile"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <RiskProfile />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/risk-analysis"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <RiskAnalysis />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/chat-advisor"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <ChatAdvisor />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/portfolio"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <Portfolio />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings"
                element={
                    <ProtectedRoute>
                        <DashboardLayout>
                            <Settings />
                        </DashboardLayout>
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function App() {
    return (
        <ThemeProvider>
            <Router>
                <AuthProvider>
                    <AppRoutes />
                </AuthProvider>
            </Router>
        </ThemeProvider>
    );
}

export default App;
