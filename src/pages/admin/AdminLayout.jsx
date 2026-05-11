import React, { useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const NAV_ITEMS = [
  { to: '/app/dashboard',  icon: '⊞', label: 'Dashboard' },
  { to: '/app/records',    icon: '📋', label: 'Records' },
  { to: '/app/analytics',  icon: '📊', label: 'Analytics' },
  { to: '/app/queue',      icon: '🎫', label: 'Queue' },
  { to: '/app/reports',    icon: '📄', label: 'Reports' },
  { to: '/app/audit',      icon: '🔍', label: 'Audit Logs' },
]

export default function AdminLayout() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/')
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside style={{
        width: collapsed ? 68 : 240,
        background: 'var(--navy-dark)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'width .25s',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{ padding: collapsed ? '24px 16px' : '28px 24px', borderBottom: '1px solid rgba(255,255,255,.08)', display: 'flex', alignItems: 'center', gap: 12, minHeight: 80 }}>
          <div style={{ width: 36, height: 36, background: 'var(--gold)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1rem', color: 'var(--navy)', flexShrink: 0 }}>M</div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, color: 'var(--white)', fontSize: '1rem', lineHeight: 1.1 }}>MCRO</div>
              <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.65rem', letterSpacing: '.06em' }}>CRMS v2.0</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '16px 0', overflowY: 'auto' }}>
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: collapsed ? '13px 16px' : '13px 24px',
                color: isActive ? 'var(--gold)' : 'rgba(255,255,255,.55)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                background: isActive ? 'rgba(201,151,58,.1)' : 'transparent',
                transition: 'all .15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
              onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.color = 'rgba(255,255,255,.85)'; e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}}
              onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.color = 'rgba(255,255,255,.55)'; e.currentTarget.style.background = 'transparent' }}}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && item.label}
            </NavLink>
          ))}
          {profile?.role === 'admin' && (
            <NavLink
              to="/app/users"
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: collapsed ? '13px 16px' : '13px 24px',
                color: isActive ? 'var(--gold)' : 'rgba(255,255,255,.55)',
                textDecoration: 'none',
                fontSize: '0.9rem',
                fontWeight: 500,
                borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
                background: isActive ? 'rgba(201,151,58,.1)' : 'transparent',
                transition: 'all .15s',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              })}
            >
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>👥</span>
              {!collapsed && 'Users'}
            </NavLink>
          )}
        </nav>

        {/* User section */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: collapsed ? '16px 12px' : '16px 20px' }}>
          {!collapsed && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
                  {(profile?.email || user?.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ color: 'var(--white)', fontSize: '0.8rem', fontWeight: 600, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {profile?.email || user?.email}
                  </div>
                  <span className={`badge badge-${profile?.role || 'staff'}`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                    {profile?.role || 'staff'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="btn btn-ghost btn-sm"
              style={{ color: 'rgba(255,255,255,.4)', fontSize: '1rem', padding: '6px 10px' }}
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? '›' : '‹'}
            </button>
            {!collapsed && (
              <button onClick={handleSignOut} className="btn btn-ghost btn-sm" style={{ color: 'rgba(255,255,255,.4)', flex: 1 }}>
                Sign Out
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', minHeight: '100vh' }}>
        {/* Top bar */}
        <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--gray-200)', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--gray-400)' }}>
            Municipal Civil Registrar's Office — General Luna, Quezon
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <a href="/queue-display" target="_blank" style={{ fontSize: '0.8rem', color: 'var(--navy)', fontWeight: 600, border: '1px solid var(--gray-200)', borderRadius: 6, padding: '4px 12px' }}>
              Queue Display ↗
            </a>
            <a href="/" target="_blank" style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>
              Public Site ↗
            </a>
          </div>
        </div>

        {/* Page content */}
        <div style={{ padding: '32px' }}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
