import React, { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

const BAR_COLORS = ['#0F1F3D','#C9973A','#16A34A','#DC2626','#7C3B8C','#0F5E9C','#D97706','#065F46','#1E40AF','#92400E']
const PIE_STATUS = ['#D97706','#1E40AF','#16A34A']
const PIE_SEX    = ['#0F1F3D','#C9973A','#9CA3AF']

function SummaryCard({ label, value, color }) {
  return (
    <div className="card" style={{ padding: '20px 24px', borderTop: `3px solid ${color}`, textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color, fontFamily: 'var(--font-head)' }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>{label}</div>
    </div>
  )
}

export default function Analytics() {
  const [all, setAll]         = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('records').select('*')
      .then(({ data }) => { setAll(data || []); setLoading(false) })
  }, [])

  if (loading) return <div style={{ display:'flex', justifyContent:'center', paddingTop:80 }}><div className="spinner" /></div>

  const now = new Date()

  // Summary
  const total      = all.length
  const pending    = all.filter(r => r.status === 'Pending').length
  const processing = all.filter(r => r.status === 'Processing').length
  const completed  = all.filter(r => r.status === 'Completed').length

  // Monthly (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i)
    const start = format(startOfMonth(d), 'yyyy-MM-dd')
    const end   = format(endOfMonth(d), 'yyyy-MM-dd')
    return {
      month: format(d, 'MMM'),
      count: all.filter(r => r.date?.slice(0,10) >= start && r.date?.slice(0,10) <= end).length,
    }
  })

  // Top 10 transaction types
  const typeCounts = {}
  all.forEach(r => { typeCounts[r.transaction_type] = (typeCounts[r.transaction_type] || 0) + 1 })
  const topTypes = Object.entries(typeCounts)
    .sort((a,b) => b[1]-a[1]).slice(0,10)
    .map(([name,count]) => ({ name: name.length > 30 ? name.slice(0,30)+'…' : name, count }))

  // Status distribution
  const statusData = [
    { name: 'Pending',    value: pending },
    { name: 'Processing', value: processing },
    { name: 'Completed',  value: completed },
  ]

  // Sex distribution
  const sexCounts = { Male: 0, Female: 0, Other: 0 }
  all.forEach(r => { if (r.sex && sexCounts[r.sex] !== undefined) sexCounts[r.sex]++ })
  const sexData = Object.entries(sexCounts).map(([name,value]) => ({ name, value }))

  // Top barangays
  const brgyCount = {}
  all.forEach(r => { if (r.address) brgyCount[r.address] = (brgyCount[r.address] || 0) + 1 })
  const topBrgy = Object.entries(brgyCount)
    .sort((a,b) => b[1]-a[1]).slice(0,10)
    .map(([name,count]) => ({ name, count }))

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Analytics</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Overview of all civil registry transactions</p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <SummaryCard label="Total" value={total} color="var(--navy)" />
        <SummaryCard label="Pending" value={pending} color="var(--amber)" />
        <SummaryCard label="Processing" value={processing} color="#1E40AF" />
        <SummaryCard label="Completed" value={completed} color="var(--green)" />
      </div>

      {/* Monthly Volume */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Monthly Transaction Volume (Last 6 Months)</h2>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="month" tick={{ fontSize: 13 }} />
            <YAxis tick={{ fontSize: 13 }} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--navy)" radius={[5,5,0,0]} name="Transactions" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top 10 Transaction Types */}
      <div className="card" style={{ padding: '24px 28px', marginBottom: 24 }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Top 10 Transaction Types</h2>
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={topTypes} layout="vertical" margin={{ left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={220} />
            <Tooltip />
            <Bar dataKey="count" radius={[0,4,4,0]} name="Count">
              {topTypes.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pie Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Status Breakdown */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Status Breakdown</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {statusData.map((_, i) => <Cell key={i} fill={PIE_STATUS[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Sex Distribution */}
        <div className="card" style={{ padding: '24px 28px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Sex Distribution</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={sexData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {sexData.map((_, i) => <Cell key={i} fill={PIE_SEX[i]} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Barangays */}
      <div className="card" style={{ padding: '24px 28px' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 20 }}>Requests per Barangay (Top 10)</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={topBrgy} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={170} />
            <Tooltip />
            <Bar dataKey="count" fill="var(--gold)" radius={[0,4,4,0]} name="Requests">
              {topBrgy.map((_, i) => <Cell key={i} fill={`hsl(${40 - i*3}, 65%, ${45 + i*2}%)`} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
