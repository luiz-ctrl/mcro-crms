import { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import API from '../utils/api.js';
import './Records.css';

const TRANSACTION_TYPES = [
  "ON-TIME REGISTRATION OF BIRTH",
  "ON-TIME REGISTRATION OF MARRIAGE",
  "ON-TIME REGISTRATION OF DEATH",
  "DELAYED REGISTRATION OF BIRTH",
  "BRAP DELAYED REGISTRATION OF BIRTH",
  "OUT-OF-TOWN DELAYED REGISTRATION OF BIRTH",
  "RECEIVED OUT-OF-TOWN BIRTH REGISTRATION",
  "DELAYED REGISTRATION OF MARRIAGE",
  "DELAYED REGISTRATION OF DEATH",
  "CTC OF BIRTH",
  "CTC OF MARRIAGE",
  "CTC OF DEATH",
  "CRF 1A","CRF 2A","CRF 3A","CRF 1C","CRF 2C","CRF 3C",
  "MARRIAGE APPLICANT",
  "BREQS BIRTH - REQUEST","BREQS BIRTH - CLAIMED",
  "BREQS MARRIAGE - REQUEST","BREQS MARRIAGE - CLAIMED",
  "BREQS DEATH - REQUEST","BREQS DEATH - CLAIMED",
  "BREQS CENOMAR - REQUEST","BREQS CENOMAR - CLAIMED",
  "COURT DECREE","LEGITIMATION","R.A. 9048",
  "MIGRANT PETITION","R.A. 10172","SUPPLEMENTAL",
];

const BARANGAYS = [
  'Barangay 1','Barangay 2','Barangay 3','Barangay 4','Barangay 5',
  'Barangay 6','Barangay 7','Barangay 8','Barangay 9',
  'Bacong Ibaba','Bacong Ilaya','Lavides','Magsaysay','Malaya',
  'Nieva','Recto','San Ignacio Ibaba','San Ignacio Ilaya',
  'San Isidro Ibaba','San Isidro Ilaya','San Jose','San Nicolas',
  'San Vicente','Santa Maria Ibaba','Santa Maria Ilaya','Sumilang','Villarica',
  'Outside Municipality',
];

const STATUSES = ['Pending', 'Processing', 'Completed'];

function getNowDatetime() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function Badge({ status }) {
  const cls = {
    Pending:    'badge-pending',
    Processing: 'badge-processing',
    Completed:  'badge-completed',
  };
  return <span className={`badge ${cls[status] || ''}`}>{status}</span>;
}

function formatDateTime(val) {
  if (!val) return '—';
  try {
    return new Date(val).toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return val; }
}

/* ── Sort Icon ─────────────────────────────────────────── */
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ opacity: .3, marginLeft: 4 }}>
      <path d="M5 1L8 4H2L5 1Z" fill="currentColor"/>
      <path d="M5 9L2 6H8L5 9Z" fill="currentColor"/>
    </svg>
  );
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ marginLeft: 4, color: 'var(--navy)' }}>
      {sortDir === 'asc'
        ? <path d="M5 1L8 5H2L5 1Z" fill="currentColor"/>
        : <path d="M5 9L2 5H8L5 9Z" fill="currentColor"/>
      }
    </svg>
  );
}

