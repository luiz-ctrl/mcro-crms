import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, LineChart, Line,
} from 'recharts';
import API from '../utils/api.js';
import './Dashboard.css';

const STATUS_COLORS = ['#9ca3af', '#f59e0b', '#16a34a'];
const BAR_COLORS    = ['#2563eb', '#16a34a', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#ca8a04', '#059669', '#0f2044', '#c9973a'];
const SEX_COLORS    = ['#0f2044', '#c9973a'];

const BARANGAYS_FILTER = [
  'All Barangays',
  'Barangay 1','Barangay 2','Barangay 3','Barangay 4','Barangay 5',
  'Barangay 6','Barangay 7','Barangay 8','Barangay 9',
  'Bacong Ibaba','Bacong Ilaya','Lavides','Magsaysay','Malaya',
  'Nieva','Recto','San Ignacio Ibaba','San Ignacio Ilaya',
  'San Isidro Ibaba','San Isidro Ilaya','San Jose','San Nicolas',
  'San Vicente','Santa Maria Ibaba','Santa Maria Ilaya','Sumilang','Villarica',
  'Outside Municipality',
];

/* ── Custom Tooltip ────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,.08)',
    }}>
      {label && <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</div>}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || '#6b7280' }}>
          {p.name}: <strong>{p.value}</strong>
        </div>
      ))}
    </div>
  );
};

/* ── Stat Icons ────────────────────────────────────────── */
const STAT_ICONS = {
  Total: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  Pending: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  Processing: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  ),
  Completed: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
};

const CARD_GRADS = {
  Total:      'linear-gradient(135deg, #0f2044 0%, #1a3a70 100%)',
  Pending:    'linear-gradient(135deg, #92400e 0%, #d97706 100%)',
  Processing: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
  Completed:  'linear-gradient(135deg, #14532d 0%, #16a34a 100%)',
};

function MetricCard({ label, value, sub }) {
  return (
    <div className="stat-card-v2" style={{ '--grad': CARD_GRADS[label] }}>
      <div className="stat-blob" />
      <div className="stat-top-row">
        <div className="stat-icon-v2">{STAT_ICONS[label]}</div>
      </div>
      <div className="stat-body">
        <div className="stat-value-v2">{value ?? 0}</div>
        <div className="stat-label-v2">{label}</div>
        {sub && <div className="stat-sub-v2">{sub}</div>}
      </div>
    </div>
  );
}

function LegendRow({ items }) {
  return (
    <div className="legend-row">
      {items.map(({ name, color, percent }) => (
        <span key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span className="legend-dot" style={{ background: color }} />
          {name}{percent != null && ` ${percent}%`}
        </span>
      ))}
    </div>
  );
}

