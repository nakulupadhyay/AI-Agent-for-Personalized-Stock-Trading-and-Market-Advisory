# """
# ml_service/services/stock_data_service.py
# ──────────────────────────────────────────
# Fetches stock data using yfinance (Yahoo Finance).
#   • No API key required
#   • Supports US stocks, Indian stocks (.NS/.BO), crypto (-USD), indices (^)
#   • Returns clean dicts / DataFrames ready for ML models

# Data provider choice: yfinance
#   ✓ Free, no key needed, 15+ years of daily history
#   ✓ Live price snapshots, dividends, earnings, news
#   ✓ Supports 50,000+ global symbols
# """

# import yfinance as yf
# import pandas as pd
# import numpy as np
# from datetime import datetime
# from utils.helpers import safe_float, safe_int, clean_df_for_json
# from utils.config import settings


# # ─────────────────────────────────────────────
# # Live Quote
# # ─────────────────────────────────────────────

# def get_live_quote(ticker: str) -> dict:
#     """
#     Fetch the real-time price snapshot for a ticker.

#     Returns a standardised dict with all the key metrics
#     needed for the frontend stock snapshot panel.
#     """
#     stock = yf.Ticker(ticker)
#     # info  = stock.info
#     fi = stock.fast_info
#     current_price = getattr(fi, "last_price", None)
#     # yfinance returns different keys depending on asset type
#     # current_price = (
#     #     info.get("currentPrice") or
#     #     info.get("regularMarketPrice") or
#     #     info.get("navPrice") or        # for ETFs
#     #     info.get("ask")
#     # )

#     return {
#         "ticker"         : ticker.upper(),
#         "company_name"   : info.get("longName") or info.get("shortName") or ticker,
#         "currency"       : info.get("currency", "USD"),
#         "exchange"       : info.get("fullExchangeName") or info.get("exchange", "N/A"),
#         "sector"         : info.get("sector", "N/A"),
#         "industry"       : info.get("industry", "N/A"),
#         "current_price"  : safe_float(current_price),
#         "previous_close" : safe_float(info.get("previousClose") or info.get("regularMarketPreviousClose")),
#         "open"           : safe_float(info.get("open") or info.get("regularMarketOpen")),
#         "day_high"       : safe_float(info.get("dayHigh") or info.get("regularMarketDayHigh")),
#         "day_low"        : safe_float(info.get("dayLow") or info.get("regularMarketDayLow")),
#         "volume"         : safe_int(info.get("volume") or info.get("regularMarketVolume")),
#         "avg_volume"     : safe_int(info.get("averageVolume")),
#         "market_cap"     : safe_float(info.get("marketCap")),
#         "pe_ratio"       : safe_float(info.get("trailingPE")),
#         "forward_pe"     : safe_float(info.get("forwardPE")),
#         "eps"            : safe_float(info.get("trailingEps")),
#         "week_52_high"   : safe_float(info.get("fiftyTwoWeekHigh")),
#         "week_52_low"    : safe_float(info.get("fiftyTwoWeekLow")),
#         "beta"           : safe_float(info.get("beta")),
#         "dividend_yield" : safe_float(info.get("dividendYield")),
#         "book_value"     : safe_float(info.get("bookValue")),
#         "price_to_book"  : safe_float(info.get("priceToBook")),
#         "description"    : (info.get("longBusinessSummary") or "")[:300],
#     }


# # ─────────────────────────────────────────────
# # Historical OHLCV Data
# # ─────────────────────────────────────────────

# def get_historical_data(ticker: str, period: str = "6mo") -> pd.DataFrame:
#     """
#     Download daily OHLCV history from Yahoo Finance.

#     Parameters
#     ──────────
#     ticker : stock symbol
#     period : "1mo" | "3mo" | "6mo" | "1y" | "2y"

#     Returns
#     ───────
#     pd.DataFrame with columns:
#         date, open, high, low, close, volume
#     Index is a clean RangeIndex (not DatetimeIndex) for easy JSON serialisation.
#     """
#     stock = yf.Ticker(ticker)
#     df = yf.download(ticker, period="6mo", progress=False, threads=False)

#     if df.empty:
#         raise ValueError(
#             f"No historical data for '{ticker}'. "
#             "Check the symbol — try adding .NS for Indian stocks or -USD for crypto."
#         )

#     df.index = pd.to_datetime(df.index)
#     df.sort_index(inplace=True)

#     # Rename to snake_case and keep only the columns we need
#     df = df.rename(columns={
#         "Open"  : "open",
#         "High"  : "high",
#         "Low"   : "low",
#         "Close" : "close",
#         "Volume": "volume",
#     })[["open", "high", "low", "close", "volume"]]

#     # Add date column from index
#     df["date"] = df.index.strftime("%Y-%m-%d")
#     df.reset_index(drop=True, inplace=True)

