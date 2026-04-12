<div align="center">
  <h1>🚀 AI-Powered Stock Trading & Market Advisory Platform</h1>
  <p><strong>A Next-Generation Multi-Agent AI System for Smart Trading, Risk Management, and Portfolio Optimization</strong></p>
  <br />
</div>

An advanced, enterprise-grade stock trading platform designed to revolutionize how individuals interact with the financial markets. It leverages a robust architecture comprising **multiple specialized AI Agents** to deliver granular market analysis, automated risk profiling, intelligent asset allocation, and seamless natural language voice interaction.

Built for retail investors to have Wall-Street-grade quantitative and qualitative analyses right at their fingertips.

---

## 🔥 Features & Capabilities

- **Intelligent Multi-Agent Analysis:** Get synthesized insights from distinct AI specializations (Trader, Risk Manager, Sentiment, Portfolio Advisor).
- **Voice-Enabled Execution:** Talk to your dashboard! Execute trades, query market conditions, or check your portfolio risk status—hands-free.
- **Dynamic Risk Evaluation:** Advanced algorithms that calculate drawdown risks, optimize stop-loss/take-profit levels, and guard capital.
- **Smart Decision Cards:** Highly visual, confidence-scored BUY/SELL/HOLD recommendations generated in real-time.
- **Real-time Metrics:** Live pricing, tracking, and analytics visualization with interactive charts (Drawdown, Allocation, Risk/Return).

---

## 🏛️ System Architecture

Our platform follows a modern, scalable microservices-based architecture:

```text
+-----------------------+        +------------------------------------------+        +----------------------+
|                       |        |                                          |        |                      |
|  Frontend (React.js)  | <====> |        Backend API (Node.js/Express)     | <====> | Database (MongoDB)   |
|  - Dashboard View     |  HTTP  |        - Authentication & JWT            |        | - User Profiles      |
|  - Charts & Insights  |  WSS   |        - User & Portfolio Context        |        | - Transaction Log    |
|  - Voice/Chat UI      |        |        - Trade Execution & Rate Limiting |        |                      |
|                       |        |                                          |        +----------------------+
+-----------------------+        +------------------------------------------+                   ^
                                       |                               |                    |
                                       v                               v                    v
                          +-------------------------+      +-------------------------------------------+
                          |   Market Data Services  |      |   ML Microservice / Agent Engine (Py)     |
                          |   - Live Quotes         |      |   - Risk Analysis Model                   |
                          |   - SEC/News Feeds      |      |   - Sentiment NLP (Mistral/GenAI)         |
                          +-------------------------+      +-------------------------------------------+
```

---

## 🤖 How the Multi-Agent AI Works

The platform utilizes a highly collaborative suite of specialized AI Agents to ensure accuracy and comprehensive coverage of any asset:

### 1. 📈 Trader AI (Technical & ML Analysis)
Focuses purely on price action, moving averages, momentum indicators (RSI, MACD), and historical volatility. It generates the primary statistical signal for entry or exit.

### 2. 🛡️ Risk Manager AI (Capital Protection)
Monitors trade context against user-defined risk tolerance. It actively computes protective stop-losses, maximum drawdown ceilings, and warns the user if a suggested trade violates capital protection parameters.

### 3. 📰 News & Sentiment AI (Market Emotion)
Scrapes and processes the latest financial news, SEC filings, and macro-economic data using Large Language Models (Mistral/GenAI). It provides a real-time "Emotion Score" (Bullish/Bearish) to contextualize raw price movements.

### 4. 💼 Portfolio Advisor AI (Optimization)
Reviews the user’s broader financial goals and current asset allocation. Before any trade is executed, it ensures the transaction doesn't heavily skew diversification and aligns with long-term investing frameworks.

### 5. 🎙️ Voice Assistant AI (Interaction Layer)
A natural language processing interface that allows users to seamlessly navigate the platform, query specific stock sentiments, or trigger system actions hands-free.

---

## 💻 Technologies Used

