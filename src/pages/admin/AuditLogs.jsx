import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../hooks/useToast'
import { format } from 'date-fns'

const PAGE_SIZE = 30
const ACTION_TYPES = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN']

export default function AuditLogs() {
  const toast = useToast()
  const [logs, setLogs]       = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [action, setAction]   = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('audit_logs').select('*', { count: 'exact' })
    if (search) q = q.or(`description.ilike.%${search}%,user_email.ilike.%${search}%`)
    if (action) q = q.eq('action', action)
    q = q.order('created_at', { ascending: false }).range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1)
    const { data, count, error } = await q
    if (error) toast(error.message, 'error')
    setLogs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [search, action, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  const ACTION_STYLES = {
    CREATE: 'badge-create',
    UPDATE: 'badge-update',
    DELETE: 'badge-delete',
    LOGIN:  'badge-login',
  }

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Audit Logs</h1>
        <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>{total} entries — all system activity</p>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '18px 24px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 260px' }}>
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Search description or email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="form-group" style={{ flex: '0 0 200px' }}>
            <label className="form-label">Action Type</label>
            <select className="form-select" value={action} onChange={e => { setAction(e.target.value); setPage(1) }}>
              <option value="">All Actions</option>
              {ACTION_TYPES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label className="form-label" style={{ opacity: 0 }}>Reset</label>
            <button className="btn btn-ghost" onClick={() => { setSearch(''); setAction(''); setPage(1) }}>✕ Clear</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} style={{ textAlign:'center', padding: 40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} style={{ textAlign:'center', padding:40, color:'var(--gray-400)' }}>No logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {format(new Date(log.created_at), 'MMM d, yyyy')}<br />
                    <span style={{ color: 'var(--gray-400)' }}>{format(new Date(log.created_at), 'h:mm:ss a')}</span>
                  </td>
                  <td style={{ fontSize: '0.85rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {log.user_email || '—'}
                  </td>
                  <td><span className={`badge ${ACTION_STYLES[log.action] || ''}`}>{log.action}</span></td>
                  <td style={{ fontSize: '0.875rem', maxWidth: 500, color: 'var(--gray-600)' }}>{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--gray-100)' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
            {Math.min((page-1)*PAGE_SIZE + 1, total)}–{Math.min(page*PAGE_SIZE, total)} of {total}
          </span>
          <div className="pagination">
            <button className="page-btn" onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}>‹</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const p = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
              return <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages || totalPages === 0}>›</button>
          </div>
        </div>
      </div>
    </div>
  )
}
