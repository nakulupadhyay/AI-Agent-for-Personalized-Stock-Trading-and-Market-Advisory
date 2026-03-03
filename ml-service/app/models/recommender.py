"""
Hybrid Personalized Stock Recommendation Engine.

Combines:
  1. Content-Based Filtering (stock features vs user preferences)
  2. Risk-Profile Matching (volatility/beta compatibility)
  3. Sentiment Boost (FinBERT sentiment modifier)

Collaborative filtering requires sufficient user data and
is activated once enough users exist in the system.
"""
import logging
import numpy as np
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)

# Stock data for Indian market (static baseline)
STOCK_DATABASE = {
    "RELIANCE": {"sector": "Energy", "market_cap": "Large", "pe": 28.5, "dividend_yield": 0.3, "beta": 0.9, "volatility": 0.22},
    "TCS": {"sector": "IT", "market_cap": "Large", "pe": 30.2, "dividend_yield": 1.2, "beta": 0.6, "volatility": 0.15},
    "INFY": {"sector": "IT", "market_cap": "Large", "pe": 27.8, "dividend_yield": 1.5, "beta": 0.7, "volatility": 0.18},
    "HDFCBANK": {"sector": "Banking", "market_cap": "Large", "pe": 20.1, "dividend_yield": 1.0, "beta": 0.8, "volatility": 0.16},
    "ICICIBANK": {"sector": "Banking", "market_cap": "Large", "pe": 18.5, "dividend_yield": 0.8, "beta": 0.9, "volatility": 0.19},
    "WIPRO": {"sector": "IT", "market_cap": "Large", "pe": 22.3, "dividend_yield": 1.1, "beta": 0.65, "volatility": 0.17},
    "SBIN": {"sector": "Banking", "market_cap": "Large", "pe": 10.5, "dividend_yield": 1.5, "beta": 1.2, "volatility": 0.28},
    "ITC": {"sector": "FMCG", "market_cap": "Large", "pe": 25.0, "dividend_yield": 3.5, "beta": 0.5, "volatility": 0.12},
    "LT": {"sector": "Infrastructure", "market_cap": "Large", "pe": 32.0, "dividend_yield": 0.8, "beta": 1.0, "volatility": 0.20},
    "BHARTIARTL": {"sector": "Telecom", "market_cap": "Large", "pe": 65.0, "dividend_yield": 0.5, "beta": 0.7, "volatility": 0.21},
    "HCLTECH": {"sector": "IT", "market_cap": "Large", "pe": 24.5, "dividend_yield": 1.3, "beta": 0.6, "volatility": 0.16},
    "MARUTI": {"sector": "Automobile", "market_cap": "Large", "pe": 35.0, "dividend_yield": 0.7, "beta": 1.1, "volatility": 0.23},
    "TATAMOTORS": {"sector": "Automobile", "market_cap": "Large", "pe": 15.0, "dividend_yield": 0.2, "beta": 1.5, "volatility": 0.35},
    "SUNPHARMA": {"sector": "Pharmaceuticals", "market_cap": "Large", "pe": 38.0, "dividend_yield": 0.5, "beta": 0.55, "volatility": 0.19},
    "ADANIENT": {"sector": "Infrastructure", "market_cap": "Large", "pe": 50.0, "dividend_yield": 0.1, "beta": 1.8, "volatility": 0.45},
}


