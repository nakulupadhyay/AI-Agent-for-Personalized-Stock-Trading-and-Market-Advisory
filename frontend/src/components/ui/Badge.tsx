import type { Recommendation } from '@/types/stock.types';

interface RecommendationBadgeProps {
  value: Recommendation;
  size?: 'sm' | 'md' | 'lg';
}

const classMap: Record<Recommendation, string> = {
  BUY:  'badge-buy',
  SELL: 'badge-sell',
  HOLD: 'badge-hold',
};

const iconMap: Record<Recommendation, string> = {
  BUY:  '↑',
  SELL: '↓',
  HOLD: '→',
};

export function RecommendationBadge({ value, size = 'md' }: RecommendationBadgeProps) {
  const sizeClass = size === 'lg' ? 'text-sm px-4 py-1.5' : size === 'sm' ? 'text-[10px] px-2 py-0.5' : '';
  return (
    <span className={`${classMap[value]} ${sizeClass} inline-flex items-center gap-1`}>
      <span>{iconMap[value]}</span>
      {value}
    </span>
  );
}

interface StatusBadgeProps {
  value: string;
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'neutral';
}

const variantMap: Record<string, string> = {
  success: 'bg-bull/20 text-bull border-bull/30',
  danger:  'bg-bear/20 text-bear border-bear/30',
  warning: 'bg-hold/20 text-hold border-hold/30',
  info:    'bg-primary-500/20 text-primary-300 border-primary-500/30',
  neutral: 'bg-slate-700/40 text-slate-500 dark:text-slate-400 border-slate-600/30',
};

export function StatusBadge({ value, variant = 'neutral' }: StatusBadgeProps) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${variantMap[variant]}`}>
      {value}
    </span>
  );
}
