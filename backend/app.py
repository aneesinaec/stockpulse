"""
Indian Stock Analysis API - Flask Backend
Fetches stock data, calculates probability scores, and provides detailed analysis
"""

from flask import Flask, jsonify
from flask_cors import CORS
import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
# Allow CORS from any origin for the API
CORS(app, origins=["*"], supports_credentials=True)

from auth import register_auth_routes, login_required   # noqa: E402
register_auth_routes(app)

# Popular Indian stocks (NSE) - diversified across sectors
INDIAN_STOCKS = [
    # Large Cap - IT
    "TCS.NS", "INFY.NS", "WIPRO.NS", "HCLTECH.NS", "TECHM.NS",
    # Large Cap - Banking
    "HDFCBANK.NS", "ICICIBANK.NS", "SBIN.NS", "KOTAKBANK.NS", "AXISBANK.NS",
    # Large Cap - Auto
    "MARUTI.NS", "TATAMOTORS.NS", "M&M.NS", "BAJAJ-AUTO.NS", "HEROMOTOCO.NS",
    # Large Cap - Pharma
    "SUNPHARMA.NS", "DRREDDY.NS", "CIPLA.NS", "DIVISLAB.NS", "APOLLOHOSP.NS",
    # Large Cap - Energy & Oil
    "RELIANCE.NS", "ONGC.NS", "NTPC.NS", "POWERGRID.NS", "COALINDIA.NS",
    # Large Cap - FMCG
    "HINDUNILVR.NS", "ITC.NS", "NESTLEIND.NS", "BRITANNIA.NS", "DABUR.NS",
    # Large Cap - Metals & Mining
    "TATASTEEL.NS", "HINDALCO.NS", "JSWSTEEL.NS", "VEDL.NS", "NMDC.NS",
    # Large Cap - Cement & Construction
    "ULTRACEMCO.NS", "GRASIM.NS", "ADANIPORTS.NS", "LT.NS", "SHREECEM.NS",
    # Large Cap - Telecom & Others
    "BHARTIARTL.NS", "BAJFINANCE.NS", "BAJAJFINSV.NS", "TITAN.NS", "ASIANPAINT.NS",
    # Mid Cap opportunities
    "TATAPOWER.NS", "INDIGO.NS", "ZOMATO.NS", "PAYTM.NS", "NYKAA.NS"
]

def calculate_rsi(prices, period=14):
    """Calculate Relative Strength Index"""
    delta = prices.diff()
    gain = (delta.where(delta > 0, 0)).rolling(window=period).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=period).mean()
    rs = gain / loss
    rsi = 100 - (100 / (1 + rs))
    return rsi.iloc[-1] if not rsi.empty else 50

def calculate_macd(prices):
    """Calculate MACD indicator"""
    exp1 = prices.ewm(span=12, adjust=False).mean()
    exp2 = prices.ewm(span=26, adjust=False).mean()
    macd = exp1 - exp2
    signal = macd.ewm(span=9, adjust=False).mean()
    return macd.iloc[-1], signal.iloc[-1]

def calculate_bollinger_bands(prices, period=20):
    """Calculate Bollinger Bands position"""
    sma = prices.rolling(window=period).mean()
    std = prices.rolling(window=period).std()
    upper = sma + (std * 2)
    lower = sma - (std * 2)
    current_price = prices.iloc[-1]
    bb_position = (current_price - lower.iloc[-1]) / (upper.iloc[-1] - lower.iloc[-1])
    return bb_position

def calculate_volatility(prices, period=20):
    """Calculate annualized volatility"""
    returns = prices.pct_change().dropna()
    daily_vol = returns.tail(period).std()
    annualized_vol = daily_vol * np.sqrt(252)  # 252 trading days
    return annualized_vol

