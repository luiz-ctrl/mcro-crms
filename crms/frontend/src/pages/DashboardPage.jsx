import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import { getAnalyticsSummary, getTopBarangays, getVisitors } from '../services/api';

const STATUS_COLORS = {
  Pending: { bg: 'var(--warning-bg)', color: 'var(--warning)', icon: '⏳' },
  Processing: { bg: 'var(--info-bg)', color: 'var(--info)', icon: '⚙️' },
  Completed: { bg: 'var(--success-bg)', color: 'var(--success)', icon: '✅' },
};

export default function DashboardPage() {
  const [summary, setSummary] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [recentVisitors, setRecentVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('crms_user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [summaryRes, barangaysRes, visitorsRes] = await Promise.all([
        getAnalyticsSummary(),
        getTopBarangays(),
        getVisitors({ limit: 5, page: 1 }),
      ]);
      setSummary(summaryRes.data);
      setBarangays(barangaysRes.data.slice(0, 5));
      setRecentVisitors(visitorsRes.data.visitors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <>
      <Header title="Dashboard" subtitle="Overview & Summary" />
      <div className="page-content">
        <div className="loading-wrapper"><div className="spinner"></div> Loading dashboard...</div>
      </div>
    </>
  );

  const statCards = [
    {
      label: 'Total Visitors',
      value: summary?.total ?? 0,
      icon: '👥',
      iconBg: '#e8f0fa',
      description: 'All-time registrations',
      action: () => navigate('/visitors'),
    },
    {
      label: 'Pending Requests',
      value: summary?.pending ?? 0,
      icon: '⏳',
      iconBg: 'var(--warning-bg)',
      description: 'Awaiting processing',
      action: () => navigate('/visitors?status=Pending'),
    },
    {
      label: 'Processing',
      value: summary?.processing ?? 0,
      icon: '⚙️',
      iconBg: 'var(--info-bg)',
      description: 'Currently being handled',
      action: () => navigate('/visitors?status=Processing'),
    },
    {
      label: 'Completed Today',
      value: summary?.today ?? 0,
      icon: '✅',
      iconBg: 'var(--success-bg)',
      description: 'Transactions today',
      action: () => navigate('/visitors'),
    },
  ];

  return (
    <>
      <Header title="Dashboard" subtitle="Overview & Summary" />
      <div className="page-content">
        {/* Welcome */}
        <div style={{
          background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)',
          borderRadius: 'var(--radius-lg)',
          padding: '24px 28px',
          marginBottom: 28,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.4rem',
              color: 'var(--white)',
              marginBottom: 4,
            }}>
              Welcome back, {user.full_name?.split(' ')[0] || 'Staff'} 👋
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.85rem' }}>
              MCRO General Luna, Quezon — Civil Registry Management System
            </p>
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 10,
            padding: '10px 18px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: 'var(--gold)',
              lineHeight: 1,
            }}>{summary?.completed ?? 0}</div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Total Completed
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          {statCards.map((s) => (
            <div
              key={s.label}
              className="stat-card"
              onClick={s.action}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-card-icon" style={{ background: s.iconBg }}>
                {s.icon}
              </div>
              <div className="stat-card-value">{s.value.toLocaleString()}</div>
              <div className="stat-card-label">{s.label}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.description}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ gap: 24, marginBottom: 28 }}>
          {/* Transaction Types */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📑 Transaction Breakdown</span>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/analytics')}>
                View Full →
              </button>
            </div>
            <div className="card-body" style={{ padding: '8px 0' }}>
              {summary?.transaction_types?.length > 0 ? (
                summary.transaction_types.map((t, i) => {
                  const pct = summary.total > 0 ? Math.round((t.count / summary.total) * 100) : 0;
                  return (
                    <div key={t.transaction_type} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      borderBottom: i < summary.transaction_types.length - 1 ? '1px solid var(--gray-200)' : 'none',
                    }}>
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        background: 'var(--navy)',
                        color: 'var(--white)',
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {t.transaction_type}
                        </div>
                        <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 99, marginTop: 5 }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'var(--navy)',
                            borderRadius: 99,
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, flexShrink: 0 }}>
                        {t.count} <span style={{ fontSize: '0.72rem', fontWeight: 400 }}>({pct}%)</span>
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📑</div><p>No transactions yet</p></div>
              )}
            </div>
          </div>

          {/* Top Barangays */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">📍 Top Barangays</span>
              <button className="btn btn-sm btn-outline" onClick={() => navigate('/analytics')}>
                View Full →
              </button>
            </div>
            <div className="card-body" style={{ padding: '8px 0' }}>
              {barangays.length > 0 ? (
                barangays.map((b, i) => {
                  const max = barangays[0]?.count || 1;
                  const pct = Math.round((b.count / max) * 100);
                  const colors = ['var(--gold)', '#3b82f6', '#10b981', '#f59e0b', '#6366f1'];
                  return (
                    <div key={b.barangay} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      borderBottom: i < barangays.length - 1 ? '1px solid var(--gray-200)' : 'none',
                    }}>
                      <span style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: colors[i],
                        flexShrink: 0,
                      }}></span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{b.barangay}</div>
                        <div style={{ height: 4, background: 'var(--gray-200)', borderRadius: 99, marginTop: 5 }}>
                          <div style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: colors[i],
                            borderRadius: 99,
                          }} />
                        </div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.1rem',
                        color: colors[i],
                        flexShrink: 0,
                      }}>{b.count}</span>
                    </div>
                  );
                })
              ) : (
                <div className="empty-state"><div className="empty-state-icon">📍</div><p>No data yet</p></div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Visitors */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">🕐 Recent Visitors</span>
            <button className="btn btn-sm btn-outline" onClick={() => navigate('/visitors')}>
              View All →
            </button>
          </div>
          <div className="table-wrapper">
            {recentVisitors.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Barangay</th>
                    <th>Transaction</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentVisitors.map(v => {
                    const st = STATUS_COLORS[v.status] || STATUS_COLORS.Pending;
                    return (
                      <tr key={v.id}>
                        <td>
                          <div style={{ fontWeight: 500 }}>{v.name}</div>
                          
                        </td>
                        <td>{v.barangay}</td>
                        <td style={{ maxWidth: 180 }}>
                          <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {v.transaction_type}
                          </div>
                        </td>
                        <td>
                          <span className={`badge badge-${v.status.toLowerCase()}`}>
                            <span className="badge-dot"></span>
                            {v.status}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {new Date(v.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <p>No visitors registered yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
