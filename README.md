# AI Stock Trading & Market Advisory Platform

A comprehensive full-stack web application for AI-powered stock trading and market advisory using React.js, Node.js/Express, and MongoDB.

## 🌟 Features

- **JWT Authentication** - Secure login and registration system
- **User Dashboard** - Real-time portfolio tracking and statistics
- **AI Recommendations** - Buy/Sell/Hold suggestions with confidence scores
- **Sentiment Analysis** - Market sentiment analysis from news
- **Paper Trading** - Virtual trading with ₹10,00,000 balance
- **Risk Profiling** - Personalized investment strategies
- **AI Chat Advisor** - Interactive AI assistant for stock queries
- **Portfolio Management** - Track holdings, profit/loss, and transactions

## 🚀 Tech Stack

**Frontend:**
- React 18 with Hooks
- React Router for navigation
- Axios for API calls
- Chart.js for data visualization
- Modern CSS with responsive design

**Backend:**
- Node.js & Express.js
- MongoDB with Mongoose ODM
- JWT authentication
- Bcrypt password hashing
- RESTful API architecture

## 📁 Project Structure

```
project_7_sem/
├── backend/
│   ├── config/         # Database configuration
│   ├── models/         # Mongoose schemas
│   ├── controllers/    # Business logic
│   ├── routes/         # API routes
│   ├── middleware/     # Auth middleware
│   └── server.js       # Express server
├── frontend/
│   ├── public/
│   └── src/
│       ├── components/ # Reusable components
│       ├── pages/      # Page components
│       ├── context/    # React context
│       ├── utils/      # API utilities
│       └── App.js      # Main app component
└── README.md
```

## ⚙️ Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
- Update `.env` file with your MongoDB URI
- Change JWT_SECRET to a secure random string

4. Start the server:
```bash
npm start
```

Server will run on http://localhost:5000

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

Application will open on http://localhost:3000

## 🔐 Default Configuration

- **Backend Port:** 5000
- **Frontend Port:** 3000
- **MongoDB URL:** mongodb://localhost:27017/ai-stock-trading
- **Virtual Balance:** ₹10,00,000

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Stocks
- `GET /api/stocks` - Get stock list
- `GET /api/stocks/:symbol` - Get stock details

### AI Services
- `POST /api/ai/recommendation` - Get AI recommendation
- `POST /api/ai/sentiment` - Get sentiment analysis
- `POST /api/ai/chat` - Chat with AI advisor

### Trading
- `POST /api/trading/buy` - Execute buy order
- `POST /api/trading/sell` - Execute sell order
- `GET /api/trading/portfolio` - Get portfolio
- `GET /api/trading/transactions` - Get transaction history

### Risk Profile
- `POST /api/risk-profile` - Save risk profile
- `GET /api/risk-profile` - Get risk profile

## 🎯 Usage Guide

1. **Register/Login** - Create an account or log in
2. **View Dashboard** - See market overview and AI recommendations
3. **Paper Trading** - Practice buying and selling stocks
4. **Risk Assessment** - Complete risk profile questionnaire
5. **AI Chat** - Ask questions to the AI advisor
6. **Track Portfolio** - Monitor your investments and performance


**Developed for AI Agent for Personalized Stock Trading and Market Advisory**
