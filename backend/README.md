<div align="center">

# 🧠 AI Stock Agent — Backend Core (Node.js)

**The resilient, scalable API gateway linking user action with intelligent financial modeling.**

![Node.js](https://img.shields.io/badge/Node.js-18.x-339933?logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-Minimalist-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7.x-47A248?logo=mongodb&logoColor=white)
![Mongoose](https://img.shields.io/badge/Mongoose-ODM-880000?logo=mongoose&logoColor=white)

</div>

---

## ⚡ What is this?

Welcome to the central nervous system of the **AI Stock Trading and Market Advisory Platform**. 

This isn't just a CRUD server; it's a financial orchestrator. Built on Node.js and Express, this backend serves as the primary API gateway for our React frontend. It handles the critical tasks: securing user data, managing virtual paper trading wallets, executing risk assessment workflows, and most importantly, proxying complex machine learning requests to our Python microservice.

---

## 🛠️ The Tech Stack

Designed for high concurrency and robust data integrity:

- **Node.js & Express.js:** Fast, asynchronous, event-driven architecture.
- **MongoDB & Mongoose:** Flexible NoSQL document storage for users, transactions, portfolios, and risk profiles.
- **JWT & Bcrypt:** Industry-standard stateless authentication and secure password hashing.
- **Yahoo Finance (`yahoo-finance2`):** Our live market data pipeline for real-time quotes, historical data, and symbol searches.
- **Winston & Morgan:** Comprehensive logging for audit trails and debugging.
- **Express Rate Limit:** Guarding our endpoints against abuse.

---

## 🏗️ Architecture & Structure

We follow the standard MVC (Model-View-Controller) design pattern tailored for APIs.

```text
backend/
├── config/              # Database connection and environment loaders
├── controllers/         # The brains (Auth, Trading, AI Proxy, Social)
├── middleware/          # The bouncers (Auth guards, Rate limiting, Error handling)
├── models/              # The data structure (Mongoose Schemas)
├── routes/              # The map (Express Routers)
├── utils/               # The tools (Math helpers, token generators)
├── server.js            # The bootstrap file
└── .env                 # Environment variables
```

---

## 🚀 Getting Started

Let's spin up the API.

### Prerequisites
- Node.js (v14+)
- MongoDB (Running locally on 27017 or a Cloud Atlas URI)

### Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the `backend/` root directory:
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/ai-stock-trading
   JWT_SECRET=super_secret_jwt_key_here
   CLIENT_URL=http://localhost:3000
   ML_SERVICE_URL=http://localhost:8000
   ```

3. **Start the Server:**
   ```bash
   # For hot-reloading development
   npm run dev
   
   # For production
   npm start
   ```
   *The API will be available at `http://localhost:5000`.*

---

## 🔗 The ML Microservice Bridge

Why separate Node and Python? Because Node excels at I/O and web requests, while Python is the king of data science.

Instead of blocking our Node event loop with heavy ML computations, our `aiController.js` and `riskAnalysisController.js` act as intelligent proxies. They gather user data, format it, and shoot it over to the FastAPI Python service (Port 8000). Once the Python service crunches the numbers (LSTM forecasting, FinBERT sentiment, XGBoost classification), Node formats the insight and delivers it blazing fast back to the React client.

---

## 🔮 Future Roadmap

- [ ] **Redis Caching:** Implement Redis to cache Yahoo Finance API calls and ML predictions to reduce latency and third-party rate limits.
- [ ] **Microservices Splitting:** As the community grows, break the `social` and `trading` logic into their own dedicated microservices.
- [ ] **GraphQL:** Add a GraphQL overlay to allow the frontend to fetch exactly the data it needs for complex dashboard views.

---

<div align="center">
<i>Scale fast. Trade smart. 🚀 Let's disrupt.</i>
</div>