def estimate_timeline(stock_data, probability_score):
    """
    Estimate timeline for upside potential to be realized
    Returns timeline in weeks with confidence level
    
    Factors considered:
    1. Volatility - Higher vol = faster potential moves
    2. Distance to target - Larger gaps take longer
    3. RSI level - Oversold stocks may recover faster
    4. Momentum - Current trend direction
    5. Volume activity - Higher volume = faster price discovery
    """
    prices = stock_data['Close']
    current_price = prices.iloc[-1]
    target_price = prices.mean()  # 52-week average as target
    
    # Calculate key metrics
    volatility = calculate_volatility(prices)
    rsi = calculate_rsi(prices)
    macd, signal = calculate_macd(prices)
    
    # 1. Base timeline from price gap and volatility
    price_gap_percent = ((target_price - current_price) / current_price) * 100
    
    # Expected weekly move based on volatility (weekly vol ≈ annual vol / sqrt(52))
    weekly_vol_percent = (volatility / np.sqrt(52)) * 100
    
    if weekly_vol_percent > 0:
        # Base weeks needed assuming average favorable movement
        base_weeks = price_gap_percent / (weekly_vol_percent * 0.5)  # 50% of vol as expected move
    else:
        base_weeks = 12  # Default
    
    # 2. RSI adjustment - Oversold stocks tend to recover faster
    if rsi < 30:
        rsi_multiplier = 0.7  # 30% faster
    elif rsi < 40:
        rsi_multiplier = 0.85
    elif rsi < 50:
        rsi_multiplier = 1.0
    else:
        rsi_multiplier = 1.2  # 20% slower
    
    # 3. MACD momentum adjustment
    if macd > signal and macd > 0:
        momentum_multiplier = 0.8  # Strong bullish momentum
    elif macd > signal:
        momentum_multiplier = 0.9  # Bullish crossover
    elif macd < signal and macd < 0:
        momentum_multiplier = 1.3  # Bearish momentum, slower recovery
    else:
        momentum_multiplier = 1.1
    
    # 4. Volume adjustment
    if 'Volume' in stock_data.columns:
        recent_vol = stock_data['Volume'].tail(10).mean()
        avg_vol = stock_data['Volume'].mean()
        vol_ratio = recent_vol / avg_vol if avg_vol > 0 else 1
        
        if vol_ratio > 1.5:
            volume_multiplier = 0.8  # High activity, faster
        elif vol_ratio > 1.0:
            volume_multiplier = 0.9
        elif vol_ratio < 0.7:
            volume_multiplier = 1.2  # Low activity, slower
        else:
            volume_multiplier = 1.0
    else:
        volume_multiplier = 1.0
    
    # 5. Probability score adjustment
    if probability_score >= 70:
        prob_multiplier = 0.85
    elif probability_score >= 60:
        prob_multiplier = 0.95
    elif probability_score >= 50:
        prob_multiplier = 1.05
    else:
        prob_multiplier = 1.2
    
    # Calculate final timeline
    adjusted_weeks = base_weeks * rsi_multiplier * momentum_multiplier * volume_multiplier * prob_multiplier
    
    # Clamp to reasonable range (2-52 weeks)
    final_weeks = max(2, min(52, adjusted_weeks))
    
    # Determine confidence based on volatility and signal alignment
    signals_aligned = (rsi < 50 and macd > signal) or (rsi < 30)
    
    if volatility < 0.25 and signals_aligned:
        confidence = "High"
    elif volatility < 0.40 and (rsi < 50 or macd > signal):
        confidence = "Medium"
    else:
        confidence = "Low"
    
    # Create timeline ranges
    min_weeks = max(1, int(final_weeks * 0.7))
    max_weeks = min(52, int(final_weeks * 1.5))
    expected_weeks = int(final_weeks)
    
    # Determine timeline category
    if expected_weeks <= 4:
        category = "Short-term"
        description = "Quick recovery expected based on strong technical signals"
    elif expected_weeks <= 12:
        category = "Medium-term"
        description = "Moderate timeline with steady recovery potential"
    elif expected_weeks <= 26:
        category = "Long-term"
        description = "Extended timeline; patience required for full potential"
    else:
        category = "Extended"
        description = "Significant time needed; consider as long-term investment"
    
    return {
        "expectedWeeks": expected_weeks,
        "minWeeks": min_weeks,
        "maxWeeks": max_weeks,
        "confidence": confidence,
        "category": category,
        "description": description,
        "targetPrice": round(target_price, 2),
        "potentialGain": round(price_gap_percent, 2),
        "volatility": round(volatility * 100, 2),  # As percentage
        "factors": {
            "rsiImpact": "Accelerating" if rsi_multiplier < 1 else "Neutral" if rsi_multiplier == 1 else "Slowing",
            "momentumImpact": "Accelerating" if momentum_multiplier < 1 else "Neutral" if momentum_multiplier == 1 else "Slowing",
            "volumeImpact": "Accelerating" if volume_multiplier < 1 else "Neutral" if volume_multiplier == 1 else "Slowing"
        }
    }

