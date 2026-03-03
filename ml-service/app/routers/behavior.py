"""
Behavior Router — User behavior analysis endpoints.
"""
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from app.services.model_registry import registry
from app.services import data_service

logger = logging.getLogger(__name__)
router = APIRouter()


class BehaviorProfileRequest(BaseModel):
    userId: str
    transactions: Optional[List[dict]] = None


@router.post("/profile")
async def get_behavior_profile(request: BehaviorProfileRequest):
    """
    Get user behavioral profile and cluster assignment.
    """
    try:
        behavior_model = registry.get_model("user_behavior")
        if not behavior_model:
            raise HTTPException(status_code=503, detail="User behavior model not loaded")

        # Get transactions from request or MongoDB
        transactions = request.transactions
        if not transactions:
            transactions = data_service.get_user_transactions(request.userId)

        if not transactions:
            return {
                "success": True,
                "data": {
                    "cluster": {
                        "cluster_id": -1,
                        "cluster_label": "New User",
                        "features": behavior_model._default_features(),
                        "model_version": behavior_model.model_version,
                    },
                    "behavioral_score": {
                        "risk_appetite_trend": 0,
                        "activity_level": "New",
                        "sector_shift": False,
                        "change_magnitude": 0,
                    },
                },
            }

        # Compute features
        features = behavior_model.compute_user_features(transactions)

        # Predict cluster
        cluster = behavior_model.predict_cluster(features)

        # Behavioral change score
        behavioral_score = behavior_model.compute_behavioral_score(transactions)

        return {
            "success": True,
            "data": {
                "cluster": cluster,
                "behavioral_score": behavioral_score,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Behavior profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
