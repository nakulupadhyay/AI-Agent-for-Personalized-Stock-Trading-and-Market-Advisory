"""
ml_service/models/price_prediction_model.py
─────────────────────────────────────────────
Stock price prediction using Multiple Linear Regression (scikit-learn).

Model pipeline
──────────────
1. Feature engineering from raw OHLCV data
2. MinMaxScaler normalisation
3. LinearRegression training (80/20 chronological split)
4. Evaluation: RMSE, MAE, R²
5. Next-day close price prediction

Features engineered
───────────────────
  lag_1        : previous day's close
  lag_2        : 2-day ago close
  lag_5        : 5-day ago close
  sma_5        : 5-day simple moving average
  sma_20       : 20-day simple moving average
  ema_12       : 12-day exponential moving average
  roc_5        : 5-day rate of change (momentum %)
  roc_10       : 10-day rate of change
  volatility_5 : 5-day rolling standard deviation (risk proxy)
  rsi_proxy    : simple RSI-like oscillator
  volume_ratio : today's volume / 20-day avg volume (liquidity proxy)
  day_of_week  : 0=Monday … 4=Friday (weekly seasonality)

Why Linear Regression?
  Simple, interpretable, fast, and demonstrates core ML concepts clearly.
  In production you would use gradient boosting or LSTM.
"""

import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.pipeline import Pipeline
import warnings
warnings.filterwarnings("ignore")


# ─────────────────────────────────────────────
# Feature Engineering
# ─────────────────────────────────────────────

FEATURE_NAMES = [
    "lag_1", "lag_2", "lag_5",
    "sma_5", "sma_20", "ema_12",
    "roc_5", "roc_10",
    "volatility_5", "rsi_proxy",
    "volume_ratio", "day_of_week",
]


def _build_feature_df(df: pd.DataFrame) -> pd.DataFrame:
    """
    Construct a feature DataFrame from OHLCV data.

    Input  : df with columns [date, open, high, low, close, volume]
    Output : feature DataFrame with FEATURE_NAMES columns + 'target'
    """
    feat = df.copy()

    # ── Lag features ──
    feat["lag_1"]  = feat["close"].shift(1)
    feat["lag_2"]  = feat["close"].shift(2)
    feat["lag_5"]  = feat["close"].shift(5)

    # ── Moving averages ──
    feat["sma_5"]  = feat["close"].rolling(5).mean()
    feat["sma_20"] = feat["close"].rolling(20).mean()
    feat["ema_12"] = feat["close"].ewm(span=12, adjust=False).mean()

    # ── Rate of Change (momentum) ──
    feat["roc_5"]  = feat["close"].pct_change(5) * 100
    feat["roc_10"] = feat["close"].pct_change(10) * 100

    # ── Volatility ──
    feat["volatility_5"] = feat["close"].rolling(5).std()

    # ── RSI proxy (simplified: up days ratio over 14 days) ──
    delta       = feat["close"].diff()
    up_days     = (delta > 0).rolling(14).sum()
    feat["rsi_proxy"] = (up_days / 14) * 100   # 0–100 scale

    # ── Volume ratio ──
    avg_vol_20  = feat["volume"].rolling(20).mean()
    feat["volume_ratio"] = feat["volume"] / avg_vol_20.replace(0, np.nan)

    # ── Day of week (from date string column) ──
    if "date" in feat.columns:
        feat["day_of_week"] = pd.to_datetime(feat["date"]).dt.dayofweek.astype(float)
    else:
        feat["day_of_week"] = feat.index.dayofweek.astype(float) if hasattr(feat.index, 'dayofweek') else 2.0

    # ── Target: next day's close price ──
    feat["target"] = feat["close"].shift(-1)

    # Drop rows with any NaN in features or target
    feat.dropna(subset=FEATURE_NAMES + ["target"], inplace=True)

    return feat


# ─────────────────────────────────────────────
# Training
# ─────────────────────────────────────────────

