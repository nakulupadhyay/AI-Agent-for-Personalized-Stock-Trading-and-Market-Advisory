"""
Portfolio Risk Classification Model — XGBoost Classifier.

Classifies portfolio risk into Low / Medium / High based on
quantitative financial metrics from the Node.js riskEngine.
"""
import os
import logging
import numpy as np
import joblib
from typing import Optional

logger = logging.getLogger(__name__)

FEATURE_NAMES = [
    "volatility",
    "sharpe_ratio",
    "max_drawdown",
    "beta",
    "var_daily",
    "diversification_ratio",
    "sector_concentration",
    "holding_count",
]

LABEL_MAP = {"Low": 0, "Medium": 1, "High": 2}
REVERSE_LABEL_MAP = {0: "Low", 1: "Medium", 2: "High"}


class RiskClassifier:
    """
    XGBoost-based portfolio risk classifier.

    Classifies portfolios into Low/Medium/High risk based on:
        - Volatility
        - Sharpe Ratio
        - Max Drawdown
        - Beta
        - VaR (daily)
        - Diversification Ratio
        - Sector Concentration
        - Holding Count
    """

    def __init__(self):
        self.model = None
        self.scaler = None
        self.is_trained = False
        self.model_version = "v1.0-xgb-risk"
        self.training_accuracy = 0.0

    def train_from_synthetic(self, n_samples: int = 5000):
        """Train the classifier using synthetic portfolio data."""
        from xgboost import XGBClassifier
        from sklearn.preprocessing import StandardScaler
        from sklearn.model_selection import StratifiedKFold
        from sklearn.metrics import accuracy_score, f1_score
        from app.utils.synthetic_data import generate_synthetic_portfolios

        logger.info(f"Generating {n_samples} synthetic portfolios...")
        df = generate_synthetic_portfolios(n_samples)

        X = df[FEATURE_NAMES].values
        y = df["label"].map(LABEL_MAP).values

        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)

        # Train model
        self.model = XGBClassifier(
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

        # Stratified K-Fold validation
        skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
        scores = []

        for train_idx, val_idx in skf.split(X_scaled, y):
            self.model.fit(
                X_scaled[train_idx], y[train_idx],
                eval_set=[(X_scaled[val_idx], y[val_idx])],
                verbose=False,
            )
            preds = self.model.predict(X_scaled[val_idx])
            scores.append(accuracy_score(y[val_idx], preds))

        # Final train on all data
        self.model.fit(X_scaled, y, verbose=False)
        self.is_trained = True
        self.training_accuracy = np.mean(scores)

        logger.info(f"Risk classifier trained. CV Accuracy: {self.training_accuracy:.4f}")

    def predict(self, metrics: dict) -> dict:
        """
        Predict risk category from portfolio metrics.

        Args:
            metrics: Dict with keys matching FEATURE_NAMES

        Returns:
            Dict with risk_category, probabilities, confidence, and top factors.
        """
        if not self.is_trained or self.model is None:
            return self._rule_based_predict(metrics)

        # Build feature vector
        feature_vector = []
        for feat in FEATURE_NAMES:
            val = metrics.get(feat, metrics.get(self._camel_to_snake(feat), 0.0))
            feature_vector.append(float(val) if val is not None else 0.0)

        X = np.array([feature_vector])
        X_scaled = self.scaler.transform(X)

        # Predict
        probabilities = self.model.predict_proba(X_scaled)[0]
        predicted_class = self.model.predict(X_scaled)[0]
        risk_category = REVERSE_LABEL_MAP[predicted_class]
        confidence = float(max(probabilities)) * 100

        # Feature importance for explainability
        importance = self.model.feature_importances_
        top_factors = self._get_top_factors(feature_vector, importance, metrics)

        return {
            "success": True,
            "prediction": {
                "category": risk_category,
                "risk_category": risk_category,
                "probabilities": {
                    "Low": round(float(probabilities[0]) * 100, 1),
                    "Medium": round(float(probabilities[1]) * 100, 1),
                    "High": round(float(probabilities[2]) * 100, 1),
                },
                "confidence": round(confidence, 1),
                "top_risk_factors": top_factors,
                "model_version": self.model_version,
            },
        }

    def _rule_based_predict(self, metrics: dict) -> dict:
        """Fallback rule-based prediction."""
        vol = float(metrics.get("volatility", 0.2))
        sharpe = float(metrics.get("sharpe_ratio", metrics.get("sharpeRatio", 1.0)))
        dd = float(metrics.get("max_drawdown", metrics.get("maxDrawdown", 0.1)))

        score = 0
        if vol > 0.35:
            score += 2
        elif vol > 0.20:
            score += 1

        if sharpe < 0.5:
            score += 2
        elif sharpe < 1.0:
            score += 1

        if dd > 0.25:
            score += 2
        elif dd > 0.12:
            score += 1

        if score >= 4:
            category = "High"
        elif score >= 2:
            category = "Medium"
        else:
            category = "Low"

        return {
            "success": True,
            "prediction": {
                "category": category,
                "risk_category": category,
                "probabilities": {"Low": 33.3, "Medium": 33.3, "High": 33.3},
                "confidence": 60.0,
                "top_risk_factors": [],
                "model_version": "rule-based-v1",
            },
        }

    def _get_top_factors(self, feature_vector, importance, metrics) -> list:
        """Get top contributing risk factors with explanations."""
        factors = []
        sorted_indices = np.argsort(importance)[::-1]

        for idx in sorted_indices[:3]:
            name = FEATURE_NAMES[idx]
            value = feature_vector[idx]
            impact = "HIGH" if importance[idx] > 0.2 else "MEDIUM" if importance[idx] > 0.1 else "LOW"

            explanation = self._explain_factor(name, value)
            factors.append({
                "feature": name,
                "value": round(value, 4),
                "impact": f"{impact} — {explanation}",
            })

        return factors

    @staticmethod
    def _explain_factor(name: str, value: float) -> str:
        """Generate human-readable explanation for a risk factor."""
        explanations = {
            "volatility": f"Portfolio volatility is {value:.1%}",
            "sharpe_ratio": f"Sharpe ratio is {value:.2f}",
            "max_drawdown": f"Maximum drawdown is {value:.1%}",
            "beta": f"Portfolio beta is {value:.2f}",
            "var_daily": f"Daily VaR is {value:.1%}",
            "diversification_ratio": f"Diversification is {value:.1%}",
            "sector_concentration": f"Sector concentration is {value:.1%}",
            "holding_count": f"Portfolio has {int(value)} holdings",
        }
        return explanations.get(name, f"{name} = {value:.4f}")

    @staticmethod
    def _camel_to_snake(name: str) -> str:
        """Convert camelCase to snake_case for flexible key matching."""
        import re
        s1 = re.sub(r"(.)([A-Z][a-z]+)", r"\1_\2", name)
        return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s1).lower()

    def save(self, path: str):
        """Save model to disk."""
        data = {
            "model": self.model,
            "scaler": self.scaler,
            "version": self.model_version,
            "accuracy": self.training_accuracy,
        }
        os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
        joblib.dump(data, path)
        logger.info(f"Risk classifier saved to {path}")

    def load(self, path: str):
        """Load model from disk."""
        data = joblib.load(path)
        self.model = data["model"]
        self.scaler = data["scaler"]
        self.model_version = data.get("version", "v1.0-xgb-risk")
        self.training_accuracy = data.get("accuracy", 0.0)
        self.is_trained = True
        logger.info(f"Risk classifier loaded from {path}")
