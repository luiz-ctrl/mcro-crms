import { NavLink, useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const navItems = [
  { to: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { to: '/visitors', icon: '👥', label: 'Clients' },
  { to: '/analytics', icon: '📊', label: 'Analytics' },
  { to: '/audit-logs', icon: '📋', label: 'Audit Logs' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('crms_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('crms_token');
    localStorage.removeItem('crms_user');
    navigate('/login');
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      background: 'var(--navy)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
      }}>
        <img
          src={logo}
          alt="MCRO General Luna Quezon"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            objectFit: 'cover',
            background: '#fff',
            padding: 2,
            boxShadow: '0 0 0 2px var(--gold)',
          }}
        />
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: '0.95rem',
            color: 'var(--white)',
            lineHeight: 1.2,
            fontWeight: 700,
          }}>MCRO</div>
          <div style={{
            fontSize: '0.68rem',
            color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.4,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}>General Luna, Quezon</div>
        </div>
        <div style={{
          padding: '6px 10px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 8,
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.55)',
          lineHeight: 1.4,
          textAlign: 'center',
          width: '100%',
        }}>
          Civil Registry Management System
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '0 12px',
          marginBottom: '8px',
        }}>
          Main Menu
        </div>
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '10px 14px',
              borderRadius: '8px',
              marginBottom: '2px',
              textDecoration: 'none',
              color: isActive ? 'var(--white)' : 'rgba(255,255,255,0.55)',
              background: isActive ? 'rgba(201,162,39,0.18)' : 'transparent',
              borderLeft: isActive ? '3px solid var(--gold)' : '3px solid transparent',
              fontSize: '0.9rem',
              fontWeight: isActive ? 500 : 400,
              transition: 'all 0.15s',
            })}
          >
            <span style={{ fontSize: '1rem', lineHeight: 1 }}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 12px',
          borderRadius: 8,
          marginBottom: '8px',
          background: 'rgba(255,255,255,0.05)',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: 'var(--gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--white)', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
          }}>
            {(user.full_name || user.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{
              fontSize: '0.82rem', color: 'var(--white)', fontWeight: 500,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.full_name || 'Staff'}
            </div>
            <div style={{
              fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {user.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            width: '100%', padding: '8px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8, color: 'rgba(255,255,255,0.55)',
            fontSize: '0.82rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '8px',
            transition: 'all 0.15s', fontFamily: 'var(--font-body)',
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
          }}
        >
          <span>⇥</span> Sign Out
        </button>
      </div>
    </aside>
  );
}
