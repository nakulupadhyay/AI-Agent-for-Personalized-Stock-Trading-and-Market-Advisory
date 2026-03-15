"""
Technical indicator computation utilities.

Computes RSI, MACD, Bollinger Bands, SMA, EMA, ATR, OBV,
VWAP, Stochastic Oscillator, Williams %R, ADX, CCI from OHLCV data.
"""
import numpy as np
import pandas as pd


def compute_sma(series: pd.Series, window: int) -> pd.Series:
    """Simple Moving Average."""
    return series.rolling(window=window, min_periods=1).mean()


def compute_ema(series: pd.Series, window: int) -> pd.Series:
    """Exponential Moving Average."""
    return series.ewm(span=window, adjust=False).mean()


def compute_rsi(series: pd.Series, window: int = 14) -> pd.Series:
    """Relative Strength Index (0-100) using Wilder's smoothing (EMA)."""
    delta = series.diff()
    gain = delta.where(delta > 0, 0.0)
    loss = -delta.where(delta < 0, 0.0)

    avg_gain = gain.ewm(alpha=1.0 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / window, min_periods=window, adjust=False).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """MACD: (macd_line, signal_line, histogram)."""
    ema_fast = compute_ema(series, fast)
    ema_slow = compute_ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = compute_ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_bollinger_bands(series: pd.Series, window: int = 20, num_std: float = 2.0):
    """Bollinger Bands: (upper, middle, lower)."""
    middle = compute_sma(series, window)
    std = series.rolling(window=window, min_periods=1).std()
    upper = middle + (std * num_std)
    lower = middle - (std * num_std)
    return upper, middle, lower


def compute_atr(high: pd.Series, low: pd.Series, close: pd.Series, window: int = 14) -> pd.Series:
    """Average True Range — measures volatility."""
    tr1 = high - low
    tr2 = (high - close.shift(1)).abs()
    tr3 = (low - close.shift(1)).abs()
    true_range = pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)
    return true_range.rolling(window=window, min_periods=1).mean()


def compute_obv(close: pd.Series, volume: pd.Series) -> pd.Series:
    """On-Balance Volume — volume trend indicator."""
    direction = np.sign(close.diff())
    direction.iloc[0] = 0
    obv = (volume * direction).cumsum()
    return obv


def compute_vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
    """
    Volume Weighted Average Price.
    Uses a rolling 20-period VWAP as a proxy since intraday data isn't available.
    """
    typical_price = (high + low + close) / 3
    cum_tp_vol = (typical_price * volume).rolling(window=20, min_periods=1).sum()
    cum_vol = volume.rolling(window=20, min_periods=1).sum()
    vwap = cum_tp_vol / (cum_vol + 1e-10)
    return vwap


def compute_stochastic(high: pd.Series, low: pd.Series, close: pd.Series,
                       k_period: int = 14, d_period: int = 3):
    """
    Stochastic Oscillator.
    Returns: (%K, %D)
    """
    lowest_low = low.rolling(window=k_period, min_periods=1).min()
    highest_high = high.rolling(window=k_period, min_periods=1).max()
    stoch_k = 100 * (close - lowest_low) / (highest_high - lowest_low + 1e-10)
    stoch_d = stoch_k.rolling(window=d_period, min_periods=1).mean()
    return stoch_k, stoch_d


def compute_williams_r(high: pd.Series, low: pd.Series, close: pd.Series,
                       period: int = 14) -> pd.Series:
    """Williams %R — momentum indicator (-100 to 0)."""
    highest_high = high.rolling(window=period, min_periods=1).max()
    lowest_low = low.rolling(window=period, min_periods=1).min()
    wr = -100 * (highest_high - close) / (highest_high - lowest_low + 1e-10)
    return wr


def compute_cci(high: pd.Series, low: pd.Series, close: pd.Series,
                period: int = 20) -> pd.Series:
    """Commodity Channel Index — trend strength."""
    typical_price = (high + low + close) / 3
    sma_tp = typical_price.rolling(window=period, min_periods=1).mean()
    mean_deviation = typical_price.rolling(window=period, min_periods=1).apply(
        lambda x: np.mean(np.abs(x - np.mean(x))), raw=True
    )
    cci = (typical_price - sma_tp) / (0.015 * mean_deviation + 1e-10)
    return cci