#     return df


# def get_historical_with_indicators(ticker: str, period: str = "6mo") -> pd.DataFrame:
#     """
#     Download OHLCV history and add technical indicators:
#       • SMA-20, SMA-50  (simple moving averages)
#       • EMA-12, EMA-26  (exponential moving averages)
#       • RSI-14          (relative strength index)
#       • MACD, Signal    (moving average convergence divergence)
#       • BB_upper/lower  (Bollinger Bands, 20-day, 2σ)
#       • Daily return %

#     Returns a clean DataFrame ready for JSON serialisation.
#     """
#     df = get_historical_data(ticker, period)

#     closes = df["close"]

#     # ── Simple Moving Averages ──
#     df[f"sma_{settings.SMA_SHORT}"] = closes.rolling(settings.SMA_SHORT).mean().round(4)
#     df[f"sma_{settings.SMA_LONG}"]  = closes.rolling(settings.SMA_LONG).mean().round(4)

#     # ── Exponential Moving Averages ──
#     df["ema_12"] = closes.ewm(span=12, adjust=False).mean().round(4)
#     df["ema_26"] = closes.ewm(span=26, adjust=False).mean().round(4)

#     # ── MACD ──
#     df["macd"]        = (df["ema_12"] - df["ema_26"]).round(4)
#     df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean().round(4)
#     df["macd_hist"]   = (df["macd"] - df["macd_signal"]).round(4)

#     # ── RSI-14 ──
#     delta  = closes.diff()
#     gain   = delta.clip(lower=0)
#     loss   = -delta.clip(upper=0)
#     avg_g  = gain.rolling(14).mean()
#     avg_l  = loss.rolling(14).mean()
#     rs     = avg_g / avg_l.replace(0, np.nan)
#     df["rsi_14"] = (100 - (100 / (1 + rs))).round(2)

#     # ── Bollinger Bands (20-day, 2σ) ──
#     sma20        = closes.rolling(20).mean()
#     std20        = closes.rolling(20).std()
#     df["bb_upper"] = (sma20 + 2 * std20).round(4)
#     df["bb_lower"] = (sma20 - 2 * std20).round(4)
#     df["bb_mid"]   = sma20.round(4)

#     # ── Daily Return % ──
#     df["daily_return"] = closes.pct_change().mul(100).round(4)

#     return df


# def get_ohlcv_for_json(ticker: str, period: str = "6mo") -> list:
#     """Convenience: returns the full indicator DataFrame as JSON-safe list of dicts."""
#     df = get_historical_with_indicators(ticker, period)
#     return clean_df_for_json(df)


# import time
# import random
# import requests
# import yfinance as yf
# import pandas as pd
# import numpy as np
# from utils.helpers import safe_float, safe_int, clean_df_for_json
# from utils.config import settings

# try:
#     from curl_cffi import requests as curl_requests
#     _CURL_AVAILABLE = True
# except ImportError:
#     _CURL_AVAILABLE = False

# def _make_session():
#     if _CURL_AVAILABLE:
#         return curl_requests.Session(impersonate="chrome110")
#     s = requests.Session()
#     s.headers.update({"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"})
#     return s

# _CACHE: dict = {}
# _CACHE_TTL = 180

# def _cached(key):
#     entry = _CACHE.get(key)
#     if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
#         return entry["data"]
#     return None

# def _cache_set(key, data):
#     _CACHE[key] = {"data": data, "ts": time.time()}
#     return data

# def _retry(fn, retries=3, base_delay=3.0):
#     last_err = None
#     for attempt in range(retries):
#         try:
#             return fn()
#         except Exception as e:
#             last_err = e
#             delay = base_delay * (2 ** attempt) + random.uniform(0.5, 2.0)
#             print(f"[stock_data] Attempt {attempt+1} failed: {e}. Waiting {delay:.1f}s…")
#             time.sleep(delay)
#     raise last_err

# def get_live_quote(ticker: str) -> dict:
#     ck = f"quote:{ticker}"
#     cached = _cached(ck)
#     if cached:
#         return cached

#     def _fetch():
#         session = _make_session()
#         df = yf.download(
#             ticker, period="5d", interval="1d",
#             auto_adjust=True, progress=False,
#             threads=False, session=session,
#         )
#         if df.empty:
#             raise ValueError(f"No data for '{ticker}'. Check the ticker symbol.")
#         if isinstance(df.columns, pd.MultiIndex):
#             df.columns = df.columns.get_level_values(0)
#         df.sort_index(inplace=True)

#         current_price = safe_float(df["Close"].iloc[-1])
#         prev_close    = safe_float(df["Close"].iloc[-2]) if len(df) > 1 else None
#         day_high      = safe_float(df["High"].iloc[-1])
#         day_low       = safe_float(df["Low"].iloc[-1])
#         volume        = safe_int(df["Volume"].iloc[-1])

