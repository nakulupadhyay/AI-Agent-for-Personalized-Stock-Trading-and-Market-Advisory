<div align="center">

# 🚀 AI Stock Agent — Frontend Engine

**The breathtaking, intuitive, and responsive React SPA that brings professional-grade market intelligence to the retail investor.**

![React](https://img.shields.io/badge/React-18.x-61DAFB?logo=react&logoColor=black)
![Chart.js](https://img.shields.io/badge/Chart.js-4.x-FF6384?logo=chartdotjs&logoColor=white)
![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.x-0055FF?logo=framer&logoColor=white)
![CSS3](https://img.shields.io/badge/Vanilla_CSS-Modern-1572B6?logo=css3&logoColor=white)

</div>

---

## ⚡ What is this?

This is the client-facing presentation layer for the **AI Stock Trading and Market Advisory Platform**. 

We didn't just want to build a dashboard; we wanted to build an *experience*. We're talking real-time, fluid, and actionable intelligence that feels right at home alongside professional trading terminals—without the brutal learning curve.

Built on React 18, this Single Page Application (SPA) consumes our Node.js API and FastAPI ML models to deliver beautiful charts, AI-driven buy/sell signals, sentiment analysis, and seamless virtual paper trading.

---

## 🛠️ The Tech Stack

We chose a stack geared towards performance, maintainability, and visual excellence:

- **React 18:** The core engine. We heavily utilize Hooks and the Context API for state management.
- **Vanilla CSS3:** We skipped heavy CSS frameworks to maintain ultimate control over pixel-perfect layouts, fluid micro-animations, and a sleek dark mode.
- **Chart.js & React-Chartjs-2:** For rendering interactive, high-performance financial charts.
- **Axios:** For robust, predictable HTTP communication with our microservices.
- **Framer Motion:** Because static UI is dead. We use Framer Motion for buttery-smooth page transitions and element animations.
- **React Router v6:** For dynamic client-side routing and protected authentication flows.

---

## 🏗️ Architecture & Structure

Our frontend is modularized for rapid iteration and scaling.

```text
frontend/src/
├── components/          # The building blocks (Navbars, Cards, Modals, Forms)
├── context/             # App-wide state (AuthContext)
├── pages/               # The big picture (Dashboard, Portfolio, Settings)
├── utils/               # The fixers (API helpers, token managers, formatting)
├── App.js               # The conductor (Routing and Layout)
├── index.js             # The ignition switch
└── index.css            # The paint (Global styles and design tokens)
```

---

## 🚀 Getting Started

Ready to run the UI locally? Let's go.

### Prerequisites
- Node.js (v14+)
- npm (v6+)

### Installation

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   *As of right now, most API URLs are relative or default to localhost, but ensure your backend is running on port 5000.*

3. **Start the Development Server:**
   ```bash
   npm start
   ```
   *The app will launch at `http://localhost:3000`.*

---

## 🎨 Design Philosophy

We believe financial tools shouldn't look like MS-DOS. Our design principles:

1. **Clarity over Complexity:** Financial data is dense. We use clean typography and whitespace to make it digestible.
2. **Actionable Insights:** AI signals are color-coded (Green/Red/Gray) and placed front and center.
3. **Motion adds Meaning:** Animations are used to draw attention to changes in portfolio value or new AI recommendations, not just for show.
4. **Dark Mode First:** Because traders love dark mode.

---

## 🔮 Future Roadmap

- [ ] **WebSockets:** Migrate from REST polling to live Socket.io data feeds for the charting engine.
- [ ] **Advanced Charting:** Integrate TradingView's Lightweight Charts for more professional technical analysis tools.
- [ ] **React Native Port:** Extract business logic into a shared package to build the mobile app.

---

<div align="center">
<i>Built to disrupt retail trading. 🚢 Let's ship it.</i>
</div>
