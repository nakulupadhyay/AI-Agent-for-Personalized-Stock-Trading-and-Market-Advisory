"""
Health & Status Router — Service health check and model status.
Matches the /health endpoint expected by aiController.js.
"""
from fastapi import APIRouter
from app.services.model_registry import registry

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Service health check.
    Called by Node.js aiController.js: isMLServiceAvailable()
    """
    model_status = registry.get_status()

    return {
        "status": "healthy",
        "service": "StockAI ML Service",
        "version": "1.0.0",
        "models_loaded": model_status["total_models"],
        "models": model_status["models"],
    }


@router.get("/ready")
async def readiness_check():
    """
    Readiness probe — checks if all critical models are loaded
    and the service is ready to handle requests.
    Use this for Kubernetes/Docker readiness probes.
    """
    is_ready = registry.is_ready()
    status = registry.get_status()

    return {
        "ready": is_ready,
        "service": "StockAI ML Service",
        "models_loaded": status["total_models"],
        "models": {
            name: info.get("available", False)
            for name, info in status.get("models", {}).items()
        },
    }


@router.get("/ml-status")
async def ml_status():
    """Detailed ML service status."""
    return {
        "success": True,
        "data": {
            "available": True,
            "service": "StockAI ML Service",
            "version": "1.0.0",
            **registry.get_status(),
        },
    }
