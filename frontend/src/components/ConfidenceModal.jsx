import React from 'react';
import { 
  X, Shield, CheckCircle, AlertTriangle, Info, 
  TrendingUp, BarChart3, Activity, Target, Zap
} from 'lucide-react';
import './ConfidenceModal.css';

function ConfidenceModal({ stock, onClose }) {
  const confidence = stock.confidence;
  const reliability = confidence?.reliability;

  const getImpactIcon = (impact) => {
    switch (impact) {
      case 'Positive': return <CheckCircle size={16} className="impact-icon positive" />;
      case 'Negative': return <AlertTriangle size={16} className="impact-icon negative" />;
      default: return <Info size={16} className="impact-icon neutral" />;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium-high';
    if (score >= 40) return 'medium';
    if (score >= 25) return 'low-medium';
    return 'low';
  };

  return (
    <div className="confidence-modal-overlay" onClick={onClose}>
      <div className="confidence-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="confidence-modal-header">
          <div className="header-icon">
            <Shield size={24} />
          </div>
          <div className="header-text">
            <h2>Confidence Analysis</h2>
            <p>{stock.symbol} - {stock.name}</p>
          </div>
        </div>

        <div className="confidence-modal-body">
          {/* Main Scores Section */}
          <div className="scores-section">
            <div className="score-card-main">
              <div className="score-label">Upside Score</div>
              <div className={`score-value ${getScoreColor(stock.probabilityScore)}`}>
                {stock.probabilityScore}%
              </div>
              <div className="score-sublabel">Probability of price increase</div>
            </div>
            
            <div className="score-arrow">→</div>
            
            <div className="score-card-main">
              <div className="score-label">Confidence Level</div>
              <div className={`score-value ${getScoreColor(confidence.percent)}`}>
                {confidence.percent}%
              </div>
              <div className="score-sublabel">{confidence.level}</div>
            </div>
            
            <div className="score-arrow">→</div>
            
            <div className="score-card-main reliability">
              <div className="score-label">
                <Shield size={14} />
                Reliability Score
              </div>
              <div className={`score-value ${getScoreColor(reliability?.score || 0)}`}>
                {reliability?.score || 'N/A'}%
              </div>
              <div className="score-sublabel">{reliability?.level || 'Unknown'}</div>
            </div>
          </div>

          {/* Reliability Explanation */}
          {reliability && (
            <div className="reliability-section">
              <div className="section-header">
                <Shield size={18} />
                <h3>What does the Reliability Score mean?</h3>
              </div>
              <p className="reliability-summary">{reliability.summary}</p>
              
              <div className="explanation-box">
                <h4>How we calculate reliability:</h4>
                <p>
                  The reliability score measures how much you can trust our confidence score. 
                  It analyzes the quality of data, consistency of signals, market stability, 
                  and clarity of trends to determine if conditions favor accurate predictions.
                </p>
              </div>
            </div>
          )}

          {/* Signal Factors */}
          <div className="signals-section">
            <div className="section-header">
              <Activity size={18} />
              <h3>Signal Analysis ({confidence.signalsAligned} of {confidence.totalSignals} bullish)</h3>
            </div>
            <div className="signals-grid">
              {confidence.factors?.map((factor, idx) => (
                <div key={idx} className={`signal-card ${factor.strength.toLowerCase()}`}>
                  <div className="signal-header">
                    <span className="signal-name">{factor.name}</span>
                    <span className={`signal-badge ${factor.strength.toLowerCase()}`}>
                      {factor.strength}
                    </span>
                  </div>
                  <p className="signal-detail">{factor.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Reliability Factors */}
          {reliability?.factors && (
            <div className="reliability-factors-section">
              <div className="section-header">
                <Target size={18} />
                <h3>Reliability Breakdown</h3>
              </div>
              <div className="reliability-factors">
                {reliability.factors.map((factor, idx) => (
                  <div key={idx} className={`reliability-factor ${factor.impact.toLowerCase()}`}>
                    <div className="factor-header">
                      {getImpactIcon(factor.impact)}
                      <span className="factor-name">{factor.factor}</span>
                      <div className="factor-score-bar">
                        <div 
                          className={`factor-score-fill ${getScoreColor(factor.score)}`}
                          style={{ width: `${factor.score}%` }}
                        ></div>
                      </div>
                      <span className="factor-score">{factor.score}%</span>
                    </div>
                    <p className="factor-reasoning">{factor.reasoning}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interpretation Guide */}
          <div className="interpretation-section">
            <div className="section-header">
              <Info size={18} />
              <h3>How to Interpret These Scores</h3>
            </div>
            <div className="interpretation-grid">
              <div className="interp-card">
                <h4>High Reliability (80%+)</h4>
                <p>Strong data quality, aligned signals, stable conditions. The confidence score is highly trustworthy.</p>
              </div>
              <div className="interp-card">
                <h4>Medium Reliability (50-79%)</h4>
                <p>Reasonable data with some mixed signals. Use the confidence score as a guide but consider other factors.</p>
              </div>
              <div className="interp-card">
                <h4>Low Reliability (&lt;50%)</h4>
                <p>Limited data, conflicting signals, or high volatility. Treat the confidence score with caution.</p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="disclaimer-section">
            <AlertTriangle size={16} />
            <p>
              These scores are based on technical analysis and historical patterns. 
              Past performance does not guarantee future results. Always conduct your own research 
              and consider consulting a financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfidenceModal;
