import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { TRANSACTION_TYPES, BARANGAYS, STATUSES } from '../../lib/constants'
import { exportRecordsPDF } from '../../lib/pdf'
import { format } from 'date-fns'

const PAGE_SIZE = 15

function RecordModal({ record, onClose, onSaved }) {
  const { user } = useAuth()
  const toast = useToast()
  const isEdit = !!record?.id
  const [form, setForm] = useState({
    date: record?.date ? format(new Date(record.date), "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    client_name: record?.client_name || '',
    sex: record?.sex || '',
    address: record?.address || '',
    mobile_number: record?.mobile_number || '',
    transaction_type: record?.transaction_type || TRANSACTION_TYPES[0],
    document_owner_name: record?.document_owner_name || '',
    status: record?.status || 'Pending',
  })
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    if (!form.client_name.trim()) return toast('Client name is required', 'error')
    if (isEdit && !reason.trim()) return toast('Reason for change is required', 'error')
    setSaving(true)
    try {
      if (isEdit) {
        const { error } = await supabase.from('records').update({ ...form }).eq('id', record.id)
        if (error) throw error
        await supabase.from('audit_logs').insert({
          user_id: user.id, user_email: user.email, action: 'UPDATE',
          description: `Updated record #${record.id} (${record.client_name}). Reason: ${reason}`,
        })
        toast('Record updated', 'success')
      } else {
        const { data, error } = await supabase.from('records').insert({ ...form }).select().single()
        if (error) throw error
        await supabase.from('audit_logs').insert({
          user_id: user.id, user_email: user.email, action: 'CREATE',
          description: `Created record for ${form.client_name} — ${form.transaction_type}`,
        })
        toast('Record added', 'success')
      }
      onSaved()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { label: 'Date & Time', key: 'date', type: 'datetime-local' },
    { label: 'Client Name', key: 'client_name', type: 'text', placeholder: 'Full name of client' },
    { label: 'Sex', key: 'sex', type: 'select', options: ['', 'Male', 'Female', 'Other'] },
    { label: 'Address / Barangay', key: 'address', type: 'select', options: ['', ...BARANGAYS] },
    { label: 'Mobile Number', key: 'mobile_number', type: 'text', placeholder: '09XX-XXX-XXXX' },
    { label: 'Transaction Type', key: 'transaction_type', type: 'select', options: TRANSACTION_TYPES },
    { label: 'Document Owner Name', key: 'document_owner_name', type: 'text', placeholder: 'Name on the document' },
    { label: 'Status', key: 'status', type: 'select', options: STATUSES },
  ]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit Record' : 'Add New Record'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.25rem', padding: '4px 10px' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {fields.map(f => (
              <div key={f.key} className="form-group" style={f.key === 'transaction_type' ? { gridColumn: '1 / -1' } : {}}>
                <label className="form-label">{f.label}</label>
                {f.type === 'select' ? (
                  <select className="form-select" value={form[f.key]} onChange={e => set(f.key, e.target.value)}>
                    {f.options.map(o => <option key={o} value={o}>{o || '— Select —'}</option>)}
                  </select>
                ) : (
                  <input type={f.type} className="form-input" value={form[f.key]} onChange={e => set(f.key, e.target.value)} placeholder={f.placeholder} />
                )}
              </div>
            ))}
            {isEdit && (
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label" style={{ color: 'var(--red)' }}>Reason for Change *</label>
                <textarea className="form-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="Explain why this record is being modified…" />
              </div>
            )}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteModal({ record, onClose, onDeleted }) {
  const { user } = useAuth()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!reason.trim()) return toast('Reason is required', 'error')
    setDeleting(true)
    try {
      await supabase.from('records').delete().eq('id', record.id)
      await supabase.from('audit_logs').insert({
        user_id: user.id, user_email: user.email, action: 'DELETE',
        description: `Deleted record #${record.id} (${record.client_name} — ${record.transaction_type}). Reason: ${reason}`,
      })
      toast('Record deleted', 'success')
      onDeleted()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--red)' }}>Delete Record</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.25rem' }}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ marginBottom: 16, color: 'var(--gray-600)' }}>
            Are you sure you want to delete the record for <strong>{record.client_name}</strong> ({record.transaction_type})?
            This action cannot be undone.
          </p>
          <div className="form-group">
            <label className="form-label" style={{ color: 'var(--red)' }}>Reason for Deletion *</label>
            <textarea className="form-textarea" value={reason} onChange={e => setReason(e.target.value)} placeholder="State the reason for deleting this record…" />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete Record'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Records() {
  const toast = useToast()
  const [records, setRecords] = useState([])
  const [total, setTotal]     = useState(0)
  const [page, setPage]       = useState(1)
  const [loading, setLoading] = useState(true)

  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [typeFilter, setType]     = useState('')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  const [addModal, setAddModal]     = useState(false)
  const [editRecord, setEditRecord] = useState(null)
  const [delRecord, setDelRecord]   = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('records').select('*', { count: 'exact' })

    if (search) {
      q = q.or(`client_name.ilike.%${search}%,document_owner_name.ilike.%${search}%,mobile_number.ilike.%${search}%`)
    }
    if (statusFilter) q = q.eq('status', statusFilter)
    if (typeFilter)   q = q.eq('transaction_type', typeFilter)
    if (dateFrom)     q = q.gte('date', dateFrom + 'T00:00:00')
    if (dateTo)       q = q.lte('date', dateTo + 'T23:59:59')

    q = q.order('date', { ascending: false })
         .range((page-1)*PAGE_SIZE, page*PAGE_SIZE - 1)

    const { data, count, error } = await q
    if (error) toast(error.message, 'error')
    setRecords(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [search, statusFilter, typeFilter, dateFrom, dateTo, page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  async function handleExportPDF() {
    // Export current page
    exportRecordsPDF(records, 'Records Export', `Page ${page} — ${new Date().toLocaleDateString('en-PH')}`)
  }

  const statusColors = { Pending: 'badge-pending', Processing: 'badge-processing', Completed: 'badge-completed' }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Records Management</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>{total} total records</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-ghost" onClick={handleExportPDF}>📄 Export PDF</button>
          <button className="btn btn-primary" onClick={() => setAddModal(true)}>➕ Add Record</button>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input className="form-input" placeholder="Client, owner, mobile…" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Transaction Type</label>
            <select className="form-select" value={typeFilter} onChange={e => { setType(e.target.value); setPage(1) }}>
              <option value="">All Types</option>
              {TRANSACTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Date From</label>
            <input type="date" className="form-input" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
          </div>
          <div className="form-group">
            <label className="form-label">Date To</label>
            <input type="date" className="form-input" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
          </div>
          <div className="form-group" style={{ justifyContent: 'flex-end' }}>
            <label className="form-label" style={{ opacity: 0 }}>Reset</label>
            <button className="btn btn-ghost" onClick={() => { setSearch(''); setStatus(''); setType(''); setDateFrom(''); setDateTo(''); setPage(1) }}>
              ✕ Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date & Time</th>
                <th>Client Name</th>
                <th>Sex</th>
                <th>Address</th>
                <th>Mobile</th>
                <th>Transaction Type</th>
                <th>Document Owner</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} style={{ textAlign:'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
              ) : records.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign:'center', padding: 40, color: 'var(--gray-400)' }}>No records found</td></tr>
              ) : records.map((r, i) => (
                <tr key={r.id}>
                  <td style={{ color: 'var(--gray-400)', fontSize: '0.8rem' }}>{(page-1)*PAGE_SIZE + i + 1}</td>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                    {format(new Date(r.date), 'MMM d, yyyy')}<br />
                    <span style={{ color: 'var(--gray-400)' }}>{format(new Date(r.date), 'h:mm a')}</span>
                  </td>
                  <td style={{ fontWeight: 600 }}>{r.client_name}</td>
                  <td>{r.sex || '—'}</td>
                  <td style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.address || '—'}</td>
                  <td>{r.mobile_number || '—'}</td>
                  <td style={{ maxWidth: 200, fontSize: '0.8rem' }}>
                    <span style={{ background: 'var(--gray-100)', borderRadius: 4, padding: '2px 8px', whiteSpace: 'nowrap' }}>{r.transaction_type}</span>
                  </td>
                  <td>{r.document_owner_name || '—'}</td>
                  <td><span className={`badge ${statusColors[r.status]}`}>{r.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditRecord(r)} title="Edit">✏️</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDelRecord(r)} title="Delete" style={{ color: 'var(--red)' }}>🗑️</button>
                    </div>
                  </td>
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
              return (
                <button key={p} className={`page-btn${p === page ? ' active' : ''}`} onClick={() => setPage(p)}>{p}</button>
              )
            })}
            <button className="page-btn" onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}>›</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      {addModal && <RecordModal onClose={() => setAddModal(false)} onSaved={() => { setAddModal(false); load() }} />}
      {editRecord && <RecordModal record={editRecord} onClose={() => setEditRecord(null)} onSaved={() => { setEditRecord(null); load() }} />}
      {delRecord && <DeleteModal record={delRecord} onClose={() => setDelRecord(null)} onDeleted={() => { setDelRecord(null); load() }} />}
    </div>
  )
}
