"""
Technical indicator computation utilities.
Computes RSI, MACD, Bollinger Bands, SMA, EMA, ATR, OBV from OHLCV data.
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

    # Wilder's smoothing: EMA with alpha = 1/window
    avg_gain = gain.ewm(alpha=1.0 / window, min_periods=window, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1.0 / window, min_periods=window, adjust=False).mean()

    rs = avg_gain / (avg_loss + 1e-10)
    rsi = 100 - (100 / (1 + rs))
    return rsi


def compute_macd(series: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """
    MACD indicator.
    Returns: (macd_line, signal_line, histogram)
    """
    ema_fast = compute_ema(series, fast)
    ema_slow = compute_ema(series, slow)
    macd_line = ema_fast - ema_slow
    signal_line = compute_ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def compute_bollinger_bands(series: pd.Series, window: int = 20, num_std: float = 2.0):
    """
    Bollinger Bands.
    Returns: (upper_band, middle_band, lower_band)
    """
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


def compute_all_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute all technical indicators from an OHLCV DataFrame.
    Expects columns: Open, High, Low, Close, Volume
    Returns DataFrame with additional indicator columns.
    """
    result = df.copy()

    close = result["Close"]
    high = result["High"]
    low = result["Low"]
    volume = result["Volume"]

    # Moving Averages
    result["SMA_7"] = compute_sma(close, 7)
    result["SMA_21"] = compute_sma(close, 21)
    result["SMA_50"] = compute_sma(close, 50)
    result["EMA_12"] = compute_ema(close, 12)
    result["EMA_26"] = compute_ema(close, 26)

    # RSI
    result["RSI_14"] = compute_rsi(close, 14)

    # MACD
    macd_line, signal_line, histogram = compute_macd(close)
    result["MACD"] = macd_line
    result["MACD_Signal"] = signal_line
    result["MACD_Hist"] = histogram

    # Bollinger Bands
    upper, middle, lower = compute_bollinger_bands(close)
    result["BB_Upper"] = upper
    result["BB_Middle"] = middle
    result["BB_Lower"] = lower

    # ATR
    result["ATR_14"] = compute_atr(high, low, close, 14)

    # OBV
    result["OBV"] = compute_obv(close, volume)

    # Derived features
    result["Log_Return"] = np.log(close / close.shift(1))
    result["Price_Range"] = (high - low) / (close + 1e-10)
    result["Price_SMA50_Ratio"] = close / (result["SMA_50"] + 1e-10)
    result["RSI_Zone"] = pd.cut(
        result["RSI_14"],
        bins=[0, 30, 70, 100],
        labels=["Oversold", "Neutral", "Overbought"],
    )

    # MACD crossover: 1 if MACD above signal, 0 otherwise
    result["MACD_Crossover"] = (result["MACD"] > result["MACD_Signal"]).astype(int)

    # Volatility regime: percentile rank of ATR over last 90 days
    result["Volatility_Regime"] = result["ATR_14"].rolling(window=90, min_periods=1).apply(
        lambda x: pd.Series(x).rank(pct=True).iloc[-1], raw=False
    )

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
