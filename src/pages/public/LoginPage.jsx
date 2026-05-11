import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'

export default function LoginPage() {
  const { signIn } = useAuth()
  const toast      = useToast()
  const navigate   = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/app/dashboard')
    } catch (err) {
      toast(err.message || 'Login failed. Check your credentials.', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Animated geometric shapes
  const shapes = Array.from({ length: 12 }, (_, i) => ({
    size: 40 + (i * 23) % 80,
    x: (i * 17 + 5) % 95,
    y: (i * 13 + 10) % 90,
    delay: (i * 0.4) % 4,
    duration: 8 + (i % 5),
  }))

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated shapes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: .06; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: .12; }
        }
      `}</style>
      {shapes.map((s, i) => (
        <div key={i} style={{
          position: 'absolute',
          width: s.size,
          height: s.size,
          left: `${s.x}%`,
          top: `${s.y}%`,
          border: '1.5px solid var(--gold)',
          borderRadius: i % 3 === 0 ? '50%' : i % 3 === 1 ? '4px' : '0',
          animation: `float ${s.duration}s ${s.delay}s ease-in-out infinite`,
          opacity: 0.08,
          pointerEvents: 'none',
        }} />
      ))}

      {/* Left branding panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '80px 64px',
        position: 'relative',
        zIndex: 1,
      }}>
        <a href="/" style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.85rem', marginBottom: 64, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          ← Back to Public Site
        </a>
        <div style={{ fontFamily: 'var(--font-head)', fontSize: '3rem', fontWeight: 900, color: 'var(--white)', lineHeight: 1, marginBottom: 8 }}>MCRO</div>
        <div style={{ color: 'var(--gold)', fontSize: '0.9rem', letterSpacing: '.08em', marginBottom: 40 }}>CIVIL REGISTRY MANAGEMENT SYSTEM</div>
        <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '1rem', lineHeight: 1.7, maxWidth: 380, marginBottom: 48 }}>
          Secure staff portal for managing civil registry transactions, queue operations, reports, and more.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[
            '📋 Records Management',
            '📊 Analytics & Reports',
            '🎫 Queue Management',
            '🔍 Audit Trail',
          ].map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'rgba(255,255,255,.65)', fontSize: '0.9rem' }}>
              {f}
            </div>
          ))}
        </div>
      </div>

      {/* Login card */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        flex: '0 0 480px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          width: '100%',
          maxWidth: 400,
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,.12)',
          borderRadius: 'var(--radius-xl)',
          padding: '44px 40px',
        }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ color: 'var(--white)', fontSize: '1.6rem', fontWeight: 800, marginBottom: 8 }}>Staff Login</h2>
            <p style={{ color: 'rgba(255,255,255,.45)', fontSize: '0.9rem' }}>Municipal Civil Registrar's Office</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-group">
              <label className="form-label" style={{ color: 'rgba(255,255,255,.7)' }}>Email Address</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@mcro-generaluna.gov.ph"
                required
                autoComplete="email"
                style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'var(--white)' }}
              />
            </div>
            <div className="form-group">
              <label className="form-label" style={{ color: 'rgba(255,255,255,.7)' }}>Password</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: 'var(--white)' }}
              />
            </div>
            <button
              type="submit"
              className="btn btn-gold"
              disabled={loading}
              style={{ width: '100%', justifyContent: 'center', marginTop: 8, padding: '14px', fontSize: '1rem' }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p style={{ color: 'rgba(255,255,255,.25)', fontSize: '0.75rem', textAlign: 'center', marginTop: 28, lineHeight: 1.5 }}>
            Authorized personnel only.<br />
            All sessions are monitored and logged.
          </p>
        </div>
      </div>
    </div>
  )
}
