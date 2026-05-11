import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

function getPHTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
}

export default function QueueDisplay() {
  const [serving, setServing]   = useState(null)
  const [waiting, setWaiting]   = useState([])
  const [time, setTime]         = useState(getPHTime())
  const [flash, setFlash]       = useState(false)
  const prevServing = React.useRef(null)

  async function fetchQueue() {
    const today = getPHTime().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('queue')
      .select('*')
      .gte('created_at', today + 'T00:00:00')
      .order('number')

    if (!data) return
    const s = data.find(q => q.status === 'serving')
    const w = data.filter(q => q.status === 'waiting')
    setWaiting(w)
    if (s?.number !== prevServing.current) {
      setFlash(true)
      setTimeout(() => setFlash(false), 1500)
      prevServing.current = s?.number ?? null
    }
    setServing(s ?? null)
  }

  useEffect(() => {
    fetchQueue()
    const qId = setInterval(fetchQueue, 2500)
    const tId = setInterval(() => setTime(getPHTime()), 1000)
    return () => { clearInterval(qId); clearInterval(tId) }
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--navy)',
      color: 'var(--white)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'var(--font-body)',
    }}>
      {/* Header */}
      <div style={{ background: 'var(--navy-dark)', padding: '16px 48px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '3px solid var(--gold)' }}>
        <div>
          <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.4rem', color: 'var(--white)' }}>
            MCRO — Municipal Civil Registrar's Office
          </div>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '0.85rem' }}>General Luna, Quezon</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-head)', fontSize: '2rem', fontWeight: 700, color: 'var(--gold)', letterSpacing: '-.02em' }}>
            {time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <div style={{ color: 'rgba(255,255,255,.4)', fontSize: '0.8rem' }}>
            {time.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', gap: 0 }}>
        {/* Now Serving */}
        <div style={{
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px',
          borderRight: '1px solid rgba(255,255,255,.08)',
        }}>
          <div style={{ fontSize: '1rem', letterSpacing: '.25em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 24 }}>
            Now Serving
          </div>
          <div style={{
            fontSize: 'clamp(8rem, 18vw, 18rem)',
            fontFamily: 'var(--font-head)',
            fontWeight: 900,
            lineHeight: 1,
            color: flash ? 'var(--white)' : 'var(--gold)',
            transition: 'color .3s',
            textShadow: flash ? '0 0 80px rgba(201,151,58,.8)' : 'none',
          }}>
            {serving?.number ?? '—'}
          </div>
          <div style={{ color: 'rgba(255,255,255,.35)', fontSize: '1rem', marginTop: 24, letterSpacing: '.05em' }}>
            PLEASE PROCEED TO THE COUNTER
          </div>
        </div>

        {/* Waiting List */}
        <div style={{ flex: 1, padding: '40px 32px', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.8rem', letterSpacing: '.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,.4)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid rgba(255,255,255,.1)' }}>
            Waiting List ({waiting.length})
          </div>
          {waiting.length === 0 ? (
            <div style={{ color: 'rgba(255,255,255,.3)', fontSize: '1rem', textAlign: 'center', marginTop: 60 }}>No one waiting</div>
          ) : (
            waiting.map((q, i) => (
              <div key={q.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '14px 16px',
                marginBottom: 8,
                background: 'rgba(255,255,255,.05)',
                borderRadius: 8,
                border: i === 0 ? '1px solid rgba(201,151,58,.3)' : '1px solid transparent',
              }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: 'var(--navy)', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-head)', color: i === 0 ? 'var(--gold)' : 'var(--white)' }}>
                  {q.number}
                </div>
                <div style={{ color: 'rgba(255,255,255,.35)', fontSize: '0.75rem' }}>
                  {new Date(q.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Footer ticker */}
      <div style={{ background: 'var(--gold)', color: 'var(--navy)', padding: '10px 48px', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center' }}>
        Please wait for your number to be called. Thank you for your patience. • Salamat po sa inyong pasensya.
      </div>
    </div>
  )
}