#         company_name = ticker.upper()
#         market_cap = week_52_high = week_52_low = avg_volume = None
#         currency = "USD"; exchange = "N/A"
#         try:
#             stock = yf.Ticker(ticker, session=session)
#             fi = stock.fast_info
#             company_name = getattr(fi, "long_name", None) or getattr(fi, "shortName", None) or ticker.upper()
#             market_cap   = safe_float(getattr(fi, "market_cap", None))
#             week_52_high = safe_float(getattr(fi, "year_high", None))
#             week_52_low  = safe_float(getattr(fi, "year_low", None))
#             currency     = str(getattr(fi, "currency", "USD") or "USD")
#             exchange     = str(getattr(fi, "exchange", "N/A") or "N/A")
#             avg_volume   = safe_int(getattr(fi, "three_month_average_volume", None))
#         except Exception:
#             pass

#         if current_price is None:
#             raise ValueError(f"Could not read price for '{ticker}'.")

#         return {
#             "ticker": ticker.upper(), "company_name": company_name,
#             "currency": currency, "exchange": exchange,
#             "sector": "N/A", "industry": "N/A",
#             "current_price": current_price, "previous_close": prev_close,
#             "open": safe_float(df["Open"].iloc[-1]),
#             "day_high": day_high, "day_low": day_low,
#             "volume": volume, "avg_volume": avg_volume,
#             "market_cap": market_cap, "pe_ratio": None,
#             "forward_pe": None, "eps": None,
#             "week_52_high": week_52_high, "week_52_low": week_52_low,
#             "beta": None, "dividend_yield": None,
#             "book_value": None, "price_to_book": None, "description": "",
#         }

#     return _cache_set(ck, _retry(_fetch))

# def get_historical_data(ticker: str, period: str = "6mo") -> pd.DataFrame:
#     ck = f"hist:{ticker}:{period}"
#     cached = _cached(ck)
#     if cached is not None:
#         return cached

#     def _fetch():
#         session = _make_session()
#         time.sleep(0.3)
#         df = yf.download(
#             ticker, period=period, interval="1d",
#             auto_adjust=True, progress=False,
#             threads=False, session=session,
#         )
#         if df.empty:
#             raise ValueError(f"No historical data for '{ticker}' (period={period}).")
#         if isinstance(df.columns, pd.MultiIndex):
#             df.columns = df.columns.get_level_values(0)
#         df.sort_index(inplace=True)
#         df = df.rename(columns={"Open":"open","High":"high","Low":"low","Close":"close","Volume":"volume"})
#         keep = [c for c in ["open","high","low","close","volume"] if c in df.columns]
#         df = df[keep].copy()
#         df["date"] = pd.to_datetime(df.index).strftime("%Y-%m-%d")
#         df.reset_index(drop=True, inplace=True)
#         return df

#     return _cache_set(ck, _retry(_fetch))

# def get_historical_with_indicators(ticker: str, period: str = "6mo") -> pd.DataFrame:
#     df = get_historical_data(ticker, period)
#     closes = df["close"]
#     df["sma_20"]      = closes.rolling(20).mean().round(4)
#     df["sma_50"]      = closes.rolling(50).mean().round(4)
#     df["ema_12"]      = closes.ewm(span=12, adjust=False).mean().round(4)
#     df["ema_26"]      = closes.ewm(span=26, adjust=False).mean().round(4)
#     df["macd"]        = (df["ema_12"] - df["ema_26"]).round(4)
#     df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean().round(4)
#     df["macd_hist"]   = (df["macd"] - df["macd_signal"]).round(4)
#     delta             = closes.diff()
#     avg_g             = delta.clip(lower=0).ewm(com=13, adjust=False).mean()
#     avg_l             = (-delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
#     rs                = avg_g / avg_l.replace(0, np.nan)
#     df["rsi_14"]      = (100 - (100 / (1 + rs))).round(2)
#     sma20             = closes.rolling(20).mean()
#     std20             = closes.rolling(20).std()
#     df["bb_upper"]    = (sma20 + 2 * std20).round(4)
#     df["bb_lower"]    = (sma20 - 2 * std20).round(4)
#     df["bb_mid"]      = sma20.round(4)
#     df["daily_return"]= closes.pct_change().mul(100).round(4)
#     return df

# def get_ohlcv_for_json(ticker: str, period: str = "6mo") -> list:
#     df = get_historical_with_indicators(ticker, period)
#     return clean_df_for_json(df)

# """
# stock_data_service.py
# Uses Alpha Vantage API as primary data source (reliable, never blocks).
# Set ALPHA_VANTAGE_KEY in ml_service/.env
# """

