import React from 'react';
import './LoadingState.css';

function LoadingState() {
  return (
    <div className="loading-state">
      <div className="loading-header">
        <div className="loading-spinner-large"></div>
        <h3>Analyzing Indian Markets</h3>
        <p>Scanning NSE stocks, calculating technical indicators, and ranking opportunities...</p>
      </div>
      
      <div className="skeleton-grid">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="skeleton-card" style={{ animationDelay: `${i * 0.1}s` }}>
            <div className="skeleton-header">
              <div className="skeleton-badge"></div>
              <div className="skeleton-title">
                <div className="skeleton-line short"></div>
                <div className="skeleton-line medium"></div>
              </div>
              <div className="skeleton-score"></div>
            </div>
            <div className="skeleton-chart"></div>
            <div className="skeleton-metrics">
              <div className="skeleton-line full"></div>
              <div className="skeleton-line full"></div>
              <div className="skeleton-line full"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default LoadingState;
