"""
Training script for the Market Trend Prediction model.

Usage:
    cd ml-service
    python -m app.training.train_trend --symbol RELIANCE --period 2y

This fetches historical data, computes technical indicators,
trains the XGBoost model, and saves it to the models directory.
"""
import argparse
import logging
import os
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def train_trend_model(symbol: str = "RELIANCE", period: str = "2y"):
    """Train the trend model on a single stock's historical data."""
    from app.services.feature_engine import get_historical_features
    from app.models.trend_model import TrendPredictor
    from app.config import settings

    logger.info(f"Fetching {period} historical data for {symbol}...")
    df = get_historical_features(symbol, period)

    if df.empty or len(df) < 100:
        logger.error(f"Insufficient data for {symbol}. Got {len(df)} rows, need at least 100.")
        return None

    logger.info(f"Got {len(df)} data points. Training model...")

    model = TrendPredictor()
    model.train(df)

    # Save model
    model_path = os.path.join(settings.MODEL_DIR, "trend_xgb.pkl")
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    model.save(model_path)

    logger.info(f"Model saved to {model_path}")

    # Test prediction
    from app.services.feature_engine import get_features_for_prediction
    features = get_features_for_prediction(symbol)
    prediction = model.predict(features)
    logger.info(f"Test prediction for {symbol}: {prediction}")

    return model


def train_multi_stock(symbols: list = None, period: str = "2y"):
    """Train on multiple stocks combined."""
    import pandas as pd
    from app.services.feature_engine import get_historical_features
    from app.models.trend_model import TrendPredictor
    from app.config import settings

    if symbols is None:
        symbols = settings.TRACKED_STOCKS[:5]  # Top 5 stocks

    all_data = []
    for symbol in symbols:
        logger.info(f"Fetching data for {symbol}...")
        df = get_historical_features(symbol, period)
        if not df.empty:
            df["Symbol"] = symbol
            all_data.append(df)

    if not all_data:
        logger.error("No data fetched for any symbol.")
        return None

    combined = pd.concat(all_data, ignore_index=True)
    logger.info(f"Combined dataset: {len(combined)} rows from {len(all_data)} stocks")

    model = TrendPredictor()
    model.train(combined)

    model_path = os.path.join(settings.MODEL_DIR, "trend_xgb.pkl")
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    model.save(model_path)
    logger.info(f"Multi-stock model saved to {model_path}")

    return model


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Market Trend Prediction Model")
    parser.add_argument("--symbol", type=str, default="RELIANCE", help="Stock symbol to train on")
    parser.add_argument("--period", type=str, default="2y", help="Historical data period (e.g., 1y, 2y, 5y)")
    parser.add_argument("--multi", action="store_true", help="Train on multiple stocks")

    args = parser.parse_args()

    if args.multi:
        train_multi_stock(period=args.period)
    else:
        train_trend_model(symbol=args.symbol, period=args.period)
