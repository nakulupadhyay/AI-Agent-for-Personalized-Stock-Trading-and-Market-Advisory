"""
Prediction Router — Market trend prediction endpoints.
Matches POST /predict/recommendation called by aiController.js.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.model_registry import registry
from app.services.feature_engine import get_features_for_prediction

logger = logging.getLogger(__name__)
router = APIRouter()


class RecommendationRequest(BaseModel):
    symbol: str
    currentPrice: Optional[float] = None
    sentimentText: Optional[str] = None
    model: Optional[str] = "finbert"


class SentimentRequest(BaseModel):
    text: str
    model: Optional[str] = "finbert"


@router.post("/recommendation")
async def predict_recommendation(request: RecommendationRequest):
    """
    AI-powered stock recommendation.
    Called by Node.js aiController.js: POST /predict/recommendation

    Combines:
    - Technical indicator analysis (trend model)
    - Sentiment analysis (FinBERT)
    - Risk-aware recommendation
    """
    try:
        symbol = request.symbol.upper()

        # 1. Get technical features
        features = get_features_for_prediction(symbol)
        current_price = request.currentPrice or features.get("close", 0)

        # 2. Run trend prediction
        trend_model = registry.get_model("trend")
        trend_prediction = {}
        if trend_model:
            trend_prediction = trend_model.predict(features)

        # 3. Run sentiment analysis on provided text
        sentiment_result = {"label": "neutral", "confidence": 50}
        sentiment_model = registry.get_model("sentiment")
        if sentiment_model and request.sentimentText:
            sentiment_result = sentiment_model.analyze(request.sentimentText)

        # 4. Combine into recommendation
        direction = trend_prediction.get("direction", "HOLD")
        trend_confidence = trend_prediction.get("confidence", 50)
        sentiment_label = sentiment_result.get("label", "neutral")
        sentiment_confidence = sentiment_result.get("confidence", 50)

        # Adjust recommendation based on sentiment
        if sentiment_label == "positive" and direction == "HOLD":
            direction = "BUY"
            trend_confidence = min(trend_confidence + 5, 90)
        elif sentiment_label == "negative" and direction == "HOLD":
            direction = "SELL"
            trend_confidence = min(trend_confidence + 5, 85)
        elif sentiment_label == "negative" and direction == "BUY":
            trend_confidence = max(trend_confidence - 10, 40)

        # Generate reasoning
        signals = trend_prediction.get("signals", [])
        reasoning = _generate_reasoning(direction, signals, sentiment_label, features)

        # Target price
        target_price = trend_prediction.get("targetPrice", current_price)
        if target_price == 0:
            if direction == "BUY":
                target_price = current_price * 1.05
            elif direction == "SELL":
                target_price = current_price * 0.95
            else:
                target_price = current_price * 1.01

        return {
            "success": True,
            "data": {
                "symbol": symbol,
                "recommendation": direction,
                "confidence": round(trend_confidence, 1),
                "reasoning": reasoning,
                "targetPrice": round(target_price, 2),
                "sentimentBreakdown": {
                    "label": sentiment_label,
                    "confidence": sentiment_confidence,
                    "probabilities": sentiment_result.get("probabilities", {}),
                },
                "technicalIndicators": {
                    "rsi_14": features.get("rsi_14", 50),
                    "macd": features.get("macd", 0),
                    "sma_50_ratio": features.get("price_sma50_ratio", 1),
                    "atr_14": features.get("atr_14", 0),
                },
                "model": trend_prediction.get("model", "hybrid-v1"),
                "method": trend_prediction.get("method", "combined"),
            },
        }

    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sentiment")
async def predict_sentiment(request: SentimentRequest):
    """
    Sentiment analysis endpoint.
    Called by Node.js aiController.js: POST /predict/sentiment
    """
    try:
        sentiment_model = registry.get_model("sentiment")
        if not sentiment_model:
            raise HTTPException(status_code=503, detail="Sentiment model not loaded")

        result = sentiment_model.analyze(request.text)

        return {
            "success": True,
            "data": {
                "label": result["label"].capitalize(),
                "confidence": result["confidence"],
                "probabilities": result["probabilities"],
                "model": result["model"],
                "text_analyzed": request.text[:100] + "..." if len(request.text) > 100 else request.text,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sentiment error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def _generate_reasoning(direction: str, signals: list, sentiment: str, features: dict) -> str:
    """Generate human-readable reasoning for the recommendation."""
    parts = []

    if direction == "BUY":
        parts.append("Bullish technical signals detected")
    elif direction == "SELL":
        parts.append("Bearish technical indicators present")
    else:
        parts.append("Mixed technical signals suggest caution")

    # RSI context
    rsi = features.get("rsi_14", 50)
    if rsi < 30:
        parts.append(f"RSI at {rsi:.0f} indicates oversold conditions")
    elif rsi > 70:
        parts.append(f"RSI at {rsi:.0f} indicates overbought conditions")

    # Sentiment context
    if sentiment == "positive":
        parts.append("Positive news sentiment supports the outlook")
    elif sentiment == "negative":
        parts.append("Negative news sentiment adds caution")

    # Add technical signals if available
    for signal in signals[:2]:
        parts.append(signal)

    return ". ".join(parts) + "."
