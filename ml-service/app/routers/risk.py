"""
Risk Router — Portfolio risk classification endpoint.
Matches POST /predict-risk called by riskAnalysisController.js.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from app.services.model_registry import registry

logger = logging.getLogger(__name__)
router = APIRouter()


class RiskPredictionRequest(BaseModel):
    volatility: float = 0.2
    sharpeRatio: Optional[float] = 1.0
    sharpe_ratio: Optional[float] = None
    maxDrawdown: Optional[float] = 0.1
    max_drawdown: Optional[float] = None
    beta: Optional[float] = 1.0
    var_daily: Optional[float] = None
    sectorConcentration: Optional[float] = 0.3
    sector_concentration: Optional[float] = None
    diversificationRatio: Optional[float] = 0.5
    diversification_ratio: Optional[float] = None
    holdingCount: Optional[int] = 5
    holding_count: Optional[int] = None


@router.post("")
async def predict_risk(request: RiskPredictionRequest):
    """
    Classify portfolio risk into Low/Medium/High.
    Called by Node.js riskAnalysisController.js: POST /predict-risk

    Accepts both camelCase and snake_case keys for flexibility.
    """
    try:
        risk_model = registry.get_model("risk_classifier")
        if not risk_model:
            raise HTTPException(status_code=503, detail="Risk classifier not loaded")

        # Normalize keys — accept both camelCase and snake_case
        metrics = {
            "volatility": request.volatility,
            "sharpe_ratio": request.sharpe_ratio or request.sharpeRatio or 1.0,
            "max_drawdown": request.max_drawdown or request.maxDrawdown or 0.1,
            "beta": request.beta or 1.0,
            "var_daily": request.var_daily or 0.02,
            "diversification_ratio": request.diversification_ratio or request.diversificationRatio or 0.5,
            "sector_concentration": request.sector_concentration or request.sectorConcentration or 0.3,
            "holding_count": request.holding_count or request.holdingCount or 5,
        }

        result = risk_model.predict(metrics)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
