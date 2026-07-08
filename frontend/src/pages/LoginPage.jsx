import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/layout/AuthLayout';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.email || !form.password) {
      setErrorMsg('Please enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user?.user_type === 'admin' ? '/admin' : '/dashboard');
    } catch (err) {
      const msg =
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        err.response?.data?.error ||
        'Invalid email or password. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Sign In"
      subtitle="Access your training dashboard"
      footer={<>No account? <Link to="/login" className="text-link text-cyber-blue font-medium hover:text-cyber-cyan">Register here</Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div className="auth-field">
          <label className="input-label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            type="email"
            className={`input-field ${errorMsg ? 'border-cyber-red/50' : ''}`}
            placeholder="you@example.com"
            value={form.email}
            onChange={(e) => { setForm({ ...form, email: e.target.value }); setErrorMsg(''); }}
            autoComplete="email"
          />
        </div>

        <div className="auth-field">
          <label className="input-label" htmlFor="login-password">Password</label>
          <div className="relative">
            <input
              id="login-password"
              type={showPw ? 'text' : 'password'}
              className={`input-field pr-14 ${errorMsg ? 'border-cyber-red/50' : ''}`}
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrorMsg(''); }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyber-text-dim hover:text-cyber-text px-1 py-1"
              tabIndex={-1}
            >
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="flex justify-end -mt-1">
          <Link to="/forgot-password" className="text-link text-xs text-cyber-blue hover:text-cyber-cyan">
            Forgot password?
          </Link>
        </div>

        {/* ── Inline error banner ── */}
        {errorMsg && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">✕</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5 text-sm">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </AuthLayout>
  );
}
