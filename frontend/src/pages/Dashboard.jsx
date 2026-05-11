import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import API from '../utils/api.js';
import './Dashboard.css';

const STATUS_COLORS = { Pending: '#d97706', Processing: '#2563eb', Completed: '#16a34a' };
const PIE_COLORS = ['#d97706', '#2563eb', '#16a34a'];

/* ── Animated Counter ──────────────────────────────────── */
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  const frameRef = useRef(null);

  useEffect(() => {
    if (value == null) return;
    const target = parseInt(value) || 0;
    const duration = 900;
    const start = performance.now();
    const from = 0;

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

/* ── Mini Sparkline ────────────────────────────────────── */
function Sparkline({ data = [], color = '#fff' }) {
  if (!data.length) return null;
  const values = data.map(d => parseInt(d.count) || 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 80, H = 32;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return `${x},${y}`;
  });
  const polyline = pts.join(' ');
  const area = `0,${H} ${polyline} ${W},${H}`;

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Stat Card ─────────────────────────────────────────── */
function StatCard({ label, value, sub, gradient, icon, trend, trendLabel, sparkData, sparkColor }) {
  const isUp = trend > 0;
  const isDown = trend < 0;
  const hasChange = trend !== null && trend !== undefined;

  return (
    <div className="stat-card-v2" style={{ '--grad': gradient }}>
      {/* Gradient background blob */}
      <div className="stat-blob" />

      <div className="stat-top-row">
        <div className="stat-icon-v2">{icon}</div>
        {hasChange && (
          <div className={`stat-trend-badge ${isUp ? 'trend-up' : isDown ? 'trend-down' : 'trend-flat'}`}>
            <span className="trend-arrow">
              {isUp ? '▲' : isDown ? '▼' : '—'}
            </span>
            {Math.abs(trend)}%
          </div>
        )}
      </div>

      <div className="stat-body">
        <div className="stat-value-v2">
          {value != null ? <AnimatedNumber value={value} /> : '—'}
        </div>
        <div className="stat-label-v2">{label}</div>
        {sub && <div className="stat-sub-v2">{sub}</div>}
        {trendLabel && (
          <div className="stat-trend-label">
            <span style={{ color: isUp ? '#4ade80' : isDown ? '#f87171' : 'rgba(255,255,255,.55)' }}>
              {isUp ? '+' : ''}{trendLabel}
            </span>
            {' '}vs last month
          </div>
        )}
      </div>

      {sparkData && sparkData.length > 1 && (
        <div className="stat-spark">
          <Sparkline data={sparkData} color={sparkColor || 'rgba(255,255,255,0.8)'} />
        </div>
      )}
    </div>
  );
}

const PAGE_ROUTES = {
  dashboard: '/app/dashboard',
  records:   '/app/records',
  analytics: '/app/analytics',
  queue:     '/app/queue',
  reports:   '/app/reports',
  users:     '/app/users',
};

/* ── Quick Actions ─────────────────────────────────────── */
function QuickActions() {
  const navigate = useNavigate();
  const actions = [
    {
      label: 'Add Record',
      desc: 'Log a new civil registry transaction',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>
        </svg>
      ),
      color: 'var(--navy)',
      bg: '#eff6ff',
      nav: 'records',
    },
    {
      label: 'Issue Queue Ticket',
      desc: 'Issue a number ticket to a client',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="2" y="7" width="20" height="14" rx="2"/>
          <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z"/>
          <line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/>
        </svg>
      ),
      color: '#d97706',
      bg: '#fffbeb',
      nav: 'queue',
    },
    {
      label: 'Call Next in Queue',
      desc: 'Advance the queue to next client',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      ),
      color: 'var(--green)',
      bg: 'var(--green-light)',
      nav: 'queue',
    },
    {
      label: 'View Analytics',
      desc: 'See transaction trends and charts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6"  y1="20" x2="6"  y2="14"/>
        </svg>
      ),
      color: '#7c3aed',
      bg: '#f5f3ff',
      nav: 'analytics',
    },
    {
      label: 'Generate Report',
      desc: 'Daily or weekly summary report',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
      ),
      color: '#0891b2',
      bg: '#ecfeff',
      nav: 'reports',
    },
    {
      label: 'Manage Users',
      desc: 'Add or edit staff accounts',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
      color: 'var(--gray-600)',
      bg: 'var(--gray-100)',
      nav: 'users',
    },
  ];

  return (
    <div className="card" style={{ marginBottom: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 className="chart-title" style={{ marginBottom: 2 }}>Quick Actions</h3>
          <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: 0 }}>Common tasks at a glance</p>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        {actions.map(a => (
          <button
            key={a.label}
            onClick={() => navigate(PAGE_ROUTES[a.nav] || '/app/dashboard')}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 14px',
              background: a.bg,
              border: `1px solid ${a.color}22`,
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer', textAlign: 'left',
              transition: 'transform .12s, box-shadow .12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-sm)',
              background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: a.color, flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,.08)',
            }}>
              {a.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', lineHeight: 1.2, marginBottom: 2 }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-500)', lineHeight: 1.3 }}>{a.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Helper: compute % change ──────────────────────────── */
function pctChange(current, previous) {
  if (!previous || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [topTx, setTopTx] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [statusDist, setStatusDist] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/analytics/summary'),
      API.get('/analytics/top-transactions'),
      API.get('/analytics/status-distribution'),
    ]).then(([s, t, d]) => {
      setSummary(s.data);
      setTopTx(t.data.topTransactions || []);
      setMonthly(t.data.monthly || []);
      setStatusDist(d.data.statusDist || []);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const navigate = useNavigate();

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="loader" style={{ width: 32, height: 32, borderWidth: 3 }} />
    </div>
  );

  const pieData = statusDist.map(r => ({ name: r.status, value: parseInt(r.count) }));

  // Compute trends from monthly data (last 2 months)
  const lastMonth  = monthly[monthly.length - 2];
  const thisMonthD = monthly[monthly.length - 1];
  const totalTrend    = pctChange(parseInt(thisMonthD?.count), parseInt(lastMonth?.count));
  const pendingCount  = parseInt(summary?.pending)    || 0;
  const processCount  = parseInt(summary?.processing) || 0;
  const completedCount= parseInt(summary?.completed)  || 0;
  const total         = pendingCount + processCount + completedCount || 1;

  return (
    <div className="dashboard animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Civil Registry Overview — General Luna, Quezon</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* ── Stat Cards (vibrant v2) ─────────────────────── */}
      <div className="grid-4 mb-6">
        <StatCard
          label="Total Records"
          value={summary?.total}
          sub="All-time entries"
          gradient="linear-gradient(135deg, #0f2044 0%, #1e4a9e 100%)"
          icon="📋"
          trend={totalTrend}
          trendLabel={totalTrend != null ? `${Math.abs(totalTrend)}%` : null}
          sparkData={monthly}
          sparkColor="rgba(147,197,253,0.9)"
        />
        <StatCard
          label="Pending"
          value={summary?.pending}
          sub="Awaiting action"
          gradient="linear-gradient(135deg, #b45309 0%, #f59e0b 100%)"
          icon="⏳"
          trend={pendingCount > 0 ? Math.round((pendingCount / total) * 100) : null}
          trendLabel={pendingCount > 0 ? `${Math.round((pendingCount / total) * 100)}% of total` : null}
          sparkColor="rgba(253,230,138,0.9)"
        />
        <StatCard
          label="Processing"
          value={summary?.processing}
          sub="Currently handled"
          gradient="linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)"
          icon="⚙️"
          trend={processCount > 0 ? Math.round((processCount / total) * 100) : null}
          trendLabel={processCount > 0 ? `${Math.round((processCount / total) * 100)}% of total` : null}
          sparkColor="rgba(196,181,253,0.9)"
        />
        <StatCard
          label="Completed"
          value={summary?.completed}
          sub="Successfully released"
          gradient="linear-gradient(135deg, #15803d 0%, #059669 100%)"
          icon="✅"
          trend={completedCount > 0 ? Math.round((completedCount / total) * 100) : null}
          trendLabel={completedCount > 0 ? `${Math.round((completedCount / total) * 100)}% of total` : null}
          sparkColor="rgba(134,239,172,0.9)"
        />
      </div>

      <div className="grid-2 mb-6">
        <StatCard
          label="Transactions Today"
          value={summary?.today}
          sub="New records since midnight"
          gradient="linear-gradient(135deg, #c9973a 0%, #f59e0b 80%)"
          icon="📅"
          sparkColor="rgba(255,237,153,0.9)"
        />
        <StatCard
          label="This Month"
          value={summary?.thisMonth}
          sub={`Records for ${new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}`}
          gradient="linear-gradient(135deg, #2a4a8a 0%, #3b82f6 100%)"
          icon="📆"
          trend={totalTrend}
          trendLabel={totalTrend != null ? `${Math.abs(totalTrend)}%` : null}
          sparkData={monthly}
          sparkColor="rgba(147,197,253,0.9)"
        />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* Charts Row */}
      <div className="dashboard-charts">
        <div className="card chart-card">
          <h3 className="chart-title">Monthly Volume</h3>
          <p className="chart-sub">Last 6 months transaction volume</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly.map(m => ({ name: m.month, count: parseInt(m.count) }))} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              <Bar dataKey="count" fill="var(--navy)" radius={[4, 4, 0, 0]} name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3 className="chart-title">Status Distribution</h3>
          <p className="chart-sub">Current record statuses</p>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false} fontSize={11}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty">No data yet</div>
          )}
        </div>
      </div>

      {/* Top Transactions */}
      <div className="card mt-6">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h3 className="chart-title" style={{ marginBottom: 2 }}>Most Requested Transactions</h3>
            <p className="chart-sub" style={{ marginBottom: 0 }}>Ranked by frequency</p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate(PAGE_ROUTES.analytics)}>
            View full analytics →
          </button>
        </div>
        {topTx.length > 0 ? (
          <div className="top-tx-list">
            {topTx.map((tx, i) => {
              const max = parseInt(topTx[0].count);
              const pct = Math.round((parseInt(tx.count) / max) * 100);
              return (
                <div className="top-tx-item" key={i}>
                  <span className="top-tx-rank">#{i + 1}</span>
                  <div className="top-tx-info">
                    <div className="top-tx-name">{tx.transaction_type}</div>
                    <div className="top-tx-bar-wrap">
                      <div className="top-tx-bar" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="top-tx-count">{tx.count}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="chart-empty">No transaction data yet</div>
        )}
      </div>
    </div>
  );
}
