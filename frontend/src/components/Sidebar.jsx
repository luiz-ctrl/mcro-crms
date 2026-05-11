import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import './Sidebar.css';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const NAV = [
    { to: '/app/dashboard', label: 'Dashboard', icon: '⬡' },
    { to: '/app/records',   label: 'Records',   icon: '◧' },
    { to: '/app/analytics', label: 'Analytics', icon: '◈' },
    { to: '/app/queue',     label: 'Queue',     icon: '◫' },
    { to: '/app/audit',     label: 'Audit Logs',icon: '◩' },
    { to: '/app/reports',   label: 'Reports',   icon: '◪' },
    ...(user?.role === 'admin' ? [{ to: '/app/users',    label: 'Users',    icon: '◭' }] : []),
    ...(user?.role === 'admin' ? [{ to: '/app/settings', label: 'Settings', icon: '◎' }] : []),
  ];

  const handleLogout = () => { logout(); window.location.href = 'https://mcro-crms.vercel.app/login?key=login'; };

  return (
    <aside className="sidebar">

      {/* Header — logo always visible, title slides in on hover */}
      <div className="sidebar-header">
        <div className="sidebar-seal">
          <div className="seal-ring" style={{ overflow: 'hidden', background: 'white', padding: 2 }}>
            <img
              src="/logo.png"
              alt="MCRO Logo"
              style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%' }}
            />
          </div>
        </div>
        <div className="sidebar-title">
          <span className="sidebar-title-main">MCRO</span>
          <span className="sidebar-title-sub">General Luna, Quezon</span>
        </div>
      </div>

      {/* Section label — slides in on hover */}
      <div className="sidebar-label">CIVIL REGISTRY</div>

      {/* Nav — icons always visible, labels slide in on hover */}
      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            data-label={label}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon">{icon}</span>
            <span className="sidebar-link-label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — avatar always visible, info + logout slide in on hover */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" title={user?.username}>
            {user?.username?.[0]?.toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-email">{user?.username}</span>
            <span className="sidebar-user-role">{user?.role?.toUpperCase()}</span>
          </div>
        </div>
        <button className="sidebar-logout" onClick={handleLogout} title="Logout">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>

    </aside>
  );
}
