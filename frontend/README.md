<div align="center">
  <h1>💻 Frontend Web Application</h1>
  <p><strong>AI-Powered Stock Trading & Market Advisory Platform</strong></p>
</div>

This directory contains the **React.js Frontend** for the AI Stock Trading Platform. It is a highly dynamic, Single Page Application (SPA) designed to give users a Wall-Street-level analytical view mixed with a futuristic AI assistant layer.

## ✨ Features

- **Interactive Dashboard:** Beautiful grid layouts showcasing net worth, active risk limits, portfolio allocation, and historical drawdowns.
- **Floating AI Assistant:** A sophisticated, always-accessible chat UI that supports both text and voice commands. Contains contextual awareness of the user's current screen.
- **Smart Decision Cards:** AI predictions don't just appear as plain text—they render as actionable UI components showing *Confidence Scores*, *Stop Loss Indicators*, and *1-Click Action Buttons*.
- **Data Visualization:** Employs `Chart.js` and `Recharts` for high-performance, interactive financial charts.

## 🛠️ Tech Stack

- **Framework:** React.js (v18), React Router
- **Styling & UI:** Tailwind CSS, Framer Motion (for fluid, fintech-grade animations)
- **Data Fetching:** Axios
- **State Management:** React Context API

---

## ⚙️ Setup & Installation

**1. Navigate to the frontend directory:**
```bash
cd frontend
```

**2. Install Dependencies:**
```bash
npm install
```

**3. Configure Environment:**
Check the `.env` file (if available) to ensure the API URL points to your backend. By default, the `package.json` uses `"proxy": "http://localhost:5000"`.

**4. Start Development Server:**
```bash
npm start
```

The application will launch on `http://localhost:3000`.

## 📦 Building for Production

To create an optimized production build:
```bash
npm run build
```
This will compile the React code into the `build/` folder, ready to be served by Nginx or distributed via a CDN. An `nginx.conf` has been provided for Docker deployments.

---
*Part of the AI-Powered Stock Trading & Market Advisory Platform microservices ecosystem.*
