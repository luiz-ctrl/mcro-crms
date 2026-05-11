import React, { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { exportRecordsPDF, exportSummaryReport } from '../../lib/pdf'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'

export default function Reports() {
  const toast = useToast()
  const [dailyDate, setDailyDate]     = useState(format(new Date(), 'yyyy-MM-dd'))
  const [weekDate, setWeekDate]       = useState(format(new Date(), 'yyyy-MM-dd'))
  const [monthDate, setMonthDate]     = useState(format(new Date(), 'yyyy-MM'))
  const [loading, setLoading]         = useState({})

  function setLoad(key, val) { setLoading(l => ({ ...l, [key]: val })) }

  async function fetchRange(from, to) {
    const { data } = await supabase.from('records')
      .select('*')
      .gte('date', from + 'T00:00:00')
      .lte('date', to + 'T23:59:59')
      .order('date')
    return data || []
  }

  async function buildSummary(records) {
    const total      = records.length
    const pending    = records.filter(r => r.status === 'Pending').length
    const processing = records.filter(r => r.status === 'Processing').length
    const completed  = records.filter(r => r.status === 'Completed').length

    const typeCounts = {}
    records.forEach(r => { typeCounts[r.transaction_type] = (typeCounts[r.transaction_type] || 0) + 1 })
    const byType = Object.entries(typeCounts).sort((a,b) => b[1]-a[1]).map(([t,c]) => [t, c])

    return {
      summary: [
        ['Total Transactions', total],
        ['Pending', pending],
        ['Processing', processing],
        ['Completed', completed],
      ],
      byType,
    }
  }

  async function exportDaily() {
    setLoad('daily', true)
    const records = await fetchRange(dailyDate, dailyDate)
    if (records.length === 0) { toast('No records for this date', 'info'); setLoad('daily', false); return }
    const data = await buildSummary(records)
    exportSummaryReport(data, 'Daily Report', format(new Date(dailyDate + 'T12:00:00'), 'MMMM d, yyyy'))
    toast('Daily report exported', 'success')
    setLoad('daily', false)
  }

  async function exportDailyFull() {
    setLoad('dailyfull', true)
    const records = await fetchRange(dailyDate, dailyDate)
    if (records.length === 0) { toast('No records for this date', 'info'); setLoad('dailyfull', false); return }
    exportRecordsPDF(records, 'Daily Transactions', format(new Date(dailyDate + 'T12:00:00'), 'MMMM d, yyyy'))
    toast('Full daily report exported', 'success')
    setLoad('dailyfull', false)
  }

  async function exportWeekly() {
    setLoad('weekly', true)
    const ref   = new Date(weekDate + 'T12:00:00')
    const from  = format(startOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const to    = format(endOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd')
    const records = await fetchRange(from, to)
    if (records.length === 0) { toast('No records for this week', 'info'); setLoad('weekly', false); return }
    const data = await buildSummary(records)
    exportSummaryReport(data, 'Weekly Report', `${format(new Date(from + 'T12:00:00'), 'MMM d')} – ${format(new Date(to + 'T12:00:00'), 'MMM d, yyyy')}`)
    toast('Weekly report exported', 'success')
    setLoad('weekly', false)
  }

  async function exportMonthly() {
    setLoad('monthly', true)
    const [y, m]  = monthDate.split('-')
    const ref     = new Date(parseInt(y), parseInt(m) - 1, 1)
    const from    = format(startOfMonth(ref), 'yyyy-MM-dd')
    const to      = format(endOfMonth(ref), 'yyyy-MM-dd')
    const records = await fetchRange(from, to)
    if (records.length === 0) { toast('No records for this month', 'info'); setLoad('monthly', false); return }
    const data = await buildSummary(records)
    exportSummaryReport(data, 'Monthly Report', format(ref, 'MMMM yyyy'))
    toast('Monthly report exported', 'success')
    setLoad('monthly', false)
  }

  const ReportCard = ({ title, desc, children }) => (
    <div className="card" style={{ padding: '28px', borderTop: '3px solid var(--navy)' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 6 }}>{title}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: 20 }}>{desc}</p>
      {children}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Reports</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Generate and export PDF reports</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
        {/* Daily */}
        <ReportCard title="📅 Daily Report" desc="Summary and full transaction list for a specific day">
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Select Date</label>
            <input type="date" className="form-input" value={dailyDate} onChange={e => setDailyDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-primary" onClick={exportDaily} disabled={loading.daily} style={{ flex: 1 }}>
              {loading.daily ? 'Exporting…' : '📊 Summary PDF'}
            </button>
            <button className="btn btn-outline" onClick={exportDailyFull} disabled={loading.dailyfull} style={{ flex: 1 }}>
              {loading.dailyfull ? 'Exporting…' : '📋 Full List PDF'}
            </button>
          </div>
        </ReportCard>

        {/* Weekly */}
        <ReportCard title="📆 Weekly Report" desc="Summary for the calendar week containing the selected date">
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Select Any Day in Week</label>
            <input type="date" className="form-input" value={weekDate} onChange={e => setWeekDate(e.target.value)} max={format(new Date(), 'yyyy-MM-dd')} />
          </div>
          <button className="btn btn-primary" onClick={exportWeekly} disabled={loading.weekly} style={{ width: '100%', justifyContent: 'center' }}>
            {loading.weekly ? 'Exporting…' : '📊 Export Weekly PDF'}
          </button>
        </ReportCard>

        {/* Monthly */}
        <ReportCard title="🗓️ Monthly Report" desc="Full monthly summary with breakdown by transaction type">
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">Select Month</label>
            <input type="month" className="form-input" value={monthDate} onChange={e => setMonthDate(e.target.value)} max={format(new Date(), 'yyyy-MM')} />
          </div>
          <button className="btn btn-primary" onClick={exportMonthly} disabled={loading.monthly} style={{ width: '100%', justifyContent: 'center' }}>
            {loading.monthly ? 'Exporting…' : '📊 Export Monthly PDF'}
          </button>
        </ReportCard>
      </div>

      {/* Report Contents Info */}
      <div className="card" style={{ padding: '24px 28px', marginTop: 28 }}>
        <h3 style={{ marginBottom: 16, fontSize: '1rem', fontWeight: 700 }}>What's Included in PDF Reports</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '🏛️', text: 'MCRO official header' },
            { icon: '📊', text: 'Transaction totals' },
            { icon: '📋', text: 'Status breakdown' },
            { icon: '📑', text: 'Type-by-type counts' },
            { icon: '📅', text: 'Date range covered' },
            { icon: '🕐', text: 'Generation timestamp' },
          ].map(item => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-600)', fontSize: '0.9rem' }}>
              <span>{item.icon}</span> {item.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
