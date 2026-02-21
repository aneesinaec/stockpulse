import React, { useState } from 'react';
import { BarChart3, LogIn, UserPlus, ArrowRight, AlertCircle, CheckCircle, ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { login, register, forgotPassword, resetPassword } from '../auth';
import './AuthPage.css';

function AuthPage({ onAuthenticated, resetToken: initialResetToken, onResetComplete }) {
  // modes: 'login' | 'register' | 'forgot' | 'reset'
  const [mode, setMode] = useState(initialResetToken ? 'reset' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const clearForm = () => {
    setError('');
    setSuccess('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const goToMode = (newMode) => {
    clearForm();
    setMode(newMode);
  };

  const handleLoginRegister = async (e) => {
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

  const handleForgot = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const data = await forgotPassword(email);
      if (data.success) {
        setSuccess('If that email is registered, a reset link has been sent. Check your inbox.');
      } else {
        setError(data.error || 'Something went wrong.');
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const data = await resetPassword(initialResetToken, password);
      if (data.success) {
        setSuccess('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          if (onResetComplete) onResetComplete();
          goToMode('login');
        }, 2000);
      } else {
        setError(data.error || 'Reset failed.');
      }
    } catch {
      setError('Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const renderMessages = () => (
    <>
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
    </>
  );

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

          {/* ---------- Forgot password ---------- */}
          {mode === 'forgot' && (
            <>
              <div className="auth-card-header">
                <button className="back-link" onClick={() => goToMode('login')}>
                  <ArrowLeft size={16} /> Back to Sign In
                </button>
                <div className="auth-card-icon">
                  <Mail size={28} />
                </div>
                <h2>Forgot Password</h2>
                <p className="auth-card-desc">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              </div>

              <form className="auth-form" onSubmit={handleForgot}>
                {renderMessages()}
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
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? <span className="auth-spinner"></span> : (
                    <>Send Reset Link <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ---------- Reset password (from email link) ---------- */}
          {mode === 'reset' && (
            <>
              <div className="auth-card-header">
                <div className="auth-card-icon">
                  <KeyRound size={28} />
                </div>
                <h2>Reset Password</h2>
                <p className="auth-card-desc">
                  Choose a new password for your account.
                </p>
              </div>

              <form className="auth-form" onSubmit={handleReset}>
                {renderMessages()}
                <div className="form-group">
                  <label htmlFor="password">New Password</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Min 8 chars, upper, lower, digit"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className="auth-submit" disabled={loading}>
                  {loading ? <span className="auth-spinner"></span> : (
                    <>Reset Password <ArrowRight size={18} /></>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ---------- Login / Register ---------- */}
          {(mode === 'login' || mode === 'register') && (
            <>
              <div className="auth-tabs">
                <button
                  className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
                  onClick={() => goToMode('login')}
                  disabled={mode === 'login'}
                >
                  <LogIn size={16} />
                  Sign In
                </button>
                <button
                  className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
                  onClick={() => goToMode('register')}
                  disabled={mode === 'register'}
                >
                  <UserPlus size={16} />
                  Create Account
                </button>
              </div>

              <form className="auth-form" onSubmit={handleLoginRegister}>
                {renderMessages()}

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

                {mode === 'login' && (
                  <div className="forgot-link-row">
                    <button type="button" className="forgot-link" onClick={() => goToMode('forgot')}>
                      Forgot password?
                    </button>
                  </div>
                )}

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
                <button onClick={() => goToMode(mode === 'login' ? 'register' : 'login')}>
                  {mode === 'login' ? 'Create one' : 'Sign in'}
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
