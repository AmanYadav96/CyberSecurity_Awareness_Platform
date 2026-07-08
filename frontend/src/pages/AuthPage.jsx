import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotify } from '../context/NotifyContext';
import AuthLayout from '../components/layout/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import CenterModal from '../components/common/CenterModal';
import { USER_TYPES } from '../utils/constants';
import api from '../api/axios';

/**
 * Smart auth flow:
 *   Step 1 — email + password → check if user exists.
 *             Existing user → login directly.
 *             New user      → show Step 2 registration fields.
 *   Step 2 — remaining profile fields + email OTP verification → register.
 */
export default function AuthPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [form, setForm] = useState({
    full_name: '', user_type: '', age: '', gender: '', occupation: '',
    country: '', mobile: '', security_question: '', confirm_password: '',
  });

  const { setAuthFromResponse, register } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();

  // ────────────────────────────────────────────────────────────────────────
  // Step 1: check if user exists → login or move to Step 2 registration
  // ────────────────────────────────────────────────────────────────────────
  const handleStep1 = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setModal({ type: 'warning', title: 'Missing Fields', message: 'Please enter your email and password.' });
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/smart/', { email: email.trim().toLowerCase(), password });

      if (res.data.tokens) {
        // ── Existing user login succeeded ──────────────────────────────
        setAuthFromResponse(res.data);
        setModal({ type: 'success', title: 'Welcome Back!', message: 'Login successful.' });
        const user = res.data.user;
        setTimeout(() => navigate(user?.user_type === 'admin' ? '/admin' : '/dashboard'), 800);

      } else if (res.data.action === 'needs_registration') {
        // ── New user — show info modal, then move to Step 2 ──────────
        setModal({
          type: 'info',
          title: 'New Account',
          message: 'No account found with this email. Complete your profile below to register.',
          onContinue: () => {
            setModal(null);
            setForm(f => ({ ...f, confirm_password: password }));
            setStep(2);
          },
        });
      }
    } catch (err) {
      const data = err.response?.data;
      if (data?.action === 'needs_registration') {
        // Handled above but also catch edge cases
        setForm(f => ({ ...f, confirm_password: password }));
        setStep(2);
      } else {
        const errText = data?.error || data?.detail || 'Invalid credentials. Please check your email and password.';
        setErrorMsg(errText);
        setModal({
          type: 'error',
          title: 'Login Failed',
          message: errText,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Step 2 helpers: Send & resend OTP
  // ────────────────────────────────────────────────────────────────────────
  const sendOTP = async () => {
    if (!email.trim()) {
      setModal({ type: 'warning', title: 'Email Required', message: 'Please enter your email address first.' });
      return;
    }
    try {
      const res = await api.post('/auth/send-otp/', { email: email.trim().toLowerCase() });
      setOtpSent(true);
      setModal({
        type: 'success',
        title: 'Verification Code Sent!',
        message: `A 6-digit verification code has been sent to ${email}. Please check your inbox and enter it below.`,
      });
    } catch (err) {
      const msg = err.response?.data?.email?.[0]
        || err.response?.data?.non_field_errors?.[0]
        || err.response?.data?.error
        || 'Failed to send OTP. Please try again.';
      setModal({ type: 'error', title: 'OTP Error', message: msg });
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Step 2: complete registration
  // ────────────────────────────────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!form.full_name.trim() || !form.user_type) {
      setModal({ type: 'warning', title: 'Incomplete Form', message: 'Full name and user type are required.' });
      return;
    }
    if (!otp.trim()) {
      setModal({ type: 'warning', title: 'Email Not Verified', message: 'Please send and enter the OTP to verify your email.' });
      return;
    }
    if (password !== form.confirm_password) {
      setModal({ type: 'error', title: 'Password Mismatch', message: 'Passwords do not match.' });
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        confirm_password: form.confirm_password,
        full_name: form.full_name.trim(),
        user_type: form.user_type,
        age: form.age ? parseInt(form.age, 10) : null,
        gender: form.gender || '',
        occupation: form.occupation || '',
        country: form.country || '',
        mobile: form.mobile || '',
        security_question: form.security_question || '',
        otp: otp.trim(),
      });
      setModal({ type: 'success', title: 'Registration Successful!', message: 'Your account has been created.' });
      setTimeout(() => navigate('/survey'), 1000);
    } catch (err) {
      const data = err.response?.data;
      const msg = data
        ? (typeof data === 'string' ? data : Object.values(data).flat()[0])
        : 'Registration failed. Please try again.';
      setModal({ type: 'error', title: 'Registration Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Password suggestion
  // ────────────────────────────────────────────────────────────────────────
  const suggestPassword = async () => {
    try {
      const res = await api.get('/auth/suggest-password/');
      const pw = res.data.password;
      setPassword(pw);
      setForm(f => ({ ...f, confirm_password: pw }));
      notify.success('Strong password generated! Save it securely.');
    } catch {
      notify.error('Could not generate password. Try again.');
    }
  };

  // ────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────
  return (
    <AuthLayout
      title={step === 1 ? 'Welcome to CyberAware' : 'Complete Your Profile'}
      subtitle={step === 1 ? 'Enter your email and password to continue' : 'Tell us a bit about yourself to get started'}
      footer={step === 1 && <>New here? Just enter your email and a password to get started.</>}
    >
      {step === 1 ? (
        /* ── STEP 1: Email + Password ─────────────────────────────────── */
        <form onSubmit={handleStep1} className="auth-form" noValidate>
          <div className="auth-field">
            <label className="input-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrorMsg(''); }}
              autoComplete="email"
              required
            />
          </div>

          <PasswordField
            label="Password"
            value={password}
            onChange={e => { setPassword(e.target.value); setErrorMsg(''); }}
            placeholder="Enter your password"
            showStrength
            onSuggest={suggestPassword}
            id="auth-password"
          />

          <div className="flex justify-end -mt-1">
            <Link to="/forgot-password" className="text-link text-xs text-cyber-blue hover:text-cyber-cyan">
              Forgot password?
            </Link>
          </div>

          {/* Inline error message — always visible when login fails */}
          {errorMsg && (
            <div className="auth-error-banner" role="alert">
              <span className="auth-error-icon">✕</span>
              <span>{errorMsg}</span>
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full !py-2.5 text-sm">
            {loading ? 'Checking…' : 'Continue →'}
          </button>
        </form>

      ) : (
        /* ── STEP 2: Full Registration ─────────────────────────────────── */
        <form onSubmit={handleRegister} className="auth-form" noValidate>
          {/* Email — locked */}
          <div className="auth-field">
            <label className="input-label">Email Address</label>
            <input type="email" className="input-field opacity-60 cursor-not-allowed" value={email} readOnly />
          </div>

          {/* Full Name */}
          <div className="auth-field">
            <label className="input-label" htmlFor="reg-name">Full Name *</label>
            <input
              id="reg-name"
              type="text"
              className="input-field"
              placeholder="Your full name"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              required
            />
          </div>

          {/* User Type */}
          <div className="auth-field">
            <label className="input-label">I am a *</label>
            <div className="grid grid-cols-3 gap-2 pt-1">
              {USER_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm({ ...form, user_type: t.value })}
                  className={`py-2 px-1 rounded-lg border text-center transition-all text-xs ${form.user_type === t.value
                      ? 'border-cyber-blue bg-cyber-blue/10 text-cyber-blue'
                      : 'border-cyber-border text-cyber-text-dim hover:border-cyber-blue/40'
                    }`}
                >
                  <div>{t.icon}</div>
                  <div className="mt-1 font-medium">{t.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Age & Gender */}
          <div className="grid grid-cols-2 gap-3">
            <div className="auth-field">
              <label className="input-label" htmlFor="reg-age">Age</label>
              <input
                id="reg-age"
                type="number"
                className="input-field"
                placeholder="Age"
                min="13"
                max="120"
                value={form.age}
                onChange={e => setForm({ ...form, age: e.target.value })}
              />
            </div>
            <div className="auth-field">
              <label className="input-label" htmlFor="reg-gender">Gender</label>
              <select
                id="reg-gender"
                className="input-field"
                value={form.gender}
                onChange={e => setForm({ ...form, gender: e.target.value })}
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not">Prefer not to say</option>
              </select>
            </div>
          </div>

          {/* Occupation */}
          <div className="auth-field">
            <label className="input-label" htmlFor="reg-occ">Occupation</label>
            <input
              id="reg-occ"
              type="text"
              className="input-field"
              placeholder="e.g. Software Engineer, Student"
              value={form.occupation}
              onChange={e => setForm({ ...form, occupation: e.target.value })}
            />
          </div>

          {/* Country */}
          <div className="auth-field">
            <label className="input-label" htmlFor="reg-country">Country</label>
            <input
              id="reg-country"
              type="text"
              className="input-field"
              placeholder="Your country"
              value={form.country}
              onChange={e => setForm({ ...form, country: e.target.value })}
            />
          </div>

          {/* Mobile (optional) */}
          <div className="auth-field">
            <label className="input-label" htmlFor="reg-mobile">Mobile (optional)</label>
            <input
              id="reg-mobile"
              type="tel"
              className="input-field"
              placeholder="+91 XXXXX XXXXX"
              value={form.mobile}
              onChange={e => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          {/* Email OTP */}
          <div className="auth-field">
            <label className="input-label">Email Verification Code *</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field flex-1"
                placeholder="6-digit code"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              />
              <button
                type="button"
                onClick={sendOTP}
                className="btn-secondary text-xs !py-2 !px-3 shrink-0"
              >
                {otpSent ? 'Resend' : 'Send OTP'}
              </button>
            </div>
            {otpSent && (
              <p className="text-xs text-cyber-neon mt-1">✓ Code sent — check your inbox (or console in dev mode)</p>
            )}
          </div>

          {/* Confirm Password */}
          <PasswordField
            label="Confirm Password"
            value={form.confirm_password}
            onChange={e => setForm({ ...form, confirm_password: e.target.value })}
            placeholder="Re-enter your password"
            id="reg-confirm-pw"
          />

          {/* Actions */}
          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn-secondary flex-1 text-sm !py-2.5">
              ← Back
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 text-sm !py-2.5">
              {loading ? 'Creating account…' : 'Create Account'}
            </button>
          </div>
        </form>
      )}

      {/* Centre-screen modal for warnings, errors, success, info */}
      <CenterModal
        open={!!modal}
        type={modal?.type}
        title={modal?.title}
        message={modal?.message}
        actions={modal?.onContinue ? (
          <div className="flex gap-3">
            <button type="button" onClick={() => setModal(null)} className="btn-secondary text-sm !py-2.5 !px-6">
              Cancel
            </button>
            <button type="button" onClick={modal.onContinue} className="btn-primary text-sm !py-2.5 !px-6">
              Continue →
            </button>
          </div>
        ) : undefined}
        onClose={() => setModal(null)}
      />
    </AuthLayout>
  );
}
