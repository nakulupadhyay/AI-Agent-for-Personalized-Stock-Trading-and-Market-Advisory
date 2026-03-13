import React from 'react';

/**
 * Reusable Loading Skeleton Components
 * Uses CSS classes from index.css skeleton system
 */

export const SkeletonText = ({ width = '100%', lines = 1 }) => (
    <div style={{ width }}>
        {Array.from({ length: lines }).map((_, i) => (
            <div key={i} className="skeleton skeleton-text"
                style={{ width: i === lines - 1 && lines > 1 ? '60%' : '100%' }} />
        ))}
    </div>
);

export const SkeletonTitle = ({ width = '60%' }) => (
    <div className="skeleton skeleton-title" style={{ width }} />
);

export const SkeletonCard = ({ height = 140, count = 1 }) => (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card"
                style={{ height, flex: '1 1 200px', minWidth: 200 }} />
        ))}
    </div>
);

export const SkeletonChart = ({ height = 200 }) => (
    <div className="skeleton skeleton-chart" style={{ height }} />
);

export const SkeletonTable = ({ rows = 5, cols = 4 }) => (
    <div>
        <div className="skeleton" style={{ height: 40, marginBottom: 8, borderRadius: 8 }} />
        {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="skeleton skeleton-row" />
        ))}
    </div>
);

export const SkeletonStatCards = ({ count = 4 }) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(220px, 1fr))`, gap: '1rem' }}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="skeleton skeleton-card" style={{ height: 120 }} />
        ))}
    </div>
);

/**
 * Full Dashboard Skeleton
 */
export const DashboardSkeleton = () => (
    <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <SkeletonTitle width="30%" />
        <SkeletonStatCards count={4} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <SkeletonChart height={300} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <SkeletonCard height={140} />
                <SkeletonCard height={140} />
            </div>
        </div>
        <SkeletonTable rows={5} />
    </div>
);

export default {
    SkeletonText,
    SkeletonTitle,
    SkeletonCard,
    SkeletonChart,
    SkeletonTable,
    SkeletonStatCards,
    DashboardSkeleton,
};
