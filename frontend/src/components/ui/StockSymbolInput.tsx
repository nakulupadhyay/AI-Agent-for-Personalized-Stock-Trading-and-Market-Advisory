import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, TrendingUp } from 'lucide-react';

// ── Stock catalogue ──────────────────────────────────────────────────────────
const STOCK_CATALOGUE = [
  // Indian NSE
  { symbol: 'RELIANCE',   name: 'Reliance Industries Ltd' },
  { symbol: 'TCS',        name: 'Tata Consultancy Services' },
  { symbol: 'INFY',       name: 'Infosys Ltd' },
  { symbol: 'HDFCBANK',   name: 'HDFC Bank Ltd' },
  { symbol: 'WIPRO',      name: 'Wipro Ltd' },
  { symbol: 'ICICIBANK',  name: 'ICICI Bank Ltd' },
  { symbol: 'SBIN',       name: 'State Bank of India' },
  { symbol: 'AXISBANK',   name: 'Axis Bank Ltd' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { symbol: 'KOTAKBANK',  name: 'Kotak Mahindra Bank' },
  { symbol: 'LT',         name: 'Larsen & Toubro Ltd' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
  { symbol: 'ITC',        name: 'ITC Ltd' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd' },
  { symbol: 'MARUTI',     name: 'Maruti Suzuki India Ltd' },
  { symbol: 'SUNPHARMA',  name: 'Sun Pharmaceutical Ind.' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd' },
  { symbol: 'TATASTEEL',  name: 'Tata Steel Ltd' },
  { symbol: 'ONGC',       name: 'Oil & Natural Gas Corp.' },
  { symbol: 'POWERGRID',  name: 'Power Grid Corp of India' },
  { symbol: 'NTPC',       name: 'NTPC Ltd' },
  { symbol: 'TECHM',      name: 'Tech Mahindra Ltd' },
  { symbol: 'M&M',        name: 'Mahindra & Mahindra Ltd' },
  { symbol: 'TITAN',      name: 'Titan Company Ltd' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd' },
  { symbol: 'NESTLEIND',  name: 'Nestle India Ltd' },
  { symbol: 'DRREDDY',    name: "Dr Reddy's Laboratories" },
  { symbol: 'DIVISLAB',   name: "Divi's Laboratories Ltd" },
  { symbol: 'CIPLA',      name: 'Cipla Ltd' },
  // US
  { symbol: 'AAPL',  name: 'Apple Inc.' },
  { symbol: 'TSLA',  name: 'Tesla Inc.' },
  { symbol: 'NVDA',  name: 'NVIDIA Corporation' },
  { symbol: 'MSFT',  name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN',  name: 'Amazon.com Inc.' },
  { symbol: 'META',  name: 'Meta Platforms Inc.' },
  { symbol: 'NFLX',  name: 'Netflix Inc.' },
  { symbol: 'AMD',   name: 'Advanced Micro Devices' },
  { symbol: 'INTC',  name: 'Intel Corporation' },
  { symbol: 'PYPL',  name: 'PayPal Holdings Inc.' },
  { symbol: 'CRM',   name: 'Salesforce Inc.' },
  { symbol: 'UBER',  name: 'Uber Technologies Inc.' },
  { symbol: 'BABA',  name: 'Alibaba Group Holding' },
  { symbol: 'JPM',   name: 'JPMorgan Chase & Co.' },
  { symbol: 'V',     name: 'Visa Inc.' },
  { symbol: 'MA',    name: 'Mastercard Inc.' },
  { symbol: 'DIS',   name: 'The Walt Disney Company' },
  { symbol: 'BA',    name: 'Boeing Company' },
  { symbol: 'GS',    name: 'Goldman Sachs Group' },
];

interface StockEntry { symbol: string; name: string }

interface StockSymbolInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  /** Extra class applied to the wrapper div */
  wrapperClass?: string;
  autoFocus?: boolean;
  maxLength?: number;
  id?: string;
}

export function StockSymbolInput({
  value,
  onChange,
  placeholder = 'e.g. RELIANCE, AAPL, TSLA',
  className = '',
  wrapperClass = '',
  autoFocus = false,
  maxLength = 12,
  id,
}: StockSymbolInputProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ── Filter suggestions ────────────────────────────────────────────────────
  const suggestions: StockEntry[] = value.trim().length === 0
    ? []
    : STOCK_CATALOGUE.filter(
        (s) =>
          s.symbol.includes(value.trim().toUpperCase()) ||
          s.name.toUpperCase().includes(value.trim().toUpperCase())
      ).slice(0, 8);

  const showDropdown = focused && suggestions.length > 0;

  // ── Keyboard navigation ───────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!showDropdown) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted((h) => Math.min(h + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted((h) => Math.max(h - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (suggestions[highlighted]) {
          onChange(suggestions[highlighted].symbol);
          setOpen(false);
          inputRef.current?.blur();
        }
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    },
    [showDropdown, suggestions, highlighted, onChange]
  );

  // Reset highlight when suggestions change
  useEffect(() => { setHighlighted(0); }, [value]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (listRef.current) {
      const item = listRef.current.children[highlighted] as HTMLElement | undefined;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (symbol: string) => {
    onChange(symbol);
    setOpen(false);
    setFocused(false);
    inputRef.current?.blur();
  };

  // Highlight matched chars in text
  const highlight = (text: string, query: string) => {
    const idx = text.toUpperCase().indexOf(query.toUpperCase());
    if (idx === -1 || !query) return <span>{text}</span>;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-primary-500/25 text-primary-300 rounded-sm px-0.5">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className={`relative ${wrapperClass}`}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        autoFocus={autoFocus}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`form-input ${className}`}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setOpen(true);
        }}
        onFocus={() => { setFocused(true); setOpen(true); }}
        onKeyDown={handleKeyDown}
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="stock-suggestions-list"
        aria-activedescendant={showDropdown ? `stock-suggestion-${highlighted}` : undefined}
      />

      {/* Dropdown */}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-full mt-1.5 z-50
                     bg-white dark:bg-dark-100
                     border border-slate-200 dark:border-slate-700/70
                     rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.18)]
                     backdrop-blur-md overflow-hidden"
          role="listbox"
          aria-label="Stock suggestions"
        >
          {/* Header */}
          <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-1.5">
            <Search size={12} className="text-primary-400" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              Suggestions
            </span>
          </div>

          <ul ref={listRef} id="stock-suggestions-list" className="max-h-56 overflow-y-auto py-1" role="listbox">
            {suggestions.map((s, i) => (
              <li
                key={s.symbol}
                id={`stock-suggestion-${i}`}
                role="option"
                aria-selected={i === highlighted}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(s.symbol); }}
                onMouseEnter={() => setHighlighted(i)}
                className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors
                  ${i === highlighted
                    ? 'bg-primary-500/10 dark:bg-primary-500/15'
                    : 'hover:bg-slate-50 dark:hover:bg-dark-200/60'}`}
              >
                {/* Icon bubble */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black
                  ${i === highlighted
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'bg-slate-100 dark:bg-dark-200 text-slate-500 dark:text-slate-400'}`}>
                  <TrendingUp size={14} />
                </div>

                {/* Text */}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-bold leading-none ${i === highlighted ? 'text-primary-400' : 'text-slate-900 dark:text-white'}`}>
                    {highlight(s.symbol, value.trim())}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 leading-none">
                    {highlight(s.name, value.trim())}
                  </p>
                </div>

                {/* Keyboard hint on highlighted */}
                {i === highlighted && (
                  <kbd className="hidden sm:flex items-center gap-0.5 text-[9px] text-slate-400 border border-slate-300 dark:border-slate-700 rounded px-1 py-0.5 font-mono flex-shrink-0">
                    ↵
                  </kbd>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
