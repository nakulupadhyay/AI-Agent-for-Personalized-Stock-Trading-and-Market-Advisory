import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import './RiskProfile.css';

const questions = [
    {
        id: 'horizon',
        question: 'What is your investment horizon?',
        options: [
            { value: 'short', label: 'Less than 1 year', score: 1 },
            { value: 'medium', label: '1-5 years', score: 2 },
            { value: 'long', label: 'More than 5 years', score: 3 },
        ],
    },
    {
        id: 'tolerance',
        question: 'How would you react if your portfolio dropped 20% in a month?',
        options: [
            { value: 'sell', label: 'Sell everything immediately', score: 1 },
            { value: 'wait', label: 'Hold and wait for recovery', score: 2 },
            { value: 'buy', label: 'Buy more at lower prices', score: 3 },
        ],
    },
    {
        id: 'experience',
        question: 'How much trading experience do you have?',
        options: [
            { value: 'beginner', label: 'Beginner (< 1 year)', score: 1 },
            { value: 'intermediate', label: 'Intermediate (1-5 years)', score: 2 },
            { value: 'expert', label: 'Expert (5+ years)', score: 3 },
        ],
    },
    {
        id: 'goal',
        question: 'What is your primary financial goal?',
        options: [
            { value: 'preserve', label: 'Capital preservation', score: 1 },
            { value: 'balanced', label: 'Balanced growth', score: 2 },
            { value: 'aggressive', label: 'Aggressive capital growth', score: 3 },
        ],
    },
    {
        id: 'income',
        question: 'What percentage of your income do you invest?',
        options: [
            { value: 'low', label: 'Less than 10%', score: 1 },
            { value: 'medium', label: '10-30%', score: 2 },
            { value: 'high', label: 'More than 30%', score: 3 },
        ],
    },
];