# import time
# import requests
# import pandas as pd
# import numpy as np
# from utils.helpers import safe_float, safe_int, clean_df_for_json
# from utils.config import settings

# BASE = "https://www.alphavantage.co/query"

# def _get(params: dict) -> dict:
#     """Make a call to Alpha Vantage API."""
#     params["apikey"] = settings.ALPHA_VANTAGE_KEY
#     r = requests.get(BASE, params=params, timeout=15)
#     r.raise_for_status()
#     data = r.json()
#     if "Note" in data:
#         raise RuntimeError("Alpha Vantage rate limit hit (5/min, 25/day free). Wait 1 minute.")
#     if "Error Message" in data:
#         raise ValueError(f"Alpha Vantage error: {data['Error Message']}")
#     if "Information" in data:
#         raise RuntimeError(data["Information"])
#     return data

# # ── In-process cache ──
# _CACHE: dict = {}
# _CACHE_TTL = 300  # 5 minutes

# def _cached(key):
#     entry = _CACHE.get(key)
#     if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
#         return entry["data"]
#     return None

# def _cache_set(key, data):
#     _CACHE[key] = {"data": data, "ts": time.time()}
#     return data


# def get_live_quote(ticker: str) -> dict:
#     """Fetch live price via Alpha Vantage GLOBAL_QUOTE endpoint."""
#     ck = f"quote:{ticker}"
#     if _cached(ck):
#         return _cached(ck)

#     data  = _get({"function": "GLOBAL_QUOTE", "symbol": ticker})
#     q     = data.get("Global Quote", {})

#     if not q or not q.get("05. price"):
#         raise ValueError(
#             f"No data for '{ticker}'. "
#             "Check the ticker symbol. For Indian stocks use BSE/NSE symbol e.g. RELIANCE.BSE"
#         )

#     current_price = safe_float(q.get("05. price"))
#     prev_close    = safe_float(q.get("08. previous close"))
#     change        = safe_float(q.get("09. change"))
#     change_pct    = q.get("10. change percent", "0%").replace("%", "")

#     # Get company name from OVERVIEW (costs 1 extra API call — cached 5 min)
#     company_name = ticker.upper()
#     market_cap = pe_ratio = week_52_high = week_52_low = beta = None
#     sector = "N/A"; exchange = "N/A"

#     try:
#         ov = _get({"function": "OVERVIEW", "symbol": ticker})
#         company_name = ov.get("Name", ticker.upper())
#         market_cap   = safe_float(ov.get("MarketCapitalization"))
#         pe_ratio     = safe_float(ov.get("PERatio"))
#         week_52_high = safe_float(ov.get("52WeekHigh"))
#         week_52_low  = safe_float(ov.get("52WeekLow"))
#         beta         = safe_float(ov.get("Beta"))
#         sector       = ov.get("Sector", "N/A")
#         exchange     = ov.get("Exchange", "N/A")
#         currency     = "USD"
#     except Exception:
#         currency = "USD"

#     result = {
#         "ticker"        : ticker.upper(),
#         "company_name"  : company_name,
#         "currency"      : currency,
#         "exchange"      : exchange,
#         "sector"        : sector,
#         "industry"      : "N/A",
#         "current_price" : current_price,
#         "previous_close": prev_close,
#         "open"          : safe_float(q.get("02. open")),
#         "day_high"      : safe_float(q.get("03. high")),
#         "day_low"       : safe_float(q.get("04. low")),
#         "volume"        : safe_int(q.get("06. volume")),
#         "avg_volume"    : None,
#         "market_cap"    : market_cap,
#         "pe_ratio"      : pe_ratio,
#         "forward_pe"    : None,
#         "eps"           : None,
#         "week_52_high"  : week_52_high,
#         "week_52_low"   : week_52_low,
#         "beta"          : beta,
#         "dividend_yield": None,
#         "book_value"    : None,
#         "price_to_book" : None,
#         "description"   : "",
#     }
#     return _cache_set(ck, result)


# def get_historical_data(ticker: str, period: str = "6mo") -> pd.DataFrame:
#     """
#     Fetch daily OHLCV via Alpha Vantage TIME_SERIES_DAILY.
#     outputsize=compact = last 100 days (enough for 6mo).
#     outputsize=full    = up to 20 years (for 1y, 2y periods).
#     """
#     ck = f"hist:{ticker}:{period}"
#     if _cached(ck) is not None:
#         return _cached(ck)

#     output_size = "full" if period in ("1y", "2y") else "compact"

#     data = _get({
#         "function"  : "TIME_SERIES_DAILY",
#         "symbol"    : ticker,
#         "outputsize": output_size,
#     })

#     ts = data.get("Time Series (Daily)", {})
#     if not ts:
#         raise ValueError(f"No historical data for '{ticker}'.")

