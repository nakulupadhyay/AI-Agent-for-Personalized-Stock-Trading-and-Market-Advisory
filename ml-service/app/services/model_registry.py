"""
Model Registry — Loads, manages, and serves all ML models.
Handles model versioning and provides a unified access API.
"""
import os
import logging
import joblib
import json
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Central registry that loads all ML models at startup
    and provides a unified interface to access them.
    """

    def __init__(self):
        self.models = {}
        self.metadata = {}
        self._loaded = False

    def load_all_models(self, version: str = "latest"):
        """Load all available models from disk."""
        logger.info(f"Loading models (version={version})...")

        model_dir = settings.MODEL_DIR
        os.makedirs(model_dir, exist_ok=True)

        # Load risk classifier
        self._load_risk_model(model_dir)

        # Load sentiment model
        self._load_sentiment_model()

        # Load trend model
        self._load_trend_model(model_dir)

        # Load user behavior model
        self._load_behavior_model(model_dir)

        self._loaded = True
        logger.info(f"Model registry ready. Loaded models: {list(self.models.keys())}")

    def _load_risk_model(self, model_dir: str):
        """Load or train the risk classifier."""
        try:
            from app.models.risk_classifier import RiskClassifier
            risk_model = RiskClassifier()

            model_path = os.path.join(model_dir, "risk_classifier.pkl")
            if os.path.exists(model_path):
                risk_model.load(model_path)
                logger.info("Loaded risk classifier from disk")
            else:
                logger.info("Training risk classifier from synthetic data...")
                risk_model.train_from_synthetic()
                risk_model.save(model_path)
                logger.info("Risk classifier trained and saved")

            self.models["risk_classifier"] = risk_model
            self.metadata["risk_classifier"] = {
                "version": "v1.0",
                "loaded_at": datetime.now().isoformat(),
                "type": "XGBoost Classifier",
            }
        except Exception as e:
            logger.error(f"Failed to load risk classifier: {e}")

    def _load_sentiment_model(self):
        """Load the sentiment analysis model (FinBERT)."""
        try:
            from app.models.sentiment import SentimentAnalyzer
            sentiment_model = SentimentAnalyzer()
            self.models["sentiment"] = sentiment_model
            self.metadata["sentiment"] = {
                "version": "v1.0",
                "loaded_at": datetime.now().isoformat(),
                "type": sentiment_model.model_type,
            }
            logger.info(f"Loaded sentiment model: {sentiment_model.model_type}")
        except Exception as e:
            logger.error(f"Failed to load sentiment model: {e}")

    def _load_trend_model(self, model_dir: str):
        """Load the market trend prediction model."""
        try:
            from app.models.trend_model import TrendPredictor
            trend_model = TrendPredictor()

            model_path = os.path.join(model_dir, "trend_xgb.pkl")
            if os.path.exists(model_path):
                trend_model.load(model_path)
                logger.info("Loaded trend model from disk")
            else:
                logger.info("Trend model will use rule-based predictions until trained")

            self.models["trend"] = trend_model
            self.metadata["trend"] = {
                "version": "v1.0",
                "loaded_at": datetime.now().isoformat(),
                "type": "LSTM + XGBoost Ensemble",
            }
        except Exception as e:
            logger.error(f"Failed to load trend model: {e}")

    def _load_behavior_model(self, model_dir: str):
        """Load the user behavior model."""
        try:
            from app.models.user_behavior import UserBehaviorModel
            behavior_model = UserBehaviorModel()

            model_path = os.path.join(model_dir, "user_kmeans.pkl")
            if os.path.exists(model_path):
                behavior_model.load(model_path)
                logger.info("Loaded user behavior model from disk")

            self.models["user_behavior"] = behavior_model
            self.metadata["user_behavior"] = {
                "version": "v1.0",
                "loaded_at": datetime.now().isoformat(),
                "type": "K-Means + Behavioral Scorer",
            }
        except Exception as e:
            logger.error(f"Failed to load user behavior model: {e}")

    def get_model(self, name: str):
        """Get a loaded model by name."""
        return self.models.get(name)

    def get_status(self) -> dict:
        """Get status of all loaded models."""
        return {
            "loaded": self._loaded,
            "models": {
                name: {
                    "available": True,
                    **meta,
                }
                for name, meta in self.metadata.items()
            },
            "total_models": len(self.models),
        }


# Singleton instance
registry = ModelRegistry()
