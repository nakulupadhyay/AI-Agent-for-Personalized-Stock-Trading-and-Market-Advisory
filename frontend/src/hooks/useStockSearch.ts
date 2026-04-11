import { useState, useCallback, useEffect } from 'react';
import api from '@/services/api';
import type { StockPrediction } from '@/types/stock.types';
import { useDebounce } from './useDebounce';

interface UseStockSearchReturn {
  query: string;
  setQuery: (q: string) => void;
  result: StockPrediction | null;
  isLoading: boolean;
  error: string | null;
  reset: () => void;
}

/**
 * Debounced stock search — calls GET /api/stocks/:symbol
 * only after the user stops typing for 600ms.
 */
export function useStockSearch(): UseStockSearchReturn {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<StockPrediction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debouncedQuery = useDebounce(query.trim().toUpperCase(), 600);

  const fetchStock = useCallback(async (symbol: string) => {
    if (!symbol || symbol.length < 1) return;
    setIsLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/stocks/${symbol}`);
      // Map backend response to StockPrediction shape
      setResult({
        symbol: data.symbol || symbol,
        price: data.price ?? data.currentPrice ?? 0,
        recommendation: data.recommendation ?? data.signal ?? 'HOLD',
        confidence: data.confidence ?? 0.5,
        reasoning: data.reasoning ?? data.analysis,
        targetPrice: data.targetPrice,
        stopLoss: data.stopLoss,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        `Could not fetch data for "${symbol}"`;
      setError(msg);
      setResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debouncedQuery.length >= 1) {
      fetchStock(debouncedQuery);
    } else {
      setResult(null);
      setError(null);
    }
  }, [debouncedQuery, fetchStock]);

  const reset = useCallback(() => {
    setQuery('');
    setResult(null);
    setError(null);
  }, []);

  return { query, setQuery, result, isLoading, error, reset };
}
