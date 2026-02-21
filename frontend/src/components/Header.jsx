import React from 'react';
import { TrendingUp, RefreshCw, BarChart3, LogOut } from 'lucide-react';
import './Header.css';

function Header({ lastUpdated, onRefresh, loading, email, onLogout }) {
  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <div className="logo">
            <div className="logo-icon">
              <BarChart3 size={28} />
            </div>
            <div className="logo-text">
              <h1>StockPulse</h1>
              <span className="logo-subtitle">Indian Market Scanner</span>
            </div>
          </div>
        </div>
        
        <div className="header-center">
          <div className="market-badge">
            <span className="badge-dot"></span>
            <span>NSE</span>
          </div>
          <div className="market-badge secondary">
            <TrendingUp size={14} />
            <span>Below 52W Avg</span>
          </div>
        </div>

        <div className="header-right">
          {lastUpdated && (
            <div className="last-updated">
              <span className="update-label">Last updated</span>
              <span className="update-time">{formatTime(lastUpdated)}</span>
            </div>
          )}
          <button 
            className={`refresh-button ${loading ? 'loading' : ''}`}
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw size={18} className={loading ? 'spinning' : ''} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
          {email && (
            <div className="user-section">
              <span className="user-email">{email}</span>
              <button className="logout-button" onClick={onLogout} title="Sign out">
                <LogOut size={16} />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
