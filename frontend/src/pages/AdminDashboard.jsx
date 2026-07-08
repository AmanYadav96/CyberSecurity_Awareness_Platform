import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../api/axios';
import { useNotify } from '../context/NotifyContext';
import PageLayout from '../components/layout/PageLayout';
import { getUserTypeLabel, formatDate } from '../utils/helpers';

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const notify = useNotify();

  useEffect(() => {
    Promise.all([api.get('/admin/stats/'), api.get('/admin/users/')])
      .then(([s, u]) => {
        setStats(s.data);
        setUsers(u.data.results || u.data || []);
      })
      .catch(() => notify.error('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const tabs = [
    { k: 'overview', l: 'Overview' },
    { k: 'users', l: 'Users' },
  ];
  const COLORS = ['#00d4ff', '#7c3aed', '#39ff14', '#fbbf24'];
  const distData = stats?.user_distribution
    ? Object.entries(stats.user_distribution).map(([k, v]) => ({ name: getUserTypeLabel(k), value: v }))
    : [];
  const catData = [
    { name: 'Phishing', value: stats?.phishing_average || 0 },
    { name: 'Malware', value: stats?.malware_average || 0 },
  ];

  return (
    <PageLayout
      loading={loading}
      title="Admin Dashboard"
      subtitle="Platform analytics and registered user management"
    >
      <div className="flex flex-wrap gap-1 mb-5 border-b border-cyber-border/20 pb-3">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              tab === t.k ? 'bg-cyber-blue/10 text-cyber-blue' : 'text-cyber-text-dim hover:text-cyber-text hover:bg-white/5'
            }`}>
            {t.l}
            {t.k === 'users' && ` (${users.length})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="stat-grid !grid-cols-3">
            {[
              { l: 'Users', v: stats?.total_users || 0, c: '#00d4ff' },
              { l: 'Quiz Attempts', v: stats?.total_attempts || 0, c: '#39ff14' },
              { l: 'Avg Score', v: `${stats?.average_score || 0}%`, c: '#fbbf24' },
            ].map((s) => (
              <div key={s.l} className="stat-card">
                <p className="stat-value" style={{ color: s.c }}>{s.v}</p>
                <p className="stat-label">{s.l}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="glass-card p-5">
              <h2 className="section-title mb-3">Users by Type</h2>
              {distData.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={distData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                        {distData.map((_, i) => <Cell key={i} fill={COLORS[i % 4]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="empty-state !py-8"><p>No user data yet</p></div>
              )}
            </div>

            <div className="glass-card p-5">
              <h2 className="section-title mb-3">Category Averages</h2>
              <div className="h-52">
                <ResponsiveContainer>
                  <BarChart data={catData} barSize={48}>
                    <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#e2e8f0', fontSize: '12px' }} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>{catData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="cyber-table w-full">
              <thead>
                <tr><th>Name</th><th>Email</th><th>Type</th><th>Attempts</th><th>Best</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-sm text-cyber-text-dim">No users yet</td></tr>
                ) : users.map(u => (
                  <tr key={u.id}>
                    <td className="text-sm font-medium py-3">{u.full_name}</td>
                    <td className="text-sm text-cyber-text-dim py-3">{u.email}</td>
                    <td className="py-3"><span className="badge badge-purple">{getUserTypeLabel(u.user_type)}</span></td>
                    <td className="text-sm py-3">{u.total_attempts}</td>
                    <td className="text-sm font-bold text-cyber-cyan py-3">{u.best_score}%</td>
                    <td className="text-sm text-cyber-text-dim py-3">{formatDate(u.date_joined)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </PageLayout>
  );
}
