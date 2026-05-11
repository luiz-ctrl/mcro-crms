import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { format } from 'date-fns'

function UserModal({ editUser, onClose, onSaved }) {
  const { user: currentUser } = useAuth()
  const toast   = useToast()
  const isEdit  = !!editUser
  const [email, setEmail]       = useState(editUser?.email || '')
  const [password, setPassword] = useState('')
  const [role, setRole]         = useState(editUser?.role || 'staff')
  const [saving, setSaving]     = useState(false)

  async function handleSave() {
    if (!email.trim()) return toast('Email is required', 'error')
    if (!isEdit && !password.trim()) return toast('Password is required', 'error')
    setSaving(true)

    try {
      if (isEdit) {
        // Update profile
        const { error } = await supabase.from('profiles').update({ email, role }).eq('id', editUser.id)
        if (error) throw error
        // Update password if provided
        if (password.trim()) {
          const { error: pwErr } = await supabase.auth.admin.updateUserById(editUser.id, { password })
          if (pwErr) throw pwErr
        }
        await supabase.from('audit_logs').insert({
          user_id: currentUser.id, user_email: currentUser.email, action: 'UPDATE',
          description: `Updated user ${email} (role: ${role})`,
        })
        toast('User updated', 'success')
      } else {
        // Create new user via Supabase Auth
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { role } },
        })
        if (error) throw error
        // Ensure profile is created
        if (data.user) {
          await supabase.from('profiles').upsert({ id: data.user.id, email, role })
        }
        await supabase.from('audit_logs').insert({
          user_id: currentUser.id, user_email: currentUser.email, action: 'CREATE',
          description: `Created user ${email} with role ${role}`,
        })
        toast('User created — they will receive a confirmation email', 'success')
      }
      onSaved()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{isEdit ? 'Edit User' : 'Add User'}</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.25rem' }}>×</button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="staff@mcro-generaluna.gov.ph" />
            </div>
            <div className="form-group">
              <label className="form-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Minimum 6 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteUserModal({ target, onClose, onDeleted }) {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      await supabase.from('profiles').delete().eq('id', target.id)
      await supabase.from('audit_logs').insert({
        user_id: currentUser.id, user_email: currentUser.email, action: 'DELETE',
        description: `Deleted user ${target.email}`,
      })
      toast('User deleted', 'success')
      onDeleted()
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title" style={{ color: 'var(--red)' }}>Delete User</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ fontSize: '1.25rem' }}>×</button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--gray-600)' }}>
            Are you sure you want to delete <strong>{target.email}</strong>? This cannot be undone.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const { user: currentUser } = useAuth()
  const toast = useToast()
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [addModal, setAddModal]   = useState(false)
  const [editUser, setEditUser]   = useState(null)
  const [delUser, setDelUser]     = useState(null)

  async function loadUsers() {
    setLoading(true)
    const { data, error } = await supabase.from('profiles').select('*').order('created_at')
    if (error) toast(error.message, 'error')
    setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => { loadUsers() }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>User Management</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>{users.length} staff accounts</p>
        </div>
        <button className="btn btn-primary" onClick={() => setAddModal(true)}>➕ Add User</button>
      </div>

      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign:'center', padding:40 }}><div className="spinner" style={{ margin:'0 auto' }} /></td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem' }}>
                      {u.email[0].toUpperCase()}
                    </div>
                  </td>
                  <td style={{ fontWeight: 500 }}>
                    {u.email}
                    {u.id === currentUser?.id && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--gray-400)' }}>(you)</span>}
                  </td>
                  <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
                    {u.created_at ? format(new Date(u.created_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditUser(u)}>✏️ Edit</button>
                      {u.id !== currentUser?.id && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setDelUser(u)} style={{ color: 'var(--red)' }}>🗑️ Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {addModal && <UserModal onClose={() => setAddModal(false)} onSaved={() => { setAddModal(false); loadUsers() }} />}
      {editUser && <UserModal editUser={editUser} onClose={() => setEditUser(null)} onSaved={() => { setEditUser(null); loadUsers() }} />}
      {delUser && <DeleteUserModal target={delUser} onClose={() => setDelUser(null)} onDeleted={() => { setDelUser(null); loadUsers() }} />}
    </div>
  )
}
