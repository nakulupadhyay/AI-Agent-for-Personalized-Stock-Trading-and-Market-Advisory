<div align="center">
  <h1>⚡ Backend API Service</h1>
  <p><strong>AI-Powered Stock Trading & Market Advisory Platform</strong></p>
</div>

This directory contains the **Node.js/Express.js Backend** for the AI Stock Trading Platform. It acts as the central hub, routing user requests, handling authentication, managing MongoDB data, and communicating directly with the Python ML Microservice to generate AI insights.

## 🚀 Key Responsibilities

- **User Management & Authentication:** Secure JWT-based authentication combined with `bcrypt` for password hashing to protect user data and portfolio privacy.
- **API Gateway to AI:** Receives user chat/voice queries and structural trading commands, formatting them into standardized payloads to send to the Python ML Service.
- **Trade Execution & Logging:** Validates buy/sell logic computationally before storing immutable trade logs and portfolio updates in the database.
- **Real-Time Websockets:** Employs `Socket.io` to beam live market data and instant AI notification updates directly to the connected frontend clients.
- **Security & Rate Limiting:** Utilizes `helmet`, `hpp`, and `express-rate-limit` to prevent abuse of the backend endpoints.

## 🛠️ Tech Stack

- **Framework:** Node.js, Express.js
- **Database:** MongoDB, Mongoose
- **Security:** Helmet, CORS, Express-Rate-Limit, Express-Mongo-Sanitize, Bcrypt, JWT
- **Integrations:** Axios, Google GenAI SDK

---

## ⚙️ Setup & Installation

**1. Navigate to the backend directory:**
```bash
cd backend
```

**2. Install Dependencies:**
```bash
npm install
```

**3. Configure Environment:**
Rename `.env.example` to `.env` and fill in the required variables:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRE=30d
NODE_ENV=development
ML_SERVICE_URL=http://localhost:8000
```

**4. Start the Server:**
```bash
# For development (uses nodemon)
npm run dev

# For production
npm start
```

## 🔌 Core API Routes

- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Authenticate & get JWT token
- `GET /api/portfolio` - Fetch current user portfolio and risk stats
- `POST /api/trade` - Execute a market/limit trade
- `POST /api/chat` - Route query to the AI Multi-Agent system

---
*Part of the AI-Powered Stock Trading & Market Advisory Platform microservices ecosystem.*
