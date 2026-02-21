import React, { useState, useEffect } from 'react';
import StockCard from './components/StockCard';
import StockDetailModal from './components/StockDetailModal';
import LoadingState from './components/LoadingState';
import Header from './components/Header';
import AuthPage from './components/AuthPage';
import { API_BASE } from './config';
import { isAuthenticated, clearSession, authFetch, getEmail } from './auth';
import './App.css';

function getResetToken() {
  const params = new URLSearchParams(window.location.search);
  return params.get('reset_token') || null;
}

function App() {
  const [authed, setAuthed] = useState(isAuthenticated());
  const [resetToken, setResetToken] = useState(getResetToken);
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (authed && !resetToken) fetchStocks();
  }, [authed, resetToken]);

  const handleLogout = () => {
    clearSession();
    setAuthed(false);
    setStocks([]);
  };

  const handleResetComplete = () => {
    setResetToken(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  if (resetToken || !authed) {
    return (
      <AuthPage
        onAuthenticated={() => { setResetToken(null); setAuthed(true); }}
        resetToken={resetToken}
        onResetComplete={handleResetComplete}
      />
    );
  }

  const fetchStocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await authFetch(`${API_BASE}/api/stocks`);
      const data = await response.json();
      
      if (data.success) {
        setStocks(data.stocks);
        setLastUpdated(new Date(data.lastUpdated));
      } else {
        setError('Failed to fetch stocks');
      }
    } catch (err) {
      setError('Unable to connect to server. Make sure the backend is running.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStockClick = (stock) => {
    setSelectedStock(stock);
  };

  const handleCloseModal = () => {
    setSelectedStock(null);
  };

  return (
    <div className="app">
      <div className="app-background">
        <div className="grid-pattern"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>
      
      <Header lastUpdated={lastUpdated} onRefresh={fetchStocks} loading={loading} email={getEmail()} onLogout={handleLogout} />
      
      <main className="main-content">
        <div className="container">
          <div className="intro-section">
            <h2 className="intro-title">
              <span className="highlight">Undervalued</span> Opportunities
            </h2>
            <p className="intro-text">
              Stocks currently trading below their 52-week average, ranked by our 
              proprietary algorithm analyzing RSI, MACD, volume trends, and price momentum.
            </p>
          </div>

          {loading && <LoadingState />}
          
          {error && (
            <div className="error-state">
              <div className="error-icon">⚠️</div>
              <h3>Something went wrong</h3>
              <p>{error}</p>
              <button onClick={fetchStocks} className="retry-button">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && stocks.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>No stocks found</h3>
              <p>No stocks are currently trading below their 52-week average.</p>
            </div>
          )}

          {!loading && !error && stocks.length > 0 && (
            <div className="stocks-grid">
              {stocks.map((stock, index) => (
                <StockCard 
                  key={stock.symbol} 
                  stock={stock} 
                  onClick={() => handleStockClick(stock)}
                  animationDelay={index * 0.1}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedStock && (
        <StockDetailModal 
          symbol={selectedStock.symbol} 
          onClose={handleCloseModal} 
        />
      )}

      <footer className="footer">
        <p>Data sourced from Yahoo Finance • For educational purposes only • Not financial advice</p>
      </footer>
    </div>
  );
}

export default App;
