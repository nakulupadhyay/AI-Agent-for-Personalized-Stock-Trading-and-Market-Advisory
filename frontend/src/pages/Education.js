import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import './Education.css';

const Education = () => {
    const [modules, setModules] = useState([]);
    const [overallProgress, setOverallProgress] = useState({ total: 0, completed: 0, percent: 0 });
    const [activeModule, setActiveModule] = useState(null);
    const [quiz, setQuiz] = useState(null);
    const [answers, setAnswers] = useState({});
    const [quizResult, setQuizResult] = useState(null);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);
    const [filter, setFilter] = useState('all');

    const fetchModules = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get('/education/modules');
            setModules(res.data.data.modules);
            setOverallProgress(res.data.data.overallProgress);
        } catch (err) {
            console.error('Failed to fetch modules:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchModules(); }, [fetchModules]);

    const handleModuleClick = async (moduleId) => {
        try {
            const res = await api.get(`/education/module/${moduleId}`);
            setActiveModule(res.data.data);
            setQuiz(null);
            setQuizResult(null);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load module' });
        }
    };

    const handleStartQuiz = async (moduleId) => {
        try {
            const res = await api.get(`/education/quiz/${moduleId}`);
            setQuiz(res.data.data);
            setAnswers({});
            setQuizResult(null);
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to load quiz' });
        }
    };

    const handleSubmitQuiz = async () => {
        try {
            const answerArray = Object.entries(answers).map(([qId, option]) => ({
                questionId: parseInt(qId),
                selectedOption: option,
            }));
            const res = await api.post(`/education/quiz/${quiz.moduleId}/submit`, { answers: answerArray });
            setQuizResult(res.data.data);
            fetchModules();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to submit quiz' });
        }
    };

    const handleToggleBookmark = async (moduleId) => {
        const module = modules.find(m => m.id === moduleId);
        try {
            await api.post('/education/progress', {
                moduleId,
                bookmarked: !module.progress.bookmarked,
            });
            fetchModules();
        } catch (err) {
            console.error('Failed to bookmark:', err);
        }
    };

    const handleMarkComplete = async (moduleId) => {
        try {
            await api.post('/education/progress', { moduleId, completed: true });
            setMessage({ type: 'success', text: 'Module marked as complete!' });
            fetchModules();
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to update progress' });
        }
    };

    useEffect(() => {
        if (message) {
            const timer = setTimeout(() => setMessage(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [message]);

    const filteredModules = modules.filter(m => {
        if (filter === 'completed') return m.progress.completed;
        if (filter === 'bookmarked') return m.progress.bookmarked;
        if (filter === 'in-progress') return !m.progress.completed && m.progress.quizAttempts > 0;
        return true;
    });

    const categoryColors = { 'Beginner': '#10b981', 'Intermediate': '#f59e0b', 'Advanced': '#8b5cf6' };

    return (
        <div className="education-page">
            <div className="page-header">
                <h1>📚 Educational Resources</h1>
                <p className="page-subtitle">Learn stock market fundamentals, technical analysis, and AI-driven trading</p>
            </div>

            {message && (
                <div className={`toast-message ${message.type}`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                </div>
            )}

            {/* Overall Progress */}
            <div className="progress-overview">
                <div className="progress-bar-container">
                    <div className="progress-text">
                        <span>Overall Progress</span>
                        <span>{overallProgress.completed}/{overallProgress.total} modules completed</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${overallProgress.percent}%` }}></div>
                    </div>
                </div>
                <div className="progress-percent">{overallProgress.percent}%</div>
            </div>

            {/* Filter Tabs */}
            <div className="filter-tabs">
                {['all', 'in-progress', 'completed', 'bookmarked'].map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                        {f === 'all' ? '📋 All' : f === 'in-progress' ? '⏳ In Progress' : f === 'completed' ? '✅ Completed' : '🔖 Bookmarked'}
                    </button>
                ))}
            </div>

            {/* Module Detail View */}
            {activeModule && !quiz && (
                <div className="module-detail">
                    <button className="back-btn" onClick={() => setActiveModule(null)}>← Back to Modules</button>
                    <div className="detail-header">
                        <span className="detail-icon">{activeModule.icon}</span>
                        <div>
                            <h2>{activeModule.name}</h2>
                            <div className="detail-meta">
                                <span className="category-tag" style={{ background: categoryColors[activeModule.category] }}>{activeModule.category}</span>
                                <span>⏱ {activeModule.duration}</span>
                            </div>
                        </div>
                    </div>
                    <p className="detail-desc">{activeModule.description}</p>

                    <h3>📝 Topics Covered</h3>
                    <ul className="topics-list">
                        {activeModule.topics.map((topic, i) => (
                            <li key={i}>
                                <span className="topic-check">{activeModule.progress?.completed ? '✅' : '○'}</span>
                                {topic}
                            </li>
                        ))}
                    </ul>

                    {activeModule.resources.length > 0 && (
                        <>
                            <h3>🔗 Resources</h3>
                            <div className="resources-list">
                                {activeModule.resources.map((r, i) => (
                                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">
                                        {r.type === 'article' ? '📄' : '🎥'} {r.title}
                                    </a>
                                ))}
                            </div>
                        </>
                    )}

                    <div className="detail-actions">
                        {!activeModule.progress?.completed && (
                            <button className="btn-complete" onClick={() => handleMarkComplete(activeModule.id)}>✅ Mark as Complete</button>
                        )}
                        <button className="btn-quiz" onClick={() => handleStartQuiz(activeModule.id)}>📝 Take Quiz</button>
                    </div>
                </div>
            )}

            {/* Quiz View */}
            {quiz && !quizResult && (
                <div className="quiz-view">
                    <button className="back-btn" onClick={() => setQuiz(null)}>← Back to Module</button>
                    <h2>📝 Quiz: {modules.find(m => m.id === quiz.moduleId)?.name}</h2>
                    <div className="quiz-questions">
                        {quiz.questions.map((q) => (
                            <div key={q.id} className="question-card">
                                <p className="question-text">Q{q.id + 1}. {q.question}</p>
                                <div className="options">
                                    {q.options.map((option, oi) => (
                                        <label key={oi} className={`option-label ${answers[q.id] === oi ? 'selected' : ''}`}>
                                            <input
                                                type="radio"
                                                name={`q-${q.id}`}
                                                checked={answers[q.id] === oi}
                                                onChange={() => setAnswers(prev => ({ ...prev, [q.id]: oi }))}
                                            />
                                            <span className="option-text">{option}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        className="btn-submit-quiz"
                        onClick={handleSubmitQuiz}
                        disabled={Object.keys(answers).length < quiz.questions.length}
                    >
                        Submit Quiz ({Object.keys(answers).length}/{quiz.questions.length} answered)
                    </button>
                </div>
            )}

            {/* Quiz Results */}
            {quizResult && (
                <div className="quiz-results">
                    <button className="back-btn" onClick={() => { setQuiz(null); setQuizResult(null); setActiveModule(null); }}>← Back to Modules</button>
                    <div className={`result-card ${quizResult.passed ? 'passed' : 'failed'}`}>
                        <span className="result-icon">{quizResult.passed ? '🎉' : '📚'}</span>
                        <h2>{quizResult.passed ? 'Congratulations!' : 'Keep Learning!'}</h2>
                        <div className="result-score">
                            <span className="score-num">{quizResult.score}%</span>
                            <span className="score-detail">{quizResult.correct}/{quizResult.total} correct</span>
                        </div>
                        <p>{quizResult.passed ? 'You passed the quiz! Module marked as completed.' : 'You need 60% to pass. Review the topics and try again.'}</p>
                        {!quizResult.passed && (
                            <button className="btn-retry" onClick={() => { setQuizResult(null); setAnswers({}); }}>🔄 Retry Quiz</button>
                        )}
                    </div>
                </div>
            )}

            {/* Module Grid (show when no detail/quiz is active) */}
            {!activeModule && !quiz && (
                <div className="modules-grid">
                    {loading ? (
                        [1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton-mod-card"></div>)
                    ) : filteredModules.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📚</span>
                            <h3>No modules found</h3>
                            <p>Try a different filter</p>
                        </div>
                    ) : (
                        filteredModules.map(module => (
                            <div key={module.id} className={`module-card ${module.progress.completed ? 'completed' : ''}`}>
                                <div className="mc-header">
                                    <span className="mc-icon">{module.icon}</span>
                                    <button
                                        className={`bookmark-btn ${module.progress.bookmarked ? 'active' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); handleToggleBookmark(module.id); }}
                                    >
                                        {module.progress.bookmarked ? '🔖' : '📌'}
                                    </button>
                                </div>
                                <h3>{module.name}</h3>
                                <p className="mc-desc">{module.description}</p>
                                <div className="mc-meta">
                                    <span className="category-tag" style={{ background: categoryColors[module.category] + '20', color: categoryColors[module.category] }}>{module.category}</span>
                                    <span className="mc-duration">⏱ {module.duration}</span>
                                </div>
                                {module.progress.quizScore > 0 && (
                                    <div className="mc-quiz-score">
                                        Quiz Score: <strong>{module.progress.quizScore}%</strong>
                                        {module.progress.quizAttempts > 0 && <span>({module.progress.quizAttempts} attempts)</span>}
                                    </div>
                                )}
                                <button className="btn-start" onClick={() => handleModuleClick(module.id)}>
                                    {module.progress.completed ? '✅ Review' : 'Start Learning →'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default Education;
