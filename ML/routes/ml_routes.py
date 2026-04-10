"""
ml_service/routes/ml_routes.py
────────────────────────────────
All FastAPI route handlers for the ML microservice.

Endpoints
─────────
  POST /ml/analyze            — full AI pipeline (main endpoint)
  GET  /ml/stock/{ticker}     — live quote + OHLCV history + indicators
  GET  /ml/news/{ticker}      — news articles
  POST /ml/predict            — price prediction only
  POST /ml/sentiment          — sentiment analysis only
  GET  /ml/health             — health check
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional

from services.stock_data_service  import get_live_quote, get_ohlcv_for_json, get_historical_data
from services.news_service        import get_stock_news, extract_headlines
from models.price_prediction_model import run_price_prediction
from models.sentiment_model        import get_aggregate_sentiment
from models.recommendation_engine  import get_recommendation
from utils.helpers                 import validate_ticker, validate_risk_level, now_iso

router = APIRouter(prefix="/ml", tags=["ML Service"])


# ─────────────────────────────────────────────
# Request / Response Models (Pydantic)
# ─────────────────────────────────────────────

class AnalysisRequest(BaseModel):
    ticker            : str             = Field(..., example="AAPL")
    period            : str             = Field("6mo",    example="6mo")
    risk_level        : str             = Field("medium", example="medium")
    investment_amount : float           = Field(0.0,      example=5000.0)
    max_news          : int             = Field(10,       ge=1, le=20)


class PredictRequest(BaseModel):
    ticker : str = Field(..., example="TSLA")
    period : str = Field("6mo", example="6mo")


class SentimentRequest(BaseModel):
    headlines: list[str] = Field(..., min_length=1)


# ─────────────────────────────────────────────
# GET /ml/health
# ─────────────────────────────────────────────

@router.get("/health")
def health_check():
    return {
        "status"   : "ok",
        "service"  : "ML Microservice (Python/FastAPI)",
        "timestamp": now_iso(),
        "models"   : [
            "Linear Regression (Price Prediction)",
            "VADER + TextBlob (Sentiment Analysis)",
            "Rule-Based Engine (Recommendation)",
        ],
    }


# ─────────────────────────────────────────────
# GET /ml/stock/{ticker}
# ─────────────────────────────────────────────

@router.get("/stock/{ticker}")
def get_stock_data(
    ticker : str,
    period : str = Query("6mo", regex="^(1mo|3mo|6mo|1y|2y)$"),
):
    """
    Returns:
      • live quote snapshot
      • full OHLCV history with technical indicators
    """
    try:
        clean   = validate_ticker(ticker)
        quote   = get_live_quote(clean)
        history = get_ohlcv_for_json(clean, period)
        return {
            "success": True,
            "ticker" : clean,
            "period" : period,
            "quote"  : quote,
            "history": history,
            "count"  : len(history),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# GET /ml/news/{ticker}
# ─────────────────────────────────────────────

@router.get("/news/{ticker}")
def get_news(
    ticker      : str,
    max_articles: int = Query(10, ge=1, le=20),
):
    """Returns recent news articles for the given ticker."""
    try:
        clean    = validate_ticker(ticker)
        quote    = get_live_quote(clean)    # to get company name for better search
        articles = get_stock_news(
            ticker       = clean,
            company_name = quote.get("company_name", ""),
            max_articles = max_articles,
        )
        return {
            "success" : True,
            "ticker"  : clean,
            "count"   : len(articles),
            "articles": articles,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# POST /ml/predict
# ─────────────────────────────────────────────

@router.post("/predict")
def predict_price(req: PredictRequest):
    """
    Run only the price prediction model for a given ticker.
    Returns prediction dict + model metrics.
    """
    try:
        clean   = validate_ticker(req.ticker)
        df      = get_historical_data(clean, req.period)
        result  = run_price_prediction(df)
        return {"success": True, "ticker": clean, "prediction": result}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# POST /ml/sentiment
# ─────────────────────────────────────────────

@router.post("/sentiment")
def analyze_sentiment(req: SentimentRequest):
    """
    Run sentiment analysis on a list of headlines.
    Returns individual results + aggregate.
    """
    try:
        result = get_aggregate_sentiment(req.headlines)
        return {"success": True, "sentiment": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────
# POST /ml/analyze  ← Main endpoint
# ─────────────────────────────────────────────

@router.post("/analyze")
def run_full_analysis(req: AnalysisRequest):
    """
    Full AI analysis pipeline:

      1. Fetch live quote
      2. Download OHLCV history (yfinance)
      3. Run Linear Regression price prediction (scikit-learn)
      4. Fetch news (NewsAPI → yfinance fallback)
      5. Run VADER + TextBlob sentiment analysis
      6. Generate BUY / HOLD / SELL recommendation
      7. Return everything to the Node.js backend

    This is the single endpoint the Express backend calls.
    """
    try:
        # ── Validate ──
        ticker    = validate_ticker(req.ticker)
        risk      = validate_risk_level(req.risk_level)

        # ── Step 1: Live quote ──
        try:
            quote = get_live_quote(ticker)
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Could not find ticker '{ticker}': {e}"
            )

        # ── Step 2: Historical data ──
        df = get_historical_data(ticker, req.period)

        # ── Step 3: Price prediction ──
        prediction_error = None
        try:
            prediction = run_price_prediction(df)
        except Exception as e:
            prediction_error = str(e)
            cp = quote.get("current_price") or 0.0
            prediction = {
                "predicted_price"     : cp,
                "current_price"       : cp,
                "price_change"        : 0.0,
                "change_pct"          : 0.0,
                "direction"           : "FLAT",
                "confidence_band_low" : cp,
                "confidence_band_high": cp,
                "model_metrics"       : {"rmse": None, "mae": None, "r2": None},
                "test_actual"         : [],
                "test_predicted"      : [],
            }

        # ── Step 4: News ──
        articles  = []
        headlines = []
        try:
            articles  = get_stock_news(ticker, quote.get("company_name",""), req.max_news)
            headlines = extract_headlines(articles)
        except Exception:
            pass  # non-fatal

        # ── Step 5: Sentiment ──
        try:
            sentiment = get_aggregate_sentiment(headlines)
        except Exception:
            sentiment = {
                "overall_label":"NEUTRAL","avg_blended":0.0,"aggregate_score":0.0,
                "positive_count":0,"negative_count":0,"neutral_count":0,
                "total_articles":0,"confidence":0.0,"emoji":"🟡","individual":[],
            }

        # ── Step 6: Recommendation ──
        recommendation = get_recommendation(
            prediction        = prediction,
            sentiment         = sentiment,
            risk_level        = risk,
            investment_amount = req.investment_amount,
        )

        # ── Step 7: Build response ──
        # Send last 90 candles for the chart (enough for SMA-50)
        from utils.helpers import clean_df_for_json
        from services.stock_data_service import get_historical_with_indicators
        df_with_ind = get_historical_with_indicators(ticker, req.period)
        history_json = clean_df_for_json(df_with_ind)[-90:]

        return {
            "success"         : True,
            "ticker"          : ticker,
            "timestamp"       : now_iso(),
            "quote"           : quote,
            "history"         : history_json,
            "prediction"      : prediction,
            "sentiment"       : sentiment,
            "recommendation"  : recommendation,
            "news_articles"   : articles,
            "prediction_error": prediction_error,
        }

    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {e}")
