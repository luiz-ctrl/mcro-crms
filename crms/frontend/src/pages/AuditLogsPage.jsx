import { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import { getAuditLogs } from '../services/api';

const ACTION_LABELS = {
  USER_LOGIN: { icon: '🔐', color: '#3b82f6', bg: '#dbeafe' },
  VISITOR_ADDED: { icon: '➕', color: '#10b981', bg: '#d1fae5' },
  STATUS_UPDATED: { icon: '🔄', color: '#f59e0b', bg: '#fef3c7' },
  VISITOR_DELETED: { icon: '🗑️', color: '#ef4444', bg: '#fee2e2' },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('');
  const LIMIT = 25;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (filterAction) params.action = filterAction;
      const res = await getAuditLogs(params);
      setLogs(res.data.logs);
      setTotal(res.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, filterAction]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <>
      <Header title="Audit Logs" subtitle="System activity and action history" />
      <div className="page-content">
        <div className="page-header">
          <div className="page-header-left">
            <h1>Audit Logs</h1>
            <p>Complete history of all system actions — <strong>{total.toLocaleString()}</strong> entries</p>
          </div>
          <button className="btn btn-outline" onClick={fetchLogs}>
            🔄 Refresh
          </button>
        </div>

        {/* Action filters */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { value: '', label: 'All Actions' },
            { value: 'USER_LOGIN', label: '🔐 Logins' },
            { value: 'VISITOR_ADDED', label: '➕ Added' },
            { value: 'STATUS_UPDATED', label: '🔄 Status Updated' },
            { value: 'VISITOR_DELETED', label: '🗑️ Deleted' },
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => { setFilterAction(opt.value); setPage(1); }}
              style={{
                padding: '6px 14px',
                borderRadius: 99,
                border: '1.5px solid',
                fontFamily: 'var(--font-body)',
                fontSize: '0.82rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: filterAction === opt.value ? 'var(--navy)' : 'var(--white)',
                color: filterAction === opt.value ? 'var(--white)' : 'var(--text-secondary)',
                borderColor: filterAction === opt.value ? 'var(--navy)' : 'var(--gray-300)',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="card">
          <div className="table-wrapper">
            {loading ? (
              <div className="loading-wrapper"><div className="spinner"></div> Loading audit logs...</div>
            ) : logs.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📋</div>
                <p>No audit log entries found.</p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Action</th>
                    <th>Description</th>
                    <th>Performed By</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => {
                    const actionMeta = ACTION_LABELS[log.action] || { icon: '📌', color: 'var(--text-muted)', bg: 'var(--gray-100)' };
                    return (
                      <tr key={log.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          {(page - 1) * LIMIT + idx + 1}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '4px 10px',
                            borderRadius: 99,
                            background: actionMeta.bg,
                            color: actionMeta.color,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            letterSpacing: '0.02em',
                            whiteSpace: 'nowrap',
                          }}>
                            {actionMeta.icon} {log.action.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.875rem', maxWidth: 360 }}>
                          {log.description}
                        </td>
                        <td>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}>
                            <div style={{
                              width: 28,
                              height: 28,
                              borderRadius: '50%',
                              background: 'var(--navy)',
                              color: 'var(--white)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              flexShrink: 0,
                            }}>
                              {(log.performed_by || 'S').charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                              {log.performed_by || 'system'}
                            </span>
                          </div>
                        </td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                            {new Date(log.created_at).toLocaleDateString('en-PH', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                            {new Date(log.created_at).toLocaleTimeString('en-PH', {
                              hour: '2-digit', minute: '2-digit', second: '2-digit'
                            })}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="pagination">
              <span>
                Showing {Math.min((page - 1) * LIMIT + 1, total)}–{Math.min(page * LIMIT, total)} of {total}
              </span>
              <div className="pagination-controls">
                <button className="btn btn-sm btn-outline" onClick={() => setPage(1)} disabled={page === 1}>
                  «
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                  ← Prev
                </button>
                <span style={{ padding: '5px 12px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Page {page} of {totalPages}
                </span>
                <button className="btn btn-sm btn-outline" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                  Next →
                </button>
                <button className="btn btn-sm btn-outline" onClick={() => setPage(totalPages)} disabled={page === totalPages}>
                  »
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{
          marginTop: 16,
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          {Object.entries(ACTION_LABELS).map(([key, val]) => (
            <div key={key} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: val.color,
              }}></span>
              {key.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
