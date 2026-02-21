# StockPulse - Indian Stock Analyzer

A full-stack web application that finds Indian stocks trading below their 52-week average and ranks them by probability of price increase.

![StockPulse Screenshot](https://via.placeholder.com/800x450/0a0e17/10b981?text=StockPulse+Dashboard)

## Features

- 📊 **Stock Scanner**: Automatically scans 50+ popular NSE stocks
- 📉 **Below Average Filter**: Identifies stocks trading below their 52-week average
- 🎯 **Probability Ranking**: Ranks stocks using technical indicators (RSI, MACD, Moving Averages, Volume)
- 📈 **Interactive Charts**: 52-week price history visualization using Recharts
- 🔍 **Detailed Analysis**: Click any stock for in-depth technical and fundamental analysis
- 🌙 **Modern Dark UI**: Beautiful trading terminal-inspired interface

## Tech Stack

### Backend
- **Python Flask** - REST API server
- **yfinance** - Yahoo Finance data fetching
- **pandas/numpy** - Data processing and calculations

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Recharts** - Charting library
- **Lucide React** - Icons

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 18+
- npm or yarn

### Installation

1. **Clone the repository**
```bash
cd /Users/aabdulkader/vibe
```

2. **Set up the Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Set up the Frontend**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the Backend** (Terminal 1)
```bash
cd backend
source venv/bin/activate  # On Windows: venv\Scripts\activate
python app.py
```
Backend will run on http://localhost:5000

2. **Start the Frontend** (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend will run on http://localhost:3000

3. **Open your browser** and navigate to http://localhost:3000

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/stocks` | GET | Get top 10 undervalued stocks ranked by probability |
| `/api/stocks/<symbol>` | GET | Get detailed analysis for a specific stock |
| `/api/health` | GET | Health check endpoint |

## Probability Score Algorithm

The probability score (0-100) is calculated using:

| Indicator | Weight | Description |
|-----------|--------|-------------|
| RSI (14) | 30% | Oversold stocks (RSI < 30) get higher scores |
| Distance from 52W Low | 25% | Closer to low = more upside potential |
| Moving Averages | 20% | Bullish alignment (Price > SMA20 > SMA50) |
| MACD | 15% | Bullish crossover signals |
| Volume Trend | 10% | Increased volume indicates interest |

## Disclaimer

This application is for educational purposes only. The data is sourced from Yahoo Finance and may have delays. This is not financial advice. Always do your own research before making investment decisions.

## License

MIT License
