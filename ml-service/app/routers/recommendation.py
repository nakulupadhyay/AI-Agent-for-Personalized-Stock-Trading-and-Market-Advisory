"""
Recommendation Router — Personalized stock recommendation endpoint.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.model_registry import registry

logger = logging.getLogger(__name__)
router = APIRouter()


class RecommendationRequest(BaseModel):
    userId: Optional[str] = None
    riskProfile: Optional[str] = "Medium"
    preferredSectors: Optional[List[str]] = []
    currentHoldings: Optional[List[str]] = []
    topK: Optional[int] = 5


@router.post("")
async def get_recommendations(request: RecommendationRequest):
    """
    Get personalized stock recommendations.
    Uses risk profile, sector preferences, and sentiment for ranking.
    """
    try:
        from app.models.recommender import StockRecommender
        recommender = StockRecommender()

        # Get sentiment scores for all stocks
        sentiment_scores = {}
        sentiment_model = registry.get_model("sentiment")
        if sentiment_model:
            for symbol in ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK",
                           "WIPRO", "SBIN", "ITC", "LT", "BHARTIARTL"]:
                try:
                    result = sentiment_model.analyze(f"{symbol} stock market news analysis")
                    if result["label"] == "positive":
                        sentiment_scores[symbol] = result["confidence"] / 100
                    elif result["label"] == "negative":
                        sentiment_scores[symbol] = -(result["confidence"] / 100)
                    else:
                        sentiment_scores[symbol] = 0
                except Exception:
                    sentiment_scores[symbol] = 0

        recommendations = recommender.recommend(
            user_risk_level=request.riskProfile or "Medium",
            preferred_sectors=request.preferredSectors or [],
            sentiment_scores=sentiment_scores,
            current_holdings=request.currentHoldings or [],
            top_k=request.topK or 5,
        )

        return {
            "success": True,
            "data": {
                "recommendations": recommendations,
                "user_risk_profile": request.riskProfile,
                "model_version": "v1.0-hybrid",
                "total_stocks_analyzed": 15,
            },
        }

    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
