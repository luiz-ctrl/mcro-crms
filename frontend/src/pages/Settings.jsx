import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api.js';

/* ── Permission definitions ─────────────────────────────── */
const PERMISSION_GROUPS = [
  {
    group: 'Records',
    icon: '📋',
    permissions: [
      { key: 'records_view',   label: 'View Records',   desc: 'Can browse and search all civil registry records' },
      { key: 'records_create', label: 'Add Records',    desc: 'Can log new civil registry transactions' },
      { key: 'records_edit',   label: 'Edit Records',   desc: 'Can update existing record details and status' },
      { key: 'records_delete', label: 'Delete Records', desc: 'Can permanently remove records (high risk)' },
      { key: 'records_export', label: 'Export Records', desc: 'Can download records as CSV or Excel' },
    ],
  },
  {
    group: 'Queue',
    icon: '🎫',
    permissions: [
      { key: 'queue_view',   label: 'View Queue',    desc: 'Can see the current queue and waiting list' },
      { key: 'queue_issue',  label: 'Issue Tickets', desc: 'Can issue new queue tickets to clients' },
      { key: 'queue_call',   label: 'Call Numbers',  desc: 'Can call next or specific queue numbers' },
      { key: 'queue_reset',  label: 'Reset Queue',   desc: 'Can clear all of today\'s queue entries' },
    ],
  },
  {
    group: 'Analytics & Reports',
    icon: '📊',
    permissions: [
      { key: 'analytics_view', label: 'View Analytics', desc: 'Can access charts, trends, and distribution data' },
      { key: 'reports_view',   label: 'View Reports',   desc: 'Can access the reports page' },
      { key: 'reports_generate', label: 'Generate Reports', desc: 'Can generate and download daily/weekly reports' },
    ],
  },
  {
    group: 'Administration',
    icon: '⚙️',
    permissions: [
      { key: 'audit_view',    label: 'View Audit Logs', desc: 'Can see system activity and audit trail' },
      { key: 'users_manage',  label: 'Manage Users',    desc: 'Can add, edit, and delete staff accounts' },
      { key: 'settings_view', label: 'View Settings',   desc: 'Can access the settings panel' },
      { key: 'settings_edit', label: 'Edit Settings',   desc: 'Can change office settings and configurations' },
    ],
  },
];

const ALL_PERMISSION_KEYS = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

/* ── Default permission sets ────────────────────────────── */
const ADMIN_DEFAULTS = Object.fromEntries(ALL_PERMISSION_KEYS.map(k => [k, true]));
const STAFF_DEFAULTS = {
  records_view: true, records_create: true, records_edit: true,
  records_delete: false, records_export: false,
  queue_view: true, queue_issue: true, queue_call: true, queue_reset: false,
  analytics_view: true, reports_view: true, reports_generate: false,
  audit_view: false, users_manage: false, settings_view: false, settings_edit: false,
};

/* ── Toggle switch ──────────────────────────────────────── */
function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: checked ? 'var(--green)' : 'var(--gray-200)',
        border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
        position: 'relative', transition: 'background .2s', flexShrink: 0,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: 'absolute', top: 3,
        left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', transition: 'left .2s',
        boxShadow: '0 1px 3px rgba(0,0,0,.2)',
        display: 'block',
      }} />
    </button>
  );
}

/* ── Section header ─────────────────────────────────────── */
function SectionHeader({ icon, title, subtitle }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>{title}</h3>
      </div>
      {subtitle && <p style={{ fontSize: 12, color: 'var(--gray-400)', margin: 0, marginLeft: 28 }}>{subtitle}</p>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   TAB 1 — Role-Based Permissions
════════════════════════════════════════════════════════ */
function PermissionsTab() {
  const [staffPerms, setStaffPerms]   = useState(STAFF_DEFAULTS);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);

  useEffect(() => {
    API.get('/settings/permissions')
      .then(r => { if (r.data.staff) setStaffPerms(r.data.staff); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => setStaffPerms(p => ({ ...p, [key]: !p[key] }));

  const setGroupAll = (group, value) => {
    const keys = group.permissions.map(p => p.key);
    setStaffPerms(p => ({ ...p, ...Object.fromEntries(keys.map(k => [k, value])) }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.post('/settings/permissions', { staff: staffPerms });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving permissions');
    } finally { setSaving(false); }
  };

  if (loading) return (
    <div style={{ padding: 48, textAlign: 'center' }}>
      <div className="loader" style={{ margin: '0 auto' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <p style={{ fontSize: 13, color: 'var(--gray-500)', margin: 0, maxWidth: 560 }}>
            Configure what <strong>Staff</strong> accounts can do. Admin accounts always have full access and cannot be restricted.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ flexShrink: 0 }}
        >
          {saving
            ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', borderTopColor: '#fff' }} /> Saving…</>
            : saved
            ? <>✓ Saved</>
            : 'Save Permissions'}
        </button>
      </div>

      {/* Role comparison header */}
      <div className="card" style={{ marginBottom: 20, padding: '14px 20px', background: '#f8faff', border: '1px solid #dbeafe' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge" style={{ background: '#eff6ff', color: '#1d4ed8' }}>Admin</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Full access to all features — cannot be restricted</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="badge" style={{ background: '#f3f4f6', color: '#4b5563' }}>Staff</span>
            <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Configurable permissions below</span>
          </div>
        </div>
      </div>

      {PERMISSION_GROUPS.map(group => {
        const groupKeys = group.permissions.map(p => p.key);
        const allOn  = groupKeys.every(k => staffPerms[k]);
        const allOff = groupKeys.every(k => !staffPerms[k]);

        return (
          <div key={group.group} className="card" style={{ marginBottom: 16, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{group.icon}</span>
                <h4 style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                  {group.group}
                </h4>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setGroupAll(group, true)}
                  style={{ fontSize: 11, color: 'var(--green)' }}
                  disabled={allOn}
                >All On</button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => setGroupAll(group, false)}
                  style={{ fontSize: 11, color: 'var(--red)' }}
                  disabled={allOff}
                >All Off</button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {group.permissions.map((perm, i) => (
                <div key={perm.key} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 0',
                  borderTop: i > 0 ? '1px solid var(--gray-100)' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-800)', marginBottom: 2 }}>{perm.label}</div>
                    <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>{perm.desc}</div>
                  </div>
                  {/* Admin always on */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginLeft: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 70 }}>
                      <Toggle checked={true} disabled={true} onChange={() => {}} />
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Admin</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 60 }}>
                      <Toggle checked={!!staffPerms[perm.key]} onChange={() => toggle(perm.key)} />
                      <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>Staff</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Permissions'}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN — Settings Page
════════════════════════════════════════════════════════ */
const TABS = [
  { key: 'permissions', label: 'Role Permissions', icon: '🔐' },
];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('permissions');

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">System configuration and permissions</p>
        </div>
        <div className="date-badge">
          {new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Tab row */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--gray-100)', paddingBottom: 0 }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px',
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--navy)' : 'var(--gray-500)',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--navy)' : '2px solid transparent',
              marginBottom: -2,
              cursor: 'pointer',
              transition: 'color .15s',
              whiteSpace: 'nowrap',
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'permissions' && <PermissionsTab />}
    </div>
  );
}
