import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title,
  Tooltip, Legend, ArcElement, PointElement, LineElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import Header from '../components/Header';
import {
  getAnalyticsSummary, getTopBarangays,
  getMonthlyAnalytics, getStatusBreakdown
} from '../services/api';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, Title,
  Tooltip, Legend, ArcElement, PointElement, LineElement
);

export default function AnalyticsPage() {
  const [summary, setSummary] = useState(null);
  const [barangays, setBarangays] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [s, b, m, st] = await Promise.all([
          getAnalyticsSummary(),
          getTopBarangays(),
          getMonthlyAnalytics(),
          getStatusBreakdown(),
        ]);
        setSummary(s.data);
        setBarangays(b.data);
        setMonthly(m.data);
        setStatusBreakdown(st.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const el = reportRef.current;
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let posY = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      // Title
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MCRO General Luna, Quezon', pdfWidth / 2, 12, { align: 'center' });
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Civil Registry Management System — Analytics Report', pdfWidth / 2, 18, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleString('en-PH')}`, pdfWidth / 2, 23, { align: 'center' });
      pdf.line(10, 26, pdfWidth - 10, 26);
      // Add chart image
      if (pdfHeight > pageHeight - 30) {
        let remaining = pdfHeight;
        let srcY = 0;
        let firstPage = true;
        while (remaining > 0) {
          const sliceH = Math.min(remaining, (pageHeight - 30) * (canvas.width / pdfWidth));
          const sliceCanvas = document.createElement('canvas');
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceH;
          const ctx = sliceCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
          const sliceImg = sliceCanvas.toDataURL('image/png');
          if (!firstPage) { pdf.addPage(); posY = 0; }
          pdf.addImage(sliceImg, 'PNG', 0, firstPage ? 30 : 0, pdfWidth, (sliceH * pdfWidth) / canvas.width);
          srcY += sliceH;
          remaining -= sliceH;
          firstPage = false;
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 30, pdfWidth, pdfHeight);
      }
      pdf.save(`MCRO-Analytics-Report-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error('Export error:', e);
      alert('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const barangayChartData = {
    labels: barangays.map(b => b.barangay),
    datasets: [{
      label: 'Visitors',
      data: barangays.map(b => parseInt(b.count)),
      backgroundColor: barangays.map((_, i) => [
        'rgba(15,39,68,0.85)', 'rgba(201,162,39,0.85)', 'rgba(59,130,246,0.75)',
        'rgba(16,185,129,0.75)', 'rgba(245,158,11,0.75)', 'rgba(99,102,241,0.75)',
        'rgba(236,72,153,0.75)', 'rgba(239,68,68,0.75)', 'rgba(20,184,166,0.75)', 'rgba(107,114,128,0.75)',
      ][i % 10]),
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: ctx => ` ${ctx.parsed.y} visitors` } },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } },
      x: { grid: { display: false }, ticks: { maxRotation: 35 } },
    },
  };

  const doughnutData = {
    labels: statusBreakdown.map(s => s.status),
    datasets: [{
      data: statusBreakdown.map(s => parseInt(s.count)),
      backgroundColor: ['#fef3c7', '#dbeafe', '#d1fae5'],
      borderColor: ['#f59e0b', '#3b82f6', '#10b981'],
      borderWidth: 2,
    }],
  };

  const monthlyChartData = {
    labels: monthly.map(m => m.month),
    datasets: [{
      label: 'Visitors',
      data: monthly.map(m => parseInt(m.count)),
      borderColor: 'var(--navy)',
      backgroundColor: 'rgba(15,39,68,0.08)',
      pointBackgroundColor: 'var(--gold)',
      pointBorderColor: 'var(--navy)',
      pointRadius: 5,
      tension: 0.3,
      fill: true,
    }],
  };

  const lineOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { stepSize: 1 } },
      x: { grid: { display: false } },
    },
  };

  const txChartData = {
    labels: summary?.transaction_types?.map(t => t.transaction_type.replace(' Certificate', '').replace(' (Certificate of No Marriage)', '')) || [],
    datasets: [{
      label: 'Count',
      data: summary?.transaction_types?.map(t => parseInt(t.count)) || [],
      backgroundColor: 'rgba(201,162,39,0.75)',
      borderColor: 'var(--gold)',
      borderWidth: 2,
      borderRadius: 6,
      borderSkipped: false,
    }],
  };

  if (loading) return (
    <>
      <Header title="Analytics" subtitle="Statistics & Insights" />
      <div className="page-content">
        <div className="loading-wrapper"><div className="spinner"></div> Loading analytics...</div>
      </div>
    </>
  );

  return (
    <>
      <Header title="Analytics" subtitle="Statistics & Insights" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Analytics & Reports</h1>
            <p>Civil registry statistics and transaction insights</p>
          </div>
          <button
            className="btn btn-gold"
            onClick={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderTopColor: '#fff' }}></span> Exporting...</>
            ) : '📄 Export PDF Report'}
          </button>
        </div>

        <div ref={reportRef} style={{ background: 'var(--gray-100)', padding: '4px' }}>
          {/* Summary Cards */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            {[
              { label: 'Total Visitors', value: summary?.total ?? 0, icon: '👥', color: 'var(--navy)' },
              { label: 'Pending', value: summary?.pending ?? 0, icon: '⏳', color: '#f59e0b' },
              { label: 'Processing', value: summary?.processing ?? 0, icon: '⚙️', color: '#3b82f6' },
              { label: 'Completed', value: summary?.completed ?? 0, icon: '✅', color: '#10b981' },
            ].map(s => (
              <div className="stat-card" key={s.label}>
                <div style={{ fontSize: '1.5rem' }}>{s.icon}</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', color: s.color, lineHeight: 1 }}>
                  {s.value.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 500 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div className="grid-2" style={{ gap: 20, marginBottom: 20 }}>
            {/* Top Barangays Chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📍 Visitors by Barangay</span>
              </div>
              <div className="card-body">
                {barangays.length > 0 ? (
                  <Bar data={barangayChartData} options={barOptions} />
                ) : (
                  <div className="empty-state"><p>No barangay data yet</p></div>
                )}
              </div>
            </div>

            {/* Status Doughnut */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📊 Status Distribution</span>
              </div>
              <div className="card-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
                {statusBreakdown.length > 0 ? (
                  <>
                    <div style={{ maxWidth: 200, maxHeight: 200 }}>
                      <Doughnut data={doughnutData} options={{ plugins: { legend: { display: false } }, cutout: '65%' }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {statusBreakdown.map((s, i) => (
                        <div key={s.status} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            width: 12, height: 12, borderRadius: 3,
                            background: ['#f59e0b', '#3b82f6', '#10b981'][i],
                          }}></span>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{s.status}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, marginLeft: 4 }}>{s.count}</span>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="empty-state"><p>No status data yet</p></div>
                )}
              </div>
            </div>
          </div>

          <div className="grid-2" style={{ gap: 20 }}>
            {/* Monthly Trend */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📈 Monthly Visitor Trend</span>
              </div>
              <div className="card-body">
                {monthly.length > 0 ? (
                  <Line data={monthlyChartData} options={lineOptions} />
                ) : (
                  <div className="empty-state"><p>No monthly data yet</p></div>
                )}
              </div>
            </div>

            {/* Transaction Types Chart */}
            <div className="card">
              <div className="card-header">
                <span className="card-title">📑 Transaction Types</span>
              </div>
              <div className="card-body">
                {summary?.transaction_types?.length > 0 ? (
                  <Bar data={txChartData} options={{
                    ...barOptions,
                    indexAxis: 'y',
                    scales: {
                      x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' }, ticks: { stepSize: 1 } },
                      y: { grid: { display: false } },
                    },
                  }} />
                ) : (
                  <div className="empty-state"><p>No transaction data yet</p></div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}


