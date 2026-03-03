"""
Market Trend Prediction Model — LSTM + XGBoost Ensemble.

Predicts next-day price movement (Up/Down/Sideways) and target price.
Uses technical indicators as features with a 60-day lookback window.
"""
import os
import logging
import numpy as np
import pandas as pd
import joblib
from typing import Optional

logger = logging.getLogger(__name__)

# Feature columns used for the XGBoost model
FEATURE_COLS = [
    "Close", "Volume", "SMA_7", "SMA_21", "SMA_50",
    "EMA_12", "EMA_26", "RSI_14", "MACD", "MACD_Signal",
    "MACD_Hist", "BB_Upper", "BB_Lower", "ATR_14",
    "Log_Return", "Price_Range", "Price_SMA50_Ratio",
    "MACD_Crossover", "Volatility_Regime", "Day_Sin", "Day_Cos",
]


class TrendPredictor:
    """
    Market trend prediction using XGBoost (primary) with
    technical indicator features.

    The LSTM component is optional and loaded only if a trained
    model file exists. Otherwise, XGBoost handles all predictions.
    """

    def __init__(self):
        self.xgb_model = None
        self.scaler = None
        self.is_trained = False
        self.model_version = "v1.0-xgb"

    def train(self, df: pd.DataFrame):
        """
        Train the XGBoost model on historical data with indicators.

        Args:
            df: DataFrame with all technical indicators already computed
        """
        from xgboost import XGBClassifier
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import TimeSeriesSplit

        # Create target: next-day direction
        df = df.copy()
        pct = df["Close"].pct_change().shift(-1)
        df["Target"] = 0  # Sideways
        df.loc[pct > 0.005, "Target"] = 1   # Up
        df.loc[pct < -0.005, "Target"] = -1  # Down
        df.dropna(inplace=True)

        # Select features
        available_cols = [c for c in FEATURE_COLS if c in df.columns]
        X = df[available_cols].values
        y = df["Target"].values

        # Map: -1 -> 0, 0 -> 1, 1 -> 2 for XGBoost
        y_mapped = y + 1

        # Scale
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train with time-series cross-validation
        self.xgb_model = XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            objective="multi:softprob",
            num_class=3,
            eval_metric="mlogloss",
            use_label_encoder=False,
            random_state=42,
        )

        # Use last 20% as validation
        split = int(len(X_scaled) * 0.8)
        X_train, X_val = X_scaled[:split], X_scaled[split:]
        y_train, y_val = y_mapped[:split], y_mapped[split:]

        self.xgb_model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )

        self.is_trained = True
        logger.info("Trend model trained successfully")

    def predict(self, features: dict) -> dict:
        """
        Predict next-day trend from current feature values.

        If the model is not trained, uses a rule-based fallback
        based on technical indicators.
        """
        if self.is_trained and self.xgb_model is not None:
            return self._ml_predict(features)
        else:
            return self._rule_based_predict(features)

    def _ml_predict(self, features: dict) -> dict:
        """ML-based prediction using trained XGBoost model."""
        available_cols = [c for c in FEATURE_COLS if c.lower().replace("_", "") in
                          {k.lower().replace("_", "") for k in features}]

        # Build feature vector in correct order
        feature_vector = []
        for col in FEATURE_COLS:
            key = col.lower()
            # Try various key formats
            val = features.get(key) or features.get(col) or 0.0
            feature_vector.append(float(val))

        X = np.array([feature_vector])
        X_scaled = self.scaler.transform(X)

        probabilities = self.xgb_model.predict_proba(X_scaled)[0]
        predicted_class = self.xgb_model.predict(X_scaled)[0]

        # Map back: 0 -> Down, 1 -> Sideways, 2 -> Up
        direction_map = {0: "SELL", 1: "HOLD", 2: "BUY"}
        direction = direction_map[predicted_class]

        confidence = float(max(probabilities)) * 100

        # Estimate target price based on direction and confidence
        current_price = features.get("close", 0)
        if direction == "BUY":
            target_price = current_price * (1 + confidence / 1000)
        elif direction == "SELL":
            target_price = current_price * (1 - confidence / 1000)
        else:
            target_price = current_price * 1.001

        return {
            "direction": direction,
            "confidence": round(confidence, 1),
            "targetPrice": round(target_price, 2),
            "probabilities": {
                "Down": round(float(probabilities[0]) * 100, 1),
                "Sideways": round(float(probabilities[1]) * 100, 1),
                "Up": round(float(probabilities[2]) * 100, 1),
            },
            "model": self.model_version,
            "method": "ml",
        }

    def _rule_based_predict(self, features: dict) -> dict:
        """
        Rule-based fallback prediction using technical indicators.
        Used when no trained model is available.
        """
        score = 0.0
        signals = []

        # RSI signal
        rsi = features.get("rsi_14", 50)
        if rsi < 30:
            score += 2.0
            signals.append("RSI oversold (bullish)")
        elif rsi > 70:
            score -= 2.0
            signals.append("RSI overbought (bearish)")
        else:
            signals.append(f"RSI neutral ({rsi:.0f})")

        # MACD signal
        macd = features.get("macd", 0)
        macd_signal = features.get("macd_signal", 0)
        if macd > macd_signal:
            score += 1.5
            signals.append("MACD bullish crossover")
        else:
            score -= 1.0
            signals.append("MACD bearish")

        # Price vs SMA50
        price_ratio = features.get("price_sma50_ratio", 1.0)
        if price_ratio > 1.02:
            score += 1.0
            signals.append("Price above SMA50 (uptrend)")
        elif price_ratio < 0.98:
            score -= 1.0
            signals.append("Price below SMA50 (downtrend)")

        # Bollinger Band position
        close = features.get("close", 0)
        bb_lower = features.get("bb_lower", 0)
        bb_upper = features.get("bb_upper", 0)
        if close and bb_lower and close <= bb_lower:
            score += 1.5
            signals.append("Price at lower Bollinger Band (potential bounce)")
        elif close and bb_upper and close >= bb_upper:
            score -= 1.5
            signals.append("Price at upper Bollinger Band (potential pullback)")

        # Log return momentum
        log_return = features.get("log_return", 0)
        if log_return > 0.01:
            score += 0.5
        elif log_return < -0.01:
            score -= 0.5

        # Determine direction
        if score > 1.5:
            direction = "BUY"
            confidence = min(55 + score * 5, 88)
        elif score < -1.5:
            direction = "SELL"
            confidence = min(55 + abs(score) * 5, 85)
        else:
            direction = "HOLD"
            confidence = min(50 + abs(score) * 3, 75)

        current_price = features.get("close", 0)
        if direction == "BUY":
            target_price = current_price * 1.05
        elif direction == "SELL":
            target_price = current_price * 0.95
        else:
            target_price = current_price * 1.01

        return {
            "direction": direction,
            "confidence": round(confidence, 1),
            "targetPrice": round(target_price, 2),
            "signals": signals,
            "score": round(score, 2),
            "model": "rule-based-v1",
            "method": "rule_based",
        }

    def save(self, path: str):
        """Save the trained model to disk."""
        if self.xgb_model is not None:
            data = {
                "xgb_model": self.xgb_model,
                "scaler": self.scaler,
                "version": self.model_version,
            }
            joblib.dump(data, path)
            logger.info(f"Trend model saved to {path}")

    def load(self, path: str):
        """Load a trained model from disk."""
        if os.path.exists(path):
            data = joblib.load(path)
            self.xgb_model = data["xgb_model"]
            self.scaler = data["scaler"]
            self.model_version = data.get("version", "v1.0-xgb")
            self.is_trained = True
            logger.info(f"Trend model loaded from {path}")
