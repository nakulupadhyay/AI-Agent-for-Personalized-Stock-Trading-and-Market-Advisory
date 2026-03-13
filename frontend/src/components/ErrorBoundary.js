import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript runtime errors in child components
 * and displays a graceful fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-state" style={{ margin: '2rem', padding: '3rem' }}>
                    <div className="error-icon">⚠️</div>
                    <h3>Something went wrong</h3>
                    <p style={{ marginBottom: '1rem' }}>
                        {this.props.fallbackMessage || 'An unexpected error occurred. Please try again.'}
                    </p>
                    <button className="btn btn-primary" onClick={this.handleRetry}>
                        🔄 Try Again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
