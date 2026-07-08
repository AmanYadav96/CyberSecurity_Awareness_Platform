import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/layout/AuthLayout';
import { useNotify } from '../context/NotifyContext';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resetLink, setResetLink] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const notify = useNotify();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email) { setErrorMsg('Please enter your email address.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/forgot-password/', { email });
      if (res.data.reset_link) setResetLink(res.data.reset_link);
      setSent(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Something went wrong. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(resetLink);
    notify.success('Link copied to clipboard');
  };

  return (
    <AuthLayout
      title="Reset Password"
      subtitle="We'll send a reset link to your email"
      footer={<Link to="/login" className="text-link text-cyber-blue hover:text-cyber-cyan">← Back to Login</Link>}
    >
      {sent ? (
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-12 h-12 rounded-full bg-cyber-neon/15 flex items-center justify-center text-cyber-neon text-xl">✓</div>
          <div>
            <h3 className="text-sm font-semibold text-cyber-text mb-1">Check your email</h3>
            <p className="text-sm text-cyber-text-dim leading-relaxed">
              If an account exists for <strong className="text-cyber-text">{email}</strong>, a reset link has been sent.
            </p>
          </div>

          {resetLink && (
            <div className="w-full p-4 rounded-lg bg-cyber-dark/40 border border-cyber-border/30 text-left">
              <p className="text-xs font-semibold text-cyber-text mb-2">Development reset link</p>
              <p className="text-xs text-cyber-text-dim break-all mb-3 leading-relaxed">{resetLink}</p>
              <div className="flex gap-2">
                <a href={resetLink} className="btn-primary flex-1 text-xs !py-2 text-center justify-center">Open Link</a>
                <button type="button" onClick={copyLink} className="btn-secondary flex-1 text-xs !py-2">Copy Link</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="fp-email" className="input-label">Email</label>
            <input
              id="fp-email"
              type="email"
              className={`input-field ${errorMsg ? 'border-cyber-red/50' : ''}`}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrorMsg(''); }}
            />
          </div>

          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <span className="auth-error-icon">✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5 text-sm">
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}
    </AuthLayout>
  );
}