#     rows = []
#     for date_str, vals in sorted(ts.items()):
#         rows.append({
#             "date"  : date_str,
#             "open"  : safe_float(vals.get("1. open")),
#             "high"  : safe_float(vals.get("2. high")),
#             "low"   : safe_float(vals.get("3. low")),
#             "close" : safe_float(vals.get("4. close")),  # adjusted close
#             "volume": safe_int(vals.get("6. volume")),
#         })

#     df = pd.DataFrame(rows)
#     df["date"] = pd.to_datetime(df["date"])
#     df.sort_values("date", inplace=True)

#     # Filter by period
#     period_days = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730}
#     days = period_days.get(period, 180)
#     cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)
#     df = df[df["date"] >= cutoff].copy()

#     df["date"] = df["date"].dt.strftime("%Y-%m-%d")
#     df.reset_index(drop=True, inplace=True)

#     return _cache_set(ck, df)


# def get_historical_with_indicators(ticker: str, period: str = "6mo") -> pd.DataFrame:
#     """Add technical indicators to OHLCV data."""
#     df = get_historical_data(ticker, period)
#     closes = df["close"]

#     df["sma_20"]      = closes.rolling(20).mean().round(4)
#     df["sma_50"]      = closes.rolling(50).mean().round(4)
#     df["ema_12"]      = closes.ewm(span=12, adjust=False).mean().round(4)
#     df["ema_26"]      = closes.ewm(span=26, adjust=False).mean().round(4)
#     df["macd"]        = (df["ema_12"] - df["ema_26"]).round(4)
#     df["macd_signal"] = df["macd"].ewm(span=9, adjust=False).mean().round(4)
#     df["macd_hist"]   = (df["macd"] - df["macd_signal"]).round(4)

#     delta             = closes.diff()
#     avg_g             = delta.clip(lower=0).ewm(com=13, adjust=False).mean()
#     avg_l             = (-delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
#     rs                = avg_g / avg_l.replace(0, np.nan)
#     df["rsi_14"]      = (100 - (100 / (1 + rs))).round(2)

#     sma20             = closes.rolling(20).mean()
#     std20             = closes.rolling(20).std()
#     df["bb_upper"]    = (sma20 + 2 * std20).round(4)
#     df["bb_lower"]    = (sma20 - 2 * std20).round(4)
#     df["bb_mid"]      = sma20.round(4)
#     df["daily_return"]= closes.pct_change().mul(100).round(4)
#     return df


# def get_ohlcv_for_json(ticker: str, period: str = "6mo") -> list:
#     df = get_historical_with_indicators(ticker, period)
#     return clean_df_for_json(df)

"""
stock_data_service.py
Handles US stocks, Indian stocks, Crypto, Forex via Alpha Vantage.
Different asset types use different AV endpoints and symbol formats.
"""

import time
import requests
import pandas as pd
import numpy as np
from utils.helpers import safe_float, safe_int, clean_df_for_json
from utils.config import settings

BASE = "https://www.alphavantage.co/query"

# ── Symbol mapping (Yahoo format → Alpha Vantage format) ──────
# Add more mappings here as needed
SYMBOL_MAP = {
    # Crypto (Yahoo: BTC-USD → AV: BTC)
    "BTC-USD" : ("crypto", "BTC",      "USD"),
    "ETH-USD" : ("crypto", "ETH",      "USD"),
    "BNB-USD" : ("crypto", "BNB",      "USD"),
    "SOL-USD" : ("crypto", "SOL",      "USD"),
    "XRP-USD" : ("crypto", "XRP",      "USD"),
    "ADA-USD" : ("crypto", "ADA",      "USD"),
    "DOGE-USD": ("crypto", "DOGE",     "USD"),
    "AVAX-USD": ("crypto", "AVAX",     "USD"),
    "DOT-USD" : ("crypto", "DOT",      "USD"),
    "MATIC-USD":("crypto", "MATIC",    "USD"),

    # Indian Stocks (Yahoo: RELIANCE.NS → AV: RELIANCE.BSE)
    "RELIANCE.NS" : ("stock", "RELIANCE.BSE", None),
    "TCS.NS"      : ("stock", "TCS.BSE",      None),
    "INFY.NS"     : ("stock", "INFY.BSE",     None),
    "HDFCBANK.NS" : ("stock", "HDFCBANK.BSE", None),
    "WIPRO.NS"    : ("stock", "WIPRO.BSE",    None),
    "ICICIBANK.NS": ("stock", "ICICIBANK.BSE",None),
    "SBIN.NS"     : ("stock", "SBIN.BSE",     None),
    "BAJFINANCE.NS":("stock", "BAJFINANCE.BSE",None),
    "HINDUNILVR.NS":("stock", "HINDUNILVR.BSE",None),
    "KOTAKBANK.NS" :("stock", "KOTAKBANK.BSE", None),

    # Forex
    "EURUSD=X": ("forex", "EUR", "USD"),
    "GBPUSD=X": ("forex", "GBP", "USD"),
    "USDJPY=X": ("forex", "USD", "JPY"),
    "USDINR=X": ("forex", "USD", "INR"),
}


