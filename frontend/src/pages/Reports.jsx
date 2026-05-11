import { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../utils/api.js';

const TRANSACTION_TYPES = [
  "ON-TIME REGISTRATION OF BIRTH", "ON-TIME REGISTRATION OF MARRIAGE", "ON-TIME REGISTRATION OF DEATH",
  "DELAYED REGISTRATION OF BIRTH", "BRAP DELAYED REGISTRATION OF BIRTH",
  "CTC OF BIRTH", "CTC OF MARRIAGE", "CTC OF DEATH",
  "BREQS BIRTH - REQUEST", "BREQS BIRTH - CLAIMED",
  "BREQS MARRIAGE - REQUEST", "BREQS MARRIAGE - CLAIMED",
  "BREQS DEATH - REQUEST", "BREQS DEATH - CLAIMED",
  "BREQS CENOMAR - REQUEST", "BREQS CENOMAR - CLAIMED",
  "MARRIAGE APPLICANT", "COURT DECREE", "LEGITIMATION", "R.A. 9048",
  "MIGRANT PETITION", "R.A. 10172", "SUPPLEMENTAL",
];

function getWeekRange(offset = 0) {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday, to: sunday };
}

function fmtDate(d) {
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function fmtShort(d) {
  return d.toISOString().split('T')[0];
}

export default function Reports() {
  const [reportType, setReportType]   = useState('daily'); // 'daily' | 'weekly' | 'custom'
  const [dateTarget, setDateTarget]   = useState(fmtShort(new Date())); // for daily
  const [weekOffset, setWeekOffset]   = useState(0);       // for weekly
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [loading, setLoading]         = useState(false);
  const [reportData, setReportData]   = useState(null);
  const [error, setError]             = useState('');

  const getDateRange = () => {
    if (reportType === 'daily') {
      return { from: dateTarget, to: dateTarget };
    } else if (reportType === 'weekly') {
      const { from, to } = getWeekRange(weekOffset);
      return { from: fmtShort(from), to: fmtShort(to) };
    } else {
      return { from: customFrom, to: customTo };
    }
  };

  const getRangeLabel = () => {
    if (reportType === 'daily') {
      return new Date(dateTarget + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } else if (reportType === 'weekly') {
      const { from, to } = getWeekRange(weekOffset);
      return `${fmtDate(from)} – ${fmtDate(to)}`;
    } else {
      if (!customFrom || !customTo) return '—';
      return `${new Date(customFrom + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })} – ${new Date(customTo + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
  };

  const generate = async () => {
    const { from, to } = getDateRange();
    if (!from || !to) { setError('Please select a valid date range.'); return; }
    if (from > to) { setError('Start date must be before end date.'); return; }
    setError('');
    setLoading(true);
    setReportData(null);
    try {
      const { data } = await API.get('/records', {
        params: { date_from: from, date_to: to, limit: 9999, page: 1 },
      });
      const records = data.records || [];
      // Build summary
      const byStatus = { Pending: 0, Processing: 0, Completed: 0 };
      const byType   = {};
      const bySex    = { Male: 0, Female: 0, Unknown: 0 };
      const byBarangay = {};

      records.forEach(r => {
        byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        byType[r.transaction_type] = (byType[r.transaction_type] || 0) + 1;
        const sex = r.sex || 'Unknown';
        bySex[sex] = (bySex[sex] || 0) + 1;
        const brgy = r.address?.replace('Brgy. ', '').replace(', General Luna, Quezon 4310', '').replace(', General Luna, Quezon', '') || 'Unknown';
        byBarangay[brgy] = (byBarangay[brgy] || 0) + 1;
      });

      const topTypes = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      const topBarangays = Object.entries(byBarangay)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      setReportData({
        records,
        total: records.length,
        byStatus,
        bySex,
        topTypes,
        topBarangays,
        rangeLabel: getRangeLabel(),
        from, to,
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  const exportReportPDF = () => {
    if (!reportData) return;
    const doc = new jsPDF({ orientation: 'portrait' });
    const { rangeLabel, total, byStatus, bySex, topTypes, topBarangays, records } = reportData;

    // Header
    doc.setFillColor(15, 32, 68);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('MCRO General Luna, Quezon', 14, 14);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Civil Registry Transaction Report', 14, 21);
    doc.setFontSize(9);
    doc.text(`Period: ${rangeLabel}`, 14, 29);
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 35);
    doc.setTextColor(0, 0, 0);

    let y = 46;

    // Summary table
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Summary', 14, y); y += 6;

    autoTable(doc, {
      startY: y,
      head: [['Metric', 'Count']],
      body: [
        ['Total Transactions', total],
        ['Pending', byStatus.Pending || 0],
        ['Processing', byStatus.Processing || 0],
        ['Completed', byStatus.Completed || 0],
        ['Male Clients', bySex.Male || 0],
        ['Female Clients', bySex.Female || 0],
      ],
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [15, 32, 68], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 0: { fontStyle: 'bold' }, 1: { halign: 'center' } },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Top transaction types
    doc.setFont('helvetica', 'bold');
    doc.text('Top Transaction Types', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Transaction Type', 'Count']],
      body: topTypes.map(([type, count]) => [type, count]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [42, 74, 138], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Top barangays
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFont('helvetica', 'bold');
    doc.text('Requests by Barangay (Top 10)', 14, y); y += 6;
    autoTable(doc, {
      startY: y,
      head: [['Barangay', 'Requests']],
      body: topBarangays.map(([brgy, count]) => [brgy, count]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [201, 151, 58], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: 14, right: 14 },
    });
    y = doc.lastAutoTable.finalY + 10;

    // Full records on new page
    if (records.length > 0) {
      doc.addPage();
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('Transaction Listing', 14, 16);
      autoTable(doc, {
        startY: 22,
        head: [['Date', 'Client Name', 'Sex', 'Type of Document', 'Status']],
        body: records.map(r => [
          r.date ? new Date(r.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : '—',
          r.client_name,
          r.sex || '—',
          r.transaction_type,
          r.status,
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5 },
        headStyles: { fillColor: [15, 32, 68], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [249, 250, 251] },
        margin: { left: 14, right: 14 },
      });
    }

    // Conclusion page
    const conclusion = generateConclusion(reportData, reportType);
    if (conclusion) {
      if (y > 220) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Conclusion', 14, y); y += 7;

      doc.setFillColor(245, 247, 250);
      doc.roundedRect(14, y, 182, 4, 1, 1, 'F');
      y += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const bullets = [
        conclusion.volumeNote,
        conclusion.completionNote,
        conclusion.typeNote,
        conclusion.brgyNote,
        conclusion.sexNote,
      ].filter(Boolean);

      bullets.forEach(text => {
        const lines = doc.splitTextToSize(`• ${text}`, 178);
        if (y + lines.length * 5 > 275) { doc.addPage(); y = 20; }
        doc.text(lines, 16, y);
        y += lines.length * 5 + 3;
      });

      if (conclusion.pendingAlert) {
        y += 2;
        doc.setFillColor(255, 251, 235);
        const alertLines = doc.splitTextToSize(conclusion.pendingAlert, 174);
        doc.roundedRect(14, y - 3, 182, alertLines.length * 5 + 6, 2, 2, 'F');
        doc.setTextColor(146, 64, 14);
        doc.text(alertLines, 16, y + 1);
        doc.setTextColor(0, 0, 0);
        y += alertLines.length * 5 + 10;
      }

      y += 4;
      doc.setFontSize(7.5);
      doc.setTextColor(180, 180, 180);
      doc.text('This conclusion is computed directly from the data in this report. No external service or AI was used.', 14, y);
      doc.setTextColor(0, 0, 0);
    }

    const suffix = reportType === 'daily' ? dateTarget : `${reportData.from}-to-${reportData.to}`;
    doc.save(`MCRO-Report-${suffix}.pdf`);
  };

  const exportReportCSV = () => {
    if (!reportData) return;
    const { records, rangeLabel } = reportData;
    const headers = ['Date & Time', 'Client Name', 'Sex', 'Address', 'Mobile', 'Type of Document', 'Document Owner', 'Status'];
    const rows = records.map(r => [
      r.date ? new Date(r.date).toLocaleString('en-PH') : '',
      r.client_name, r.sex || '', r.address || '',
      r.mobile_number || '', r.transaction_type,
      r.document_owner_name || '', r.status,
    ]);
    const csvContent = [
      [`# MCRO Report — ${rangeLabel}`],
      headers,
      ...rows,
    ].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MCRO-Report-${reportData.from}-to-${reportData.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Pure data-driven conclusion (no AI) ─────────────────
  const generateConclusion = (data, type) => {
    if (!data || data.total === 0) return null;
    const { total, byStatus, bySex, topTypes, topBarangays, rangeLabel } = data;

    const completionRate = total > 0 ? Math.round((byStatus.Completed / total) * 100) : 0;
    const pendingRate    = total > 0 ? Math.round(((byStatus.Pending || 0) / total) * 100) : 0;
    const topType        = topTypes[0]?.[0] ?? '—';
    const topTypeCount   = topTypes[0]?.[1] ?? 0;
    const topTypeShare   = total > 0 ? Math.round((topTypeCount / total) * 100) : 0;
    const topBrgy        = topBarangays[0]?.[0] ?? '—';
    const topBrgyCount   = topBarangays[0]?.[1] ?? 0;
    const maleCount      = bySex.Male   || 0;
    const femaleCount    = bySex.Female || 0;
    const dominantSex    = maleCount > femaleCount ? 'male' : femaleCount > maleCount ? 'female' : null;
    const sexGap         = Math.abs(maleCount - femaleCount);

    // Volume assessment
    let volumeNote = '';
    if (type === 'daily') {
      if (total === 0)       volumeNote = 'No transactions were recorded for this date.';
      else if (total <= 5)   volumeNote = `A light day with only ${total} transaction${total > 1 ? 's' : ''} recorded.`;
      else if (total <= 15)  volumeNote = `A moderate day with ${total} transactions processed.`;
      else if (total <= 30)  volumeNote = `A busy day with ${total} transactions handled.`;
      else                   volumeNote = `An exceptionally high-volume day with ${total} transactions logged.`;
    } else if (type === 'weekly') {
      if (total <= 20)       volumeNote = `A quiet week with ${total} total transactions.`;
      else if (total <= 60)  volumeNote = `A typical week with ${total} transactions across the period.`;
      else if (total <= 120) volumeNote = `A productive week with ${total} transactions recorded.`;
      else                   volumeNote = `A high-volume week with ${total} transactions processed.`;
    } else {
      volumeNote = `A total of ${total} transactions were recorded for the period: ${rangeLabel}.`;
    }

    // Completion health
    let completionNote = '';
    if (completionRate === 100) {
      completionNote = 'All transactions were successfully completed — an excellent processing record.';
    } else if (completionRate >= 85) {
      completionNote = `The office maintained a strong completion rate of ${completionRate}%, with ${byStatus.Pending || 0} pending and ${byStatus.Processing || 0} still in progress.`;
    } else if (completionRate >= 60) {
      completionNote = `Completion stood at ${completionRate}%. There are ${byStatus.Pending || 0} pending and ${byStatus.Processing || 0} processing transactions that require follow-up.`;
    } else {
      completionNote = `The completion rate was ${completionRate}%, indicating a significant backlog. Attention is needed for the ${byStatus.Pending || 0} pending and ${byStatus.Processing || 0} in-progress transactions.`;
    }

    // Top document type
    const typeNote = topType !== '—'
      ? `The most requested document type was "${topType}" accounting for ${topTypeCount} transaction${topTypeCount > 1 ? 's' : ''} (${topTypeShare}% of total volume).`
      : '';

    // Barangay note
    const brgyNote = topBrgy !== '—'
      ? `${topBrgy} had the highest request volume with ${topBrgyCount} transaction${topBrgyCount > 1 ? 's' : ''}.`
      : '';

    // Sex distribution note
    let sexNote = '';
    if (dominantSex && sexGap > 0) {
      sexNote = `Client visits were predominantly ${dominantSex} (${dominantSex === 'male' ? maleCount : femaleCount} vs ${dominantSex === 'male' ? femaleCount : maleCount}).`;
    } else if (!dominantSex && maleCount > 0) {
      sexNote = `Male and female client visits were equally distributed (${maleCount} each).`;
    }

    // Pending alert
    const pendingAlert = (pendingRate >= 20 && total >= 5)
      ? `⚠ Note: ${pendingRate}% of transactions remain pending — timely processing is recommended to avoid further delays.`
      : null;

    return { volumeNote, completionNote, typeNote, brgyNote, sexNote, pendingAlert, completionRate, total };
  };

  const weekRange = getWeekRange(weekOffset);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate daily, weekly, or custom-range transaction reports</p>
        </div>
        <span className="date-badge">
          {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Report Builder */}
      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="chart-title" style={{ marginBottom: 4 }}>Report Configuration</h3>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 20 }}>Select a report type and date range, then click Generate.</p>

        {/* Type tabs */}
        <div className="tab-row" style={{ marginBottom: 20 }}>
          {[
            { id: 'daily',  label: '📅 Daily' },
            { id: 'weekly', label: '🗓️ Weekly' },
            { id: 'custom', label: '📆 Custom Range' },
          ].map(t => (
            <button
              key={t.id}
              className={`tab${reportType === t.id ? ' active' : ''}`}
              onClick={() => { setReportType(t.id); setReportData(null); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Date pickers */}
        {reportType === 'daily' && (
          <div className="form-group" style={{ maxWidth: 280 }}>
            <label className="form-label">Select Date</label>
            <input
              className="form-input"
              type="date"
              value={dateTarget}
              max={fmtShort(new Date())}
              onChange={e => { setDateTarget(e.target.value); setReportData(null); }}
            />
          </div>
        )}

        {reportType === 'weekly' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setWeekOffset(o => o - 1); setReportData(null); }}
            >‹ Previous</button>
            <div style={{
              padding: '8px 20px',
              background: 'var(--gray-50)',
              border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13, fontWeight: 600, color: 'var(--navy)',
              minWidth: 260, textAlign: 'center',
            }}>
              {fmtDate(weekRange.from)} – {fmtDate(weekRange.to)}
              {weekOffset === 0 && <span style={{ fontSize: 11, color: 'var(--green)', marginLeft: 8 }}>This week</span>}
              {weekOffset === -1 && <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 8 }}>Last week</span>}
            </div>
            <button
              className="btn btn-ghost btn-sm"
              disabled={weekOffset >= 0}
              onClick={() => { setWeekOffset(o => o + 1); setReportData(null); }}
            >Next ›</button>
          </div>
        )}

        {reportType === 'custom' && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ minWidth: 180 }}>
              <label className="form-label">From</label>
              <input
                className="form-input"
                type="date"
                value={customFrom}
                max={customTo || fmtShort(new Date())}
                onChange={e => { setCustomFrom(e.target.value); setReportData(null); }}
              />
            </div>
            <div className="form-group" style={{ minWidth: 180 }}>
              <label className="form-label">To</label>
              <input
                className="form-input"
                type="date"
                value={customTo}
                min={customFrom}
                max={fmtShort(new Date())}
                onChange={e => { setCustomTo(e.target.value); setReportData(null); }}
              />
            </div>
          </div>
        )}

        {error && (
          <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--red-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--red)' }}>
            {error}
          </div>
        )}

        <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={generate} disabled={loading}>
            {loading
              ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Generating…</>
              : <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                  </svg>
                  Generate Report
                </>
            }
          </button>
          {reportData && (
            <>
              <button className="btn btn-ghost" onClick={exportReportPDF}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export PDF
              </button>
              <button className="btn btn-ghost" onClick={exportReportCSV}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report Output */}
      {reportData && (
        <div className="animate-fade">
          {/* Header */}
          <div style={{
            padding: '18px 24px',
            background: 'linear-gradient(135deg, var(--navy), var(--navy-light))',
            borderRadius: 'var(--radius)',
            marginBottom: 16,
            color: 'white',
          }}>
            <div style={{ fontSize: 11, opacity: .7, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              {reportType === 'daily' ? 'Daily' : reportType === 'weekly' ? 'Weekly' : 'Custom'} Report
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
              {reportData.rangeLabel}
            </div>
            <div style={{ fontSize: 12, opacity: .65 }}>
              MCRO General Luna, Quezon — Generated {new Date().toLocaleString('en-PH')}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid-4 mb-6">
            {[
              { label: 'Total Transactions', value: reportData.total,                  color: 'var(--navy)' },
              { label: 'Pending',            value: reportData.byStatus.Pending   || 0, color: '#d97706' },
              { label: 'Processing',         value: reportData.byStatus.Processing || 0, color: '#2563eb' },
              { label: 'Completed',          value: reportData.byStatus.Completed  || 0, color: '#16a34a' },
            ].map(m => (
              <div key={m.label} className="stat-card">
                <div className="stat-accent" style={{ background: m.color }} />
                <div className="stat-value" style={{ fontSize: 30 }}>{m.value}</div>
                <div className="stat-label">{m.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2 mb-6">
            {/* Top transaction types */}
            <div className="card">
              <h3 className="chart-title" style={{ marginBottom: 4 }}>Transaction Breakdown</h3>
              <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 14 }}>By document type for this period</p>
              {reportData.topTypes.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                  {reportData.topTypes.map(([type, count], i) => {
                    const max = reportData.topTypes[0][1];
                    const pct = Math.round((count / max) * 100);
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--gray-400)', width: 18, textAlign: 'right', flexShrink: 0 }}>#{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, color: 'var(--gray-700)', marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{type}</div>
                          <div style={{ height: 5, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg, var(--navy), var(--navy-light))', borderRadius: 99 }} />
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy)', minWidth: 24, textAlign: 'right', flexShrink: 0 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              ) : <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No data for this period.</div>}
            </div>

            {/* Top barangays + sex */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="card">
                <h3 className="chart-title" style={{ marginBottom: 4 }}>Top Barangays</h3>
                <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 14 }}>By request volume</p>
                {reportData.topBarangays.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                    {reportData.topBarangays.slice(0, 5).map(([brgy, count], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: 'var(--gray-700)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
                          <span style={{ color: 'var(--gray-400)', marginRight: 6, fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                          {brgy}
                        </span>
                        <span style={{ fontWeight: 600, color: 'var(--navy)', flexShrink: 0, marginLeft: 8 }}>{count}</span>
                      </div>
                    ))}
                  </div>
                ) : <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No data.</div>}
              </div>

              <div className="card">
                <h3 className="chart-title" style={{ marginBottom: 4 }}>Client Sex</h3>
                <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
                  {[
                    { label: 'Male',   value: reportData.bySex.Male || 0,    color: 'var(--navy)' },
                    { label: 'Female', value: reportData.bySex.Female || 0,  color: '#c9973a' },
                    { label: 'Unknown',value: reportData.bySex.Unknown || 0, color: 'var(--gray-400)' },
                  ].map(s => (
                    <div key={s.label} style={{ textAlign: 'center' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: 'var(--gray-500)', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Records table */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="chart-title" style={{ marginBottom: 0 }}>
                Transaction Listing
                <span style={{ fontSize: 12, color: 'var(--gray-400)', fontWeight: 400, marginLeft: 10 }}>
                  {reportData.total} record{reportData.total !== 1 ? 's' : ''}
                </span>
              </h3>
            </div>
            <div className="table-wrap">
              {reportData.records.length === 0 ? (
                <div className="records-empty">No transactions found for this period.</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Date & Time</th>
                      <th>Client Name</th>
                      <th>Sex</th>
                      <th>Type of Document</th>
                      <th>Document Owner</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.records.map((r, i) => (
                      <tr key={r.id}>
                        <td style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                        <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>
                          {r.date ? new Date(r.date).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td style={{ fontWeight: 600, color: '#0f2044', fontSize: 13 }}>{r.client_name}</td>
                        <td style={{ color: '#6b7280' }}>{r.sex || '—'}</td>
                        <td><span className="tx-type-tag">{r.transaction_type}</span></td>
                        <td style={{ color: '#6b7280' }}>{r.document_owner_name || '—'}</td>
                        <td>
                          <span className={`badge badge-${r.status?.toLowerCase()}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* ── Conclusion ────────────────────────────────────── */}
          {(() => {
            const c = generateConclusion(reportData, reportType);
            if (!c) return null;

            const barColor = c.completionRate >= 85 ? '#16a34a' : c.completionRate >= 60 ? '#d97706' : '#dc2626';

            return (
              <div className="card" style={{ marginTop: 16, borderTop: '3px solid var(--navy)' }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                        <line x1="16" y1="13" x2="8" y2="13"/>
                        <line x1="16" y1="17" x2="8" y2="17"/>
                        <polyline points="10 9 9 9 8 9"/>
                      </svg>
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--navy)' }}>Report Conclusion</h3>
                      <p style={{ margin: 0, fontSize: 11, color: 'var(--gray-400)' }}>Auto-generated from report data</p>
                    </div>
                  </div>
                  {/* Completion rate badge */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 22, fontWeight: 700, color: barColor, lineHeight: 1 }}>{c.completionRate}%</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>Completion Rate</div>
                    <div style={{ marginTop: 5, height: 5, width: 80, background: 'var(--gray-100)', borderRadius: 99, overflow: 'hidden', marginLeft: 'auto' }}>
                      <div style={{ height: '100%', width: c.completionRate + '%', background: barColor, borderRadius: 99, transition: 'width .6s ease' }} />
                    </div>
                  </div>
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'var(--gray-100)', marginBottom: 16 }} />

                {/* Conclusion paragraphs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[c.volumeNote, c.completionNote, c.typeNote, c.brgyNote, c.sexNote]
                    .filter(Boolean)
                    .map((text, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{
                          marginTop: 3, flexShrink: 0,
                          width: 6, height: 6, borderRadius: '50%',
                          background: 'var(--navy)', opacity: 0.4,
                        }} />
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-700)', lineHeight: 1.65 }}>{text}</p>
                      </div>
                    ))
                  }
                </div>

                {/* Pending alert */}
                {c.pendingAlert && (
                  <div style={{
                    marginTop: 14, padding: '10px 14px',
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: 8, fontSize: 13, color: '#92400e', lineHeight: 1.6,
                  }}>
                    {c.pendingAlert}
                  </div>
                )}

                {/* Footer note */}
                <div style={{ marginTop: 14, fontSize: 11, color: 'var(--gray-300)', borderTop: '1px solid var(--gray-100)', paddingTop: 10 }}>
                  This conclusion is computed directly from the data in this report. No external service or AI was used.
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
