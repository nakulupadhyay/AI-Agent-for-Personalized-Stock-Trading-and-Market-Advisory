# Frontend - AI Stock Trading Platform

React.js frontend application for AI Stock Trading Platform.

## 📦 Installation

```bash
npm install
```

## 🔧 Environment Variables

Create a `.env` file in the frontend directory:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## 🚀 Running the Application

Development mode:
```bash
npm start
```

Build for production:
```bash
npm run build
```

Run tests:
```bash
npm test
```

## 📂 Project Structure

```
frontend/
├── public/
│   └── index.html
└── src/
    ├── components/
    │   ├── Navbar.js          # Navigation component
    │   ├── Navbar.css
    │   └── ProtectedRoute.js  # Route guard
    ├── pages/
    │   ├── LandingPage.js     # Homepage
    │   ├── LandingPage.css
    │   ├── Login.js           # Login page
    │   ├── Signup.js          # Registration page
    │   ├── Login.css          # Auth pages styles
    │   ├── Dashboard.js       # Main dashboard
    │   └── Dashboard.css
    ├── context/
    │   └── AuthContext.js     # Authentication state
    ├── utils/
    │   └── api.js             # Axios instance
    ├── App.js                 # Main app component
    ├── App.css
    ├── index.js               # Entry point
    └── index.css              # Global styles
```

## 🎨 Pages

### Landing Page (/)
- Project introduction
- Features showcase
- Call-to-action buttons

### Login (/login)
- Email/password authentication
- Form validation
- Error handling

### Signup (/signup)
- User registration
- Password confirmation
- Input validation

### Dashboard (/dashboard) - Protected
- Portfolio statistics
- AI recommendations with confidence scores
- Sentiment analysis
- Top stocks table
- Real-time data updates

### Paper Trading (/paper-trading) - Protected
- Virtual trading interface (Coming Soon)

### Risk Profile (/risk-profile) - Protected
- Risk assessment questionnaire (Coming Soon)

### AI Chat Advisor (/chat-advisor) - Protected
- Interactive AI chat (Coming Soon)

## 🔐 Authentication Flow

1. User registers/logs in
2. JWT token stored in localStorage
3. Token attached to all API requests via Axios interceptor
4. Protected routes check authentication status
5. Automatic redirect to login if unauthorized

## 🛠️ Key Features

### AuthContext
- Manages global authentication state
- Provides login, register, logout functions
- Persists user session

### Protected Routes
- Guards dashboard and user-specific pages
- Redirects unauthenticated users to login

### API Integration
- Centralized Axios instance with interceptors
- Automatic token attachment
- Global error handling

### Responsive Design
- Mobile-friendly layouts
- Flexible grid systems
- Touch-optimized interfaces

## 📊 Components

### Navbar
- Conditional rendering based on auth state
- Navigation links
- User profile display
- Logout functionality

### Dashboard Stats Cards
- Virtual balance
- Total invested
- Current value
- Profit/loss with color coding

### Recommendation Card
- Buy/Sell/Hold badge
- Confidence progress bar
- AI reasoning explanation

### Sentiment Badge
- Positive/Negative/Neutral indicators
- Color-coded design

## 🎨 Styling

- Modern gradient backgrounds
- Smooth transitions and animations
- Hover effects for interactivity
- Card-based layout
- Color-coded data (green for profit, red for loss)

## 🔌 API Integration

All API calls use the centralized `api` utility:

```javascript
import api from '../utils/api';

// Example: Fetch stocks
const response = await api.get('/stocks');

// Example: Buy stock
const response = await api.post('/trading/buy', {
  symbol: 'RELIANCE',
  quantity: 10,
  price: 2456.75
});
```

## 🧪 State Management

Uses React Context API for:
- Authentication state
- User information
- Login/logout actions

## 📱 Responsive Breakpoints

- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

## 🛠️ Dependencies

```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-router-dom": "^6.18.0",
  "axios": "^1.5.1",
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0"
}
```

## 📝 Available Scripts

- `npm start` - Run development server
- `npm build` - Create production build
- `npm test` - Run test suite
- `npm eject` - Eject from create-react-app (irreversible)

## 🌐 Environment Setup

For different environments:

**Development:**
```env
REACT_APP_API_URL=http://localhost:5000/api
```

**Production:**
```env
REACT_APP_API_URL=https://your-api-domain.com/api
```

## 🐛 Troubleshooting

**CORS Errors:**
- Ensure backend CORS is configured correctly
- Check API_URL in .env file

**Authentication Issues:**
- Clear localStorage
- Check JWT token expiration
- Verify backend is running

**Page Not Loading:**
- Check console for errors
- Verify API endpoint responses
- Ensure backend is accessible

## 🚀 Deployment

Build the application:
```bash
npm run build
```

The `build` folder contains optimized production files ready for deployment to:
- Netlify
- Vercel
- GitHub Pages
- AWS S3
- Heroku

## 📝 Notes

- ChartJS integration ready but charts need to be implemented
- Additional pages (Paper Trading, Risk Profile, Chat) have placeholder components
- LocalStorage used for token management
- Automatic token refresh not implemented (tokens expire based on backend JWT_EXPIRE setting)
