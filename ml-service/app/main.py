"""
StockAI ML Service — FastAPI Application Entry Point.

This is the main entry point for the Python ML service.
It loads all ML models at startup and exposes REST endpoints
that the Node.js backend (aiController.js, riskAnalysisController.js,
sentimentController.js) connects to.

Start with:
    cd ml-service
    pip install -r requirements.txt
    python -m uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload
"""
import logging
import os
import time
import uuid
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan events.
    Loads all ML models at startup, cleans up on shutdown.
    """
    logger.info("=" * 60)
    logger.info("  StockAI ML Service — Starting Up")
    logger.info("=" * 60)

    # Ensure model directory exists
    os.makedirs(settings.MODEL_DIR, exist_ok=True)

    # Load all models
    from app.services.model_registry import registry
    registry.load_all_models()

    status = registry.get_status()
    logger.info(f"Models loaded: {status['total_models']}")
    for name, info in status.get("models", {}).items():
        logger.info(f"  ✓ {name}: {info.get('type', 'unknown')}")

    logger.info("=" * 60)
    logger.info(f"  ML Service ready on port {settings.PORT}")
    logger.info("=" * 60)

    yield

    # Shutdown
    logger.info("ML Service shutting down...")


# Create FastAPI app
app = FastAPI(
    title="StockAI ML Service",
    description="AI-powered stock market prediction, recommendation, and analysis service",
    version="1.0.0",
    lifespan=lifespan,
)


# ─── Middleware ────────────────────────────────────────────

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_metadata(request: Request, call_next):
    """Add request ID and response time tracking to every request."""
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()

    # Attach request_id to request state for use in handlers
    request.state.request_id = request_id

    response = await call_next(request)

    # Add response headers
    duration_ms = round((time.time() - start_time) * 1000, 1)
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time"] = f"{duration_ms}ms"

    # Log request/response
    logger.info(
        f"[{request_id}] {request.method} {request.url.path} → "
        f"{response.status_code} ({duration_ms}ms)"
    )

    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors."""
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(f"[{request_id}] Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "request_id": request_id,
        },
    )


# ─── Include Routers ──────────────────────────────────────
from app.routers import health, prediction, risk, sentiment_router, recommendation, behavior

# Health check (no prefix — matches GET /health)
app.include_router(health.router, tags=["Health"])

# Prediction — matches POST /predict/recommendation, /predict/sentiment
app.include_router(prediction.router, prefix="/predict", tags=["Prediction"])

# Risk — matches POST /predict-risk
app.include_router(risk.router, prefix="/predict-risk", tags=["Risk Classification"])

# Sentiment — matches GET /sentiment/trending, POST /sentiment/analyze
app.include_router(sentiment_router.router, prefix="/sentiment", tags=["Sentiment"])

# Recommendation — matches POST /recommend
app.include_router(recommendation.router, prefix="/recommend", tags=["Recommendation"])

# User Behavior — POST /behavior/profile
app.include_router(behavior.router, prefix="/behavior", tags=["User Behavior"])


# ─── Root ─────────────────────────────────────────────────
@app.get("/")
async def root():
    return {
        "service": "StockAI ML Service",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": {
            "health": "GET /health",
            "ready": "GET /ready",
            "prediction": "POST /predict/recommendation",
            "sentiment_predict": "POST /predict/sentiment",
            "sentiment_analyze": "POST /sentiment/analyze",
            "sentiment_trending": "GET /sentiment/trending",
            "risk": "POST /predict-risk",
            "recommend": "POST /recommend",
            "behavior": "POST /behavior/profile",
        },
    }
