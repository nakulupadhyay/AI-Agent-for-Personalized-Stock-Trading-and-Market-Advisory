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
        # Use 'is not None' to avoid treating valid 0.0 as falsy
        def _pick(snake, camel, default):
            if snake is not None:
                return snake
            if camel is not None:
                return camel
            return default

        metrics = {
            "volatility": request.volatility,
            "sharpe_ratio": _pick(request.sharpe_ratio, request.sharpeRatio, 1.0),
            "max_drawdown": _pick(request.max_drawdown, request.maxDrawdown, 0.1),
            "beta": request.beta if request.beta is not None else 1.0,
            "var_daily": request.var_daily if request.var_daily is not None else 0.02,
            "diversification_ratio": _pick(request.diversification_ratio, request.diversificationRatio, 0.5),
            "sector_concentration": _pick(request.sector_concentration, request.sectorConcentration, 0.3),
            "holding_count": _pick(request.holding_count, request.holdingCount, 5),
        }

        result = risk_model.predict(metrics)

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Risk prediction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
