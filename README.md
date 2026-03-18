<div align="center">

# 🚀 CapitalWave AI

### AI-Powered Stock Trading & Market Advisory Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://mongodb.com)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](LICENSE)

> An intelligent paper trading platform that combines **LSTM deep learning**, **FinBERT NLP sentiment analysis**, and **XGBoost ensemble models** to deliver real-time BUY/SELL/HOLD recommendations with confidence scores for Indian (NSE) stocks.

[Demo](#screenshots) · [Quick Start](#-quick-start) · [Architecture](#-architecture) · [API Docs](#-api-documentation) · [Contributing](#-contributing)

</div>

---

## ✨ Features

### 🤖 AI & Machine Learning
- **LSTM Neural Network** — Time-series stock price prediction with 60-day lookback
- **FinBERT Sentiment Analysis** — NLP-based market sentiment from financial text
- **XGBoost Ensemble** — Feature-engineered trend classification
- **Combined AI Signal** — BUY / SELL / HOLD with confidence score (0–100%)
- **AI Chat Advisor** — Interactive financial Q&A with stock-specific analysis

### 📈 Trading Platform
- **Paper Trading** — Risk-free trading with ₹10,00,000 virtual balance
- **Real-time Stock Data** — Live NSE prices via Yahoo Finance API
- **Portfolio Analytics** — P&L tracking, sector breakdown, risk metrics
- **Watchlist** — Track favorite stocks with live price updates
- **Order Types** — Market, Limit, and Stop-Loss orders
- **Trade History** — Full transaction log with P&L per trade

### 🛡️ Risk Management
- **Quantitative Risk Engine** — Volatility, Sharpe ratio, Beta, VaR calculations
- **Risk Profile Assessment** — Personalized risk tolerance questionnaire
- **Portfolio Rebalancing** — AI-suggested sector allocation adjustments
- **Stop-Loss Recommendations** — Automated risk thresholds per holding
- **Drawdown Analysis** — Max and current drawdown tracking

### 🎨 Premium UI/UX
- **Dark & Light Themes** — Premium fintech-grade design system
- **Glassmorphism Cards** — Modern glass-blur effects with gradient accents
- **Loading Skeletons** — Polished loading states across all pages
- **Responsive Design** — Works on desktop, tablet, and mobile
- **Micro-animations** — Smooth transitions and staggered reveals
- **Error Boundaries** — Graceful error handling without crashes

### 🔒 Security
- **JWT Authentication** — Access + refresh token system
- **Helmet.js** — HTTP security headers
- **Rate Limiting** — API, auth, and AI endpoint throttling
- **Input Sanitization** — NoSQL injection and XSS protection
- **Password Hashing** — bcrypt with salt rounds

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CAPITALWAVE AI                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│   │   Frontend    │   │   Backend    │   │  ML Service   │   │
│   │   React 18    │──▶│  Express.js  │──▶│   FastAPI     │   │
│   │   Chart.js    │   │   Node.js    │   │   Python 3.11 │   │
│   │   Framer      │   │   JWT Auth   │   │   TensorFlow  │   │
│   │   Motion      │   │   Winston    │   │   PyTorch     │   │
│   │   :3000       │   │   :5000      │   │   XGBoost     │   │
│   └──────────────┘   └──────┬───────┘   │   :5001       │   │
│                              │           └──────────────┘   │
│                     ┌────────▼───────┐                      │
│                     │    MongoDB     │                      │
│                     │   :27017       │                      │
│                     └────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 18, Chart.js, Recharts, Framer Motion | Interactive UI, charts, animations |
| **Backend** | Node.js, Express, Mongoose, Winston | REST API, auth, business logic |
| **ML Service** | FastAPI, TensorFlow, PyTorch, XGBoost | Predictions, sentiment, risk analysis |
| **Database** | MongoDB 7 | User data, portfolios, transactions |
| **Security** | Helmet, JWT, bcrypt, rate-limit | Auth, headers, input sanitization |
| **DevOps** | Docker, docker-compose, nginx | Containerization, reverse proxy |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm
- **Python** 3.11+ and pip
- **MongoDB** 7 (local or Atlas)
- **Docker** (optional, for containerized setup)

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/capitalwave-ai.git
cd capitalwave-ai

# Start all services
docker-compose up --build

# Access the app
# Frontend: http://localhost:3000
# Backend:  http://localhost:5000
# ML Docs:  http://localhost:5001/docs
```

### Option 2: Manual Setup

```bash
# 1. Backend
cd backend
cp .env.example .env          # Configure environment variables
npm install
npm run dev                    # Starts on :5000

# 2. ML Service (new terminal)
cd ml-service
cp .env.example .env
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 5001 --reload

# 3. Frontend (new terminal)
cd frontend
npm install
npm start                      # Starts on :3000
```

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-stock-trading
JWT_SECRET=your_secure_random_string_here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
NODE_ENV=development
ML_SERVICE_URL=http://localhost:5001
CLIENT_URL=http://localhost:3000
```

**ML Service** (`ml-service/.env`):
```env
PORT=5001
MONGODB_URI=mongodb://localhost:27017/ai-stock-trading
MODEL_DIR=./models
LOG_LEVEL=INFO
```

---

## 📡 API Documentation

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login and get tokens |
| `POST` | `/api/auth/refresh` | Refresh access token |
| `GET` | `/api/auth/me` | Get current user (🔒) |

### Stocks
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/stocks` | Get top NSE stocks with live prices (🔒) |
| `GET` | `/api/stocks/:symbol` | Get stock details + 3-month history (🔒) |
| `GET` | `/api/stocks/search/:query` | Search stocks by name/symbol (🔒) |

### Trading
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/trading/buy` | Execute buy order (🔒) |
| `POST` | `/api/trading/sell` | Execute sell order (🔒) |
| `GET` | `/api/trading/portfolio` | Get portfolio holdings (🔒) |
| `GET` | `/api/trading/transactions` | Get transaction history (🔒) |
| `GET` | `/api/trading/portfolio/analysis` | Full portfolio analysis (🔒) |
| `POST` | `/api/trading/limit-order` | Place limit order (🔒) |
| `POST` | `/api/trading/stop-loss` | Place stop-loss order (🔒) |
| `GET` | `/api/trading/analytics` | Trading performance analytics (🔒) |

### AI & ML
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/recommendation` | Get AI stock recommendation (🔒) |
| `POST` | `/api/ai/sentiment` | Analyze stock sentiment (🔒) |
| `POST` | `/api/ai/chat` | AI financial advisor chat (🔒) |
| `GET` | `/api/ai/ml-status` | Check ML service status (🔒) |

### ML Service (Direct)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check + model status |
| `POST` | `/predict/recommendation` | ML prediction |
| `POST` | `/predict/sentiment` | FinBERT sentiment |
| `POST` | `/predict-risk` | Risk classification |
| `POST` | `/recommend` | Full recommendation pipeline |

> 🔒 = Requires `Authorization: Bearer <token>` header

---

## 📁 Project Structure

```
capitalwave-ai/
├── backend/                    # Node.js Express API
│   ├── config/                 # DB connection, env validation
│   ├── controllers/            # Route handlers (12 controllers)
│   ├── middleware/              # Auth, error handler, rate limiter, validator
│   ├── models/                 # Mongoose schemas (11 models)
│   ├── routes/                 # Express route definitions
│   ├── utils/                  # Risk engine, live price fetcher
│   ├── logs/                   # Winston log files
│   ├── Dockerfile
│   └── server.js               # Entry point
│
├── frontend/                   # React 18 SPA
│   ├── src/
│   │   ├── components/         # Sidebar, TopNavbar, ErrorBoundary, LoadingSkeleton
│   │   ├── context/            # AuthContext, ThemeContext
│   │   ├── pages/              # 13 pages (Dashboard, Trading, Watchlist, etc.)
│   │   ├── utils/              # Axios API client
│   │   └── App.js              # Root component with routing
│   ├── Dockerfile
│   └── nginx.conf
│
├── ml-service/                 # Python FastAPI ML Service
│   ├── app/
│   │   ├── models/             # LSTM, FinBERT, XGBoost, Risk Classifier
│   │   ├── routers/            # Health, prediction, sentiment, risk
│   │   ├── services/           # Model registry, feature engine, data service
│   │   ├── training/           # Model training scripts
│   │   ├── utils/              # Indicators, preprocessing, synthetic data
│   │   └── main.py             # FastAPI entry point
│   ├── models/                 # Saved model files (.pkl, FinBERT cache)
│   ├── Dockerfile
│   └── requirements.txt
│
├── docker-compose.yml          # Full-stack orchestration
├── .dockerignore
└── README.md
```

---

## 🧪 Testing

```bash
# Backend unit tests
cd backend && npx jest

# Frontend tests
cd frontend && npm test

# ML service (manually via docs)
# Visit http://localhost:5001/docs for interactive Swagger docs
```

---

## 📸 Screenshots

> _Screenshots will be added here. Run the application locally and capture:_
> 1. Landing Page
> 2. Dashboard (dark theme)
> 3. Paper Trading with buy/sell
> 4. Portfolio Analytics
> 5. AI Chat Advisor
> 6. Watchlist
> 7. Risk Analysis

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---



## ⚠️ Disclaimer

This platform is for **educational and paper trading purposes only**. It does not constitute financial advice. Stock markets are subject to market risks. Always consult a certified financial advisor before making real investment decisions.

---

<div align="center">

**Built with ❤️ using AI + Modern Web Technologies**

</div>