/* ── View Modal ────────────────────────────────────────── */
function ViewModal({ record, onClose, onEdit }) {
  if (!record) return null;
  const Field = ({ label, value }) => (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gray-400)', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--gray-800)', fontWeight: value ? 500 : 400 }}>{value || <span style={{ color: 'var(--gray-300)' }}>—</span>}</div>
    </div>
  );
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620 }}>
        <div className="modal-header">
          <div>
            <h2 style={{ marginBottom: 2 }}>Record Details</h2>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', fontFamily: 'var(--font-body)' }}>ID #{record.id}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost btn-sm" onClick={() => { onClose(); onEdit(record); }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Edit
            </button>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
          </div>
        </div>
        <div className="modal-body">
          {/* Status banner */}
          <div style={{
            marginBottom: 20, padding: '10px 16px',
            background: record.status === 'Completed' ? 'var(--green-light)' : record.status === 'Processing' ? '#eff6ff' : '#fffbeb',
            borderRadius: 'var(--radius-sm)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Current Status</span>
            <Badge status={record.status} />
          </div>
          <div className="grid-2">
            <Field label="Date & Time" value={formatDateTime(record.date)} />
            <Field label="Type of Document" value={record.transaction_type} />
            <Field label="Client Name" value={record.client_name} />
            <Field label="Sex" value={record.sex} />
            <Field label="Address" value={record.address} />
            <Field label="Mobile Number" value={record.mobile_number} />
            <Field label="Document Owner" value={record.document_owner_name} />
            <Field label="Created At" value={formatDateTime(record.created_at)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Bulk Status Modal ─────────────────────────────────── */
function BulkStatusModal({ count, onClose, onConfirm, saving }) {
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Bulk Status Update</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--navy)' }}>
            Updating status for <strong>{count}</strong> selected record{count !== 1 ? 's' : ''}.
          </div>
          <div className="form-group">
            <label className="form-label">New Status *</label>
            <select
              className="form-select"
              value={newStatus}
              onChange={e => setNewStatus(e.target.value)}
            >
              <option value="">— Select new status —</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Reason for Change *</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Batch processing end of day, Documents released…"
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <span style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4, display: 'block' }}>
              Will be logged to audit trail for all {count} records
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => onConfirm(newStatus, reason)}
            disabled={saving || !newStatus || !reason.trim()}
          >
            {saving
              ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Updating…</>
              : `Update ${count} Record${count !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Add / Edit Modal ──────────────────────────────────── */
function RecordModal({ title, onClose, onSave, form, setForm, saving, isEditing }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 720 }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Date & Time of Transaction *</label>
              <input
                className="form-input"
                type="datetime-local"
                value={form.date || ''}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Status *</label>
              <select
                className="form-select"
                value={form.status || 'Pending'}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-2" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Name of Client / Visitor *</label>
              <input
                className="form-input"
                type="text"
                placeholder="Last Name, First Name, Middle Name"
                value={form.client_name || ''}
                onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Sex</label>
              <select
                className="form-select"
                value={form.sex || ''}
                onChange={e => setForm(f => ({ ...f, sex: e.target.value }))}
              >
                <option value="">— Select —</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Address</label>
            <select
              className="form-select"
              value={
                form.address === '' ? '' :
                form.address === 'Outside Municipality' ? 'Outside Municipality' :
                form._outsideMunicipality ? 'Outside Municipality' :
                (form.address || '')
              }
              onChange={e => {
                if (e.target.value === 'Outside Municipality') {
                  setForm(f => ({ ...f, address: 'Outside Municipality', _outsideMunicipality: true, _outsideText: '' }));
                } else {
                  setForm(f => ({ ...f, address: e.target.value, _outsideMunicipality: false, _outsideText: '' }));
                }
              }}
            >
              <option value="">— Select Barangay —</option>
              {BARANGAYS.filter(b => b !== 'Outside Municipality').map(b => {
                const val = `Brgy. ${b}, General Luna, Quezon`;
                return <option key={b} value={val}>{val}</option>;
              })}
              <option value="Outside Municipality">Outside Municipality</option>
            </select>

            {/* Outside municipality — custom address input */}
            {(form._outsideMunicipality || form.address === 'Outside Municipality') && (
              <div className="outside-mun-input-wrap">
                <div className="outside-mun-badge">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  Outside General Luna — please specify full address
                </div>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. Brgy. San Roque, Gumaca, Quezon"
                  value={form._outsideText || (form.address !== 'Outside Municipality' ? form.address : '')}
                  onChange={e => {
                    const val = e.target.value;
                    setForm(f => ({
                      ...f,
                      _outsideText: val,
                      address: val.trim() ? val : 'Outside Municipality',
                    }));
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>

          <div className="grid-2" style={{ marginTop: 14 }}>
            <div className="form-group">
              <label className="form-label">Client Mobile Number</label>
              <input
                className="form-input"
                type="text"
                placeholder="09XXXXXXXXX or NA"
                maxLength={11}
                value={form.mobile_number || ''}
                onChange={e => {
                  const val = e.target.value;
                  // Allow digits freely, or "NA" typed literally
                  if (/^NA$/i.test(val)) {
                    setForm(f => ({ ...f, mobile_number: 'NA' }));
                  } else {
                    setForm(f => ({ ...f, mobile_number: val.replace(/[^0-9NAna]/g, '').toUpperCase().replace(/^(N[^A]*)$/, 'N') }));
                  }
                }}
              />
              <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                Type NA if client did not provide a number
              </span>
            </div>
            <div className="form-group">
              <label className="form-label">Type of Document *</label>
              <select
                className="form-select"
                value={form.transaction_type || ''}
                onChange={e => setForm(f => ({ ...f, transaction_type: e.target.value }))}
              >
                <option value="">— Select Document Type —</option>
                <option value="NA">NA</option>
                {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Full Name of Document Owner</label>
              <label className="same-as-client-label">
                <input
                  type="checkbox"
                  checked={form.document_owner_name === form.client_name && !!form.client_name}
                  onChange={e => {
                    if (e.target.checked) {
                      setForm(f => ({ ...f, document_owner_name: f.client_name }));
                    } else {
                      setForm(f => ({ ...f, document_owner_name: '' }));
                    }
                  }}
                  style={{ accentColor: 'var(--navy)', cursor: 'pointer' }}
                />
                <span>Same as client name</span>
              </label>
            </div>
            <input
              className="form-input"
              type="text"
              placeholder="Last Name, First Name, Middle Name — or type NA"
              value={form.document_owner_name || ''}
              onChange={e => setForm(f => ({ ...f, document_owner_name: e.target.value }))}
            />
            <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
              The person named in the document being requested
            </span>
          </div>

          {isEditing && (
            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: '#fffbeb',
              borderRadius: 8,
              border: '1px solid #fde68a',
            }}>
              <label className="form-label" style={{ color: '#92400e' }}>⚠ Reason for Change *</label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Corrected client name spelling, Updated status…"
                value={form.reason || ''}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              />
              <span style={{ fontSize: 11, color: '#d97706', marginTop: 4, display: 'block' }}>
                Required for audit trail — will be logged with this change
              </span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={onSave}
            disabled={saving || !form.client_name || !form.transaction_type || (isEditing && !form.reason)}
          >
            {saving
              ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</>
              : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Delete Modal ──────────────────────────────────────── */
function DeleteModal({ record, onClose, onConfirm, deleting, reason, setReason }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <h2>Delete Record</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <p style={{ color: '#4b5563', lineHeight: 1.65, fontSize: 14 }}>
            Are you sure you want to delete the record for{' '}
            <strong style={{ color: '#0f2044' }}>{record.client_name}</strong>?
            This cannot be undone and will be logged in the audit trail.
          </p>
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#fef2f2',
            borderRadius: 8,
            border: '1px solid #fca5a5',
          }}>
            <label className="form-label" style={{ color: '#dc2626' }}>⚠ Reason for Deletion *</label>
            <input
              className="form-input"
              type="text"
              placeholder="e.g. Duplicate entry, Data entry error…"
              value={reason}
              onChange={e => setReason(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={deleting || !reason.trim()}>
            {deleting
              ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Deleting…</>
              : 'Delete Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Component ────────────────────────────────────── */
export default function Records() {
  const [records, setRecords]           = useState([]);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType]     = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [deleteRecord, setDeleteRecord] = useState(null);
  const [viewRecord, setViewRecord]     = useState(null);
  const [form, setForm]                 = useState({});
  const [saving, setSaving]             = useState(false);
  const [deleting, setDeleting]         = useState(false);
  const [deleteReason, setDeleteReason] = useState('');

  // Bulk selection
  const [selected, setSelected]         = useState(new Set());
  const [bulkModal, setBulkModal]       = useState(false);
  const [bulkSaving, setBulkSaving]     = useState(false);

  // Sort
  const [sortCol, setSortCol]           = useState('date');
  const [sortDir, setSortDir]           = useState('desc');

  const editIdRef = useRef(null);
  const LIMIT = 15;

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sort: sortCol, dir: sortDir };
      if (search)       params.search            = search;
      if (filterStatus) params.status            = filterStatus;
      if (filterType)   params.transaction_type  = filterType;
      if (dateFrom)     params.date_from         = dateFrom;
      if (dateTo)       params.date_to           = dateTo;
      const { data } = await API.get('/records', { params });
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setSelected(new Set()); // clear selection on fetch
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page, search, filterStatus, filterType, dateFrom, dateTo, sortCol, sortDir]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  /* Sort handler */
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
    setPage(1);
  };

  /* Selection handlers */
  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map(r => r.id)));
  };

  /* Bulk update */
  const handleBulkUpdate = async (newStatus, reason) => {
    setBulkSaving(true);
    try {
      await API.patch('/records/bulk-status', {
        ids: Array.from(selected),
        status: newStatus,
        reason,
      });
      setBulkModal(false);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || 'Error updating records');
    } finally { setBulkSaving(false); }
  };

  const openAdd = () => {
    editIdRef.current = null;
    setForm({
      date: getNowDatetime(),
      client_name: '', sex: '', address: '',
      mobile_number: '', transaction_type: '',
      document_owner_name: '', status: 'Pending',
    });
    setModalOpen(true);
  };

  const openEdit = (r) => {
    editIdRef.current = r.id;
    let d = r.date || '';
    if (d.length > 16) d = d.slice(0, 16);
    else if (d.length === 10) d = d + 'T00:00';

    const isGeneralLuna = !r.address || r.address === 'Outside Municipality' ||
      BARANGAYS.some(b => r.address === `Brgy. ${b}, General Luna, Quezon`);
    const isOutside = r.address && !isGeneralLuna;

    setForm({
      date: d,
      client_name: r.client_name || '',
      sex: r.sex || '',
      address: r.address || '',
      mobile_number: r.mobile_number || '',
      _outsideMunicipality: isOutside,
      _outsideText: isOutside ? r.address : '',

      transaction_type: r.transaction_type || '',
      document_owner_name: r.document_owner_name || '',
      status: r.status || 'Pending',
    });
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); editIdRef.current = null; };

  const handleSave = async () => {
    const id = editIdRef.current;
    setSaving(true);
    // Strip internal UI-only fields before sending to API
    const { _outsideMunicipality, _outsideText, ...payload } = form;
    try {
      if (id) await API.put(`/records/${id}`, payload);
      else     await API.post('/records', payload);
      setModalOpen(false);
      editIdRef.current = null;
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error saving record');
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await API.delete(`/records/${deleteRecord.id}`, { data: { reason: deleteReason } });
      setDeleteRecord(null);
      setDeleteReason('');
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.error || err.message || 'Error deleting record');
    } finally { setDeleting(false); }
  };

  /* ── Export PDF ──────────────────────────────────────── */
  const exportPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(14);
    doc.text('MCRO General Luna, Quezon — Civil Registry Records', 14, 14);
    doc.setFontSize(9);
    doc.text(`Generated: ${new Date().toLocaleString('en-PH')}`, 14, 21);
    autoTable(doc, {
      startY: 26,
      head: [['Date & Time', 'Client Name', 'Sex', 'Address', 'Mobile', 'Type of Document', 'Document Owner', 'Status']],
      body: records.map(r => [
        formatDateTime(r.date), r.client_name, r.sex || '', r.address || '',
        r.mobile_number || '', r.transaction_type, r.document_owner_name || '', r.status,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [15, 32, 68], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [249, 250, 251] },
    });
    doc.save(`MCRO-Records-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  /* ── Export CSV ──────────────────────────────────────── */
  const exportCSV = () => {
    const headers = ['Date & Time', 'Client Name', 'Sex', 'Address', 'Mobile', 'Type of Document', 'Document Owner', 'Status'];
    const rows = records.map(r => [
      formatDateTime(r.date),
      r.client_name,
      r.sex || '',
      r.address || '',
      r.mobile_number || '',
      r.transaction_type,
      r.document_owner_name || '',
      r.status,
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MCRO-Records-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Export Excel (XLSX via SheetJS if available, else CSV fallback) ── */
  const exportExcel = async () => {
    const rows = records.map(r => ({
      'Date & Time':     formatDateTime(r.date),
      'Client Name':     r.client_name,
      'Sex':             r.sex || '',
      'Address':         r.address || '',
      'Mobile':          r.mobile_number || '',
      'Type of Document': r.transaction_type,
      'Document Owner':  r.document_owner_name || '',
      'Status':          r.status,
    }));
    try {
      const XLSX = await import('xlsx');
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Records');
      // Style header row width
      ws['!cols'] = [20, 28, 8, 36, 14, 36, 28, 12].map(w => ({ wch: w }));
      XLSX.writeFile(wb, `MCRO-Records-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch {
      // Fallback to CSV if xlsx not installed
      exportCSV();
    }
  };

  const totalPages = Math.ceil(total / LIMIT);
  const isEditing  = editIdRef.current !== null;
  const hasFilters = search || filterStatus || filterType || dateFrom || dateTo;

  /* Sortable column header helper */
  const Th = ({ col, label, style }) => (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', ...style }}
      onClick={() => handleSort(col)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {label}
        <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Records</h1>
          <p className="page-subtitle">{total.toLocaleString()} total civil registry transactions</p>
        </div>
        <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
          {/* Bulk action bar */}
          {selected.size > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setBulkModal(true)}
              style={{ borderColor: 'var(--blue)', color: 'var(--blue)', background: '#eff6ff' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              Update {selected.size} Selected
            </button>
          )}
          {/* Export dropdown */}
          <div style={{ position: 'relative', display: 'inline-block' }} className="export-dropdown-wrap">
            <button
              className="btn btn-ghost"
              onClick={e => {
                const menu = e.currentTarget.nextSibling;
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Export
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <div style={{
              display: 'none', position: 'absolute', right: 0, top: '110%', zIndex: 50,
              background: 'var(--white)', border: '1px solid var(--gray-200)',
              borderRadius: 'var(--radius-sm)', boxShadow: 'var(--shadow-md)',
              minWidth: 160, overflow: 'hidden',
            }}
              onMouseLeave={e => { e.currentTarget.style.display = 'none'; }}
            >
              {[
                { label: 'Export as PDF',  icon: '📄', fn: exportPDF },
                { label: 'Export as CSV',  icon: '📊', fn: exportCSV },
                { label: 'Export as Excel', icon: '🟢', fn: exportExcel },
              ].map(({ label, icon, fn }) => (
                <button
                  key={label}
                  onClick={() => { fn(); document.querySelectorAll('.export-dropdown-wrap div').forEach(d => d.style.display = 'none'); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    width: '100%', padding: '10px 16px',
                    background: 'none', border: 'none',
                    fontSize: 13, color: 'var(--gray-700)', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <span>{icon}</span> {label}
                </button>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Record
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card records-filters mb-4">
        <input
          className="form-input"
          type="text"
          placeholder="Search client name, document owner, mobile…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 2, minWidth: 200 }}
        />
        <select
          className="form-select"
          value={filterStatus}
          onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 130 }}
        >
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="form-select"
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setPage(1); }}
          style={{ flex: 2, minWidth: 180 }}
        >
          <option value="">All Document Types</option>
          {TRANSACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          className="form-input"
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 130 }}
          title="Date from"
        />
        <input
          className="form-input"
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1); }}
          style={{ flex: 1, minWidth: 130 }}
          title="Date to"
        />
        {hasFilters && (
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setDateFrom(''); setDateTo(''); setPage(1); }}
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
          ) : records.length === 0 ? (
            <div className="records-empty">
              No records found.{!hasFilters && ' Click "Add Record" to get started.'}
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={selected.size === records.length && records.length > 0}
                      ref={el => { if (el) el.indeterminate = selected.size > 0 && selected.size < records.length; }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--navy)' }}
                    />
                  </th>
                  <th style={{ width: 36 }}>#</th>
                  <Th col="date"             label="Date & Time" />
                  <Th col="client_name"      label="Client Name" />
                  <th>Sex</th>
                  <th>Address</th>
                  <th>Mobile</th>
                  <Th col="transaction_type" label="Type of Document" />
                  <th>Document Owner</th>
                  <Th col="status"           label="Status" />
                  <th style={{ width: 90 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{ background: selected.has(r.id) ? '#eff6ff' : undefined }}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        style={{ cursor: 'pointer', accentColor: 'var(--navy)' }}
                      />
                    </td>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 12, color: '#6b7280' }}>{formatDateTime(r.date)}</td>
                    <td>
                      <span
                        style={{ fontWeight: 600, color: '#0f2044', fontSize: 13, cursor: 'pointer', textDecoration: 'underline dotted' }}
                        onClick={() => setViewRecord(r)}
                        title="Click to view details"
                      >
                        {r.client_name}
                      </span>
                    </td>
                    <td style={{ color: '#6b7280' }}>{r.sex || '—'}</td>
                    <td
                      style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#6b7280' }}
                      title={r.address}
                    >
                      {r.address || '—'}
                    </td>
                    <td style={{ color: '#6b7280' }}>
                      {r.mobile_number === 'NA'
                        ? <span style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', background: '#f3f4f6', borderRadius: 4, padding: '2px 7px' }}>NA</span>
                        : r.mobile_number || '—'}
                    </td>
                    <td><span className="tx-type-tag">{r.transaction_type}</span></td>
                    <td style={{ color: '#6b7280' }}>{r.document_owner_name || '—'}</td>
                    <td><Badge status={r.status} /></td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="View details"
                          onClick={() => setViewRecord(r)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                            <circle cx="12" cy="12" r="3"/>
                          </svg>
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          title="Edit"
                          onClick={() => openEdit(r)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="btn btn-icon btn-sm"
                          style={{ color: '#dc2626', background: '#fef2f2', border: 'none' }}
                          title="Delete"
                          onClick={() => setDeleteRecord(r)}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14H6L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
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
              {selected.size > 0 && <span style={{ marginLeft: 10, color: 'var(--blue)', fontWeight: 600 }}>• {selected.size} selected</span>}
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

      {/* Modals */}
      {viewRecord && (
        <ViewModal
          record={viewRecord}
          onClose={() => setViewRecord(null)}
          onEdit={openEdit}
        />
      )}

      {modalOpen && (
        <RecordModal
          title={isEditing ? 'Edit Record' : 'Add New Record'}
          form={form}
          setForm={setForm}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving}
          isEditing={isEditing}
        />
      )}

      {deleteRecord && (
        <DeleteModal
          record={deleteRecord}
          onClose={() => { setDeleteRecord(null); setDeleteReason(''); }}
          onConfirm={handleDelete}
          deleting={deleting}
          reason={deleteReason}
          setReason={setDeleteReason}
        />
      )}

      {bulkModal && (
        <BulkStatusModal
          count={selected.size}
          onClose={() => setBulkModal(false)}
          onConfirm={handleBulkUpdate}
          saving={bulkSaving}
        />
      )}
    </div>
  );
}