class StockRecommender:
    """
    Hybrid recommendation engine that scores each stock
    based on content-based features, risk compatibility,
    and sentiment signals.
    """

    def __init__(self):
        self.model_version = "v1.0-hybrid"

    def recommend(
        self,
        user_risk_level: str = "Medium",
        preferred_sectors: list = None,
        sentiment_scores: dict = None,
        current_holdings: list = None,
        top_k: int = 5,
    ) -> list:
        """
        Generate personalized stock recommendations.

        Args:
            user_risk_level: 'Low', 'Medium', or 'High'
            preferred_sectors: List of sector names the user prefers
            sentiment_scores: Dict of {symbol: sentiment_score (-1 to 1)}
            current_holdings: List of symbols already held
            top_k: Number of recommendations to return

        Returns:
            List of recommendation dicts, sorted by final_score descending
        """
        if preferred_sectors is None:
            preferred_sectors = []
        if sentiment_scores is None:
            sentiment_scores = {}
        if current_holdings is None:
            current_holdings = []

        recommendations = []

        for symbol, info in STOCK_DATABASE.items():
            # Skip stocks already in portfolio
            if symbol in current_holdings:
                continue

            # 1. Content-Based Score
            cb_score = self._content_based_score(info, preferred_sectors)

            # 2. Risk Compatibility Score
            risk_score = self._risk_compatibility_score(user_risk_level, info)

            # 3. Sentiment Boost
            sentiment_boost = sentiment_scores.get(symbol, 0.0)
            sentiment_normalized = (sentiment_boost + 1) / 2  # Map [-1,1] to [0,1]

            # 4. Final weighted score
            final_score = (
                0.35 * cb_score +
                0.35 * risk_score +
                0.20 * sentiment_normalized +
                0.10 * self._fundamental_score(info)
            )

            # Determine action
            if final_score > 0.65:
                action = "BUY"
            elif final_score > 0.45:
                action = "HOLD"
            else:
                action = "AVOID"

            explanation = self._generate_explanation(
                symbol, info, user_risk_level, cb_score, risk_score,
                sentiment_boost, preferred_sectors
            )

            recommendations.append({
                "symbol": symbol,
                "company": self._get_company_name(symbol),
                "sector": info["sector"],
                "final_score": round(final_score, 3),
                "scores": {
                    "content_based": round(cb_score, 3),
                    "risk_match": round(risk_score, 3),
                    "sentiment": round(sentiment_normalized, 3),
                    "fundamental": round(self._fundamental_score(info), 3),
                },
                "action": action,
                "confidence": round(final_score * 100, 1),
                "explanation": explanation,
            })

        # Sort by final_score descending
        recommendations.sort(key=lambda x: x["final_score"], reverse=True)

        # Rank
        for i, rec in enumerate(recommendations[:top_k]):
            rec["rank"] = i + 1

        return recommendations[:top_k]

    def _content_based_score(self, stock_info: dict, preferred_sectors: list) -> float:
        """Score based on how well the stock matches user preferences."""
        score = 0.5  # Base score

        # Sector match
        if stock_info["sector"] in preferred_sectors:
            score += 0.3
        elif preferred_sectors:
            score -= 0.1

        # Large-cap bonus (safer)
        if stock_info["market_cap"] == "Large":
            score += 0.1

        # PE sweet spot (15-35 is reasonable)
        pe = stock_info["pe"]
        if 15 <= pe <= 35:
            score += 0.1
        elif pe > 50:
            score -= 0.1

        return max(0, min(1, score))

    def _risk_compatibility_score(self, user_risk: str, stock_info: dict) -> float:
        """
        Score stock based on risk compatibility.
        Conservative users get high scores for low-volatility stocks.
        """
        thresholds = {
            "Low": {"max_vol": 0.20, "max_beta": 0.8},
            "Medium": {"max_vol": 0.35, "max_beta": 1.2},
            "High": {"max_vol": 1.00, "max_beta": 3.0},
        }

        t = thresholds.get(user_risk, thresholds["Medium"])
        vol = stock_info["volatility"]
        beta = stock_info["beta"]

        vol_score = max(0, 1 - (vol / t["max_vol"]))
        beta_score = max(0, 1 - (beta / t["max_beta"]))

        return 0.6 * vol_score + 0.4 * beta_score

    def _fundamental_score(self, stock_info: dict) -> float:
        """Score based on fundamental attractiveness."""
        score = 0.5

        # Dividend yield bonus
        if stock_info["dividend_yield"] > 1.0:
            score += 0.2
        elif stock_info["dividend_yield"] > 2.0:
            score += 0.3

        # Reasonable PE
        pe = stock_info["pe"]
        if pe < 20:
            score += 0.2
        elif pe < 30:
            score += 0.1

        return max(0, min(1, score))

    def _generate_explanation(
        self, symbol, info, risk_level, cb_score, risk_score,
        sentiment, preferred_sectors
    ) -> str:
        """Generate human-readable explanation for the recommendation."""
        parts = []

        if info["sector"] in preferred_sectors:
            parts.append(f"Matches your {info['sector']} sector preference")

        if risk_score > 0.7:
            parts.append(f"Well-suited for your {risk_level} risk profile")
        elif risk_score < 0.3:
            risk_adj = "conservative" if risk_level == "Low" else "moderate"
            parts.append(f"Higher volatility than typical for {risk_adj} investors")

        if sentiment > 0.3:
            parts.append("Positive market sentiment detected")
        elif sentiment < -0.3:
            parts.append("Negative sentiment — proceed with caution")

        if info["dividend_yield"] > 1.5:
            parts.append(f"Attractive dividend yield ({info['dividend_yield']}%)")

        if not parts:
            parts.append("Standard market characteristics")

        return " • ".join(parts)

    @staticmethod
    def _get_company_name(symbol: str) -> str:
        """Get company name from symbol."""
        names = {
            "RELIANCE": "Reliance Industries Ltd",
            "TCS": "Tata Consultancy Services",
            "INFY": "Infosys Ltd",
            "HDFCBANK": "HDFC Bank Ltd",
            "ICICIBANK": "ICICI Bank Ltd",
            "WIPRO": "Wipro Ltd",
            "SBIN": "State Bank of India",
            "ITC": "ITC Ltd",
            "LT": "Larsen & Toubro Ltd",
            "BHARTIARTL": "Bharti Airtel Ltd",
            "HCLTECH": "HCL Technologies Ltd",
            "MARUTI": "Maruti Suzuki India Ltd",
            "TATAMOTORS": "Tata Motors Ltd",
            "SUNPHARMA": "Sun Pharmaceutical Industries",
            "ADANIENT": "Adani Enterprises Ltd",
        }
        return names.get(symbol, symbol)
