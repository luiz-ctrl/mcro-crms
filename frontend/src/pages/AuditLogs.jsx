import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api.js';

const ACTION_META = {
  CREATE: { bg: '#dcfce7', color: '#15803d', label: 'Create' },
  UPDATE: { bg: '#dbeafe', color: '#1d4ed8', label: 'Update' },
  DELETE: { bg: '#fee2e2', color: '#dc2626', label: 'Delete' },
  LOGIN:  { bg: '#fef3c7', color: '#92400e', label: 'Login'  },
};

function ActionBadge({ action }) {
  const meta = ACTION_META[action] || { bg: '#f3f4f6', color: '#374151', label: action };
  return (
    <span className="badge" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

export default function AuditLogs() {
  const [logs, setLogs]               = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [loading, setLoading]         = useState(true);
  const [search, setSearch]           = useState('');
  const [filterAction, setFilterAction] = useState('');
  const LIMIT = 30;

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search)       params.search = search;
      if (filterAction) params.action = filterAction;
      const { data } = await API.get('/audit', { params });
      setLogs(data.logs);
      setTotal(data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, filterAction]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Audit Logs</h1>
          <p className="page-subtitle">{total.toLocaleString()} total system activity entries</p>
        </div>
        <span className="date-badge">
          {new Date().toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Filters */}
      <div className="card records-filters mb-5">
        <input
          className="form-input"
          type="text"
          placeholder="Search description or user email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 2, minWidth: 200 }}
        />
        <select
          className="form-select"
          value={filterAction}
          onChange={e => { setFilterAction(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 140 }}
        >
          <option value="">All Actions</option>
          {Object.keys(ACTION_META).map(a => (
            <option key={a} value={a}>{ACTION_META[a].label}</option>
          ))}
        </select>
        {(search || filterAction) && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setFilterAction(''); setPage(1); }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }} />
            </div>
          ) : logs.length === 0 ? (
            <div className="records-empty">No audit log entries found.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th style={{ width: 100 }}>Action</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log.id}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>
                      {new Date(log.created_at).toLocaleString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: '#0f2044', fontSize: 13 }}>
                        {log.user_email || '—'}
                      </span>
                    </td>
                    <td>
                      <ActionBadge action={log.action} />
                    </td>
                    <td style={{ color: '#4b5563', fontSize: 13, maxWidth: 420 }}>
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="records-pagination">
            <span style={{ fontSize: 12, color: '#6b7280' }}>
              Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}
            </span>
            <div className="pagination">
              <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pg = i + 1;
                if (totalPages > 5 && page > 3) pg = page - 2 + i;
                if (pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    className={`page-btn${pg === page ? ' active' : ''}`}
                    onClick={() => setPage(pg)}
                  >
                    {pg}
                  </button>
                );
              })}
              <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