const RiskProfile = () => {
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        checkExistingProfile();
    }, []);

    const checkExistingProfile = async () => {
        try {
            const res = await api.get('/risk-profile');
            if (res.data.data) {
                setResult(res.data.data);
            }
        } catch (e) { }
        setLoading(false);
    };

    const handleSelect = (qId, option) => {
        setAnswers({ ...answers, [qId]: option });
    };

    const handleNext = () => {
        if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1);
    };

    const handlePrev = () => {
        if (currentQ > 0) setCurrentQ(currentQ - 1);
    };

    // Map frontend short values to backend-expected values
    const horizonMap = { short: 'Short-term (<1 year)', medium: 'Medium-term (1-5 years)', long: 'Long-term (5+ years)' };
    const toleranceMap = { sell: 'Conservative', wait: 'Moderate', buy: 'Aggressive' };
    const experienceMap = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' };
    const goalMap = { preserve: 'Capital Preservation', balanced: 'Balanced Growth', aggressive: 'Aggressive Growth' };
    const incomeMap = { low: 'Less than 10%', medium: '10-30%', high: 'More than 30%' };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const res = await api.post('/risk-profile', {
                investmentHorizon: horizonMap[answers.horizon?.value] || answers.horizon?.value,
                riskTolerance: toleranceMap[answers.tolerance?.value] || answers.tolerance?.value,
                investmentExperience: experienceMap[answers.experience?.value] || answers.experience?.value,
                financialGoal: goalMap[answers.goal?.value] || answers.goal?.value,
                monthlyIncome: incomeMap[answers.income?.value] || answers.income?.value,
            });
            setResult(res.data.data);
        } catch (e) {
            console.error('Risk profile submit error:', e);
        }
        setSubmitting(false);
    };

    const retake = () => {
        setResult(null);
        setAnswers({});
        setCurrentQ(0);
    };

    const progress = ((Object.keys(answers).length) / questions.length) * 100;

    if (loading) {
        return (
            <div className="rp-page">
                <div className="skeleton skeleton-title" style={{ width: '200px', marginBottom: '2rem' }} />
                <div className="glass-card"><div className="skeleton" style={{ height: '400px' }} /></div>
            </div>
        );
    }

    // Result View
    if (result) {
        const riskColors = {
            Low: { color: 'var(--accent-green)', bg: 'var(--accent-green-glow)' },
            Medium: { color: 'var(--accent-yellow)', bg: 'var(--accent-yellow-glow)' },
            High: { color: 'var(--accent-red)', bg: 'var(--accent-red-glow)' },
        };
        const rc = riskColors[result.riskLevel] || riskColors.Medium;

        return (
            <div className="rp-page">
                <div className="rp-header animate-fadeInUp">
                    <h1 className="rp-title">Your Risk <span className="text-gradient">Profile</span></h1>
                </div>

                <div className="rp-result glass-card animate-fadeInUp">
                    <div className="rp-result-main">
                        <div className="rp-risk-circle" style={{ borderColor: rc.color, boxShadow: `0 0 30px ${rc.bg}` }}>
                            <span className="rp-risk-level" style={{ color: rc.color }}>{result.riskLevel}</span>
                            <span className="rp-risk-label">Risk Level</span>
                        </div>
                        <div className="rp-risk-info">
                            <h2>Risk Score: {result.riskScore}/15</h2>
                            <p className="rp-risk-desc">
                                {result.riskLevel === 'Low' && 'You have a conservative investment approach. We recommend stable, blue-chip stocks with lower volatility.'}
                                {result.riskLevel === 'Medium' && 'You have a balanced approach. We recommend a mix of growth and value stocks with moderate risk.'}
                                {result.riskLevel === 'High' && 'You have an aggressive investment style. We recommend high-growth stocks with potential for significant returns.'}
                            </p>
                        </div>
                    </div>

                    <div className="rp-meter">
                        <div className="rp-meter-track">
                            <div className="rp-meter-fill" style={{ width: `${(result.riskScore / 15) * 100}%`, background: rc.color }} />
                        </div>
                        <div className="rp-meter-labels">
                            <span>Conservative</span>
                            <span>Balanced</span>
                            <span>Aggressive</span>
                        </div>
                    </div>

                    <div className="rp-recommendations">
                        <h3 className="section-title">AI Recommendations Based on Your Profile</h3>
                        <div className="rp-rec-grid">
                            <div className="rp-rec-card">
                                <span className="rp-rec-icon">📊</span>
                                <span className="rp-rec-title">Suggested Stocks</span>
                                <span className="rp-rec-value">{result.riskLevel === 'Low' ? 'HDFCBANK, TCS' : result.riskLevel === 'Medium' ? 'RELIANCE, INFY' : 'Small/Mid-cap Growth'}</span>
                            </div>
                            <div className="rp-rec-card">
                                <span className="rp-rec-icon">⚖️</span>
                                <span className="rp-rec-title">Equity Allocation</span>
                                <span className="rp-rec-value">{result.riskLevel === 'Low' ? '40-50%' : result.riskLevel === 'Medium' ? '60-70%' : '80-90%'}</span>
                            </div>
                            <div className="rp-rec-card">
                                <span className="rp-rec-icon">🎯</span>
                                <span className="rp-rec-title">Strategy</span>
                                <span className="rp-rec-value">{result.riskLevel === 'Low' ? 'Value Investing' : result.riskLevel === 'Medium' ? 'Growth + Value' : 'Momentum Trading'}</span>
                            </div>
                        </div>
                    </div>

                    <button className="btn btn-outline" onClick={retake} style={{ marginTop: '1.5rem' }}>
                        Retake Assessment
                    </button>
                </div>
            </div>
        );
    }

    // Questionnaire View
    const q = questions[currentQ];

    return (
        <div className="rp-page">
            <div className="rp-header animate-fadeInUp">
                <h1 className="rp-title">Risk <span className="text-gradient">Assessment</span></h1>
                <p className="rp-subtitle">Answer 5 quick questions to determine your ideal investment strategy</p>
            </div>

            {/* Progress Bar */}
            <div className="rp-progress">
                <div className="rp-progress-bar">
                    <div className="rp-progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="rp-progress-text">{currentQ + 1} / {questions.length}</span>
            </div>

            <div className="rp-question-card glass-card animate-fadeInUp">
                <h2 className="rp-question">{q.question}</h2>
                <div className="rp-options">
                    {q.options.map((opt) => (
                        <button
                            key={opt.value}
                            className={`rp-option ${answers[q.id]?.value === opt.value ? 'selected' : ''}`}
                            onClick={() => handleSelect(q.id, opt)}
                        >
                            <span className="rp-opt-radio" />
                            {opt.label}
                        </button>
                    ))}
                </div>

                <div className="rp-nav">
                    <button className="btn btn-outline" onClick={handlePrev} disabled={currentQ === 0}>
                        ← Previous
                    </button>
                    {currentQ < questions.length - 1 ? (
                        <button className="btn btn-primary" onClick={handleNext} disabled={!answers[q.id]}>
                            Next →
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={handleSubmit}
                            disabled={!answers[q.id] || submitting}
                        >
                            {submitting ? <span className="btn-loader" /> : 'Get My Profile'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RiskProfile;
