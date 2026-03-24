import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import AddVisitorModal from '../components/AddVisitorModal';
import { getVisitors, updateVisitorStatus, deleteVisitor } from '../services/api';

const STATUS_OPTIONS = ['', 'Pending', 'Processing', 'Completed'];
const TRANSACTION_TYPES = [
  '', 'Birth Certificate', 'Marriage Certificate', 'Death Certificate',
  'CENOMAR (Certificate of No Marriage)', 'Certificate of Live Birth',
  'Court Order / Annotation', 'Late Registration', 'Correction of Entry', 'Other',
];

export default function VisitorsPage() {
  const [visitors, setVisitors] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [toast, setToast] = useState('');
  const LIMIT = 15;

  const fetchVisitors = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.transaction_type = filterType;
      const res = await getVisitors(params);
      setVisitors(res.data.visitors);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterType]);

  useEffect(() => {
    const timer = setTimeout(fetchVisitors, 300);
    return () => clearTimeout(timer);
  }, [fetchVisitors]);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const handleStatusChange = async (id, newStatus) => {
    setUpdatingId(id);
    try {
      await updateVisitorStatus(id, newStatus);
      setVisitors(prev => prev.map(v => v.id === id ? { ...v, status: newStatus } : v));
      showToast(`✅ Status updated to "${newStatus}"`);
    } catch (err) {
      showToast('⚠️ Failed to update status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete client record for ${name}? This action cannot be undone.`)) return;
    setDeletingId(id);
    try {
      await deleteVisitor(id);
      showToast(`🗑️ Client record deleted.`);
      fetchVisitors();
    } catch (err) {
      showToast('⚠️ Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Header title="Clients Registry" subtitle="Manage civil registry transactions" />
      <div className="page-content">
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, right: 24,
            background: 'var(--navy)', color: 'var(--white)',
            padding: '12px 20px', borderRadius: 10,
            boxShadow: 'var(--shadow-lg)', zIndex: 9999,
            fontSize: '0.875rem', animation: 'slideUp 0.2s ease',
          }}>
            {toast}
          </div>
        )}

        <div className="page-header">
          <div className="page-header-left">
            <h1>Clients Registry</h1>
            <p>Total: <strong>{total.toLocaleString()}</strong> records</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            ➕ Register Client
          </button>
        </div>

        {/* Filters */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <div className="search-bar">
              <div className="search-input-wrapper" style={{ flex: 2 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                <input
                  className="form-control"
                  placeholder="Search by name or barangay..."
                  value={search}
                  onChange={e => { setSearch(e.target.value); setPage(1); }}
                />
              </div>
              <select
                className="form-control"
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
                style={{ width: 160, flex: 'none' }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s || 'All Statuses'}</option>
                ))}
              </select>
              <select
                className="form-control"
                value={filterType}
                onChange={e => { setFilterType(e.target.value); setPage(1); }}
                style={{ width: 200, flex: 'none' }}
              >
                {TRANSACTION_TYPES.map(t => (
                  <option key={t} value={t}>{t || 'All Transactions'}</option>
                ))}
              </select>
              {(search || filterStatus || filterType) && (
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setPage(1); }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-wrapper"><div className="spinner"></div> Loading clients...</div>
            ) : visitors.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <p>No clients found. {search || filterStatus || filterType ? 'Try clearing the filters.' : 'Register the first client!'}</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Name of Client</th>
                    <th>Sex</th>
                    <th>Barangay</th>
                    <th>Mobile</th>
                    <th>Transaction Type</th>
                    <th>Document Owner</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visitors.map((v, idx) => (
                    <tr key={v.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        {(page - 1) * LIMIT + idx + 1}
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(v.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <div style={{ fontSize: '0.7rem' }}>
                          {new Date(v.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{v.name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID #{v.id}</div>
                      </td>
                      <td>
                        <span style={{
                          padding: '2px 10px',
                          borderRadius: 99,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: v.sex === 'Male' ? '#dbeafe' : '#fce7f3',
                          color: v.sex === 'Male' ? '#1d4ed8' : '#be185d',
                        }}>
                          {v.sex || '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{v.barangay}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{v.mobile_number || '—'}</td>
                      <td>
                        <div style={{
                          maxWidth: 150,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.83rem',
                        }} title={v.transaction_type}>
                          {v.transaction_type}
                        </div>
                      </td>
                      <td>
                        <div style={{
                          maxWidth: 140,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '0.82rem',
                          color: 'var(--text-secondary)',
                          fontStyle: 'italic',
                        }} title={v.document_owner_name}>
                          {v.document_owner_name || '—'}
                        </div>
                      </td>
                      <td>
                        <select
                          value={v.status}
                          disabled={updatingId === v.id}
                          onChange={e => handleStatusChange(v.id, e.target.value)}
                          style={{
                            padding: '4px 10px',
                            borderRadius: 99,
                            border: '1.5px solid',
                            fontFamily: 'var(--font-body)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            outline: 'none',
                            appearance: 'none',
                            paddingRight: '22px',
                            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'no-repeat',
                            backgroundPosition: 'right 6px center',
                            ...(v.status === 'Pending' ? { background: 'var(--warning-bg)', color: 'var(--warning)', borderColor: '#f6d77a' } :
                               v.status === 'Processing' ? { background: 'var(--info-bg)', color: 'var(--info)', borderColor: '#93c5fd' } :
                               { background: 'var(--success-bg)', color: 'var(--success)', borderColor: '#86efac' }),
                          }}
                        >
                          <option value="Pending">⏳ Pending</option>
                          <option value="Processing">⚙️ Processing</option>
                          <option value="Completed">✅ Completed</option>
                        </select>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(v.id, v.name)}
                          disabled={deletingId === v.id}
                          title="Delete record"
                          style={{ padding: '4px 10px' }}
                        >
                          {deletingId === v.id ? '...' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span>
                Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total} records
              </span>
              <div className="pagination-controls">
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  ← Prev
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={p}
                      className="btn btn-sm"
                      onClick={() => setPage(p)}
                      style={{
                        background: p === page ? 'var(--navy)' : 'transparent',
                        color: p === page ? 'var(--white)' : 'var(--text-muted)',
                        border: p === page ? 'none' : '1.5px solid var(--gray-300)',
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <AddVisitorModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            showToast('✅ Client registered successfully!');
            setPage(1);
            fetchVisitors();
          }}
        />
      )}
    </>
  );
}
