<div align="center">
  <h1>🧠 ML & AI Engine Microservice</h1>
  <p><strong>AI-Powered Stock Trading & Market Advisory Platform</strong></p>
</div>

This directory contains the core **Python Machine Learning Service**, housing the intelligence behind the platform's multi-agent architecture. It runs autonomously from the Node.js backend, enabling high CPU/GPU computations for predictive analytics, sentiment parsing, and risk simulations.

## 🤖 The Multi-Agent Arsenal

This microservice handles the execution logic for our designated AI Agents:

- **Trader AI:** Scrapes and parses financial technicals, running time-series analysis or rules-based momentum modeling to find entry/exit points.
- **Risk Manager AI:** Validates any proposed trade against strict drawdown algorithms and capital utilization bounds.
- **News & Sentiment AI:** Processes raw text data from news APIs or SEC filings using NLP to quantify the market "mood" (Bullish/Bearish ratings).
- **Portfolio Advisor AI:** Uses correlation matrices and clustering to suggest diversification improvements over the user's current holdings.

## 🛠️ Tech Stack

- **Language:** Python 3.9+
- **API Framework:** FastAPI / Flask (depending on configuration)
- **AI/NLP Layers:** HuggingFace `transformers`, Google GenAI, Mistral Models
- **Financial Libraries:** `pandas`, `numpy`, `yfinance` (for market data acquisition)

---

## ⚙️ Setup & Installation

**1. Navigate to the ML service directory:**
```bash
cd ml-service
```

**2. Create and activate a Virtual Environment:**
```bash
# Mac / Linux
python3 -m venv venv
source venv/bin/activate

# Windows
python -m venv venv
venv\Scripts\activate
```

**3. Install Requirements:**
```bash
pip install -r requirements.txt
```

**4. Configure Environment:**
Rename `.env.example` to `.env` and configure your keys:
```env
HUGGINGFACE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
PORT=8000
```

**5. Start the Service:**
```bash
# Example if using FastAPI (uvicorn) or Flask:
python app/main.py 
# OR
# uvicorn app.main:app --reload --port 8000
```

The service typically runs on `http://localhost:8000` and receives internal requests from the Node.js backend.

## 🔍 Note on Hardware
Running Large Language Models (LLMs) locally can be memory intensive. The codebase defaults to API integration (HuggingFace API / Gemini) to alleviate local RAM requirements. If transitioning to local HuggingFace inference, a dedicated GPU is highly recommended.

---
*Part of the AI-Powered Stock Trading & Market Advisory Platform microservices ecosystem.*