def _resolve_symbol(ticker: str):
    """
    Returns (asset_type, av_symbol, extra)
    asset_type: 'stock' | 'crypto' | 'forex'
    """
    t = ticker.upper().strip()

    # Check direct mapping first
    if t in SYMBOL_MAP:
        return SYMBOL_MAP[t]

    # Auto-detect crypto: ends with -USD, -USDT, -BTC
    if any(t.endswith(s) for s in ["-USD", "-USDT", "-BTC", "-ETH"]):
        parts = t.split("-")
        from_sym = parts[0]
        to_sym   = parts[1] if len(parts) > 1 else "USD"
        return ("crypto", from_sym, to_sym)

    # Auto-detect Indian stocks: ends with .NS or .BO
    if t.endswith(".NS"):
        bse_sym = t.replace(".NS", ".BSE")
        return ("stock", bse_sym, None)
    if t.endswith(".BO"):
        bse_sym = t.replace(".BO", ".BSE")
        return ("stock", bse_sym, None)

    # Default: treat as US stock
    return ("stock", t, None)


# ── API caller ────────────────────────────────────────────────

def _get(params: dict) -> dict:
    params["apikey"] = settings.ALPHA_VANTAGE_KEY
    r = requests.get(BASE, params=params, timeout=15)
    r.raise_for_status()
    data = r.json()
    if "Note" in data:
        raise RuntimeError("Alpha Vantage rate limit (5/min, 25/day). Wait 1 minute.")
    if "Error Message" in data:
        raise ValueError(f"Alpha Vantage: {data['Error Message']}")
    if "Information" in data:
        raise RuntimeError(data["Information"])
    return data


# ── Cache ─────────────────────────────────────────────────────

_CACHE: dict = {}
_CACHE_TTL   = 300  # 5 minutes

def _cached(key):
    entry = _CACHE.get(key)
    if entry and (time.time() - entry["ts"]) < _CACHE_TTL:
        return entry["data"]
    return None

def _cache_set(key, data):
    _CACHE[key] = {"data": data, "ts": time.time()}
    return data


# ─────────────────────────────────────────────
# Live Quote
# ─────────────────────────────────────────────

def get_live_quote(ticker: str) -> dict:
    ck = f"quote:{ticker}"
    if _cached(ck):
        return _cached(ck)

    asset_type, av_symbol, extra = _resolve_symbol(ticker)

    if asset_type == "crypto":
        result = _get_crypto_quote(ticker, av_symbol, extra or "USD")
    elif asset_type == "forex":
        result = _get_forex_quote(ticker, av_symbol, extra or "USD")
    else:
        result = _get_stock_quote(ticker, av_symbol)

    return _cache_set(ck, result)


def _get_stock_quote(ticker: str, av_symbol: str) -> dict:
    """US stocks and Indian stocks via GLOBAL_QUOTE."""
    data = _get({"function": "GLOBAL_QUOTE", "symbol": av_symbol})
    q    = data.get("Global Quote", {})

    if not q or not q.get("05. price"):
        raise ValueError(
            f"No data for '{ticker}' (tried Alpha Vantage symbol '{av_symbol}'). "
            "For Indian stocks use format: RELIANCE.NS, TCS.NS, INFY.NS"
        )

    # Get extra info from OVERVIEW
    company_name = av_symbol
    market_cap = pe_ratio = week_52_high = week_52_low = beta = None
    sector = exchange = "N/A"
    try:
        ov = _get({"function": "OVERVIEW", "symbol": av_symbol})
        company_name = ov.get("Name", av_symbol)
        market_cap   = safe_float(ov.get("MarketCapitalization"))
        pe_ratio     = safe_float(ov.get("PERatio"))
        week_52_high = safe_float(ov.get("52WeekHigh"))
        week_52_low  = safe_float(ov.get("52WeekLow"))
        beta         = safe_float(ov.get("Beta"))
        sector       = ov.get("Sector", "N/A")
        exchange     = ov.get("Exchange", "N/A")
    except Exception:
        pass

    return {
        "ticker"        : ticker.upper(),
        "company_name"  : company_name,
        "currency"      : "USD",
        "exchange"      : exchange,
        "sector"        : sector,
        "industry"      : "N/A",
        "current_price" : safe_float(q.get("05. price")),
        "previous_close": safe_float(q.get("08. previous close")),
        "open"          : safe_float(q.get("02. open")),
        "day_high"      : safe_float(q.get("03. high")),
        "day_low"       : safe_float(q.get("04. low")),
        "volume"        : safe_int(q.get("06. volume")),
        "avg_volume"    : None,
        "market_cap"    : market_cap,
        "pe_ratio"      : pe_ratio,
        "forward_pe"    : None,
        "eps"           : None,
        "week_52_high"  : week_52_high,
        "week_52_low"   : week_52_low,
        "beta"          : beta,
        "dividend_yield": None,
        "book_value"    : None,
        "price_to_book" : None,
        "description"   : "",
    }


