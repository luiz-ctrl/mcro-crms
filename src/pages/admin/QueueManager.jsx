import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { format } from 'date-fns'

function getPHTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
}

function playChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.18)
      gain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + i * 0.18 + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.45)
      osc.start(ctx.currentTime + i * 0.18)
      osc.stop(ctx.currentTime + i * 0.18 + 0.5)
    })
  } catch {}
}

export default function QueueManager() {
  const { user } = useAuth()
  const toast    = useToast()
  const [queueItems, setQueueItems] = useState([])
  const [ticketNum, setTicketNum]   = useState('')
  const [soundOn, setSoundOn]       = useState(true)
  const [announcement, setAnnouncement] = useState('')
  const [savedAnn, setSavedAnn]     = useState('')
  const [loading, setLoading]       = useState(false)

  const today = getPHTime().toISOString().slice(0, 10)

  async function loadQueue() {
    const { data } = await supabase
      .from('queue')
      .select('*')
      .gte('created_at', today + 'T00:00:00')
      .order('number')
    setQueueItems(data || [])
  }

  async function loadAnnouncement() {
    const { data } = await supabase.from('settings').select('value').eq('key', 'announcement').single()
    if (data) { setAnnouncement(data.value || ''); setSavedAnn(data.value || '') }
  }

  useEffect(() => {
    loadQueue()
    loadAnnouncement()
    const id = setInterval(loadQueue, 3000)
    return () => clearInterval(id)
  }, [])

  const serving    = queueItems.find(q => q.status === 'serving')
  const waiting    = queueItems.filter(q => q.status === 'waiting')
  const totalToday = queueItems.length
  const served     = queueItems.filter(q => q.status === 'done').length
  const lastIssued = queueItems.length > 0 ? Math.max(...queueItems.map(q => q.number)) : 0

  async function issueTicket() {
    setLoading(true)
    try {
      const num = ticketNum.trim() !== '' ? parseInt(ticketNum) : lastIssued + 1
      if (isNaN(num) || num < 1) return toast('Invalid ticket number', 'error')
      const exists = queueItems.find(q => q.number === num && q.status !== 'done')
      if (exists) return toast(`Number ${num} is already in use`, 'error')
      await supabase.from('queue').insert({ number: num, status: 'waiting' })
      setTicketNum('')
      toast(`Ticket #${num} issued`, 'success')
      loadQueue()
    } finally {
      setLoading(false)
    }
  }

  async function callNext() {
    // Mark current serving as done
    if (serving) {
      await supabase.from('queue').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', serving.id)
    }
    // Call next waiting
    if (waiting.length > 0) {
      const next = waiting[0]
      await supabase.from('queue').update({ status: 'serving', called_at: new Date().toISOString() }).eq('id', next.id)
      if (soundOn) playChime()
      toast(`Now serving #${next.number}`, 'success')
    } else {
      toast('No more clients in queue', 'info')
    }
    loadQueue()
  }

  async function callSpecific(item) {
    if (serving) {
      await supabase.from('queue').update({ status: 'done', done_at: new Date().toISOString() }).eq('id', serving.id)
    }
    await supabase.from('queue').update({ status: 'serving', called_at: new Date().toISOString() }).eq('id', item.id)
    if (soundOn) playChime()
    toast(`Now serving #${item.number}`, 'success')
    loadQueue()
  }

  async function resetQueue() {
    if (!window.confirm('Reset entire queue for today? This cannot be undone.')) return
    await supabase.from('queue').delete().gte('created_at', today + 'T00:00:00')
    toast('Queue reset', 'success')
    loadQueue()
  }

  async function saveAnnouncement() {
    await supabase.from('settings').upsert({ key: 'announcement', value: announcement, updated_at: new Date().toISOString() })
    setSavedAnn(announcement)
    toast('Announcement updated', 'success')
  }

  async function clearAnnouncement() {
    await supabase.from('settings').upsert({ key: 'announcement', value: '', updated_at: new Date().toISOString() })
    setAnnouncement('')
    setSavedAnn('')
    toast('Announcement cleared', 'success')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>Queue Management</h1>
          <p style={{ color: 'var(--gray-400)', fontSize: '0.9rem' }}>Today's queue — {format(new Date(), 'MMMM d, yyyy')}</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <a href="/queue-display" target="_blank" className="btn btn-outline btn-sm">📺 Display Screen ↗</a>
          <button className="btn btn-danger btn-sm" onClick={resetQueue}>🔄 Reset Queue</button>
        </div>
      </div>

      {/* Announcement Manager */}
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24, borderTop: '3px solid var(--gold)' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 14 }}>📢 Public Announcement Banner</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            value={announcement}
            onChange={e => setAnnouncement(e.target.value)}
            placeholder="Type an announcement to show on the public landing page…"
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" onClick={saveAnnouncement}>Post</button>
          <button className="btn btn-ghost" onClick={clearAnnouncement}>Clear</button>
        </div>
        {savedAnn && (
          <div style={{ marginTop: 10, padding: '8px 14px', background: 'var(--gold-pale)', borderRadius: 6, fontSize: '0.85rem', color: 'var(--navy)' }}>
            <strong>Live:</strong> {savedAnn}
          </div>
        )}
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Today', value: totalToday, color: 'var(--navy)' },
          { label: 'Served', value: served, color: 'var(--green)' },
          { label: 'Waiting', value: waiting.length, color: waiting.length > 0 ? 'var(--amber)' : 'var(--gray-400)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '20px 24px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <div style={{ fontSize: '2.25rem', fontWeight: 800, color: s.color, fontFamily: 'var(--font-head)' }}>{s.value}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Issue + Now Serving */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Issue Ticket */}
          <div className="card" style={{ padding: '24px 28px' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: 4 }}>Issue Ticket</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--gray-400)', marginBottom: 16 }}>
              Last issued: <strong>#{lastIssued || '—'}</strong>
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                className="form-input"
                type="number"
                value={ticketNum}
                onChange={e => setTicketNum(e.target.value)}
                placeholder={`Auto (next: #${lastIssued + 1})`}
                min="1"
                style={{ flex: 1 }}
                onKeyDown={e => e.key === 'Enter' && issueTicket()}
              />
              <button className="btn btn-primary" onClick={issueTicket} disabled={loading}>
                Issue
              </button>
            </div>
          </div>

          {/* Now Serving */}
          <div className="card" style={{ padding: '28px', background: 'var(--navy)', color: 'var(--white)' }}>
            <div style={{ fontSize: '0.75rem', letterSpacing: '.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,.5)', marginBottom: 12 }}>
              Now Serving
            </div>
            <div style={{ fontSize: '5rem', fontFamily: 'var(--font-head)', fontWeight: 900, color: 'var(--gold)', lineHeight: 1, marginBottom: 24 }}>
              {serving?.number ?? '—'}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                className="btn btn-gold"
                style={{ flex: 1, justifyContent: 'center', padding: '14px' }}
                onClick={callNext}
              >
                📣 Call Next
              </button>
              <button
                className="btn"
                style={{ background: 'rgba(255,255,255,.1)', color: soundOn ? 'var(--gold)' : 'rgba(255,255,255,.4)', border: '1px solid rgba(255,255,255,.2)', fontSize: '1.25rem', padding: '14px 16px' }}
                onClick={() => setSoundOn(!soundOn)}
                title={soundOn ? 'Mute chime' : 'Unmute chime'}
              >
                {soundOn ? '🔔' : '🔕'}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Waiting List */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Waiting List</h2>
            <span style={{ background: 'var(--amber)', color: 'var(--white)', borderRadius: 20, padding: '2px 12px', fontSize: '0.8rem', fontWeight: 700 }}>{waiting.length}</span>
          </div>
          <div style={{ overflowY: 'auto', maxHeight: 420 }}>
            {waiting.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.9rem' }}>
                No clients waiting
              </div>
            ) : waiting.map((q, i) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--gray-100)', gap: 14 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? 'var(--gold)' : 'var(--gray-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: i === 0 ? 'var(--navy)' : 'var(--gray-400)', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-head)', color: 'var(--navy)', minWidth: 48 }}>
                  #{q.number}
                </div>
                <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--gray-400)' }}>
                  Issued {format(new Date(q.created_at), 'h:mm a')}
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => callSpecific(q)} style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Call
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