def calculate_probability_score(stock_data):
    """
    Calculate probability score (0-100) for stock price going up
    Based on multiple technical indicators
    Returns: (score, confidence, confidence_factors)
    """
    scores = []
    weights = []
    bullish_signals = 0
    total_signals = 5
    signal_strengths = []
    
    prices = stock_data['Close']
    
    # 1. RSI Score (30% weight) - Oversold stocks have higher probability
    rsi = calculate_rsi(prices)
    if rsi < 30:
        rsi_score = 90  # Oversold - high probability of bounce
        bullish_signals += 1
        signal_strengths.append(("RSI", "Strong", "Oversold territory"))
    elif rsi < 40:
        rsi_score = 75
        bullish_signals += 0.75
        signal_strengths.append(("RSI", "Moderate", "Approaching oversold"))
    elif rsi < 50:
        rsi_score = 60
        bullish_signals += 0.5
        signal_strengths.append(("RSI", "Weak", "Neutral-bearish zone"))
    elif rsi < 60:
        rsi_score = 50
        signal_strengths.append(("RSI", "Neutral", "Neutral zone"))
    elif rsi < 70:
        rsi_score = 35
        signal_strengths.append(("RSI", "Weak", "Neutral-bullish zone"))
    else:
        rsi_score = 20  # Overbought - lower probability
        signal_strengths.append(("RSI", "Against", "Overbought territory"))
    scores.append(rsi_score)
    weights.append(0.30)
    
    # 2. Distance from 52-week low (25% weight)
    year_low = prices.min()
    year_high = prices.max()
    current = prices.iloc[-1]
    distance_from_low = ((current - year_low) / (year_high - year_low)) * 100
    # Stocks closer to 52-week low have more upside
    low_score = max(0, 100 - distance_from_low)
    if distance_from_low < 25:
        bullish_signals += 1
        signal_strengths.append(("Price Position", "Strong", "Near 52-week low"))
    elif distance_from_low < 40:
        bullish_signals += 0.5
        signal_strengths.append(("Price Position", "Moderate", "Lower quartile"))
    else:
        signal_strengths.append(("Price Position", "Weak", "Upper range"))
    scores.append(low_score)
    weights.append(0.25)
    
    # 3. Moving Average Trend (20% weight)
    sma_20 = prices.rolling(window=20).mean().iloc[-1]
    sma_50 = prices.rolling(window=50).mean().iloc[-1]
    if current > sma_20 > sma_50:
        ma_score = 80  # Bullish alignment
        bullish_signals += 1
        signal_strengths.append(("Moving Avg", "Strong", "Bullish alignment"))
    elif current > sma_20:
        ma_score = 65
        bullish_signals += 0.5
        signal_strengths.append(("Moving Avg", "Moderate", "Above SMA20"))
    elif sma_20 > sma_50:
        ma_score = 50
        signal_strengths.append(("Moving Avg", "Weak", "MAs bullish but price below"))
    else:
        ma_score = 40  # Below both MAs but potential reversal
        signal_strengths.append(("Moving Avg", "Against", "Bearish alignment"))
    scores.append(ma_score)
    weights.append(0.20)
    
    # 4. MACD Signal (15% weight)
    macd, signal = calculate_macd(prices)
    if macd > signal and macd > 0:
        macd_score = 85
        bullish_signals += 1
        signal_strengths.append(("MACD", "Strong", "Bullish above zero"))
    elif macd > signal:
        macd_score = 70  # Bullish crossover
        bullish_signals += 0.75
        signal_strengths.append(("MACD", "Moderate", "Bullish crossover"))
    elif macd < signal and macd < 0:
        macd_score = 30
        signal_strengths.append(("MACD", "Against", "Bearish below zero"))
    else:
        macd_score = 45
        signal_strengths.append(("MACD", "Weak", "Mixed signal"))
    scores.append(macd_score)
    weights.append(0.15)
    
    # 5. Volume Trend (10% weight)
    if 'Volume' in stock_data.columns:
        recent_vol = stock_data['Volume'].tail(10).mean()
        avg_vol = stock_data['Volume'].mean()
        vol_ratio = recent_vol / avg_vol if avg_vol > 0 else 1
        if vol_ratio > 1.2:
            vol_score = 70  # Increased interest
            bullish_signals += 0.5
            signal_strengths.append(("Volume", "Strong", "Accumulation detected"))
        elif vol_ratio > 1.0:
            vol_score = 60
            bullish_signals += 0.25
            signal_strengths.append(("Volume", "Moderate", "Above average"))
        else:
            vol_score = 45
            signal_strengths.append(("Volume", "Weak", "Below average"))
    else:
        vol_score = 50
        signal_strengths.append(("Volume", "Neutral", "No data"))
    scores.append(vol_score)
    weights.append(0.10)
    
    # Calculate weighted average
    final_score = sum(s * w for s, w in zip(scores, weights))
    
    # Calculate confidence based on signal alignment
    alignment_ratio = bullish_signals / total_signals
    
    # Calculate volatility for confidence adjustment
    volatility = calculate_volatility(prices)
    
    # Determine confidence level and percentage
    if alignment_ratio >= 0.7 and volatility < 0.30:
        confidence_level = "High"
        confidence_percent = min(95, 70 + int(alignment_ratio * 30))
    elif alignment_ratio >= 0.5 and volatility < 0.40:
        confidence_level = "Medium-High"
        confidence_percent = min(80, 55 + int(alignment_ratio * 25))
    elif alignment_ratio >= 0.4:
        confidence_level = "Medium"
        confidence_percent = min(65, 40 + int(alignment_ratio * 30))
    elif alignment_ratio >= 0.25:
        confidence_level = "Low-Medium"
        confidence_percent = min(50, 30 + int(alignment_ratio * 30))
    else:
        confidence_level = "Low"
        confidence_percent = max(20, int(alignment_ratio * 50))
    
    # Adjust confidence based on volatility
    if volatility > 0.50:
        confidence_percent = max(20, confidence_percent - 15)
        confidence_level = "Low" if confidence_level in ["Medium", "Low-Medium"] else confidence_level
    elif volatility > 0.40:
        confidence_percent = max(25, confidence_percent - 10)
    
    # Calculate meta-confidence (reliability of the confidence score itself)
    reliability_factors = []
    reliability_score = 100
    
    # 1. Data Quality - Do we have enough data points?
    data_points = len(prices)
    if data_points >= 200:
        data_quality = 100
        reliability_factors.append({
            "factor": "Data Quality",
            "score": 100,
            "impact": "Positive",
            "reasoning": f"Excellent data coverage with {data_points} trading days of history, providing robust statistical significance."
        })
    elif data_points >= 150:
        data_quality = 85
        reliability_factors.append({
            "factor": "Data Quality",
            "score": 85,
            "impact": "Positive",
            "reasoning": f"Good data coverage with {data_points} trading days. Sufficient for reliable analysis."
        })
    elif data_points >= 100:
        data_quality = 70
        reliability_factors.append({
            "factor": "Data Quality",
            "score": 70,
            "impact": "Neutral",
            "reasoning": f"Moderate data coverage with {data_points} trading days. Some indicators may be less reliable."
        })
    else:
        data_quality = 50
        reliability_factors.append({
            "factor": "Data Quality",
            "score": 50,
            "impact": "Negative",
            "reasoning": f"Limited data with only {data_points} trading days. Long-term indicators may be unreliable."
        })
    
    # 2. Signal Consistency - Are signals pointing in the same direction?
    strong_signals = sum(1 for s in signal_strengths if s[1] in ["Strong", "Moderate"])
    against_signals = sum(1 for s in signal_strengths if s[1] == "Against")
    
    if strong_signals >= 4 and against_signals == 0:
        signal_consistency = 100
        reliability_factors.append({
            "factor": "Signal Consistency",
            "score": 100,
            "impact": "Positive",
            "reasoning": f"Excellent alignment with {strong_signals} strong/moderate signals and no contradicting signals. High conviction setup."
        })
    elif strong_signals >= 3 and against_signals <= 1:
        signal_consistency = 80
        reliability_factors.append({
            "factor": "Signal Consistency",
            "score": 80,
            "impact": "Positive",
            "reasoning": f"Good alignment with {strong_signals} supportive signals. Minor contradictions don't significantly impact reliability."
        })
    elif against_signals >= 2:
        signal_consistency = 45
        reliability_factors.append({
            "factor": "Signal Consistency",
            "score": 45,
            "impact": "Negative",
            "reasoning": f"Mixed signals detected with {against_signals} indicators contradicting the thesis. Proceed with caution."
        })
    else:
        signal_consistency = 65
        reliability_factors.append({
            "factor": "Signal Consistency",
            "score": 65,
            "impact": "Neutral",
            "reasoning": "Moderate signal alignment. Some indicators are neutral, reducing overall conviction."
        })
    
    # 3. Volatility Stability - Is the stock behaving predictably?
    recent_vol = calculate_volatility(prices, 10)  # Last 10 days
    historical_vol = volatility
    vol_change = abs(recent_vol - historical_vol) / historical_vol if historical_vol > 0 else 0
    
    if vol_change < 0.2 and volatility < 0.30:
        vol_stability = 90
        reliability_factors.append({
            "factor": "Volatility Stability",
            "score": 90,
            "impact": "Positive",
            "reasoning": f"Stable and predictable price action with {round(volatility*100, 1)}% annualized volatility. Technical patterns are more reliable."
        })
    elif vol_change < 0.3 and volatility < 0.40:
        vol_stability = 75
        reliability_factors.append({
            "factor": "Volatility Stability",
            "score": 75,
            "impact": "Neutral",
            "reasoning": f"Moderate volatility at {round(volatility*100, 1)}% with stable recent behavior. Analysis is reasonably reliable."
        })
    elif volatility > 0.50:
        vol_stability = 40
        reliability_factors.append({
            "factor": "Volatility Stability",
            "score": 40,
            "impact": "Negative",
            "reasoning": f"High volatility at {round(volatility*100, 1)}% makes predictions less reliable. Expect larger price swings."
        })
    else:
        vol_stability = 60
        reliability_factors.append({
            "factor": "Volatility Stability",
            "score": 60,
            "impact": "Neutral",
            "reasoning": f"Volatility at {round(volatility*100, 1)}% is within normal range but shows some instability recently."
        })
    
    # 4. Trend Clarity - Is there a clear trend?
    sma_20 = prices.rolling(window=20).mean().iloc[-1]
    sma_50 = prices.rolling(window=50).mean().iloc[-1]
    current = prices.iloc[-1]
    
    price_vs_sma20 = (current - sma_20) / sma_20
    sma20_vs_sma50 = (sma_20 - sma_50) / sma_50
    
    if (current > sma_20 > sma_50) or (current < sma_20 < sma_50):
        trend_clarity = 85
        trend_direction = "bullish" if current > sma_20 else "bearish"
        reliability_factors.append({
            "factor": "Trend Clarity",
            "score": 85,
            "impact": "Positive",
            "reasoning": f"Clear {trend_direction} trend with proper moving average alignment. Trend-following signals are reliable."
        })
    elif abs(price_vs_sma20) < 0.02 and abs(sma20_vs_sma50) < 0.02:
        trend_clarity = 50
        reliability_factors.append({
            "factor": "Trend Clarity",
            "score": 50,
            "impact": "Negative",
            "reasoning": "Price is consolidating near moving averages. No clear trend makes directional predictions less reliable."
        })
    else:
        trend_clarity = 65
        reliability_factors.append({
            "factor": "Trend Clarity",
            "score": 65,
            "impact": "Neutral",
            "reasoning": "Mixed trend signals. Price and moving averages are not fully aligned, creating some uncertainty."
        })
    
    # 5. RSI Extremity - Are we at clear oversold/overbought levels?
    if rsi < 25 or rsi > 75:
        rsi_clarity = 90
        condition = "oversold" if rsi < 25 else "overbought"
        reliability_factors.append({
            "factor": "RSI Clarity",
            "score": 90,
            "impact": "Positive",
            "reasoning": f"RSI at {round(rsi, 1)} indicates extreme {condition} condition. Historical mean reversion is highly probable."
        })
    elif rsi < 35 or rsi > 65:
        rsi_clarity = 75
        condition = "approaching oversold" if rsi < 35 else "approaching overbought"
        reliability_factors.append({
            "factor": "RSI Clarity",
            "score": 75,
            "impact": "Neutral",
            "reasoning": f"RSI at {round(rsi, 1)} is {condition}. Moderate confidence in momentum signals."
        })
    else:
        rsi_clarity = 55
        reliability_factors.append({
            "factor": "RSI Clarity",
            "score": 55,
            "impact": "Neutral",
            "reasoning": f"RSI at {round(rsi, 1)} is in neutral territory. Momentum signals provide limited directional guidance."
        })
    
    # Calculate overall reliability score (meta-confidence)
    reliability_score = (
        data_quality * 0.20 +
        signal_consistency * 0.30 +
        vol_stability * 0.20 +
        trend_clarity * 0.15 +
        rsi_clarity * 0.15
    )
    
    # Determine reliability level
    if reliability_score >= 80:
        reliability_level = "High"
        reliability_summary = "This confidence score is highly reliable. Multiple factors align to support the analysis with strong statistical backing."
    elif reliability_score >= 65:
        reliability_level = "Medium-High"
        reliability_summary = "This confidence score is reasonably reliable. Most supporting factors are positive with minor uncertainties."
    elif reliability_score >= 50:
        reliability_level = "Medium"
        reliability_summary = "This confidence score has moderate reliability. Some factors introduce uncertainty into the analysis."
    elif reliability_score >= 35:
        reliability_level = "Low-Medium"
        reliability_summary = "This confidence score has limited reliability. Several factors suggest the analysis may be less accurate."
    else:
        reliability_level = "Low"
        reliability_summary = "This confidence score has low reliability. Significant data or signal quality issues affect the analysis."
    
    confidence_data = {
        "level": confidence_level,
        "percent": confidence_percent,
        "signalsAligned": round(bullish_signals, 1),
        "totalSignals": total_signals,
        "alignmentRatio": round(alignment_ratio * 100, 1),
        "volatility": round(volatility * 100, 2),
        "factors": [{"name": s[0], "strength": s[1], "detail": s[2]} for s in signal_strengths],
        "reliability": {
            "score": round(reliability_score, 1),
            "level": reliability_level,
            "summary": reliability_summary,
            "factors": reliability_factors
        }
    }
    
    return round(final_score, 1), confidence_data

