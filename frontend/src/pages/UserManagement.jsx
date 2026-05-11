import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api.js';

const ROLE_META = {
  admin: { bg: '#eff6ff', color: '#1d4ed8', label: 'Admin' },
  staff: { bg: '#f3f4f6', color: '#4b5563', label: 'Staff' },
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || ROLE_META.staff;
  return <span className="badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>;
}

function Avatar({ username }) {
  const initials = username ? username.slice(0, 2).toUpperCase() : '??';
  return (
    <div style={{
      width: 32, height: 32,
      borderRadius: '50%',
      background: '#eff6ff',
      color: '#1d4ed8',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 12, fontWeight: 700,
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState({ username: '', password: '', role: 'staff' });
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [editId, setEditId]     = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/users');
      setUsers(data.users || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const openAdd = () => {
    setEditId(null);
    setForm({ username: '', password: '', role: 'staff' });
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditId(u.id);
    setForm({ username: u.username, password: '', role: u.role });
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editId) {
        await API.put(`/users/${editId}`, form);
      } else {
        await API.post('/users', form);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving user');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this user?')) return;
    setDeleting(id);
    try {
      await API.delete(`/users/${id}`);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Error deleting user');
    } finally { setDeleting(null); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <p className="page-subtitle">Manage staff accounts and system access</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add User
        </button>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div className="loader" style={{ margin: '0 auto' }} />
            </div>
          ) : users.length === 0 ? (
            <div className="records-empty">No users yet. Click "Add User" to get started.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 44 }}>#</th>
                  <th>Username</th>
                  <th style={{ width: 100 }}>Role</th>
                  <th>Created</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: '#9ca3af', fontSize: 12 }}>{i + 1}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar username={u.username} />
                        <span style={{ fontWeight: 600, color: '#0f2044', fontSize: 13 }}>{u.username}</span>
                      </div>
                    </td>
                    <td><RoleBadge role={u.role} /></td>
                    <td style={{ fontSize: 12, color: '#6b7280' }}>
                      {new Date(u.created_at).toLocaleDateString('en-PH', {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => openEdit(u)}
                          title="Edit"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button
                          className="btn btn-icon btn-sm"
                          style={{ color: '#dc2626', background: '#fef2f2', border: 'none' }}
                          onClick={() => handleDelete(u.id)}
                          disabled={deleting === u.id}
                          title="Delete"
                        >
                          {deleting === u.id
                            ? <div className="loader" style={{ width: 12, height: 12, borderWidth: 2 }} />
                            : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6l-1 14H6L5 6"/>
                                <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h2>{editId ? 'Edit User' : 'Add New User'}</h2>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Username *</label>
                <input
                  className="form-input"
                  type="text"
                  placeholder="e.g. jdelacruz"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  {editId ? 'New Password (leave blank to keep current)' : 'Password *'}
                </label>
                <input
                  className="form-input"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Role *</label>
                <select
                  className="form-select"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || !form.username || (!editId && !form.password)}
              >
                {saving
                  ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</>
                  : 'Save User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
