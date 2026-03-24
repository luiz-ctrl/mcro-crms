export default function Header({ title, subtitle }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header style={{
      height: 'var(--header-height)',
      background: 'var(--white)',
      borderBottom: '1px solid var(--gray-200)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <div>
        <h2 style={{
          fontSize: '1rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          lineHeight: 1.2,
        }}>{title}</h2>
        {subtitle && (
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{subtitle}</p>
        )}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <div style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          textAlign: 'right',
        }}>
          <div style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>📅 {dateStr}</div>
        </div>
        <div style={{
          padding: '5px 12px',
          background: 'var(--gold-pale)',
          color: 'var(--warning)',
          borderRadius: 99,
          fontSize: '0.72rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
        }}>
          🟢 Online
        </div>
      </div>
    </header>
  );
}
