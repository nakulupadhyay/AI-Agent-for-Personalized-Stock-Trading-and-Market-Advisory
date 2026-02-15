# Backend - AI Stock Trading Platform

Node.js/Express backend API for AI Stock Trading Platform.

## 📦 Installation

```bash
npm install
```

## 🔧 Environment Variables

Create a `.env` file in the backend directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-stock-trading
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_2024
JWT_EXPIRE=7d
NODE_ENV=development
```

## 🚀 Running the Server

Development mode:
```bash
npm start
```

With nodemon (auto-restart):
```bash
npm run dev
```

## 📂 Project Structure

```
backend/
├── config/
│   └── db.js              # MongoDB connection
├── controllers/
│   ├── authController.js   # Authentication logic
│   ├── stockController.js  # Stock data
│   ├── aiController.js     # AI recommendations
│   ├── tradingController.js # Paper trading
│   └── riskProfileController.js # Risk assessment
├── models/
│   ├── User.js            # User schema
│   ├── Portfolio.js       # Portfolio schema
│   ├── Transaction.js     # Transaction schema
│   └── RiskProfile.js     # Risk profile schema
├── routes/
│   ├── auth.js
│   ├── stocks.js
│   ├── ai.js
│   ├── trading.js
│   └── riskProfile.js
├── middleware/
│   └── auth.js            # JWT verification
├── .env
├── .gitignore
├── package.json
└── server.js              # Entry point
```

## 🔐 Authentication

All protected routes require a JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## 📡 API Endpoints

### Authentication Endpoints

**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login User**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

**Get Current User** (Protected)
```http
GET /api/auth/me
Authorization: Bearer <token>
```

### Stock Endpoints

**Get All Stocks** (Protected)
```http
GET /api/stocks
Authorization: Bearer <token>
```

**Get Stock Details** (Protected)
```http
GET /api/stocks/:symbol
Authorization: Bearer <token>
```

### AI Endpoints

**Get AI Recommendation** (Protected)
```http
POST /api/ai/recommendation
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "RELIANCE",
  "currentPrice": 2456.75,
  "sentiment": "Positive"
}
```

**Get Sentiment Analysis** (Protected)
```http
POST /api/ai/sentiment
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "RELIANCE"
}
```

**Chat with AI** (Protected)
```http
POST /api/ai/chat
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "Should I invest in tech stocks?"
}
```

### Trading Endpoints

**Buy Stock** (Protected)
```http
POST /api/trading/buy
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "RELIANCE",
  "companyName": "Reliance Industries Ltd",
  "quantity": 10,
  "price": 2456.75
}
```

**Sell Stock** (Protected)
```http
POST /api/trading/sell
Authorization: Bearer <token>
Content-Type: application/json

{
  "symbol": "RELIANCE",
  "companyName": "Reliance Industries Ltd",
  "quantity": 5,
  "price": 2500.00
}
```

**Get Portfolio** (Protected)
```http
GET /api/trading/portfolio
Authorization: Bearer <token>
```

**Get Transactions** (Protected)
```http
GET /api/trading/transactions
Authorization: Bearer <token>
```

### Risk Profile Endpoints

**Save Risk Profile** (Protected)
```http
POST /api/risk-profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "investmentHorizon": "Long-term (5+ years)",
  "riskTolerance": "Moderate",
  "investmentExperience": "Intermediate",
  "financialGoal": "Retirement planning",
  "monthlyIncome": "50000-100000"
}
```

**Get Risk Profile** (Protected)
```http
GET /api/risk-profile
Authorization: Bearer <token>
```

## 💾 Database Models

### User Model
- name, email, password (hashed)
- riskProfile (Low/Medium/High)
- virtualBalance (default: 1,000,000)

### Portfolio Model
- userId, holdings[], totalInvested, currentValue, profitLoss

### Transaction Model
- userId, type (BUY/SELL), symbol, quantity, price, totalAmount, timestamp

### RiskProfile Model
- userId, investmentHorizon, riskTolerance, investmentExperience, calculatedRiskLevel

## 🔒 Security Features

- Password hashing with bcrypt (salt rounds: 10)
- JWT token-based authentication
- Protected routes with middleware
- Input validation
- CORS configuration
- Environment variable protection

## 🛠️ Dependencies

```json
{
  "express": "^4.18.2",
  "mongoose": "^7.6.3",
  "cors": "^2.8.5",
  "dotenv": "^16.3.1",
  "bcrypt": "^5.1.1",
  "jsonwebtoken": "^9.0.2",
  "axios": "^1.5.1"
}
```

## 📝 Notes

- Current implementation uses mock AI logic - replace with real ML models for production
- Stock data is mocked - integrate with real APIs (Alpha Vantage, Yahoo Finance) for live data
- MongoDB must be running before starting the server
- Default virtual balance: ₹10,00,000

## 🐛 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running
- Check MONGODB_URI in .env file

**JWT Error:**
- Verify JWT_SECRET is set in .env
- Check token format in Authorization header

**Port Already in Use:**
- Change PORT in .env file
- Kill process using port 5000
