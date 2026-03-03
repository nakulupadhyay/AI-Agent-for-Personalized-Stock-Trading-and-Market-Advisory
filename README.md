<div align="center">

# AI Agent for Personalized Stock Trading & Market Advisory

**An intelligent, full-stack trading platform powered by machine learning for real-time market predictions, sentiment analysis, quantitative risk assessment, and virtual portfolio management.**

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![Python](https://img.shields.io/badge/Python-3.9+-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688?logo=fastapi&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.15-FF6F00?logo=tensorflow&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue.svg)

</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Usage](#usage)
- [License](#license)

---

## Overview

This platform serves as an end-to-end solution for stock market analysis and virtual trading. It combines a **React** single-page application with a **Node.js/Express** backend and a dedicated **Python FastAPI** machine-learning microservice to deliver actionable insights — including price-direction forecasts, news-driven sentiment scores, and portfolio risk metrics — through a unified, responsive interface.

The system is designed around three independent tiers that communicate over REST APIs, enabling each layer to be developed, tested, and scaled independently.

---

## Key Features

| Category | Feature | Description |
|:--|:--|:--|
| **Market Intelligence** | AI Recommendations | Buy / Sell / Hold signals with model confidence scores |
| | Sentiment Analysis | NLP-powered news sentiment using FinBERT / DistilBERT |
| | Market Trend Prediction | Price direction forecasting via XGBoost and LSTM networks |
| **Trading & Portfolio** | Paper Trading | Virtual trading simulator with ₹10,00,000 starting capital |
| | Portfolio Management | Real-time holdings tracker with P&L, snapshots, and history |
| | Broker Integration | Connect to external brokerage accounts for live execution |
| **Risk & Compliance** | Risk Profiling | Questionnaire-based investor profiling with tailored strategies |
| | Risk Analysis | Quantitative metrics — Sharpe ratio, VaR, volatility, and ML-based risk classification |
| **User Experience** | Dashboard | Market overview, AI picks, live charts, and portfolio summary |
| | AI Chat Advisor | Conversational assistant for stock queries and market insights |
| | Social Trading | Follow traders, share strategies, and view community activity |
| | Education Center | Structured learning modules with progress tracking |
| **Platform** | Authentication | JWT-based registration, login, and route protection |
| | Settings | Account management, notifications, and privacy controls |

---

## Architecture

```
┌──────────────┐       ┌──────────────────┐       ┌───────────────────┐
│              │       │                  │       │                   │
│   React SPA  │◄─────►│  Node.js / Express│◄─────►│  Python FastAPI   │
│  (Port 3000) │  REST │   (Port 5000)    │  REST │  ML Microservice  │
│              │       │                  │       │   (Port 8000)     │
└──────────────┘       └────────┬─────────┘       └───────────────────┘
                                │
                                ▼
                       ┌──────────────────┐
                       │     MongoDB      │
                       │  (Port 27017)    │
                       └──────────────────┘
```

- **Frontend** — React 18 SPA responsible for rendering, routing, and state management.
- **Backend** — Express.js API layer handling authentication, business logic, data persistence, and orchestration of ML service calls.
- **ML Service** — FastAPI microservice running TensorFlow, PyTorch, and scikit-learn models for prediction, sentiment, and risk classification.
- **Database** — MongoDB document store for users, portfolios, transactions, predictions, and cached market data.

---

## Technology Stack

### Frontend

| Technology | Purpose |
|:--|:--|
| React 18 | Component-based UI with Hooks & Context API |
| React Router v6 | Client-side routing and navigation |
| Axios | HTTP client for API communication |
| Chart.js / react-chartjs-2 | Interactive data visualization |
| CSS3 | Responsive, mobile-first styling |

### Backend

| Technology | Purpose |
|:--|:--|
| Node.js & Express.js | RESTful API server |
| Mongoose | MongoDB object modeling |
| JSON Web Tokens | Stateless authentication |
| Bcrypt | Password hashing |
| Yahoo Finance (`yahoo-finance2`) | Live market data feed |
| Socket.IO | Real-time event broadcasting |
| Winston | Structured logging |
| express-rate-limit | API rate limiting |

### ML Service

| Technology | Purpose |
|:--|:--|
| FastAPI & Uvicorn | High-performance async API framework |
| TensorFlow / Keras | LSTM-based time-series forecasting |
| PyTorch & Transformers | FinBERT / DistilBERT sentiment models |
| XGBoost | Gradient-boosted price prediction |
| scikit-learn | Risk classification and preprocessing |
| ta (Technical Analysis) | Technical indicator computation |
| yfinance | Historical market data retrieval |
| pandas / NumPy | Data manipulation and numerical computation |

---

## Project Structure

```
project_7_sem/
│
├── backend/                         # Node.js Express API
│   ├── config/                      # Database connection
│   ├── controllers/                 # Request handlers
│   │   ├── aiController.js          #   AI recommendation logic
│   │   ├── authController.js        #   Authentication
│   │   ├── brokerController.js      #   Broker integration
│   │   ├── educationController.js   #   Learning modules
│   │   ├── portfolioController.js   #   Portfolio analytics
│   │   ├── riskAnalysisController.js#   Quantitative risk engine
│   │   ├── riskProfileController.js #   Risk questionnaire
│   │   ├── sentimentController.js   #   Sentiment orchestration
│   │   ├── settingsController.js    #   User settings
│   │   ├── socialController.js      #   Social features
│   │   ├── stockController.js       #   Yahoo Finance integration
│   │   └── tradingController.js     #   Trade execution engine
│   ├── models/                      # Mongoose schemas (11 models)
│   ├── routes/                      # Express route definitions
│   ├── middleware/                   # Auth, errors, rate limiting
│   ├── utils/                       # Shared helpers
│   ├── server.js                    # Application entry point
│   └── .env                         # Environment configuration
│
├── frontend/                        # React SPA
│   └── src/
│       ├── components/              # Reusable UI components
│       │   ├── Navbar.js            #   Navigation bar
│       │   ├── Sidebar.js           #   Side navigation
│       │   ├── TopNavbar.js         #   Top header bar
│       │   ├── RiskMeter.js         #   Visual risk gauge
│       │   └── ProtectedRoute.js    #   Auth route guard
│       ├── pages/                   # Page components
│       │   ├── Dashboard.js         #   Main dashboard
│       │   ├── PaperTrading.js      #   Virtual trading
│       │   ├── Portfolio.js         #   Portfolio view
│       │   ├── RiskAnalysis.js      #   Risk metrics page
│       │   ├── RiskProfile.js       #   Risk questionnaire
│       │   ├── ChatAdvisor.js       #   AI chat interface
│       │   ├── SocialTrading.js     #   Social features
│       │   ├── Education.js         #   Learning center
│       │   ├── BrokerIntegration.js #   Broker connections
│       │   ├── Settings.js          #   User settings
│       │   ├── LandingPage.js       #   Public landing page
│       │   ├── Login.js             #   Login form
│       │   └── Signup.js            #   Registration form
│       ├── context/                 # AuthContext provider
│       ├── utils/                   # API helper functions
│       └── App.js                   # Root component & router
│
├── ml-service/                      # Python ML microservice
│   ├── app/
│   │   ├── main.py                  # FastAPI application
│   │   ├── config.py                # Service configuration
│   │   ├── routers/                 # API endpoint definitions
│   │   │   ├── prediction.py        #   Price prediction
│   │   │   ├── sentiment_router.py  #   Sentiment analysis
│   │   │   ├── risk.py              #   Risk classification
│   │   │   ├── recommendation.py    #   Trade recommendations
│   │   │   ├── behavior.py          #   User behavior analysis
│   │   │   └── health.py            #   Health check
│   │   ├── services/                # Core ML logic
│   │   │   ├── model_registry.py    #   Model versioning & loading
│   │   │   ├── data_service.py      #   Market data pipeline
│   │   │   └── feature_engine.py    #   Feature engineering
│   │   ├── models/                  # Pydantic schemas & model defs
│   │   ├── training/                # Model training scripts
│   │   └── utils/                   # Utility functions
│   ├── models/                      # Serialized ML model files
│   ├── requirements.txt             # Python dependencies
│   └── .env                         # Environment configuration
│
└── README.md
```

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|:--|:--|
| Node.js | 14.x |
| Python | 3.9 |
| MongoDB | 6.x |
| npm | 6.x |

### 1. Clone the Repository

```bash
git clone https://github.com/<your-username>/AI-Agent-for-Personalized-Stock-Trading-and-Market-Advisory.git
cd AI-Agent-for-Personalized-Stock-Trading-and-Market-Advisory
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Configure environment variables in `backend/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-stock-trading
JWT_SECRET=<your-secure-secret>
CLIENT_URL=http://localhost:3000
ML_SERVICE_URL=http://localhost:8000
```

Start the server:

```bash
npm run dev       # Development mode (auto-reload)
npm start         # Production mode
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

### 4. ML Service Setup

```bash
cd ml-service
python -m venv venv

# Activate virtual environment
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
```

Configure environment variables in `ml-service/.env`:

```env
MONGO_URI=mongodb://localhost:27017/ai-stock-trading
MODEL_DIR=./models
```

Start the service:

```bash
uvicorn app.main:app --reload --port 8000
```

### 5. Verify All Services

| Service | URL | Health Check |
|:--|:--|:--|
| Backend | http://localhost:5000 | `GET /` |
| Frontend | http://localhost:3000 | Open in browser |
| ML Service | http://localhost:8000 | `GET /health` |

---

## API Reference

### Backend REST API (Port 5000)

<details>
<summary><strong>Authentication</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `POST` | `/api/auth/register` | Register a new user account |
| `POST` | `/api/auth/login` | Authenticate and receive JWT token |
| `GET` | `/api/auth/me` | Retrieve authenticated user profile |

</details>

<details>
<summary><strong>Stock Market Data</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET` | `/api/stocks` | List available stocks |
| `GET` | `/api/stocks/:symbol` | Get real-time quote and details |
| `GET` | `/api/stocks/search` | Search stocks by keyword |

</details>

<details>
<summary><strong>AI Services</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `POST` | `/api/ai/recommendation` | Generate AI buy/sell/hold signal |
| `POST` | `/api/ai/sentiment` | Run sentiment analysis on a stock |
| `POST` | `/api/ai/chat` | Conversational AI advisor |

</details>

<details>
<summary><strong>Trading</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `POST` | `/api/trading/buy` | Execute a buy order |
| `POST` | `/api/trading/sell` | Execute a sell order |
| `GET` | `/api/trading/portfolio` | Retrieve portfolio holdings |
| `GET` | `/api/trading/transactions` | Get transaction history |

</details>

<details>
<summary><strong>Portfolio & Risk</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET` | `/api/portfolio/snapshot` | Portfolio analytics snapshot |
| `POST` | `/api/risk-profile` | Submit risk profile questionnaire |
| `GET` | `/api/risk-profile` | Retrieve investor risk profile |
| `GET` | `/api/risk-analysis` | Quantitative risk metrics |

</details>

<details>
<summary><strong>Sentiment, Social, Education & Broker</strong></summary>

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET` | `/api/sentiment/:symbol` | Historical sentiment data |
| `GET` | `/api/social` | Social feed and trader profiles |
| `GET` | `/api/education` | Learning modules and progress |
| `POST` | `/api/broker/connect` | Connect brokerage account |
| `GET` | `/api/settings` | User preferences and settings |

</details>

### ML Service API (Port 8000)

| Method | Endpoint | Description |
|:--|:--|:--|
| `GET` | `/health` | Service health and model status |
| `POST` | `/predict` | Stock price direction prediction |
| `POST` | `/sentiment` | NLP-based sentiment analysis |
| `POST` | `/risk` | ML risk classification |
| `POST` | `/recommend` | AI trade recommendation |
| `POST` | `/behavior` | User trading behavior analysis |

---

## Configuration

### Environment Variables

<details>
<summary><strong>Backend (<code>.env</code>)</strong></summary>

| Variable | Default | Description |
|:--|:--|:--|
| `PORT` | `5000` | Server port |
| `MONGODB_URI` | `mongodb://localhost:27017/ai-stock-trading` | MongoDB connection string |
| `JWT_SECRET` | — | Secret key for JWT signing |
| `CLIENT_URL` | `http://localhost:3000` | Allowed CORS origin |
| `ML_SERVICE_URL` | `http://localhost:8000` | ML microservice base URL |

</details>

<details>
<summary><strong>ML Service (<code>.env</code>)</strong></summary>

| Variable | Default | Description |
|:--|:--|:--|
| `MONGO_URI` | `mongodb://localhost:27017/ai-stock-trading` | MongoDB connection string |
| `MODEL_DIR` | `./models` | Directory for serialized models |

</details>

### Application Defaults

| Parameter | Value |
|:--|:--|
| Virtual Trading Balance | ₹10,00,000 |
| API Rate Limit | Configured via `express-rate-limit` |
| Token Expiry | Defined in JWT configuration |

---

## Usage

1. **Register** — Create an account from the landing page.
2. **Dashboard** — View the market overview with AI recommendations, live charts, and sentiment insights.
3. **Paper Trading** — Buy and sell stocks using virtual capital to test strategies risk-free.
4. **Portfolio** — Monitor holdings, profit and loss, and transaction history.
5. **Risk Assessment** — Complete the risk questionnaire and review quantitative risk metrics (Sharpe ratio, VaR, volatility).
6. **AI Chat** — Ask the conversational AI advisor about any stock or market concept.
7. **Social Trading** — Follow other traders, share strategies, and engage with the community.
8. **Education** — Progress through structured learning modules on stock market fundamentals.
9. **Settings** — Manage account details, notification preferences, and security options.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">

**AI Agent for Personalized Stock Trading and Market Advisory**

</div>
