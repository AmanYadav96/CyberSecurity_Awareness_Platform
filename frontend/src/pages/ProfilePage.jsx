import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { useNotify } from '../context/NotifyContext';
import PageLayout from '../components/layout/PageLayout';
import QuestionManagement from '../components/admin/QuestionManagement';
import { getUserTypeLabel, getInitials } from '../utils/helpers';

export default function ProfilePage() {
  const { user, isAdmin, refreshProfile } = useAuth();
  const [editName, setEditName] = useState(user?.full_name || '');
  const [saving, setSaving] = useState(false);
  const [allBadges, setAllBadges] = useState([]);
  const [pw, setPw] = useState({ old_password: '', new_password: '', confirm: '' });
  const [changingPw, setChangingPw] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pwError, setPwError] = useState('');
  const notify = useNotify();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await refreshProfile();
        if (!isAdmin) {
          const r = await api.get('/badges/');
          setAllBadges(r.data.all_badges || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [refreshProfile, isAdmin]);

  useEffect(() => {
    if (user?.full_name) setEditName(user.full_name);
  }, [user?.full_name]);

  const saveName = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await api.put('/profile/', { full_name: editName.trim() });
      await refreshProfile();
      notify.success('Name updated successfully!');
    } catch {
      notify.error('Failed to update name.');
    } finally {
      setSaving(false);
    }
  };

  const changePw = async (e) => {
    e.preventDefault();
    setPwError('');
    if (pw.new_password !== pw.confirm) { setPwError("Passwords don't match."); return; }
    if (pw.new_password.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setChangingPw(true);
    try {
      await api.post('/change-password/', { old_password: pw.old_password, new_password: pw.new_password });
      notify.success('Password changed successfully!');
      setPw({ old_password: '', new_password: '', confirm: '' });
      setShowPwForm(false);
    } catch (err) {
      setPwError(err.response?.data?.old_password?.[0] || 'Failed to change password.');
    } finally {
      setChangingPw(false);
    }
  };

  const cancelPwChange = () => {
    setShowPwForm(false);
    setPwError('');
    setPw({ old_password: '', new_password: '', confirm: '' });
  };

  const earned = allBadges.filter(b => b.earned).length;
  const stats = [
    { v: user?.total_attempts ?? 0, l: 'Attempts', c: '#00d4ff' },
    { v: `${Math.round(user?.best_score ?? 0)}%`, l: 'Best Score', c: '#39ff14' },
    { v: `${Math.round(user?.average_score ?? 0)}%`, l: 'Average', c: '#7c3aed' },
  ];

  const settingsBlock = (
    <div className="glass-card profile-section-card">
      <div className="profile-field">
        <label className="input-label">Display Name</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input type="text" className="input-field flex-1" value={editName}
            onChange={e => setEditName(e.target.value)} />
          <button type="button" onClick={saveName} disabled={saving || editName.trim() === user?.full_name}
            className="btn-primary text-sm !py-2.5 !px-6 shrink-0">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <hr className="profile-divider" />

      <div className="profile-password-header">
        <h2 className="section-title">Password</h2>
        {!showPwForm && (
          <button type="button" onClick={() => setShowPwForm(true)}
            className="text-link text-sm text-cyber-blue hover:text-cyber-cyan font-medium shrink-0">
            Change Password
          </button>
        )}
      </div>
      {showPwForm ? (
        <form onSubmit={changePw} className="profile-settings">
          <div className="profile-field">
            <label className="input-label">Current Password</label>
            <input type="password" className="input-field" placeholder="Enter current password"
              value={pw.old_password} onChange={e => { setPw({ ...pw, old_password: e.target.value }); setPwError(''); }} />
          </div>
          <div className="profile-field">
            <label className="input-label">New Password</label>
            <input type="password" className="input-field" placeholder="Min. 8 characters"
              value={pw.new_password} onChange={e => { setPw({ ...pw, new_password: e.target.value }); setPwError(''); }} />
          </div>
          <div className="profile-field">
            <label className="input-label">Confirm New Password</label>
            <input type="password" className="input-field" placeholder="Re-enter new password"
              value={pw.confirm} onChange={e => { setPw({ ...pw, confirm: e.target.value }); setPwError(''); }} />
          </div>
          {pwError && (
            <div className="auth-error-banner" role="alert">
              <span className="auth-error-icon">✕</span>
              <span>{pwError}</span>
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={cancelPwChange} className="btn-secondary flex-1 text-sm !py-2.5">Cancel</button>
            <button type="submit" disabled={changingPw || !pw.old_password || !pw.new_password}
              className="btn-primary flex-1 text-sm !py-2.5">
              {changingPw ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      ) : (
        <p className="profile-password-text">
          Your password is hidden. Click &quot;Change Password&quot; to update it.
        </p>
      )}
    </div>
  );

  const userInfoBlock = (
    <div className="glass-card profile-section-card flex items-center gap-5">
      <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-cyber-blue to-cyber-purple flex items-center justify-center text-white text-xl font-bold shrink-0">
        {getInitials(user?.full_name)}
      </div>
      <div className="min-w-0">
        <p className="text-lg font-semibold text-cyber-text truncate">{user?.full_name}</p>
        <p className="text-sm text-cyber-text-dim truncate mt-1">{user?.email}</p>
        <span className="badge badge-blue mt-2">{getUserTypeLabel(user?.user_type)}</span>
      </div>
    </div>
  );

  return (
    <PageLayout
      loading={loading}
      title="Profile"
      subtitle={isAdmin ? 'Account settings and question management' : 'Manage your account and view achievements'}
    >
      {isAdmin ? (
        <div className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {userInfoBlock}
              {settingsBlock}
            </div>
            <div className="lg:col-span-2">
              <QuestionManagement />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              {userInfoBlock}
              <div className="stat-grid !grid-cols-1 sm:!grid-cols-3 lg:!grid-cols-1 gap-4">
                {stats.map((s) => (
                  <div key={s.l} className="stat-card">
                    <p className="stat-value text-base" style={{ color: s.c }}>{s.v}</p>
                    <p className="stat-label">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2">
              {settingsBlock}
            </div>
          </div>

          <div className="glass-card profile-card">
            <h2 className="section-title mb-6">Badges ({earned}/{allBadges.length})</h2>
            {allBadges.length === 0 ? (
              <div className="empty-state"><p>No badges available yet.</p></div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {allBadges.map((b) => (
                  <div key={b.id} className={`p-5 rounded-xl border text-center transition-all ${
                    b.earned ? 'border-cyber-gold/30 bg-cyber-gold/5' : 'border-cyber-border/15 opacity-40'
                  }`}>
                    <div className="text-2xl mb-3">{b.icon}</div>
                    <p className="text-sm font-medium text-cyber-text mb-2">{b.name}</p>
                    <p className="text-xs text-cyber-text-dim leading-relaxed">{b.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </PageLayout>
  );
}