def train_model(df: pd.DataFrame, test_size: float = 0.20) -> dict:
    """
    Train the Linear Regression price prediction model.

    Parameters
    ──────────
    df        : OHLCV DataFrame (output of stock_data_service.get_historical_data)
    test_size : fraction of data held out for evaluation

    Returns
    ───────
    dict containing:
      model    : fitted sklearn Pipeline (scaler + LinearRegression)
      metrics  : {rmse, mae, r2, n_train, n_test, feature_importances}
      feat_df  : the full feature DataFrame (for prediction)
    """
    feat_df = _build_feature_df(df)

    if len(feat_df) < 15:
        raise ValueError(
            f"Only {len(feat_df)} usable rows after feature engineering. "
            "Use a longer period (6mo or more)."
        )

    X = feat_df[FEATURE_NAMES].values
    y = feat_df["target"].values

    # ── Chronological train/test split (no shuffle — respects time order) ──
    split    = int(len(X) * (1 - test_size))
    X_train  = X[:split];  y_train = y[:split]
    X_test   = X[split:];  y_test  = y[split:]

    # ── Pipeline: MinMaxScaler → LinearRegression ──
    pipeline = Pipeline([
        ("scaler", MinMaxScaler()),
        ("model",  LinearRegression()),
    ])
    pipeline.fit(X_train, y_train)

    # ── Evaluation ──
    y_pred  = pipeline.predict(X_test)
    rmse    = float(np.sqrt(mean_squared_error(y_test, y_pred)))
    mae     = float(mean_absolute_error(y_test, y_pred))
    r2      = float(r2_score(y_test, y_pred))

    # Feature importances (coefficients, absolute value, normalised to %)
    coefs       = pipeline.named_steps["model"].coef_
    abs_coefs   = np.abs(coefs)
    importance_pct = (abs_coefs / abs_coefs.sum() * 100).round(2).tolist()
    feature_imp = dict(zip(FEATURE_NAMES, importance_pct))

    return {
        "pipeline"    : pipeline,
        "feat_df"     : feat_df,
        "metrics"     : {
            "rmse"               : round(rmse, 4),
            "mae"                : round(mae,  4),
            "r2"                 : round(r2,   4),
            "n_train"            : int(split),
            "n_test"             : int(len(X_test)),
            "feature_importances": feature_imp,
        },
        # Store test actuals/preds for chart (last 30 of test set)
        "test_actual"    : y_test[-30:].tolist(),
        "test_predicted" : y_pred[-30:].tolist(),
    }


# ─────────────────────────────────────────────
# Prediction
# ─────────────────────────────────────────────

def predict_next_day(train_result: dict, df: pd.DataFrame) -> dict:
    """
    Predict the next trading day's closing price.

    Uses the most recent row of features (latest available candle).

    Returns
    ───────
    dict with:
      predicted_price, current_price, price_change, change_pct,
      direction ("UP" | "DOWN" | "FLAT"),
      confidence_band_low, confidence_band_high  (±1 RMSE)
    """
    pipeline = train_result["pipeline"]
    feat_df  = train_result["feat_df"]
    rmse     = train_result["metrics"]["rmse"]

    # Last row of the feature matrix = current day's data
    last_features = feat_df[FEATURE_NAMES].iloc[-1].values.reshape(1, -1)
    predicted     = float(pipeline.predict(last_features)[0])
    current       = float(df["close"].iloc[-1])

    change     = predicted - current
    change_pct = (change / current) * 100 if current != 0 else 0.0

    direction = (
        "UP"   if change_pct >  0.10 else
        "DOWN" if change_pct < -0.10 else
        "FLAT"
    )

    return {
        "predicted_price"     : round(predicted, 2),
        "current_price"       : round(current,   2),
        "price_change"        : round(change,     2),
        "change_pct"          : round(change_pct, 2),
        "direction"           : direction,
        "confidence_band_low" : round(predicted - rmse, 2),
        "confidence_band_high": round(predicted + rmse, 2),
    }


# ─────────────────────────────────────────────
# Full pipeline convenience function
# ─────────────────────────────────────────────

def run_price_prediction(df: pd.DataFrame) -> dict:
    """
    One-shot: train model → predict next day.

    Parameters
    ──────────
    df : OHLCV DataFrame from stock_data_service.get_historical_data()

    Returns
    ───────
    Merged dict of prediction result + model metrics
    """
    train_result = train_model(df)
    prediction   = predict_next_day(train_result, df)

    return {
        **prediction,
        "model_metrics"      : train_result["metrics"],
        "test_actual"        : train_result["test_actual"],
        "test_predicted"     : train_result["test_predicted"],
    }
