import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { supabase } from '../../lib/supabase'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const COLORS = ['#C9973A','#0F1F3D','#16A34A','#DC2626','#7C3B8C','#0F5E9C']

function StatCard({ label, value, sub, color = 'var(--navy)', icon }) {
  return (
    <div className="card" style={{ padding: '24px 28px', borderTop: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--gray-400)' }}>{label}</div>
        <span style={{ fontSize: '1.4rem' }}>{icon}</span>
      </div>
      <div style={{ fontSize: '2.25rem', fontWeight: 800, color, fontFamily: 'var(--font-head)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 8 }}>{sub}</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats]     = useState({ total: 0, pending: 0, processing: 0, completed: 0, today: 0, month: 0 })
  const [monthly, setMonthly] = useState([])
  const [topTypes, setTopTypes] = useState([])
  const [statusDist, setStatusDist] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const now       = new Date()
    const todayStr  = format(now, 'yyyy-MM-dd')
    const monthStart = format(startOfMonth(now), 'yyyy-MM-dd')

    const { data: all } = await supabase.from('records').select('id,status,transaction_type,date')
    if (!all) { setLoading(false); return }

    const today = all.filter(r => r.date?.slice(0,10) === todayStr).length
    const month = all.filter(r => r.date?.slice(0,10) >= monthStart).length

    setStats({
      total: all.length,
      pending:    all.filter(r => r.status === 'Pending').length,
      processing: all.filter(r => r.status === 'Processing').length,
      completed:  all.filter(r => r.status === 'Completed').length,
      today, month,
    })

    // Monthly volume (last 6 months)
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(now, 5 - i)
      return { label: format(d, 'MMM'), start: format(startOfMonth(d), 'yyyy-MM-dd'), end: format(endOfMonth(d), 'yyyy-MM-dd') }
    })
    setMonthly(months.map(m => ({
      month: m.label,
      count: all.filter(r => r.date?.slice(0,10) >= m.start && r.date?.slice(0,10) <= m.end).length,
    })))

    // Top transaction types
    const typeCounts = {}
    all.forEach(r => { typeCounts[r.transaction_type] = (typeCounts[r.transaction_type] || 0) + 1 })
    const sorted = Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).slice(0,5)
    setTopTypes(sorted.map(([name,count]) => ({ name: name.length > 20 ? name.slice(0,20)+'…' : name, count })))

    // Status distribution
    setStatusDist([
      { name: 'Pending',    value: all.filter(r => r.status === 'Pending').length },
      { name: 'Processing', value: all.filter(r => r.status === 'Processing').length },
      { name: 'Completed',  value: all.filter(r => r.status === 'Completed').length },
    ])

    setLoading(false)
  }

  const quickActions = [
    { icon: '➕', label: 'Add Record',        to: '/app/records',   color: 'var(--navy)' },
    { icon: '🎫', label: 'Issue Queue Ticket', to: '/app/queue',    color: '#7C3B8C' },
    { icon: '📢', label: 'Call Next in Queue', to: '/app/queue',    color: 'var(--green)' },
    { icon: '📊', label: 'View Analytics',     to: '/app/analytics',color: 'var(--gold)' },
    { icon: '📄', label: 'Generate Report',    to: '/app/reports',  color: '#0F5E9C' },
    { icon: '👥', label: 'Manage Users',       to: '/app/users',    color: 'var(--red)' },
  ]

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 6 }}>Dashboard</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>{format(new Date(), 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 32 }}>
        <StatCard label="Total Records"  value={stats.total}      icon="📋" color="var(--navy)" />
        <StatCard label="Pending"        value={stats.pending}    icon="⏳" color="var(--amber)" />
        <StatCard label="Processing"     value={stats.processing} icon="⚙️" color="#1E40AF" />
        <StatCard label="Completed"      value={stats.completed}  icon="✅" color="var(--green)" />
        <StatCard label="Today"          value={stats.today}      icon="📅" color="var(--navy)" sub="Transactions today" />
        <StatCard label="This Month"     value={stats.month}      icon="📆" color="var(--gold)"  sub="Current month" />
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 32 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
          {quickActions.map(a => (
            <button
              key={a.label}
              onClick={() => navigate(a.to)}
              style={{
                background: 'var(--gray-50)',
                border: `1.5px solid var(--gray-200)`,
                borderRadius: 10,
                padding: '18px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 10,
                cursor: 'pointer',
                transition: 'all .2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = a.color; e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-200)'; e.currentTarget.style.background = 'var(--gray-50)'; e.currentTarget.style.transform = 'none' }}
            >
              <span style={{ fontSize: '1.75rem' }}>{a.icon}</span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--navy)', textAlign: 'center' }}>{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Monthly Volume */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Monthly Transaction Volume</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--navy)" radius={[4,4,0,0]} name="Transactions" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Pie */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Status Distribution</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                  {statusDist.map((_, i) => <Cell key={i} fill={['var(--amber)','#1E40AF','var(--green)'][i]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 120 }}>
              {statusDist.map((d, i) => (
                <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: ['var(--amber)','#1E40AF','var(--green)'][i], flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--gray-600)' }}>{d.name}</span>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, marginLeft: 'auto' }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Top Transaction Types */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Most Requested Transactions</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topTypes.map((t, i) => {
            const pct = stats.total > 0 ? Math.round(t.count / stats.total * 100) : 0
            return (
              <div key={t.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--gray-700)' }}>{t.name}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 700 }}>{t.count} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({pct}%)</span></span>
                </div>
                <div style={{ height: 6, background: 'var(--gray-100)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: COLORS[i % COLORS.length], borderRadius: 3, transition: 'width .6s ease' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
