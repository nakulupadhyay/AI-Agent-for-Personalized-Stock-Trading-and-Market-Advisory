"""
ml_service/utils/config.py
──────────────────────────
Centralised configuration loaded from environment variables.
All other modules import from here instead of calling os.getenv directly.
"""

import os
from dotenv import load_dotenv

load_dotenv()  # reads ml_service/.env if present


class Settings:
    # Server
    ML_PORT: int         = int(os.getenv("ML_PORT", 8000))
    ML_HOST: str         = os.getenv("ML_HOST", "0.0.0.0")
    DEBUG: bool          = os.getenv("DEBUG", "true").lower() == "true"

    # API Keys
    NEWSAPI_KEY: str         = os.getenv("NEWSAPI_KEY", "0ba1b9d79e19487d9adcc00ba2ed7539")
    ALPHA_VANTAGE_KEY: str   = os.getenv("ALPHA_VANTAGE_KEY", "X9KVDWEJ2HP9VB83")

    # CORS
    ALLOWED_ORIGINS: list    = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5000,http://localhost:5173"
    ).split(",")

    # Model Parameters
    DEFAULT_PERIOD: str      = "6mo"       # yfinance period string
    MIN_HISTORY_ROWS: int    = 40          # minimum candles for ML
    TRAIN_TEST_SPLIT: float  = 0.80        # 80% train / 20% test
    SMA_SHORT: int           = 20
    SMA_LONG:  int           = 50

    # Sentiment thresholds (VADER compound score)
    VADER_POSITIVE_THRESH: float = 0.05
    VADER_NEGATIVE_THRESH: float = -0.05

    # Recommendation thresholds per risk level
    RISK_CONFIG: dict = {
        "low"   : {"price_w": 0.35, "sent_w": 0.65, "buy": 0.28, "sell": -0.22},
        "medium": {"price_w": 0.55, "sent_w": 0.45, "buy": 0.14, "sell": -0.14},
        "high"  : {"price_w": 0.72, "sent_w": 0.28, "buy": 0.05, "sell": -0.05},
    }


settings = Settings()
