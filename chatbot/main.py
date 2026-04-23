"""
CapitalWave AI - Local QA Chatbot Service
==========================================
Runs a 100% local HuggingFace extractive QA model (deepset/roberta-base-squad2).
No external API calls after the first model download (~500 MB, cached by HF).

Start:
    cd chatbot
    pip install -r requirements.txt
    python main.py          # or:  uvicorn main:app --reload --port 8000
"""

import sys, io
# Force UTF-8 output so Unicode prints don't crash on Windows cp1252
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import pipeline
import uvicorn

# ─── App Setup ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="CapitalWave Local QA Chatbot",
    description="Runs deepset/roberta-base-squad2 locally — no external APIs.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # CRA React
        "http://localhost:5173",   # Vite React (this project)
        "http://localhost:5000",   # Node backend
        "*",                       # dev convenience
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Load HuggingFace QA Model (once at startup) ─────────────────────────────
print("\n" + "=" * 60)
print("  Loading HuggingFace QA model…")
print("  Model : deepset/roberta-base-squad2")
print("  Note  : First run downloads ~500 MB (cached after that)")
print("=" * 60)

qa_pipeline = pipeline(
    "question-answering",
    model="deepset/roberta-base-squad2",
    tokenizer="deepset/roberta-base-squad2",
)

print("  [OK] Model loaded successfully!\n")


# ─── Built-in Stock Market Context ───────────────────────────────────────────
# This rich context is used when the caller does NOT supply their own context.
# Add more paragraphs here to improve answer coverage.
DEFAULT_STOCK_CONTEXT = """
Stock trading involves buying and selling shares of publicly listed companies on exchanges
such as the National Stock Exchange (NSE) and Bombay Stock Exchange (BSE) in India, or
NASDAQ and NYSE in the United States.

A BUY signal means that market analysis suggests the stock price is likely to rise,
making it a good time to purchase shares. A SELL signal indicates the price may decline
and it could be wise to exit the position. A HOLD signal means maintaining the current
position without buying or selling.

Portfolio management is the art of selecting and overseeing investments to meet long-term
financial goals while balancing risk and return. Diversification — spreading investments
across different sectors and asset classes — is a key risk-reduction strategy.

The P&L (Profit and Loss) of a trade is the difference between the selling price and the
buying price multiplied by the number of shares. A positive P&L means profit; a negative
P&L means a loss.

Paper trading is a simulated trading environment where users can place virtual buy or
sell orders using fake money to practice trading strategies without any real financial risk.

Technical analysis uses historical price charts, volume data, and indicators such as
Moving Averages (MA), Relative Strength Index (RSI), and MACD to forecast future
price movements.  Fundamental analysis evaluates a company's financial health through
metrics like Earnings Per Share (EPS), Price-to-Earnings ratio (P/E), and revenue growth.

Risk analysis in stock trading measures the potential for financial loss. Key metrics
include portfolio beta (market sensitivity), Value at Risk (VaR), and sector concentration.
A high-beta portfolio moves more sharply than the market index.

Popular Indian stocks include RELIANCE (Reliance Industries), TCS (Tata Consultancy
Services), INFY (Infosys), HDFCBANK (HDFC Bank), WIPRO, ICICIBANK, BHARTIARTL
(Bharti Airtel), SBIN (State Bank of India), and BAJFINANCE (Bajaj Finance).

Popular US stocks include AAPL (Apple), TSLA (Tesla), NVDA (NVIDIA), MSFT (Microsoft),
GOOGL (Alphabet), AMZN (Amazon), META (Meta Platforms), and NFLX (Netflix).

AI-powered stock advisors use machine learning models trained on historical price data,
sentiment analysis of news articles, and macroeconomic indicators to generate trading
recommendations with a confidence score between 0 and 1.

Dividend stocks pay shareholders a portion of company profits regularly. Blue-chip stocks
are shares of large, well-established, financially stable companies. Growth stocks are
expected to grow at an above-average rate relative to the market.
"""


# ─── Request / Response Models ───────────────────────────────────────────────
class QARequest(BaseModel):
    question: str
    context: str = ""          # Optional — uses DEFAULT_STOCK_CONTEXT if empty


class QAResponse(BaseModel):
    answer: str
    score: float
    start: int
    end: int
    context_used: str          # "default" | "custom"


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "status": "ok",
        "service": "CapitalWave Local QA Chatbot",
        "model": "deepset/roberta-base-squad2",
        "endpoints": {
            "ask":    "POST /ask",
            "health": "GET  /health",
            "docs":   "GET  /docs",
        },
    }


@app.get("/health")
def health():
    return {"status": "healthy", "model_loaded": qa_pipeline is not None}


@app.post("/ask", response_model=QAResponse)
def ask_question(body: QARequest):
    question = body.question.strip()

    # Use caller-supplied context or fall back to the built-in stock context
    context = body.context.strip() if body.context.strip() else DEFAULT_STOCK_CONTEXT
    context_used = "custom" if body.context.strip() else "default"

    # ── Validation ────────────────────────────────────────────────────────────
    if not question:
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # Cap context to avoid tokeniser overflow (roberta max = 512 tokens ≈ ~2000 chars)
    if len(context) > 3000:
        context = context[:3000]

    # ── Inference ─────────────────────────────────────────────────────────────
    try:
        result = qa_pipeline(question=question, context=context)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model inference error: {str(e)}")

    # ── Low-confidence fallback ────────────────────────────────────────────────
    if result["score"] < 0.05:
        return QAResponse(
            answer="I don't have enough information to answer that. Try rephrasing or provide more context.",
            score=round(result["score"], 4),
            start=result["start"],
            end=result["end"],
            context_used=context_used,
        )

    return QAResponse(
        answer=result["answer"],
        score=round(result["score"], 4),
        start=result["start"],
        end=result["end"],
        context_used=context_used,
    )


# ─── Entry Point ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
