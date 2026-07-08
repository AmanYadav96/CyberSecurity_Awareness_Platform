import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import AuthLayout from '../components/layout/AuthLayout';
import { USER_TYPES } from '../utils/constants';
import { getPasswordStrength, PASSWORD_STRENGTH_COLORS } from '../utils/helpers';

export default function RegisterPage() {
  const [form, setForm] = useState({ full_name: '', email: '', password: '', confirm_password: '', user_type: '' });
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const strength = getPasswordStrength(form.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!form.full_name || !form.email || !form.password || !form.confirm_password || !form.user_type) {
      setErrorMsg('Please fill in all fields.'); return;
    }
    if (form.password !== form.confirm_password) { setErrorMsg("Passwords don't match."); return; }
    if (form.password.length < 8) { setErrorMsg('Password must be at least 8 characters.'); return; }
    setLoading(true);
    try {
      await register(form);
      notify.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err) {
      const errors = err.response?.data;
      const msg = errors ? Object.values(errors).flat()[0] : 'Registration failed. Please try again.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create Account"
      subtitle="Start your cybersecurity training"
      footer={<>Have an account? <Link to="/login" className="text-link text-cyber-blue font-medium hover:text-cyber-cyan">Sign in</Link></>}
    >
      <form onSubmit={handleSubmit} className="auth-form">
        <div className="auth-field">
          <label className="input-label">Full Name</label>
          <input type="text" className="input-field" placeholder="John Doe"
            value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </div>

        <div className="auth-field">
          <label className="input-label">Email</label>
          <input type="email" className="input-field" placeholder="you@example.com"
            value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>

        <div className="auth-field">
          <label className="input-label">I am a</label>
          <div className="grid grid-cols-3 gap-2 pt-1">
            {USER_TYPES.map((t) => (
              <button key={t.value} type="button" onClick={() => setForm({ ...form, user_type: t.value })}
                className={`py-2.5 px-2 rounded-lg border text-center transition-all ${
                  form.user_type === t.value ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue' : 'border-cyber-border text-cyber-text-dim hover:border-cyber-blue/30'
                }`}>
                <div className="text-lg">{t.icon}</div>
                <div className="text-xs font-medium mt-1">{t.label}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="auth-field">
          <label className="input-label">Password</label>
          <div className="relative">
            <input type={showPw ? 'text' : 'password'} className="input-field pr-14" placeholder="Min 8 characters"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            <button type="button" onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-cyber-text-dim">
              {showPw ? 'Hide' : 'Show'}
            </button>
          </div>
          {form.password && (
            <div className="flex gap-1 mt-2">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-1 flex-1 rounded-full" style={{ backgroundColor: i < strength ? PASSWORD_STRENGTH_COLORS[strength] : '#1e293b' }} />
              ))}
            </div>
          )}
        </div>

        <div className="auth-field">
          <label className="input-label">Confirm Password</label>
          <input type="password" className="input-field" placeholder="Re-enter password"
            value={form.confirm_password} onChange={(e) => setForm({ ...form, confirm_password: e.target.value })} />
          {form.confirm_password && form.password !== form.confirm_password && (
            <p className="text-xs text-cyber-red">Passwords don't match</p>
          )}
        </div>

        {/* Inline error banner */}
        {errorMsg && (
          <div className="auth-error-banner" role="alert">
            <span className="auth-error-icon">✕</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5 text-sm">
          {loading ? 'Creating...' : 'Create Account'}
        </button>
      </form>
    </AuthLayout>
  );
}