### Frontend
* **React.js 18** - UI Framework
* **Tailwind CSS & Framer Motion** - Fintech-grade styling & fluid animations
* **Recharts & Chart.js** - Interactive financial data visualizations

### Backend
* **Node.js & Express.js** - API routing and request handling
* **MongoDB & Mongoose** - Scalable NoSQL database management
* **Socket.IO** - Real-time bidirectional data flow
* **JWT & bcrypt** - Secure authentication

### Machine Learning & AI integrations
* **Python** - Core ML microservice environment
* **Mistral 7B / Google GenAI SDK** - Large language model generation
* **Hugging Face Inference** - Open-source NLP task processing

---

## ⚙️ Setup Instructions

### Prerequisites
Make sure you have installed on your local system:
- **Node.js** (v18+)
- **Python** (3.9+)
- **MongoDB** (Local instance or Atlas URI)
- **Git**

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/AI-Stock-Trading-Platform.git
cd AI-Stock-Trading-Platform
```

### 2. Backend Setup
```bash
cd backend
npm install

# Create a .env file and configure environment variables
cp .env.example .env

# Start the server
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start the development server
npm start
```

### 4. ML Service Setup
```bash
cd ../ml-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env and configure AI provider API keys
cp .env.example .env

# Start the ML FastAPI Service
python app/main.py
```

---

## 📖 Usage Instructions

### Web Interface Application
1. **Login/Register:** Connect to your secure portfolio dashboard.
2. **Dashboard Overview:** View live performance metrics, drawdown charts, and your risk-adjusted returns.
3. **Floating AI Assistant:** Click the bottom-right AI bubble to chat. Ask for an analysis of a ticker symbol to receive an intelligent **Decision Card**.
4. **Execute Trade:** Approve or decline AI-generated trades directly from the response cards.

### 🗣️ Example Voice Commands
You can click the microphone icon and naturally speak to the system:

> 🎙️ *"What is the current risk profile for Apple (AAPL)?"*  
> 🎙️ *"Analyze Tesla stock and give me a summary of the latest news."*  
> 🎙️ *"Buy 10 shares of NVDA if the confidence score is above 85%."*  
> 🎙️ *"Review my portfolio and suggest areas for improved diversification."*

---

## 🔌 Example API Usage

**Endpoint: `POST /api/chat`**  
Retrieve a multi-agent orchestrated decision for a stock asset.

**Request:**
```json
{
  "message": "Should I buy volatile stock TSLA today?",
  "userId": "usr_789xyz"
}
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "action": "HOLD",
    "confidence": 72,
    "sentiment": "Bearish",
    "reasoning": "While technical indicators point to an oversold bounce, the Risk Manager AI notes extreme volatility and potential downside that violates your current capital protection profile.",
    "riskMetrics": {
      "stopLoss": 155.40,
      "targetPrice": 180.00
    }
  }
}
```

---

## 🚢 Deployment

The repository includes a `docker-compose.yml` for simplified, unified deployment environments.

```bash
# Build and run the entire stack (Frontend, Backend API, ML Service, MonogoDB) locally via Docker
docker-compose up --build -d
```

**Cloud Environments (e.g., AWS EC2, DigitalOcean):**
1. Provision a Linux VM.
2. Install Docker & Docker Compose.
3. Clone repository and set `.env` files with production database URIs, secure API keys, and CORS configurations.
4. Scale ML service independently if model inference requires heavy GPU acceleration.

---

## 🚀 Future Improvements / Roadmap

- [ ] **Live Brokerage Integration:** Connect securely to Alpine, Plaid, or Interactive Brokers APIs for real-money execution.
- [ ] **Advanced Backtesting Engine:** Let users test multi-agent strategies against historical data spanning 20+ years.
- [ ] **Option Plays & Derivatives:** Expand AI capabilities beyond simple equities into Greeks evaluation for Options trading.
- [ ] **Social Sentiment Mapping:** Incorporate Reddit/Twitter parsing to alert users on retail hype bubbles.

---

## 📜 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

---
*Built to bring professional tier, data-backed financial advising to everyday traders.*
