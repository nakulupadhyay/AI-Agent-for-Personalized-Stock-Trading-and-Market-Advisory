import React, { useEffect, useRef } from 'react';
import './RiskMeter.css';

/**
 * RiskMeter — Semi-circular gauge component showing 0–100 risk score.
 * 
 * Props:
 *   score {number}     — 0–100 risk score
 *   category {string}  — 'Low' | 'Medium' | 'High' | 'N/A'
 *   size {number}      — Diameter in pixels (default 220)
 */
const RiskMeter = ({ score = 0, category = 'N/A', size = 220 }) => {
    const needleRef = useRef(null);

    // Clamp score to 0–100
    const clampedScore = Math.max(0, Math.min(100, score));

    // Map score to rotation angle: -90° (left, 0) to +90° (right, 100)
    const angle = -90 + (clampedScore / 100) * 180;

    // Color based on score
    const getColor = (s) => {
        if (s <= 33) return '#22c55e'; // green
        if (s <= 66) return '#f59e0b'; // amber
        return '#ef4444';              // red
    };

    const color = getColor(clampedScore);

    // SVG arc for the gauge background
    const radius = size / 2 - 15;
    const cx = size / 2;
    const cy = size / 2;

    // Create the arc path (semi-circle from left to right)
    const createArc = (startAngle, endAngle, r) => {
        const startRad = (startAngle * Math.PI) / 180;
        const endRad = (endAngle * Math.PI) / 180;
        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);
        const largeArc = endAngle - startAngle > 180 ? 1 : 0;
        return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
    };

    // Filled arc proportional to score
    const fillEndAngle = -180 + (clampedScore / 100) * 180;

    useEffect(() => {
        if (needleRef.current) {
            // Trigger animation on mount/update
            needleRef.current.style.transform = `rotate(${angle}deg)`;
        }
    }, [angle]);

    return (
        <div className="risk-meter" style={{ width: size, height: size * 0.65 }}>
            <svg
                width={size}
                height={size * 0.6}
                viewBox={`0 ${size * 0.2} ${size} ${size * 0.45}`}
                className="risk-meter__svg"
            >
                {/* Background arc (gray) */}
                <path
                    d={createArc(-180, 0, radius)}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="12"
                    strokeLinecap="round"
                />

                {/* Green zone */}
                <path
                    d={createArc(-180, -120, radius)}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.25"
                />

                {/* Yellow zone */}
                <path
                    d={createArc(-120, -60, radius)}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.25"
                />

                {/* Red zone */}
                <path
                    d={createArc(-60, 0, radius)}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="12"
                    strokeLinecap="round"
                    opacity="0.25"
                />

                {/* Filled arc (active) */}
                {clampedScore > 0 && (
                    <path
                        d={createArc(-180, fillEndAngle, radius)}
                        fill="none"
                        stroke={color}
                        strokeWidth="12"
                        strokeLinecap="round"
                        className="risk-meter__fill"
                    />
                )}

                {/* Scale labels */}
                <text x={cx - radius - 5} y={cy + 18} className="risk-meter__scale-text" textAnchor="middle">0</text>
                <text x={cx} y={cy - radius + 5} className="risk-meter__scale-text" textAnchor="middle">50</text>
                <text x={cx + radius + 5} y={cy + 18} className="risk-meter__scale-text" textAnchor="middle">100</text>
            </svg>

            {/* Needle */}
            <div className="risk-meter__needle-container" style={{ left: cx, top: cy * 0.78 }}>
                <div
                    ref={needleRef}
                    className="risk-meter__needle"
                    style={{
                        width: radius * 0.75,
                        transform: `rotate(-90deg)`, // initial position — will animate
                    }}
                >
                    <div className="risk-meter__needle-tip" style={{ borderRightColor: color }} />
                </div>
                <div className="risk-meter__needle-dot" style={{ backgroundColor: color }} />
            </div>

            {/* Score display */}
            <div className="risk-meter__score" style={{ top: cy * 0.75 }}>
                <span className="risk-meter__score-value" style={{ color }}>
                    {clampedScore}
                </span>
                <span className="risk-meter__score-label">/ 100</span>
            </div>

            {/* Category badge */}
            <div className="risk-meter__category" style={{ borderColor: color, color }}>
                {category} Risk
            </div>
        </div>
    );
};

export default RiskMeter;
