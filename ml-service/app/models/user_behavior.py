"""
User Behavior Learning Model — K-Means Clustering + Behavioral Scoring.

Learns user trading patterns to enable adaptive recommendations,
personalized alerts, and risk appetite tracking over time.
"""
import logging
import os
import numpy as np
import joblib
from datetime import datetime, timedelta
from typing import Optional

logger = logging.getLogger(__name__)

# Cluster archetype labels
CLUSTER_LABELS = {
    0: "Conservative Investor",
    1: "Active Trader",
    2: "Growth Seeker",
    3: "Dividend Hunter",
}


class UserBehaviorModel:
    """
    K-Means user clustering + behavioral scoring.

    Features per user:
        - trade_frequency: trades per week
        - avg_hold_days: mean holding period
        - sector_diversity: number of distinct sectors
        - avg_trade_size: mean ₹ value per trade
        - profit_loss_ratio: winning trades / total
        - risk_appetite_index: weighted volatility * position size
    """

    def __init__(self):
        self.kmeans = None
        self.scaler = None
        self.n_clusters = 4
        self.is_trained = False
        self.model_version = "v1.0-kmeans"

    def compute_user_features(self, transactions: list, portfolio: dict = None) -> dict:
        """
        Compute behavioral features from a user's transaction history.

        Args:
            transactions: List of transaction dicts with keys:
                symbol, type, quantity, price, timestamp
            portfolio: Optional current portfolio dict

        Returns:
            Dict of behavioral features
        """
        if not transactions:
            return self._default_features()

        # Parse transactions
        buys = [t for t in transactions if t.get("type") in ("BUY", "buy")]
        sells = [t for t in transactions if t.get("type") in ("SELL", "sell")]

        # 1. Trade frequency (trades per week)
        timestamps = []
        for t in transactions:
            ts = t.get("timestamp") or t.get("createdAt")
            if isinstance(ts, str):
                try:
                    timestamps.append(datetime.fromisoformat(ts.replace("Z", "+00:00")))
                except (ValueError, AttributeError):
                    pass
            elif isinstance(ts, datetime):
                timestamps.append(ts)

        if len(timestamps) >= 2:
            span_days = max((max(timestamps) - min(timestamps)).days, 1)
            trade_frequency = len(transactions) / max(span_days / 7, 1)
        else:
            trade_frequency = len(transactions) / 4  # Assume 1 month

        # 2. Average trade size (₹ value)
        trade_sizes = []
        for t in transactions:
            qty = float(t.get("quantity", 0))
            price = float(t.get("price", 0))
            if qty > 0 and price > 0:
                trade_sizes.append(qty * price)
        avg_trade_size = np.mean(trade_sizes) if trade_sizes else 0

        # 3. Sector diversity
        symbols = list(set(t.get("symbol", "") for t in transactions))
        sectors = set()
        from app.config import settings
        for sym in symbols:
            sector = settings.SECTOR_MAP.get(sym, "Other")
            sectors.add(sector)
        sector_diversity = len(sectors)

        # 4. Average holding period (approximate)
        buy_timestamps = {}
        hold_days_list = []
        for t in transactions:
            sym = t.get("symbol", "")
            ts = t.get("timestamp") or t.get("createdAt")
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    continue

            if t.get("type") in ("BUY", "buy"):
                buy_timestamps[sym] = ts
            elif t.get("type") in ("SELL", "sell") and sym in buy_timestamps:
                days = (ts - buy_timestamps[sym]).days
                hold_days_list.append(max(days, 1))
                del buy_timestamps[sym]

        avg_hold_days = np.mean(hold_days_list) if hold_days_list else 30

        # 5. Profit/Loss ratio
        winning = 0
        total_closed = 0
        buy_prices = {}
        for t in transactions:
            sym = t.get("symbol", "")
            price = float(t.get("price", 0))
            if t.get("type") in ("BUY", "buy"):
                buy_prices[sym] = price
            elif t.get("type") in ("SELL", "sell") and sym in buy_prices:
                total_closed += 1
                if price > buy_prices[sym]:
                    winning += 1
                del buy_prices[sym]
        profit_loss_ratio = winning / max(total_closed, 1)

        # 6. Risk appetite index (normalized)
        risk_appetite = 0.5  # Default medium
        if avg_trade_size > 100000:
            risk_appetite += 0.2
        if trade_frequency > 5:
            risk_appetite += 0.15
        if avg_hold_days < 7:
            risk_appetite += 0.1
        risk_appetite = min(risk_appetite, 1.0)

        return {
            "trade_frequency": round(trade_frequency, 2),
            "avg_hold_days": round(avg_hold_days, 1),
            "sector_diversity": sector_diversity,
            "avg_trade_size": round(avg_trade_size, 2),
            "profit_loss_ratio": round(profit_loss_ratio, 3),
            "risk_appetite_index": round(risk_appetite, 3),
        }

    def train(self, user_features_list: list):
        """
        Train K-Means on a list of user feature dicts.

        Args:
            user_features_list: List of dicts from compute_user_features()
        """
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler
        from sklearn.metrics import silhouette_score

        if len(user_features_list) < 4:
            logger.warning("Not enough users for clustering. Need at least 4.")
            return

        feature_keys = [
            "trade_frequency", "avg_hold_days", "sector_diversity",
            "avg_trade_size", "profit_loss_ratio", "risk_appetite_index",
        ]
        X = np.array([[f.get(k, 0) for k in feature_keys] for f in user_features_list])

        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Find optimal K
        best_k, best_score = 4, -1
        for k in range(3, min(8, len(X_scaled))):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X_scaled)
            if len(set(labels)) > 1:
                score = silhouette_score(X_scaled, labels)
                if score > best_score:
                    best_k, best_score = k, score

        self.n_clusters = best_k
        self.kmeans = KMeans(n_clusters=best_k, random_state=42, n_init=10)
        self.kmeans.fit(X_scaled)
        self.is_trained = True

        logger.info(f"User behavior model trained: {best_k} clusters, silhouette={best_score:.3f}")

    def predict_cluster(self, user_features: dict) -> dict:
        """
        Predict which behavioral cluster a user belongs to.
        Falls back to rule-based classification if model isn't trained.
        """
        if not self.is_trained or self.kmeans is None:
            return self._rule_based_cluster(user_features)

        feature_keys = [
            "trade_frequency", "avg_hold_days", "sector_diversity",
            "avg_trade_size", "profit_loss_ratio", "risk_appetite_index",
        ]
        X = np.array([[user_features.get(k, 0) for k in feature_keys]])
        X_scaled = self.scaler.transform(X)
        cluster_id = self.kmeans.predict(X_scaled)[0]

        label = CLUSTER_LABELS.get(cluster_id, f"Cluster {cluster_id}")

        return {
            "cluster_id": int(cluster_id),
            "cluster_label": label,
            "features": user_features,
            "model_version": self.model_version,
        }

    def _rule_based_cluster(self, features: dict) -> dict:
        """Rule-based user classification fallback."""
        freq = features.get("trade_frequency", 1)
        hold = features.get("avg_hold_days", 30)
        risk = features.get("risk_appetite_index", 0.5)

        if freq > 5 and hold < 7:
            label = "Active Trader"
            cluster_id = 1
        elif risk < 0.4 and hold > 30:
            label = "Conservative Investor"
            cluster_id = 0
        elif risk > 0.7:
            label = "Growth Seeker"
            cluster_id = 2
        else:
            label = "Dividend Hunter"
            cluster_id = 3

        return {
            "cluster_id": cluster_id,
            "cluster_label": label,
            "features": features,
            "model_version": "rule-based-v1",
        }

    def compute_behavioral_score(self, transactions: list) -> dict:
        """
        Compute a behavioral change score comparing recent vs overall activity.
        Detects shifts in risk appetite, sector preferences, activity level.
        """
        if not transactions:
            return {
                "risk_appetite_trend": 0,
                "activity_level": "Inactive",
                "sector_shift": False,
                "change_magnitude": 0,
            }

        now = datetime.utcnow()
        recent_cutoff = now - timedelta(days=30)

        recent = []
        older = []
        for t in transactions:
            ts = t.get("timestamp") or t.get("createdAt")
            if isinstance(ts, str):
                try:
                    ts = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except (ValueError, AttributeError):
                    older.append(t)
                    continue
            elif not isinstance(ts, datetime):
                older.append(t)
                continue

            if ts.replace(tzinfo=None) >= recent_cutoff:
                recent.append(t)
            else:
                older.append(t)

        recent_features = self.compute_user_features(recent) if recent else self._default_features()
        overall_features = self.compute_user_features(transactions)

        # Risk trend
        risk_trend = recent_features["risk_appetite_index"] - overall_features["risk_appetite_index"]

        # Activity level
        if recent_features["trade_frequency"] > 5:
            activity = "Very Active"
        elif recent_features["trade_frequency"] > 2:
            activity = "Active"
        elif recent_features["trade_frequency"] > 0.5:
            activity = "Moderate"
        else:
            activity = "Low"

        # Sector shift
        from app.config import settings
        recent_sectors = set(settings.SECTOR_MAP.get(t.get("symbol", ""), "Other") for t in recent)
        older_sectors = set(settings.SECTOR_MAP.get(t.get("symbol", ""), "Other") for t in older)
        sector_shift = bool(recent_sectors - older_sectors)

        change_magnitude = abs(risk_trend)

        return {
            "risk_appetite_trend": round(risk_trend, 3),
            "activity_level": activity,
            "sector_shift": sector_shift,
            "change_magnitude": round(change_magnitude, 3),
            "recent_features": recent_features,
            "overall_features": overall_features,
        }

    def _default_features(self) -> dict:
        return {
            "trade_frequency": 0,
            "avg_hold_days": 0,
            "sector_diversity": 0,
            "avg_trade_size": 0,
            "profit_loss_ratio": 0,
            "risk_appetite_index": 0.5,
        }

    def save(self, path: str):
        """Save model to disk."""
        if self.kmeans is not None:
            data = {
                "kmeans": self.kmeans,
                "scaler": self.scaler,
                "n_clusters": self.n_clusters,
                "version": self.model_version,
            }
            os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
            joblib.dump(data, path)
            logger.info(f"User behavior model saved to {path}")

    def load(self, path: str):
        """Load model from disk."""
        if os.path.exists(path):
            data = joblib.load(path)
            self.kmeans = data["kmeans"]
            self.scaler = data["scaler"]
            self.n_clusters = data.get("n_clusters", 4)
            self.model_version = data.get("version", "v1.0-kmeans")
            self.is_trained = True
            logger.info(f"User behavior model loaded from {path}")