def _get_crypto_quote(ticker: str, from_sym: str, to_sym: str) -> dict:
    """Crypto via CURRENCY_EXCHANGE_RATE."""
    data = _get({
        "function"       : "CURRENCY_EXCHANGE_RATE",
        "from_currency"  : from_sym,
        "to_currency"    : to_sym,
    })

    rate = data.get("Realtime Currency Exchange Rate", {})
    if not rate:
        raise ValueError(
            f"No crypto data for '{ticker}'. "
            "Supported: BTC-USD, ETH-USD, BNB-USD, SOL-USD, XRP-USD, DOGE-USD"
        )

    current_price = safe_float(rate.get("5. Exchange Rate"))

    return {
        "ticker"        : ticker.upper(),
        "company_name"  : f"{from_sym} / {to_sym}",
        "currency"      : to_sym,
        "exchange"      : "Crypto",
        "sector"        : "Cryptocurrency",
        "industry"      : "Digital Assets",
        "current_price" : current_price,
        "previous_close": None,
        "open"          : None,
        "day_high"      : None,
        "day_low"       : None,
        "volume"        : None,
        "avg_volume"    : None,
        "market_cap"    : None,
        "pe_ratio"      : None,
        "forward_pe"    : None,
        "eps"           : None,
        "week_52_high"  : None,
        "week_52_low"   : None,
        "beta"          : None,
        "dividend_yield": None,
        "book_value"    : None,
        "price_to_book" : None,
        "description"   : "",
    }


def _get_forex_quote(ticker: str, from_sym: str, to_sym: str) -> dict:
    """Forex via CURRENCY_EXCHANGE_RATE."""
    data = _get({
        "function"     : "CURRENCY_EXCHANGE_RATE",
        "from_currency": from_sym,
        "to_currency"  : to_sym,
    })
    rate = data.get("Realtime Currency Exchange Rate", {})
    if not rate:
        raise ValueError(f"No forex data for '{ticker}'.")

    return {
        "ticker"        : ticker.upper(),
        "company_name"  : f"{from_sym}/{to_sym} Exchange Rate",
        "currency"      : to_sym,
        "exchange"      : "Forex",
        "sector"        : "Foreign Exchange",
        "industry"      : "Forex",
        "current_price" : safe_float(rate.get("5. Exchange Rate")),
        "previous_close": None,
        "open"          : None,
        "day_high"      : None,
        "day_low"       : None,
        "volume"        : None,
        "avg_volume"    : None,
        "market_cap"    : None,
        "pe_ratio"      : None,
        "forward_pe"    : None,
        "eps"           : None,
        "week_52_high"  : None,
        "week_52_low"   : None,
        "beta"          : None,
        "dividend_yield": None,
        "book_value"    : None,
        "price_to_book" : None,
        "description"   : "",
    }


# ─────────────────────────────────────────────
# Historical OHLCV
# ─────────────────────────────────────────────

def get_historical_data(ticker: str, period: str = "6mo") -> pd.DataFrame:
    ck = f"hist:{ticker}:{period}"
    if _cached(ck) is not None:
        return _cached(ck)

    asset_type, av_symbol, extra = _resolve_symbol(ticker)

    if asset_type == "crypto":
        df = _get_crypto_history(av_symbol, extra or "USD", period)
    elif asset_type == "forex":
        df = _get_forex_history(av_symbol, extra or "USD", period)
    else:
        df = _get_stock_history(av_symbol, period)

    return _cache_set(ck, df)


def _get_stock_history(av_symbol: str, period: str) -> pd.DataFrame:
    """US and Indian stock history via TIME_SERIES_DAILY."""
    output_size = "full" if period in ("1y", "2y") else "compact"
    data = _get({
        "function"  : "TIME_SERIES_DAILY",
        "symbol"    : av_symbol,
        "outputsize": output_size,
    })

    ts = data.get("Time Series (Daily)", {})
    if not ts:
        raise ValueError(f"No historical data for '{av_symbol}'.")

    rows = []
    for date_str, vals in sorted(ts.items()):
        rows.append({
            "date"  : date_str,
            "open"  : safe_float(vals.get("1. open")),
            "high"  : safe_float(vals.get("2. high")),
            "low"   : safe_float(vals.get("3. low")),
            "close" : safe_float(vals.get("4. close")),
            "volume": safe_int(vals.get("5. volume")),
        })

    return _filter_by_period(pd.DataFrame(rows), period)


