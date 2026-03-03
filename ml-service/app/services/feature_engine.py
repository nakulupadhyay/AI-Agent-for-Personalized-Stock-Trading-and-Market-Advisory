"""
Feature Engine — Computes technical features from stock price data.
Uses Yahoo Finance for data fetching and the indicators module for computation.
"""
import logging
import numpy as np
import pandas as pd
import yfinance as yf
from app.utils.indicators import compute_all_indicators

logger = logging.getLogger(__name__)

# NSE suffix for Indian stocks on Yahoo Finance
NSE_SUFFIX = ".NS"


def fetch_stock_data(symbol: str, period: str = "1y") -> pd.DataFrame:
    """
    Fetch OHLCV data from Yahoo Finance.
    Automatically adds .NS suffix for Indian stocks.
    """
    ticker = symbol if "." in symbol else f"{symbol}{NSE_SUFFIX}"

    try:
        stock = yf.Ticker(ticker)
        df = stock.history(period=period)

        if df.empty:
            logger.warning(f"No data fetched for {ticker}")
            return pd.DataFrame()

        # Keep only OHLCV columns
        df = df[["Open", "High", "Low", "Close", "Volume"]].copy()
        df.dropna(inplace=True)
        logger.info(f"Fetched {len(df)} rows for {symbol}")
        return df

    except Exception as e:
        logger.error(f"Failed to fetch data for {symbol}: {e}")
        return pd.DataFrame()


def get_features_for_prediction(symbol: str, period: str = "1y") -> dict:
    """
    Fetch stock data, compute all indicators, and return
    the latest feature values for prediction.
    """
    df = fetch_stock_data(symbol, period)
    if df.empty:
        return {}

    df_with_indicators = compute_all_indicators(df)

    # Get the latest row's features
    latest = df_with_indicators.iloc[-1]

    features = {
        "close": float(latest.get("Close", 0)),
        "open": float(latest.get("Open", 0)),
        "high": float(latest.get("High", 0)),
        "low": float(latest.get("Low", 0)),
        "volume": float(latest.get("Volume", 0)),
        "sma_7": float(latest.get("SMA_7", 0)),
        "sma_21": float(latest.get("SMA_21", 0)),
        "sma_50": float(latest.get("SMA_50", 0)),
        "ema_12": float(latest.get("EMA_12", 0)),
        "ema_26": float(latest.get("EMA_26", 0)),
        "rsi_14": float(latest.get("RSI_14", 50)),
        "macd": float(latest.get("MACD", 0)),
        "macd_signal": float(latest.get("MACD_Signal", 0)),
        "macd_hist": float(latest.get("MACD_Hist", 0)),
        "bb_upper": float(latest.get("BB_Upper", 0)),
        "bb_lower": float(latest.get("BB_Lower", 0)),
        "atr_14": float(latest.get("ATR_14", 0)),
        "obv": float(latest.get("OBV", 0)),
        "log_return": float(latest.get("Log_Return", 0)),
        "price_range": float(latest.get("Price_Range", 0)),
        "price_sma50_ratio": float(latest.get("Price_SMA50_Ratio", 1)),
        "macd_crossover": int(latest.get("MACD_Crossover", 0)),
        "volatility_regime": float(latest.get("Volatility_Regime", 0.5)),
    }

    # Replace NaN with defaults
    for key, val in features.items():
        if np.isnan(val) or np.isinf(val):
            features[key] = 0.0

    return features


def get_historical_features(symbol: str, period: str = "2y") -> pd.DataFrame:
    """
    Get full historical DataFrame with all indicators computed.
    Used for model training.
    """
    df = fetch_stock_data(symbol, period)
    if df.empty:
        return pd.DataFrame()

    df_features = compute_all_indicators(df)
    df_features.dropna(inplace=True)
    return df_features
