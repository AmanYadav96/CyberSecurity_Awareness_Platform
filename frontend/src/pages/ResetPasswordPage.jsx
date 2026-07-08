import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import AuthLayout from '../components/layout/AuthLayout';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <AuthLayout title="Invalid Link" subtitle="This reset link is invalid or expired">
        <div className="empty-state !py-4">
          <Link to="/forgot-password" className="btn-primary text-sm !py-2 !px-5">Request New Link</Link>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (form.new_password !== form.confirm_password) {
      setErrorMsg("Passwords don't match.");
      return;
    }
    if (form.new_password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.post('/reset-password/', { token, ...form });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthLayout title="Password Reset" subtitle="Your password has been updated">
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-14 h-14 rounded-full bg-cyber-neon/15 border-2 border-cyber-neon/30 flex items-center justify-center text-cyber-neon text-2xl">
            ✓
          </div>
          <p className="text-sm text-cyber-text-dim">Redirecting to login…</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="New Password" subtitle="Choose a strong password for your account">
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label htmlFor="rp-new" className="input-label">New Password</label>
          <input
            id="rp-new"
            type="password"
            className={`input-field ${errorMsg ? 'border-cyber-red/50' : ''}`}
            placeholder="Min. 8 characters"
            value={form.new_password}
            onChange={(e) => { setForm({ ...form, new_password: e.target.value }); setErrorMsg(''); }}
          />
        </div>
        <div className="auth-field">
          <label htmlFor="rp-confirm" className="input-label">Confirm Password</label>
          <input
            id="rp-confirm"
            type="password"
            className={`input-field ${errorMsg ? 'border-cyber-red/50' : ''}`}
            placeholder="Re-enter password"
            value={form.confirm_password}
            onChange={(e) => { setForm({ ...form, confirm_password: e.target.value }); setErrorMsg(''); }}
          />
        </div>

        {errorMsg && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">✕</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5 text-sm">
          {loading ? 'Resetting…' : 'Reset Password'}
        </button>
      </form>
    </AuthLayout>
  );
}