def _get_crypto_history(from_sym: str, to_sym: str, period: str) -> pd.DataFrame:
    """Crypto history via DIGITAL_CURRENCY_DAILY."""
    data = _get({
        "function" : "DIGITAL_CURRENCY_DAILY",
        "symbol"   : from_sym,
        "market"   : to_sym,
    })

    ts = data.get("Time Series (Digital Currency Daily)", {})
    if not ts:
        raise ValueError(f"No crypto history for '{from_sym}'.")

    rows = []
    for date_str, vals in sorted(ts.items()):
        rows.append({
            "date"  : date_str,
            "open"  : safe_float(vals.get(f"1a. open ({to_sym})") or vals.get("1. open")),
            "high"  : safe_float(vals.get(f"2a. high ({to_sym})") or vals.get("2. high")),
            "low"   : safe_float(vals.get(f"3a. low ({to_sym})")  or vals.get("3. low")),
            "close" : safe_float(vals.get(f"4a. close ({to_sym})")or vals.get("4. close")),
            "volume": safe_float(vals.get("5. volume")),
        })

    return _filter_by_period(pd.DataFrame(rows), period)


def _get_forex_history(from_sym: str, to_sym: str, period: str) -> pd.DataFrame:
    """Forex history via FX_DAILY."""
    output_size = "full" if period in ("1y", "2y") else "compact"
    data = _get({
        "function"   : "FX_DAILY",
        "from_symbol": from_sym,
        "to_symbol"  : to_sym,
        "outputsize" : output_size,
    })

    ts = data.get("Time Series FX (Daily)", {})
    if not ts:
        raise ValueError(f"No forex history for {from_sym}/{to_sym}.")

    rows = []
    for date_str, vals in sorted(ts.items()):
        rows.append({
            "date"  : date_str,
            "open"  : safe_float(vals.get("1. open")),
            "high"  : safe_float(vals.get("2. high")),
            "low"   : safe_float(vals.get("3. low")),
            "close" : safe_float(vals.get("4. close")),
            "volume": 0,
        })

    return _filter_by_period(pd.DataFrame(rows), period)


def _filter_by_period(df: pd.DataFrame, period: str) -> pd.DataFrame:
    """Filter DataFrame to the requested time period."""
    period_days = {"1mo": 30, "3mo": 90, "6mo": 180, "1y": 365, "2y": 730}
    days   = period_days.get(period, 180)
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=days)

    df["date"] = pd.to_datetime(df["date"])
    df = df[df["date"] >= cutoff].copy()
    df.sort_values("date", inplace=True)
    df["date"] = df["date"].dt.strftime("%Y-%m-%d")
    df.reset_index(drop=True, inplace=True)
    return df


# ─────────────────────────────────────────────
# Historical + Technical Indicators
# ─────────────────────────────────────────────

def get_historical_with_indicators(ticker: str, period: str = "6mo") -> pd.DataFrame:
    df     = get_historical_data(ticker, period)
    closes = df["close"]

    df["sma_20"]       = closes.rolling(20).mean().round(4)
    df["sma_50"]       = closes.rolling(50).mean().round(4)
    df["ema_12"]       = closes.ewm(span=12, adjust=False).mean().round(4)
    df["ema_26"]       = closes.ewm(span=26, adjust=False).mean().round(4)
    df["macd"]         = (df["ema_12"] - df["ema_26"]).round(4)
    df["macd_signal"]  = df["macd"].ewm(span=9, adjust=False).mean().round(4)
    df["macd_hist"]    = (df["macd"] - df["macd_signal"]).round(4)

    delta              = closes.diff()
    avg_g              = delta.clip(lower=0).ewm(com=13, adjust=False).mean()
    avg_l              = (-delta.clip(upper=0)).ewm(com=13, adjust=False).mean()
    rs                 = avg_g / avg_l.replace(0, np.nan)
    df["rsi_14"]       = (100 - (100 / (1 + rs))).round(2)

    sma20              = closes.rolling(20).mean()
    std20              = closes.rolling(20).std()
    df["bb_upper"]     = (sma20 + 2 * std20).round(4)
    df["bb_lower"]     = (sma20 - 2 * std20).round(4)
    df["bb_mid"]       = sma20.round(4)
    df["daily_return"] = closes.pct_change().mul(100).round(4)
    return df


def get_ohlcv_for_json(ticker: str, period: str = "6mo") -> list:
    df = get_historical_with_indicators(ticker, period)
    return clean_df_for_json(df)