def fetch_stock_data(symbol):
    """Fetch stock data and calculate metrics"""
    try:
        stock = yf.Ticker(symbol)
        
        # Get 1 year of historical data
        hist = stock.history(period="1y")
        
        if hist.empty or len(hist) < 50:
            return None
        
        current_price = hist['Close'].iloc[-1]
        year_high = hist['Close'].max()
        year_low = hist['Close'].min()
        year_avg = hist['Close'].mean()
        
        # Only include stocks trading below 52-week average
        if current_price >= year_avg:
            return None
        
        # Get stock info
        info = stock.info
        
        # Calculate probability score with confidence
        probability, confidence = calculate_probability_score(hist)
        
        # Calculate key metrics
        rsi = calculate_rsi(hist['Close'])
        
        # Calculate timeline estimate
        timeline = estimate_timeline(hist, probability)
        
        # Prepare price history for chart (weekly data points)
        weekly_hist = hist['Close'].resample('W').last().dropna()
        price_history = [
            {"date": date.strftime("%Y-%m-%d"), "price": round(price, 2)}
            for date, price in weekly_hist.items()
        ]
        
        return {
            "symbol": symbol.replace(".NS", ""),
            "name": info.get("longName", info.get("shortName", symbol.replace(".NS", ""))),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "currentPrice": round(current_price, 2),
            "yearHigh": round(year_high, 2),
            "yearLow": round(year_low, 2),
            "yearAverage": round(year_avg, 2),
            "belowAveragePercent": round(((year_avg - current_price) / year_avg) * 100, 2),
            "probabilityScore": probability,
            "rsi": round(rsi, 2),
            "volume": int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else 0,
            "avgVolume": int(hist['Volume'].mean()) if 'Volume' in hist.columns else 0,
            "marketCap": info.get("marketCap", 0),
            "pe": info.get("trailingPE", None),
            "priceHistory": price_history,
            "change": round(((current_price - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2]) * 100, 2) if len(hist) > 1 else 0,
            "timeline": timeline,
            "confidence": confidence
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {str(e)}")
        return None

@app.route('/api/stocks', methods=['GET'])
@login_required
def get_stocks():
    """Get top 10 stocks trading below 52-week average, ranked by probability"""
    stocks = []
    
    # Fetch data in parallel for better performance
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_symbol = {executor.submit(fetch_stock_data, symbol): symbol for symbol in INDIAN_STOCKS}
        
        for future in as_completed(future_to_symbol):
            result = future.result()
            if result:
                stocks.append(result)
    
    # Sort by probability score (descending) and take top 10
    stocks.sort(key=lambda x: x['probabilityScore'], reverse=True)
    top_stocks = stocks[:10]
    
    # Add rank
    for i, stock in enumerate(top_stocks, 1):
        stock['rank'] = i
    
    return jsonify({
        "success": True,
        "count": len(top_stocks),
        "lastUpdated": datetime.now().isoformat(),
        "stocks": top_stocks
    })

@app.route('/api/stocks/<symbol>', methods=['GET'])
@login_required
def get_stock_detail(symbol):
    """Get detailed analysis for a specific stock"""
    try:
        full_symbol = f"{symbol}.NS"
        stock = yf.Ticker(full_symbol)
        
        # Get historical data
        hist = stock.history(period="1y")
        info = stock.info
        
        if hist.empty:
            return jsonify({"success": False, "error": "Stock not found"}), 404
        
        current_price = hist['Close'].iloc[-1]
        prices = hist['Close']
        
        # Calculate all technical indicators
        rsi = calculate_rsi(prices)
        macd, signal = calculate_macd(prices)
        bb_position = calculate_bollinger_bands(prices)
        
        # Moving averages
        sma_20 = prices.rolling(window=20).mean().iloc[-1]
        sma_50 = prices.rolling(window=50).mean().iloc[-1]
        sma_200 = prices.rolling(window=200).mean().iloc[-1] if len(prices) >= 200 else None
        
        # Daily price history for detailed chart
        daily_hist = [
            {"date": date.strftime("%Y-%m-%d"), "price": round(price, 2), 
             "volume": int(hist.loc[date, 'Volume']) if 'Volume' in hist.columns else 0}
            for date, price in prices.items()
        ]
        
        # Determine trend and signals
        trend = "Bullish" if current_price > sma_50 else "Bearish"
        if rsi < 30:
            rsi_signal = "Oversold - Buy Signal"
        elif rsi > 70:
            rsi_signal = "Overbought - Sell Signal"
        else:
            rsi_signal = "Neutral"
        
        macd_signal_text = "Bullish" if macd > signal else "Bearish"
        
        # Support and resistance levels
        support = round(prices.tail(30).min(), 2)
        resistance = round(prices.tail(30).max(), 2)
        
        # Calculate probability with confidence
        probability, confidence = calculate_probability_score(hist)
        
        # Calculate timeline estimate
        timeline = estimate_timeline(hist, probability)
        
        return jsonify({
            "success": True,
            "symbol": symbol,
            "name": info.get("longName", info.get("shortName", symbol)),
            "description": info.get("longBusinessSummary", "No description available"),
            "sector": info.get("sector", "N/A"),
            "industry": info.get("industry", "N/A"),
            "website": info.get("website", ""),
            "currentPrice": round(current_price, 2),
            "yearHigh": round(prices.max(), 2),
            "yearLow": round(prices.min(), 2),
            "yearAverage": round(prices.mean(), 2),
            "probabilityScore": probability,
            "confidence": confidence,
            "timeline": timeline,
            "technicalIndicators": {
                "rsi": round(rsi, 2),
                "rsiSignal": rsi_signal,
                "macd": round(macd, 4),
                "macdSignal": round(signal, 4),
                "macdTrend": macd_signal_text,
                "bollingerPosition": round(bb_position * 100, 2),
                "sma20": round(sma_20, 2),
                "sma50": round(sma_50, 2),
                "sma200": round(sma_200, 2) if sma_200 else None,
                "trend": trend,
                "support": support,
                "resistance": resistance
            },
            "fundamentals": {
                "marketCap": info.get("marketCap", 0),
                "pe": info.get("trailingPE"),
                "forwardPe": info.get("forwardPE"),
                "pb": info.get("priceToBook"),
                "eps": info.get("trailingEps"),
                "dividendYield": info.get("dividendYield", 0) * 100 if info.get("dividendYield") else 0,
                "beta": info.get("beta"),
                "52WeekChange": info.get("52WeekChange", 0) * 100 if info.get("52WeekChange") else 0
            },
            "volume": {
                "current": int(hist['Volume'].iloc[-1]) if 'Volume' in hist.columns else 0,
                "average": int(hist['Volume'].mean()) if 'Volume' in hist.columns else 0,
                "ratio": round(hist['Volume'].iloc[-1] / hist['Volume'].mean(), 2) if 'Volume' in hist.columns and hist['Volume'].mean() > 0 else 1
            },
            "priceHistory": daily_hist,
            "recommendation": get_recommendation(probability, rsi, macd > signal)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def get_recommendation(probability, rsi, macd_bullish):
    """Generate investment recommendation based on indicators"""
    if probability >= 70 and rsi < 40:
        return {
            "action": "Strong Buy",
            "confidence": "High",
            "reasoning": "Multiple indicators suggest strong upside potential. Stock is oversold with high probability score."
        }
    elif probability >= 60 and macd_bullish:
        return {
            "action": "Buy",
            "confidence": "Medium-High", 
            "reasoning": "Positive momentum with bullish MACD crossover. Good entry point for medium-term gains."
        }
    elif probability >= 50:
        return {
            "action": "Hold/Accumulate",
            "confidence": "Medium",
            "reasoning": "Fair valuation with moderate upside potential. Consider averaging down position."
        }
    elif probability >= 40:
        return {
            "action": "Hold",
            "confidence": "Low",
            "reasoning": "Mixed signals. Wait for clearer trend confirmation before adding positions."
        }
    else:
        return {
            "action": "Avoid",
            "confidence": "Low",
            "reasoning": "Weak technicals suggest continued downside risk. Wait for reversal signals."
        }

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "timestamp": datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(debug=True, port=5001)
