<div align="center">

# 📈 AI Agent for Personalized Stock Trading & Market Advisory

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

## 📖 Project Description

The **AI Agent for Personalized Stock Trading & Market Advisory** is an end-to-end intelligent platform that enables users to make sophisticated, data-driven financial decisions. By combining real-time market data with advanced machine learning algorithms, the platform offers precise stock price predictions, news sentiment analysis, and personalized risk assessments. Whether you are a beginner looking for a risk-free paper trading environment or an advanced trader seeking AI-backed market insights, this platform provides all the necessary tools in a beautifully crafted, responsive dashboard.

---

## 🎯 Problem Statement

Retail investors often struggle to analyze vast amounts of market data, leading to emotional and uninformed trading decisions. While professional traders use expensive quantitative tools and algorithms to minimize risk and maximize returns, everyday investors are left guessing market directions. This project bridges the gap by democratizing professional-grade AI tools, providing actionable market insights, real-time news sentiment, and strict risk management in an accessible, user-friendly interface.

---

## 🛠️ Tech Stack

### 🎨 Frontend
- **React.js (18.x)** - Component-based dynamic UI
- **React Router (v6)** - Client-side navigation
- **Chart.js & React-Chartjs-2** - Interactive, responsive data visualization
- **Axios** - Async HTTP requests
- **Framer Motion** - Fluid micro-animations
- **Vanilla CSS3** - Modern, responsive styling with dark mode support

### ⚙️ Backend (Node.js)
- **Node.js & Express.js** - Robust RESTful API server
- **MongoDB & Mongoose** - NoSQL database and schema modeling
- **JWT (JSON Web Tokens)** - Stateless, secure user authentication
- **Yahoo Finance API (`yahoo-finance2`)** - Live market quotes & historical data
- **Socket.IO** - Real-time client-server communication

### 🧠 AI/ML Microservice (Python)
- **FastAPI** - High-performance async Python backend
- **TensorFlow / Keras** - Time-series prediction using LSTM
- **PyTorch & Transformers** - NLP-powered Sentiment Analysis (FinBERT)
- **XGBoost & Scikit-Learn** - Classification and predictive modeling
- **Pandas / NumPy** - Data processing and technical indicators (TA)

---

## 🔥 Key Features

- **🤖 AI Trade Recommendations:** Buy, Sell, or Hold signals backed by ML model confidence scores.
- **📰 Sentiment Analysis:** Real-time NLP parsing of financial news to determine stock sentiment.
- **📈 Market Trend Prediction:** Future price-direction forecasting using LSTM and XGBoost models.
- **📊 Virtual Paper Trading:** A risk-free trading simulator starting with a ₹10,00,000 balance.
- **💼 Portfolio Management:** Comprehensive tracking of live holdings, profit/loss, and historical snapshots.
- **📉 Quantitative Risk Assessment:** In-depth user risk profiling, Sharpe ratio calculations, and ML risk classification.
- **💬 AI Chat Advisor:** An intelligent chatbot assisting users with specific stock and market queries.
- **🤝 Social Trading:** Follow top-performing traders, share logic, and view community trades.
- **🎓 Education Center:** Step-by-step learning modules to master the stock market fundamentals.
- **🔗 Broker Integration:** Seamless linkage with external brokerage accounts for live execution.

---

## 🏗️ System Architecture

The platform follows a decoupled, three-tier architecture ensuring scalability, separation of concerns, and maintainability.

- **Frontend (React)**: Handles the presentation layer, form validation, chart rendering, and user state management.
- **Backend (Node.js/Express)**: Acts as the primary orchestrator, managing user authentication, portfolio states, risk engines, database reads/writes, and routing ML requests.
- **AI/ML Service (FastAPI)**: A dedicated microservice executing heavy computational models (TensorFlow, PyTorch) independently, allowing the Node server to remain non-blocking.
- **Database (MongoDB)**: Centralized data repository storing user credentials, virtual balances, transaction histories, API caches, and risk profiles.

---

## 🚀 Installation Guide

### Prerequisites
- Node.js (v14+)
- Python (v3.9+)
- MongoDB (Running locally on default port 27017 or Cloud Atlas)
- Git

### Step-by-Step Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/ai-stock-trading-agent.git
   cd ai-stock-trading-agent
   ```

2. **Setup the Node.js Backend:**
   ```bash
   cd backend
   npm install
   ```
   *Create a `.env` file in the `backend/` directory:*
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-stock-trading
   JWT_SECRET=your_super_secret_key_here
   CLIENT_URL=http://localhost:3000
   ML_SERVICE_URL=http://localhost:8000
   ```
   *Run the backend:*
   ```bash
   npm run dev
   ```

3. **Setup the React Frontend:**
   ```bash
   cd ../frontend
   npm install
   npm start
   ```

4. **Setup the Python ML Microservice:**
   ```bash
   cd ../ml-service
   python -m venv venv
   # Activate virtual environment
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   pip install -r requirements.txt
   ```
   *Create a `.env` file in the `ml-service/` directory:*
   ```env
   MONGO_URI=mongodb://localhost:27017/ai-stock-trading
   MODEL_DIR=./models
   ```
   *Run the ML Service:*
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

---

## 💻 Usage Guide

1. **Account Creation:** Open your browser to `http://localhost:3000`. Register a new account.
2. **Dashboard Overview:** Upon login, navigate the dashboard to explore the top movers, SPY/NIFTY indexes, and daily market sentiment.
3. **Analyze a Stock:** Use the top search bar to find a specific ticker. View its AI recommendation (Buy/Sell/Hold), recent news sentiment, and historical price charts.
4. **Take the Risk Quiz:** Head to the *Risk Analysis* tab to undergo investor profiling. The system will adapt to your specified risk tolerance.
5. **Paper Trade:** Go to *Paper Trading*, select a stock, enter quantity, and execute a virtual order without risking actual capital.
6. **Consult the AI Chat:** Stuck on market jargon? Open the *Chat Advisor* and type "Should I invest in AAPL?" to get a tailored ML response.