export default function Analytics() {
  const [summary, setSummary]           = useState(null);
  const [topTx, setTopTx]               = useState([]);
  const [monthly, setMonthly]           = useState([]);
  const [statusDist, setStatusDist]     = useState([]);
  const [sexDist, setSexDist]           = useState([]);
  const [barangayDist, setBarangayDist] = useState([]);
  const [loading, setLoading]           = useState(true);

  const [selectedBarangay, setSelectedBarangay] = useState('All Barangays');
  const [brgyFiltered, setBrgyFiltered]         = useState(null);
  const [brgyLoading, setBrgyLoading]           = useState(false);

  useEffect(() => {
    Promise.all([
      API.get('/analytics/summary'),
      API.get('/analytics/top-transactions'),
      API.get('/analytics/status-distribution'),
      API.get('/analytics/barangay-distribution'),
    ]).then(([s, t, d, b]) => {
      setSummary(s.data);
      setTopTx(t.data.topTransactions || []);
      setMonthly(t.data.monthly || []);
      setStatusDist(d.data.statusDist || []);
      setSexDist(d.data.sexDist || []);
      setBarangayDist(b.data.barangayDist || []);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedBarangay === 'All Barangays') { setBrgyFiltered(null); return; }
    setBrgyLoading(true);
    const brgyVal = selectedBarangay === 'Outside Municipality'
      ? 'Outside Municipality'
      : `Brgy. ${selectedBarangay}, General Luna, Quezon`;
    Promise.all([
      API.get('/analytics/summary',             { params: { barangay: brgyVal } }),
      API.get('/analytics/top-transactions',    { params: { barangay: brgyVal } }),
      API.get('/analytics/status-distribution', { params: { barangay: brgyVal } }),
    ]).then(([s, t, d]) => {
      setBrgyFiltered({
        summary:    s.data,
        topTx:      t.data.topTransactions || [],
        monthly:    t.data.monthly || [],
        statusDist: d.data.statusDist || [],
        sexDist:    d.data.sexDist || [],
      });
    }).catch(console.error).finally(() => setBrgyLoading(false));
  }, [selectedBarangay]);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
      <div className="loader" />
    </div>
  );

  const activeSummary    = brgyFiltered?.summary    ?? summary;
  const activeTopTx      = brgyFiltered?.topTx      ?? topTx;
  const activeMonthly    = brgyFiltered?.monthly    ?? monthly;
  const activeStatusDist = brgyFiltered?.statusDist ?? statusDist;
  const activeSexDist    = brgyFiltered?.sexDist    ?? sexDist;

  const pieStatus = activeStatusDist.map(r => ({ name: r.status, value: parseInt(r.count) }));
  const pieSex    = activeSexDist.map(r => ({ name: r.sex || 'Unknown', value: parseInt(r.count) }));

  const statusTotal = pieStatus.reduce((s, r) => s + r.value, 0);
  const sexTotal    = pieSex.reduce((s, r) => s + r.value, 0);
  const isFiltered  = selectedBarangay !== 'All Barangays';

  /* Line chart data for daily/monthly visits */
  const monthlyLineData = activeMonthly.map(m => ({ name: m.month, Transactions: parseInt(m.count) }));

  return (
    <div className="animate-fade">
      {/* ── Header ──────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            {isFiltered
              ? `Showing data for ${selectedBarangay}`
              : 'Transaction trends and distribution insights'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--gray-400)" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            <select
              className="form-select"
              value={selectedBarangay}
              onChange={e => setSelectedBarangay(e.target.value)}
              style={{ minWidth: 200, fontSize: 13 }}
            >
              {BARANGAYS_FILTER.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            {isFiltered && (
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedBarangay('All Barangays')} style={{ fontSize: 12 }}>
                Clear
              </button>
            )}
          </div>
          <span className="date-badge">
            {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Barangay filter banner */}
      {isFiltered && (
        <div style={{
          marginBottom: 16, padding: '10px 16px',
          background: '#eff6ff', border: '1px solid #bfdbfe',
          borderRadius: 'var(--radius-sm)',
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--blue)',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>Filtered by barangay: <strong>{selectedBarangay}</strong>. Metrics below reflect only records from this area.</span>
          {brgyLoading && <div className="loader" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 'auto' }} />}
        </div>
      )}

      {/* ── Metric Cards ─────────────────────────────────── */}
      <div className="grid-4 mb-6">
        <MetricCard label="Total"      value={activeSummary?.total}      sub="All civil registry records" />
        <MetricCard label="Pending"    value={activeSummary?.pending}    sub="Awaiting staff action" />
        <MetricCard label="Processing" value={activeSummary?.processing} sub="Currently being handled" />
        <MetricCard label="Completed"  value={activeSummary?.completed}  sub="Successfully released" />
      </div>

      {/* ── Row 1: Monthly line chart (daily visits style) + Weekly trend ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Monthly Transactions — Area/Line chart matching "Daily Resident Visits" style */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14 }}>📈</span>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>Monthly Transactions</h3>
            <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 2 }}>(last 6 months)</span>
          </div>
          <p className="chart-sub">Transactions recorded per month{isFiltered ? ` — ${selectedBarangay}` : ''}</p>
          {monthlyLineData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={monthlyLineData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="blueAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} allowDecimals={false} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="Transactions"
                  stroke="#2563eb" strokeWidth={2.5}
                  fill="url(#blueAreaGrad)"
                  dot={{ r: 4, fill: '#2563eb', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">No monthly data yet</div>}
        </div>

        {/* Status + Sex Distribution side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

          {/* Status breakdown donut */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14 }}>🕐</span>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>Status</h3>
            </div>
            <p className="chart-sub" style={{ marginBottom: 10 }}>Record statuses</p>
            {pieStatus.length > 0 ? (
              <>
                <LegendRow items={pieStatus.map((p, i) => ({
                  name: p.name,
                  color: STATUS_COLORS[i % STATUS_COLORS.length],
                  percent: statusTotal ? Math.round((p.value / statusTotal) * 100) : 0,
                }))} />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieStatus} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {pieStatus.map((_, i) => <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : <div className="chart-empty" style={{ height: 140 }}>No data</div>}
          </div>

          {/* Sex distribution donut */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
              <span style={{ fontSize: 14 }}>👥</span>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>By Sex</h3>
            </div>
            <p className="chart-sub" style={{ marginBottom: 10 }}>Gender breakdown</p>
            {pieSex.length > 0 ? (
              <>
                <LegendRow items={pieSex.map((p, i) => ({
                  name: p.name,
                  color: SEX_COLORS[i % SEX_COLORS.length],
                  percent: sexTotal ? Math.round((p.value / sexTotal) * 100) : 0,
                }))} />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={pieSex} cx="50%" cy="50%" innerRadius={38} outerRadius={60} dataKey="value" paddingAngle={3}>
                      {pieSex.map((_, i) => <Cell key={i} fill={SEX_COLORS[i % SEX_COLORS.length]} strokeWidth={0} />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : <div className="chart-empty" style={{ height: 140 }}>No data</div>}
          </div>
        </div>
      </div>

      {/* ── Row 2: Top Tx (colored horizontal bars) + Barangay bars ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>

        {/* Most Requested Services — colored horizontal bars matching screenshot */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 14 }}>🏆</span>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>Most Requested Services</h3>
          </div>
          <p className="chart-sub">Top document types by request count{isFiltered ? ` — ${selectedBarangay}` : ''}</p>
          {activeTopTx.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {activeTopTx.slice(0, 6).map((tx, i) => {
                const max = parseInt(activeTopTx[0].count);
                const pct = Math.round((parseInt(tx.count) / max) * 100);
                const color = BAR_COLORS[i % BAR_COLORS.length];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      fontSize: 11, color: 'var(--gray-500)', flexShrink: 0,
                      width: 150, textAlign: 'right', whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {tx.transaction_type}
                    </div>
                    <div style={{ flex: 1, height: 20, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{
                        width: `${pct}%`, height: '100%',
                        background: color, borderRadius: 5,
                        transition: 'width .6s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-700)', flexShrink: 0, minWidth: 32, textAlign: 'right' }}>
                      {tx.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : <div className="chart-empty">No transaction data yet</div>}
        </div>

        {/* Barangay bar list */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>📍</span>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>Requests per Barangay</h3>
            </div>
            {isFiltered && (
              <span style={{ fontSize: 11, color: 'var(--gray-400)', fontStyle: 'italic' }}>Showing global</span>
            )}
          </div>
          <p className="chart-sub">Top barangays by civil registry requests</p>
          {barangayDist.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {barangayDist.slice(0, 8).map((b, i) => {
                const max = parseInt(barangayDist[0].count);
                const pct = Math.round((parseInt(b.count) / max) * 100);
                const label = b.address
                  ?.replace('Brgy. ', '')
                  .replace(', General Luna, Quezon 4310', '')
                  .replace(', General Luna, Quezon', '')
                  || 'Unknown';
                const isHighlighted = isFiltered && b.address?.includes(selectedBarangay.replace('Barangay ', 'Barangay '));
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#9ca3af', width: 18, flexShrink: 0, textAlign: 'right' }}>
                      #{i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 11, marginBottom: 3, whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        color: isHighlighted ? 'var(--blue)' : '#374151',
                        fontWeight: isHighlighted ? 700 : 400,
                      }}>
                        {label}{isHighlighted && ' ←'}
                      </div>
                      <div style={{ height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', width: pct + '%',
                          background: isHighlighted
                            ? 'linear-gradient(90deg, #2563eb, #60a5fa)'
                            : 'linear-gradient(90deg, #0f2044, #2a4a8a)',
                          borderRadius: 99, transition: 'width .5s ease',
                        }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: isHighlighted ? 'var(--blue)' : '#0f2044', flexShrink: 0, minWidth: 26, textAlign: 'right' }}>
                      {b.count}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : <div className="chart-empty">No data</div>}
        </div>
      </div>
    </div>
  );
}
