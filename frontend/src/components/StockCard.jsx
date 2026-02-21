import React, { useState } from 'react';
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts';
import { TrendingUp, TrendingDown, Award, Clock, Calendar, Info, Shield } from 'lucide-react';
import ConfidenceModal from './ConfidenceModal';
import './StockCard.css';

function StockCard({ stock, onClick, animationDelay }) {
  const [showConfidenceModal, setShowConfidenceModal] = useState(false);
  const isPositiveChange = stock.change >= 0;
  
  const getProbabilityColor = (score) => {
    if (score >= 70) return 'high';
    if (score >= 50) return 'medium';
    return 'low';
  };

  const getRankBadge = (rank) => {
    if (rank === 1) return { icon: '🥇', class: 'gold' };
    if (rank === 2) return { icon: '🥈', class: 'silver' };
    if (rank === 3) return { icon: '🥉', class: 'bronze' };
    return { icon: `#${rank}`, class: 'default' };
  };

  const formatMarketCap = (cap) => {
    if (!cap) return 'N/A';
    if (cap >= 1e12) return `₹${(cap / 1e12).toFixed(2)}T`;
    if (cap >= 1e9) return `₹${(cap / 1e9).toFixed(0)}B`;
    if (cap >= 1e7) return `₹${(cap / 1e7).toFixed(0)}Cr`;
    return `₹${cap.toLocaleString()}`;
  };

  const formatTimeline = (weeks) => {
    if (weeks <= 4) return `${weeks} weeks`;
    if (weeks <= 12) return `${Math.round(weeks / 4)} months`;
    return `${Math.round(weeks / 4)} months`;
  };

  const getTimelineColor = (category) => {
    switch(category) {
      case 'Short-term': return 'short';
      case 'Medium-term': return 'medium';
      case 'Long-term': return 'long';
      default: return 'extended';
    }
  };

  const rankBadge = getRankBadge(stock.rank);
  const probClass = getProbabilityColor(stock.probabilityScore);
  const timeline = stock.timeline;

  return (
    <div 
      className="stock-card"
      onClick={onClick}
      style={{ animationDelay: `${animationDelay}s` }}
    >
      <div className="card-header">
        <div className="stock-identity">
          <div className={`rank-badge ${rankBadge.class}`}>
            {rankBadge.icon}
          </div>
          <div className="stock-info">
            <h3 className="stock-symbol">{stock.symbol}</h3>
            <p className="stock-name">{stock.name}</p>
          </div>
        </div>
        <div className="probability-badge-wrapper">
          <div className={`probability-badge ${probClass}`}>
            <Award size={14} />
            <span>{stock.probabilityScore}%</span>
          </div>
          <span className="prob-label">Upside Score</span>
          {stock.confidence && (
            <div 
              className="confidence-wrapper"
              onClick={(e) => {
                e.stopPropagation();
                setShowConfidenceModal(true);
              }}
              title="Click to see confidence analysis"
            >
              <div className={`confidence-indicator clickable ${stock.confidence.level.toLowerCase().replace('-', '')}`}>
                <span className="confidence-bar" style={{ width: `${stock.confidence.percent}%` }}></span>
                <span className="confidence-text">
                  {stock.confidence.percent}% confident
                  <Info size={10} className="info-icon" />
                </span>
              </div>
              {stock.confidence.reliability && (
                <div className={`reliability-row ${stock.confidence.reliability.level.toLowerCase().replace('-', '')}`}>
                  <Shield size={10} />
                  <span className="reliability-label">Reliability:</span>
                  <span className="reliability-value">{stock.confidence.reliability.score}%</span>
                  <span className="reliability-level">({stock.confidence.reliability.level})</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="card-chart">
        <ResponsiveContainer width="100%" height={80}>
          <LineChart data={stock.priceHistory}>
            <defs>
              <linearGradient id={`gradient-${stock.symbol}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isPositiveChange ? '#10b981' : '#ef4444'} stopOpacity={0.3} />
                <stop offset="100%" stopColor={isPositiveChange ? '#10b981' : '#ef4444'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={['dataMin', 'dataMax']} hide />
            <Line 
              type="monotone" 
              dataKey="price" 
              stroke={isPositiveChange ? '#10b981' : '#ef4444'}
              strokeWidth={2}
              dot={false}
              fill={`url(#gradient-${stock.symbol})`}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card-metrics">
        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">Current</span>
            <span className="metric-value price">₹{stock.currentPrice.toLocaleString()}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Change</span>
            <span className={`metric-value change ${isPositiveChange ? 'positive' : 'negative'}`}>
              {isPositiveChange ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {isPositiveChange ? '+' : ''}{stock.change}%
            </span>
          </div>
        </div>
        
        <div className="metric-row">
          <div className="metric">
            <span className="metric-label">52W High</span>
            <span className="metric-value">₹{stock.yearHigh.toLocaleString()}</span>
          </div>
          <div className="metric">
            <span className="metric-label">52W Low</span>
            <span className="metric-value">₹{stock.yearLow.toLocaleString()}</span>
          </div>
        </div>

        <div className="metric-row highlight">
          <div className="metric">
            <span className="metric-label">52W Average</span>
            <span className="metric-value">₹{stock.yearAverage.toLocaleString()}</span>
          </div>
          <div className="metric">
            <span className="metric-label">Below Avg</span>
            <span className="metric-value discount">-{stock.belowAveragePercent}%</span>
          </div>
        </div>
      </div>

      {timeline && (
        <div className="timeline-section">
          <div className="timeline-header">
            <Clock size={14} />
            <span>Expected Timeline</span>
          </div>
          <div className="timeline-content">
            <div className="timeline-main">
              <span className={`timeline-category ${getTimelineColor(timeline.category)}`}>
                {timeline.category}
              </span>
              <span className="timeline-range">
                {timeline.minWeeks}-{timeline.maxWeeks} weeks
              </span>
            </div>
            <div className="timeline-details">
              <div className="timeline-target">
                <span className="target-label">Target</span>
                <span className="target-value">₹{timeline.targetPrice?.toLocaleString()}</span>
              </div>
              <div className="timeline-gain">
                <span className="gain-label">Potential</span>
                <span className="gain-value">+{timeline.potentialGain}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card-footer">
        <div className="footer-item">
          <span className="footer-label">RSI</span>
          <span className={`footer-value ${stock.rsi < 30 ? 'oversold' : stock.rsi > 70 ? 'overbought' : ''}`}>
            {stock.rsi}
          </span>
        </div>
        <div className="footer-item">
          <span className="footer-label">Sector</span>
          <span className="footer-value sector">{stock.sector}</span>
        </div>
        <div className="footer-item">
          <span className="footer-label">Mkt Cap</span>
          <span className="footer-value">{formatMarketCap(stock.marketCap)}</span>
        </div>
      </div>

      <div className="card-action">
        <span>View Detailed Analysis →</span>
      </div>

      {showConfidenceModal && stock.confidence && (
        <ConfidenceModal
          stock={stock}
          onClose={() => setShowConfidenceModal(false)}
        />
      )}
    </div>
  );
}

export default StockCard;