---

## 📂 Folder Structure

```text
ai-stock-trading-agent/
│
├── backend/                   # Node.js API Service
│   ├── config/                # DB & Environment Config
│   ├── controllers/           # Business Logic (Auth, Portfolios, Stocks)
│   ├── middleware/            # JWT Verification, Rate Limiter
│   ├── models/                # Mongoose Database Schemas
│   ├── routes/                # Express API Endpoints
│   ├── utils/                 # Helper Functions
│   └── server.js              # Entry Point
│
├── frontend/                  # React Application
│   ├── public/                # Static assets
│   ├── src/
│   │   ├── components/        # Reusable UI Elements (Navbars, Cards)
│   │   ├── context/           # React Global State (Auth)
│   │   ├── pages/             # View Containers (Dashboard, Settings, Trade)
│   │   ├── utils/             # API Interceptors & Fetch Clients
│   │   ├── App.js             # Main Router
│   │   └── index.js           # DOM Entry
│
└── ml-service/                # Python Model API
    ├── app/
    │   ├── routers/           # FastAPI Routes (Predict, Risk, Recommend)
    │   ├── services/          # Core Logic (Sentiment, Feature Engine)
    │   ├── models/            # Pydantic Schemas
    │   └── main.py            # Uvicorn Setup
    ├── models/                # Pre-trained .h5, .pkl, and .bin files
    └── requirements.txt       # Python Libraries
```

---

## 📡 API Documentation

Below are a few of the core API endpoints from the Node.js backend:

### 1. Execute Virtual Trade
- **Endpoint:** `POST /api/trading/buy`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "symbol": "AAPL",
    "shares": 10,
    "currentPrice": 185.00
  }
  ```
- **Response:**
  ```json
  {
    "message": "Buy order executed successfully.",
    "transactionId": "651a2b3c4d5e",
    "updatedBalance": 998150.00
  }
  ```

### 2. Fetch ML Trade Recommendation
- **Endpoint:** `POST /api/ai/recommendation`
- **Headers:** `Authorization: Bearer <token>`
- **Request Body:**
  ```json
  {
    "symbol": "TSLA"
  }
  ```
- **Response:**
  ```json
  {
    "symbol": "TSLA",
    "action": "BUY",
    "confidence": 0.82,
    "reasoning": "Strong upward momentum detected via LSTM prediction and positive news sentiment."
  }
  ```

---

## 🤖 AI/ML Model Explanation

Our custom ML microservice takes raw market data and turns it into reliable intelligence using a pipelined approach:

1. **Market Trend Prediction (LSTM & XGBoost):** 
   - **Data Collection:** Retrieves 5+ years of historical adjusted close prices and volume via Yahoo Finance.
   - **Feature Engineering:** Computes technical indicators like RSI, MACD, and Bollinger Bands.
   - **Model:** A Long Short-Term Memory (LSTM) deep learning network handles sequence forecasting, while an XGBoost classifier is used for short-term buy/sell probability categorization.
2. **Sentiment Analysis (FinBERT):**
   - **Data Collection:** Scrapes real-time financial headlines using News APIs.
   - **Model:** A PyTorch-based, fine-tuned transformer model (FinBERT) designed explicitly to categorize financial text into *Positive, Negative, or Neutral* sentiment scores.
3. **Risk Classification (Scikit-Learn Random Forest):**
   - Calculates historical volatility and Value-at-Risk (VaR) to classify user portfolios as *Conservative, Moderate, or Aggressive*, matching against their questionnaire profiles.

---

## 📸 Screenshots

*(Replace the placeholder links with actual images of the project)*

### 1. Interactive User Dashboard
![Dashboard Screenshot Placeholder](https://via.placeholder.com/800x400?text=Insert+Dashboard+Screenshot+Here)

### 2. AI Chat Advisor Interface
![AI Chat Screenshot Placeholder](https://via.placeholder.com/800x400?text=Insert+AI+Chat+Advisor+Screenshot+Here)

### 3. Quantitative Risk Meter
![Risk Analysis Screenshot Placeholder](https://via.placeholder.com/800x400?text=Insert+Risk+Meter+Screenshot+Here)

---

## 🔮 Future Improvements

- **Algorithmic Trading Bots:** Allow users to automate trades based on predefined technical criteria and AI signals.
- **Crypto Integration:** Expand asset class options to include Bitcoin, Ethereum, and altcoins.
- **Advanced Options Trading:** Enable paper trading for put/call options and straddle strategies.
- **Mobile Application:** Build a cross-platform React Native app for iOS and Android access.
- **Enhanced Social Feeds:** Implement upvoting, deep-linking to shared charts, and trader leagues.

---

## 🤝 Contributing Guide

We welcome contributions from the open-source community!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request for review

*Please make sure to run all local tests and adhere to ESLint/Prettier formatting rules before submitting a PR.*

---


<!-- 
## ✍️ Author

**[Your Name / Your GitHub Handle]**   -->
<!-- *Senior Software Engineer & FinTech Enthusiast*
- GitHub: [@your-username](https://github.com/your-username)
- LinkedIn: [Your Profile Link](https://linkedin.com/in/your-profile)
- Portfolio: [Your Website Link](https://your-website.com) -->

---

<div align="center">
<i>Built with ❤️ for Traders & Developers.</i>
</div>
