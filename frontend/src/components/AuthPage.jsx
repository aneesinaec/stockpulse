import React, { useState } from 'react';
import { BarChart3, LogIn, UserPlus, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import { login, register } from '../auth';
import './AuthPage.css';

function AuthPage({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (mode === 'register') {
        const data = await register(email, password);
        if (data.success) {
          setSuccess('Account created! Logging you in...');
          const loginData = await login(email, password);
          if (loginData.success) {
            onAuthenticated();
          } else {
            setSuccess('');
            setError(loginData.error || 'Login failed after registration.');
          }
        } else {
          setError(data.error || 'Registration failed.');
        }
      } else {
        const data = await login(email, password);
        if (data.success) {
          onAuthenticated();
        } else {
          setError(data.error || 'Login failed.');
        }
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="grid-pattern"></div>
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="auth-logo">
            <BarChart3 size={32} />
          </div>
          <h1>StockPulse</h1>
          <p className="auth-tagline">Indian Market Scanner</p>
        </div>

        <div className="auth-card">
          <div className="auth-tabs">
            <button
              className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
              onClick={() => switchMode()}
              disabled={mode === 'login'}
            >
              <LogIn size={16} />
              Sign In
            </button>
            <button
              className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
              onClick={() => switchMode()}
              disabled={mode === 'register'}
            >
              <UserPlus size={16} />
              Create Account
            </button>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {error && (
              <div className="auth-message error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div className="auth-message success">
                <CheckCircle size={16} />
                <span>{success}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder={mode === 'register' ? 'Min 8 chars, upper, lower, digit' : 'Enter your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <span className="auth-spinner"></span>
              ) : (
                <>
                  {mode === 'login' ? 'Sign In' : 'Create Account'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="auth-switch">
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button onClick={switchMode}>
              {mode === 'login' ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
