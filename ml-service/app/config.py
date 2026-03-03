"""
Centralized configuration for the ML service.
Reads environment variables from .env file.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    PORT: int = int(os.getenv("PORT", "5001"))
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017/ai-stock-trading")
    MODEL_DIR: str = os.getenv("MODEL_DIR", "./models")
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    DB_NAME: str = "ai-stock-trading"

    # Model defaults
    LSTM_LOOKBACK: int = 60
    TREND_ENSEMBLE_WEIGHTS: dict = {"lstm": 0.7, "xgboost": 0.3}

    # Indian stocks for tracking
    TRACKED_STOCKS: list = [
        "RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
        "WIPRO", "SBIN", "ITC", "LT", "BHARTIARTL",
    ]

    SECTOR_MAP: dict = {
        "RELIANCE": "Energy & Petrochemicals",
        "TCS": "Information Technology",
        "INFY": "Information Technology",
        "HDFCBANK": "Banking & Finance",
        "ICICIBANK": "Banking & Finance",
        "WIPRO": "Information Technology",
        "SBIN": "Banking & Finance",
        "BHARTIARTL": "Telecom",
        "ITC": "FMCG",
        "LT": "Infrastructure",
        "HCLTECH": "Information Technology",
        "MARUTI": "Automobile",
        "TATAMOTORS": "Automobile",
        "SUNPHARMA": "Pharmaceuticals",
        "ADANIENT": "Infrastructure",
    }


settings = Settings()