def compute_adx(high: pd.Series, low: pd.Series, close: pd.Series,
                period: int = 14) -> pd.Series:
    """Average Directional Index — trend strength (0-100)."""
    plus_dm = high.diff()
    minus_dm = -low.diff()
    plus_dm[plus_dm < 0] = 0
    minus_dm[minus_dm < 0] = 0

    # When both are positive, keep only the larger
    mask = plus_dm > minus_dm
    minus_dm[mask & (plus_dm > 0)] = 0
    plus_dm[~mask & (minus_dm > 0)] = 0

    atr = compute_atr(high, low, close, period)
    plus_di = 100 * compute_ema(plus_dm, period) / (atr + 1e-10)
    minus_di = 100 * compute_ema(minus_dm, period) / (atr + 1e-10)

    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di + 1e-10)
    adx = compute_ema(dx, period)
    return adx


def compute_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all technical indicators from an OHLCV DataFrame.
    Expects columns: Open, High, Low, Close, Volume
    Returns DataFrame with 30+ indicator columns.
    """
    result = df.copy()

    close = result["Close"]
    high = result["High"]
    low = result["Low"]
    volume = result["Volume"]

    # ── Moving Averages ──
    result["SMA_7"] = compute_sma(close, 7)
    result["SMA_21"] = compute_sma(close, 21)
    result["SMA_50"] = compute_sma(close, 50)
    result["EMA_12"] = compute_ema(close, 12)
    result["EMA_26"] = compute_ema(close, 26)

    # ── RSI ──
    result["RSI_14"] = compute_rsi(close, 14)

    # ── MACD ──
    macd_line, signal_line, histogram = compute_macd(close)
    result["MACD"] = macd_line
    result["MACD_Signal"] = signal_line
    result["MACD_Hist"] = histogram

    # ── Bollinger Bands ──
    upper, middle, lower = compute_bollinger_bands(close)
    result["BB_Upper"] = upper
    result["BB_Middle"] = middle
    result["BB_Lower"] = lower

    # BB Width and %B (new)
    result["BB_Width"] = (upper - lower) / (middle + 1e-10)
    result["BB_Percent"] = (close - lower) / (upper - lower + 1e-10)

    # ── ATR ──
    result["ATR_14"] = compute_atr(high, low, close, 14)

    # ── OBV ──
    result["OBV"] = compute_obv(close, volume)

    # ── VWAP (new) ──
    result["VWAP"] = compute_vwap(high, low, close, volume)
    result["Price_VWAP_Ratio"] = close / (result["VWAP"] + 1e-10)

    # ── Stochastic Oscillator (new) ──
    stoch_k, stoch_d = compute_stochastic(high, low, close)
    result["Stoch_K"] = stoch_k
    result["Stoch_D"] = stoch_d

    # ── Williams %R (new) ──
    result["Williams_R"] = compute_williams_r(high, low, close)

    # ── CCI (new) ──
    result["CCI_20"] = compute_cci(high, low, close, 20)

    # ── ADX (new) ──
    result["ADX_14"] = compute_adx(high, low, close, 14)

    # ── Derived Features ──
    result["Log_Return"] = np.log(close / close.shift(1))
    result["Price_Range"] = (high - low) / (close + 1e-10)
    result["Price_SMA50_Ratio"] = close / (result["SMA_50"] + 1e-10)
    result["RSI_Zone"] = pd.cut(
        result["RSI_14"],
        bins=[0, 30, 70, 100],
        labels=["Oversold", "Neutral", "Overbought"],
    )

    # MACD crossover
    result["MACD_Crossover"] = (result["MACD"] > result["MACD_Signal"]).astype(int)

    # Volatility regime
    result["Volatility_Regime"] = result["ATR_14"].rolling(window=90, min_periods=1).apply(
        lambda x: pd.Series(x).rank(pct=True).iloc[-1], raw=False
    )

    # Volume ratio (current volume vs 20-day avg)
    result["Volume_Ratio"] = volume / (volume.rolling(window=20, min_periods=1).mean() + 1e-10)

    # Price momentum (5-day and 10-day returns)
    result["Momentum_5"] = close.pct_change(5)
    result["Momentum_10"] = close.pct_change(10)

    # Cyclical day-of-week encoding
    if "Date" in result.columns:
        dow = pd.to_datetime(result["Date"]).dt.dayofweek
    elif result.index.dtype == "datetime64[ns]":
        dow = result.index.dayofweek
    else:
        dow = pd.Series(range(len(result))) % 5

    result["Day_Sin"] = np.sin(2 * np.pi * dow / 5)
    result["Day_Cos"] = np.cos(2 * np.pi * dow / 5)

    return result
