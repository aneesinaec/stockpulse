import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  X, TrendingUp, TrendingDown, Activity, BarChart3, 
  Target, AlertCircle, CheckCircle, Info, ExternalLink,
  Clock, Calendar, Zap, ArrowRight
} from 'lucide-react';
import { API_BASE } from '../config';
import { authFetch } from '../auth';
import './StockDetailModal.css';

function StockDetailModal({ symbol, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchStockDetail();
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [symbol]);

  const fetchStockDetail = async () => {
    try {
      const response = await authFetch(`${API_BASE}/api/stocks/${symbol}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Failed to fetch stock details');
      }
    } catch (err) {
      setError('Unable to fetch stock details');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatMarketCap = (cap) => {
    if (!cap) return 'N/A';
    if (cap >= 1e12) return `₹${(cap / 1e12).toFixed(2)} Trillion`;
    if (cap >= 1e9) return `₹${(cap / 1e9).toFixed(2)} Billion`;
    if (cap >= 1e7) return `₹${(cap / 1e7).toFixed(0)} Crore`;
    return `₹${cap.toLocaleString()}`;
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'Strong Buy': return 'strong-buy';
      case 'Buy': return 'buy';
      case 'Hold/Accumulate': return 'hold';
      case 'Hold': return 'hold';
      case 'Avoid': return 'avoid';
      default: return 'neutral';
    }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date">{label}</p>
          <p className="tooltip-price">₹{payload[0].value.toLocaleString()}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content loading-modal" onClick={e => e.stopPropagation()}>
          <div className="loading-spinner"></div>
          <p>Loading analysis for {symbol}...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content error-modal" onClick={e => e.stopPropagation()}>
          <AlertCircle size={48} />
          <h3>Error Loading Data</h3>
          <p>{error}</p>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          <X size={24} />
        </button>

        <div className="modal-header">
          <div className="header-main">
            <div className="stock-title">
              <h2>{data.symbol}</h2>
              <span className="stock-full-name">{data.name}</span>
            </div>
            <div className="current-price-section">
              <span className="current-price">₹{data.currentPrice.toLocaleString()}</span>
              <div className={`recommendation-badge ${getActionColor(data.recommendation.action)}`}>
                <Target size={16} />
                <span>{data.recommendation.action}</span>
              </div>
            </div>
          </div>
          
          <div className="header-meta">
            <span className="meta-item">{data.sector}</span>
            <span className="meta-divider">•</span>
            <span className="meta-item">{data.industry}</span>
            {data.website && (
              <>
                <span className="meta-divider">•</span>
                <a href={data.website} target="_blank" rel="noopener noreferrer" className="website-link">
                  <ExternalLink size={14} />
                  Website
                </a>
              </>
            )}
          </div>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'technical' ? 'active' : ''}`}
            onClick={() => setActiveTab('technical')}
          >
            Technical Analysis
          </button>
          <button 
            className={`tab ${activeTab === 'fundamentals' ? 'active' : ''}`}
            onClick={() => setActiveTab('fundamentals')}
          >
            Fundamentals
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'overview' && (
            <div className="tab-content overview">
              {/* Probability Score Card */}
              <div className="score-card">
                <div className="score-header">
                  <Activity size={20} />
                  <h3>Upside Probability Score</h3>
                </div>
                <div className="score-display">
                  <div className="score-circle">
                    <svg viewBox="0 0 100 100">
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke="var(--bg-elevated)" 
                        strokeWidth="10"
                      />
                      <circle 
                        cx="50" cy="50" r="45" 
                        fill="none" 
                        stroke={data.probabilityScore >= 60 ? 'var(--accent-green)' : data.probabilityScore >= 40 ? 'var(--accent-amber)' : 'var(--accent-red)'}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${data.probabilityScore * 2.83} 283`}
                        transform="rotate(-90 50 50)"
                      />
                    </svg>
                    <span className="score-value">{data.probabilityScore}%</span>
                  </div>
                  <div className="score-details">
                    <p className="confidence">Recommendation: {data.recommendation.action}</p>
                    <p className="reasoning">{data.recommendation.reasoning}</p>
                  </div>
                </div>

                {/* Confidence Section */}
                {data.confidence && (
                  <div className="confidence-section">
                    <div className="confidence-header">
                      <CheckCircle size={16} />
                      <span>Confidence Analysis</span>
                    </div>
                    <div className="confidence-main">
                      <div className="confidence-score-circle">
                        <svg viewBox="0 0 80 80">
                          <circle 
                            cx="40" cy="40" r="35" 
                            fill="none" 
                            stroke="var(--bg-elevated)" 
                            strokeWidth="6"
                          />
                          <circle 
                            cx="40" cy="40" r="35" 
                            fill="none" 
                            stroke={data.confidence.percent >= 70 ? 'var(--accent-green)' : data.confidence.percent >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${data.confidence.percent * 2.2} 220`}
                            transform="rotate(-90 40 40)"
                          />
                        </svg>
                        <span className="conf-score-value">{data.confidence.percent}%</span>
                      </div>
                      <div className="confidence-info">
                        <span className={`confidence-level-badge ${data.confidence.level.toLowerCase().replace('-', '')}`}>
                          {data.confidence.level}
                        </span>
                        <div className="confidence-stats">
                          <span>{data.confidence.signalsAligned} of {data.confidence.totalSignals} signals bullish</span>
                          <span>Alignment: {data.confidence.alignmentRatio}%</span>
                          <span>Volatility: {data.confidence.volatility}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Signal Breakdown */}
                    <div className="signal-breakdown">
                      <h4>Signal Breakdown</h4>
                      <div className="signals-list">
                        {data.confidence.factors?.map((factor, idx) => (
                          <div key={idx} className={`signal-item ${factor.strength.toLowerCase()}`}>
                            <span className="signal-name">{factor.name}</span>
                            <span className={`signal-strength ${factor.strength.toLowerCase()}`}>
                              {factor.strength}
                            </span>
                            <span className="signal-detail">{factor.detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Timeline Card */}
              {data.timeline && (
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <Clock size={20} />
                    <h3>Expected Timeline for Upside Realization</h3>
                  </div>
                  <div className="timeline-card-body">
                    <div className="timeline-main-info">
                      <div className="timeline-estimate">
                        <span className="timeline-weeks">{data.timeline.expectedWeeks}</span>
                        <span className="timeline-unit">weeks</span>
                      </div>
                      <div className="timeline-range-info">
                        <span className={`timeline-category-badge ${data.timeline.category.toLowerCase().replace('-', '')}`}>
                          {data.timeline.category}
                        </span>
                        <span className="timeline-range-text">
                          Range: {data.timeline.minWeeks} - {data.timeline.maxWeeks} weeks
                        </span>
                        <span className="timeline-confidence">
                          Confidence: {data.timeline.confidence}
                        </span>
                      </div>
                    </div>
                    
                    <div className="timeline-target-info">
                      <div className="timeline-price-flow">
                        <div className="price-current">
                          <span className="price-label">Current</span>
                          <span className="price-value">₹{data.currentPrice.toLocaleString()}</span>
                        </div>
                        <div className="price-arrow">
                          <ArrowRight size={24} />
                          <span className="gain-badge">+{data.timeline.potentialGain}%</span>
                        </div>
                        <div className="price-target">
                          <span className="price-label">Target (52W Avg)</span>
                          <span className="price-value target">₹{data.timeline.targetPrice?.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="timeline-factors">
                      <h4>Factors Affecting Timeline</h4>
                      <div className="factors-grid">
                        <div className={`factor-item ${data.timeline.factors.rsiImpact.toLowerCase()}`}>
                          <Zap size={14} />
                          <span className="factor-name">RSI Momentum</span>
                          <span className="factor-impact">{data.timeline.factors.rsiImpact}</span>
                        </div>
                        <div className={`factor-item ${data.timeline.factors.momentumImpact.toLowerCase()}`}>
                          <TrendingUp size={14} />
                          <span className="factor-name">MACD Trend</span>
                          <span className="factor-impact">{data.timeline.factors.momentumImpact}</span>
                        </div>
                        <div className={`factor-item ${data.timeline.factors.volumeImpact.toLowerCase()}`}>
                          <BarChart3 size={14} />
                          <span className="factor-name">Volume Activity</span>
                          <span className="factor-impact">{data.timeline.factors.volumeImpact}</span>
                        </div>
                        <div className="factor-item neutral">
                          <Activity size={14} />
                          <span className="factor-name">Volatility</span>
                          <span className="factor-impact">{data.timeline.volatility}%</span>
                        </div>
                      </div>
                    </div>

                    <p className="timeline-description">{data.timeline.description}</p>
                  </div>
                </div>
              )}

              {/* Price Chart */}
              <div className="chart-card">
                <h3><BarChart3 size={18} /> 52-Week Price History</h3>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={data.priceHistory}>
                      <defs>
                        <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={{ stroke: 'var(--border-color)' }}
                        tickFormatter={(date) => {
                          const d = new Date(date);
                          return d.toLocaleDateString('en-IN', { month: 'short' });
                        }}
                        interval="preserveStartEnd"
                      />
                      <YAxis 
                        tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={['dataMin - 50', 'dataMax + 50']}
                        tickFormatter={(val) => `₹${val}`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="price" 
                        stroke="#3b82f6" 
                        strokeWidth={2}
                        fill="url(#priceGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="price-levels">
                  <div className="level">
                    <span className="level-label">52W High</span>
                    <span className="level-value high">₹{data.yearHigh.toLocaleString()}</span>
                  </div>
                  <div className="level">
                    <span className="level-label">52W Average</span>
                    <span className="level-value">₹{data.yearAverage.toLocaleString()}</span>
                  </div>
                  <div className="level">
                    <span className="level-label">52W Low</span>
                    <span className="level-value low">₹{data.yearLow.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {data.description && data.description !== 'No description available' && (
                <div className="description-card">
                  <h3><Info size={18} /> About the Company</h3>
                  <p>{data.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'technical' && (
            <div className="tab-content technical">
              <div className="indicators-grid">
                {/* RSI */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <h4>RSI (14)</h4>
                    <span className={`signal ${data.technicalIndicators.rsi < 30 ? 'bullish' : data.technicalIndicators.rsi > 70 ? 'bearish' : 'neutral'}`}>
                      {data.technicalIndicators.rsiSignal}
                    </span>
                  </div>
                  <div className="indicator-value">{data.technicalIndicators.rsi}</div>
                  <div className="rsi-gauge">
                    <div className="gauge-track">
                      <div className="gauge-zones">
                        <span className="zone oversold">Oversold</span>
                        <span className="zone neutral">Neutral</span>
                        <span className="zone overbought">Overbought</span>
                      </div>
                      <div 
                        className="gauge-marker" 
                        style={{ left: `${data.technicalIndicators.rsi}%` }}
                      ></div>
                    </div>
                    <div className="gauge-labels">
                      <span>0</span>
                      <span>30</span>
                      <span>70</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>

                {/* MACD */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <h4>MACD</h4>
                    <span className={`signal ${data.technicalIndicators.macdTrend === 'Bullish' ? 'bullish' : 'bearish'}`}>
                      {data.technicalIndicators.macdTrend}
                    </span>
                  </div>
                  <div className="macd-values">
                    <div className="macd-item">
                      <span className="label">MACD Line</span>
                      <span className="value">{data.technicalIndicators.macd.toFixed(2)}</span>
                    </div>
                    <div className="macd-item">
                      <span className="label">Signal Line</span>
                      <span className="value">{data.technicalIndicators.macdSignal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Moving Averages */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <h4>Moving Averages</h4>
                    <span className={`signal ${data.technicalIndicators.trend === 'Bullish' ? 'bullish' : 'bearish'}`}>
                      {data.technicalIndicators.trend}
                    </span>
                  </div>
                  <div className="ma-grid">
                    <div className="ma-item">
                      <span className="label">SMA 20</span>
                      <span className={`value ${data.currentPrice > data.technicalIndicators.sma20 ? 'above' : 'below'}`}>
                        ₹{data.technicalIndicators.sma20.toLocaleString()}
                      </span>
                    </div>
                    <div className="ma-item">
                      <span className="label">SMA 50</span>
                      <span className={`value ${data.currentPrice > data.technicalIndicators.sma50 ? 'above' : 'below'}`}>
                        ₹{data.technicalIndicators.sma50.toLocaleString()}
                      </span>
                    </div>
                    {data.technicalIndicators.sma200 && (
                      <div className="ma-item">
                        <span className="label">SMA 200</span>
                        <span className={`value ${data.currentPrice > data.technicalIndicators.sma200 ? 'above' : 'below'}`}>
                          ₹{data.technicalIndicators.sma200.toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Support & Resistance */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <h4>Support & Resistance</h4>
                  </div>
                  <div className="sr-levels">
                    <div className="sr-item resistance">
                      <span className="label">Resistance</span>
                      <span className="value">₹{data.technicalIndicators.resistance.toLocaleString()}</span>
                    </div>
                    <div className="sr-item current">
                      <span className="label">Current</span>
                      <span className="value">₹{data.currentPrice.toLocaleString()}</span>
                    </div>
                    <div className="sr-item support">
                      <span className="label">Support</span>
                      <span className="value">₹{data.technicalIndicators.support.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Bollinger Position */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <h4>Bollinger Bands Position</h4>
                  </div>
                  <div className="bb-gauge">
                    <div className="bb-track">
                      <div 
                        className="bb-marker" 
                        style={{ left: `${Math.min(100, Math.max(0, data.technicalIndicators.bollingerPosition))}%` }}
                      ></div>
                    </div>
                    <div className="bb-labels">
                      <span>Lower Band</span>
                      <span>Middle</span>
                      <span>Upper Band</span>
                    </div>
                  </div>
                  <p className="bb-hint">
                    {data.technicalIndicators.bollingerPosition < 20 
                      ? 'Near lower band - potentially oversold'
                      : data.technicalIndicators.bollingerPosition > 80
                      ? 'Near upper band - potentially overbought'
                      : 'Within normal range'}
                  </p>
                </div>

                {/* Volume */}
                <div className="indicator-card">
                  <div className="indicator-header">
                    <h4>Volume Analysis</h4>
                    <span className={`signal ${data.volume.ratio > 1.2 ? 'bullish' : data.volume.ratio < 0.8 ? 'bearish' : 'neutral'}`}>
                      {data.volume.ratio > 1.2 ? 'High Activity' : data.volume.ratio < 0.8 ? 'Low Activity' : 'Normal'}
                    </span>
                  </div>
                  <div className="volume-stats">
                    <div className="vol-item">
                      <span className="label">Current Volume</span>
                      <span className="value">{(data.volume.current / 1e6).toFixed(2)}M</span>
                    </div>
                    <div className="vol-item">
                      <span className="label">Avg Volume</span>
                      <span className="value">{(data.volume.average / 1e6).toFixed(2)}M</span>
                    </div>
                    <div className="vol-item">
                      <span className="label">Vol Ratio</span>
                      <span className={`value ${data.volume.ratio > 1 ? 'above' : 'below'}`}>
                        {data.volume.ratio}x
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'fundamentals' && (
            <div className="tab-content fundamentals">
              <div className="fundamentals-grid">
                <div className="fund-card">
                  <span className="fund-label">Market Cap</span>
                  <span className="fund-value">{formatMarketCap(data.fundamentals.marketCap)}</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">P/E Ratio (TTM)</span>
                  <span className="fund-value">{data.fundamentals.pe?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">Forward P/E</span>
                  <span className="fund-value">{data.fundamentals.forwardPe?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">P/B Ratio</span>
                  <span className="fund-value">{data.fundamentals.pb?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">EPS (TTM)</span>
                  <span className="fund-value">₹{data.fundamentals.eps?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">Dividend Yield</span>
                  <span className="fund-value">{data.fundamentals.dividendYield?.toFixed(2) || '0'}%</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">Beta</span>
                  <span className="fund-value">{data.fundamentals.beta?.toFixed(2) || 'N/A'}</span>
                </div>
                <div className="fund-card">
                  <span className="fund-label">52W Change</span>
                  <span className={`fund-value ${data.fundamentals['52WeekChange'] >= 0 ? 'positive' : 'negative'}`}>
                    {data.fundamentals['52WeekChange']?.toFixed(2) || '0'}%
                  </span>
                </div>
              </div>

              <div className="disclaimer">
                <AlertCircle size={16} />
                <p>
                  The data displayed is sourced from Yahoo Finance and may have a delay. 
                  This information is for educational purposes only and should not be considered 
                  as financial advice. Always do your own research before making investment decisions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default StockDetailModal;
