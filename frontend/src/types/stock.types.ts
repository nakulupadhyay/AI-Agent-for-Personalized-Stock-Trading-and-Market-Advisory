// ─── Stock Types ──────────────────────────────────────────────────────────────

export type Recommendation = 'BUY' | 'SELL' | 'HOLD';

export interface StockQuote {
  symbol: string;
  name?: string;
  price: number;
  change?: number;
  changePercent?: number;
  volume?: number;
  marketCap?: number;
  high52?: number;
  low52?: number;
}

export interface StockPrediction {
  symbol: string;
  price: number;
  recommendation: Recommendation;
  confidence: number;
  reasoning?: string;
  targetPrice?: number;
  stopLoss?: number;
}

export interface StockDecision {
  symbol: string;
  action: Recommendation;
  confidence: number;
  currentPrice: number;
  targetPrice?: number;
  stopLoss?: number;
  reasoning: string;
  indicators?: {
    rsi?: number;
    macd?: string;
    trend?: string;
  };
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  type: string;
  region?: string;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ChartDataPoint {
  date: string;
  price: number;
  volume?: number;
}
