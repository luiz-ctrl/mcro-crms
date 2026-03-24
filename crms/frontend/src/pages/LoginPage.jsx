import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/api';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await login(email, password);
      localStorage.setItem('crms_token', res.data.token);
      localStorage.setItem('crms_user', JSON.stringify(res.data.user));
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'var(--navy)',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          radial-gradient(circle at 20% 30%, rgba(201,162,39,0.12) 0%, transparent 50%),
          radial-gradient(circle at 80% 70%, rgba(201,162,39,0.08) 0%, transparent 50%)
        `,
      }} />

      {/* Decorative lines */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.02) 60px, rgba(255,255,255,0.02) 61px)',
        pointerEvents: 'none',
      }} />

      {/* Left panel — branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{ maxWidth: 440 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 40,
          }}>
            <div style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
            }}>🏛️</div>
            <div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.6rem',
                color: 'var(--white)',
                lineHeight: 1.1,
              }}>MCRO</div>
              <div style={{
                fontSize: '0.75rem',
                color: 'var(--gold)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>General Luna, Quezon</div>
            </div>
          </div>

          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.6rem',
            color: 'var(--white)',
            lineHeight: 1.2,
            marginBottom: 16,
          }}>
            Civil Registry<br />
            <span style={{ color: 'var(--gold)' }}>Management</span><br />
            System
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.95rem',
            lineHeight: 1.7,
            marginBottom: 40,
          }}>
            A digital platform for managing civil registration transactions,
            visitor records, and official government documents for the
            Municipality of General Luna, Quezon.
          </p>

          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            {[
              { icon: '🔒', text: 'Secure JWT Authentication' },
              { icon: '📊', text: 'Real-time Analytics Dashboard' },
              { icon: '📋', text: 'Complete Audit Trail' },
              { icon: '📄', text: 'PDF Report Export' },
            ].map(f => (
              <div key={f.text} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                fontSize: '0.85rem',
                color: 'rgba(255,255,255,0.55)',
              }}>
                <span style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div style={{
        width: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255,255,255,0.97)',
          borderRadius: 20,
          padding: '40px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.6rem',
              color: 'var(--navy)',
              marginBottom: 6,
            }}>Sign In</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Enter your credentials to access the system
            </p>
          </div>

          {error && (
            <div className="alert alert-error" style={{ marginBottom: 20 }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  className="form-control"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@mcro-generalluna.gov.ph"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  className="form-control"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}
              >
                {loading ? (
                  <><span className="spinner" style={{ width: 16, height: 16 }}></span> Signing in...</>
                ) : '→ Sign In to CRMS'}
              </button>
            </div>
          </form>

          <div style={{
            marginTop: 28,
            padding: '14px',
            background: 'var(--gray-100)',
            borderRadius: 8,
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
          }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Demo credentials:</strong><br />
            Email: admin@mcro-generalluna.gov.ph<br />
            Password: Admin@1234
          </div>

          <p style={{
            marginTop: 20,
            fontSize: '0.73rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            lineHeight: 1.5,
          }}>
            For authorized personnel only. Unauthorized access is prohibited<br />
            under RA 9048 and relevant data privacy laws.
          </p>
        </div>
      </div>
    </div>
  );
}
