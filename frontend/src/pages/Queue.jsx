import { useState, useEffect, useCallback } from 'react';
import API from '../utils/api.js';
import './Queue.css';

export default function Queue() {
  const [state, setState] = useState({ current: null, waiting: [], stats: { total: 0, served: 0, waiting: 0 } });
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [calling, setCalling] = useState(false);
  const [lastIssued, setLastIssued] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [manualNum, setManualNum] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [announcementInput, setAnnouncementInput] = useState('');
  const [savingAnn, setSavingAnn] = useState(false);

  const fetchQueue = useCallback(async () => {
    try {
      const { data } = await API.get('/queue');
      setState(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    API.get('/announcement').then(r => { setAnnouncement(r.data.message || ''); setAnnouncementInput(r.data.message || ''); }).catch(() => {});
    const interval = setInterval(fetchQueue, 3000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const playSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      // Two-tone chime
      [523.25, 659.25].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.18 + 0.4);
        osc.start(ctx.currentTime + i * 0.18);
        osc.stop(ctx.currentTime + i * 0.18 + 0.4);
      });
    } catch (e) { console.log('Audio not available'); }
  };

  const issueTicket = async () => {
    setIssuing(true);
    try {
      const { data } = await API.post('/queue', { action: 'issue', manualNumber: manualNum ? parseInt(manualNum) : null });
      setLastIssued(data.number);
      setManualNum('');
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || 'Error issuing ticket');
    } finally {
      setIssuing(false);
    }
  };

  const callNext = async () => {
    setCalling(true);
    try {
      await API.post('/queue', { action: 'next' });
      if (soundOn) playSound();
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || 'Error calling next');
    } finally {
      setCalling(false);
    }
  };

  const callSpecific = async (id) => {
    try {
      await API.post('/queue', { action: 'call', id });
      if (soundOn) playSound();
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || 'Error');
    }
  };

  const resetQueue = async () => {
    if (!confirm('Reset all of today\'s queue? This cannot be undone.')) return;
    setResetting(true);
    try {
      await API.post('/queue', { action: 'reset' });
      setLastIssued(null);
      fetchQueue();
    } catch (err) {
      alert(err.response?.data?.error || 'Error resetting queue');
    } finally {
      setResetting(false);
    }
  };

  const saveAnnouncement = async () => {
    setSavingAnn(true);
    try {
      await API.post('/announcement', { message: announcementInput });
      setAnnouncement(announcementInput);
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving announcement');
    } finally { setSavingAnn(false); }
  };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div>
          <h1 className="page-title">Queue Management</h1>
          <p className="page-subtitle">Issue tickets and manage client queue</p>
        </div>
        <div className="flex gap-2">
          <a
            href="/queue-display"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>
            </svg>
            Open Display Screen
          </a>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setSoundOn(s => !s)}
            title={soundOn ? 'Sound ON — click to mute' : 'Sound OFF — click to unmute'}
            style={{ color: soundOn ? 'var(--green)' : 'var(--gray-400)' }}
          >
            {soundOn ? '🔔 Sound ON' : '🔕 Sound OFF'}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={resetQueue} disabled={resetting} style={{ color: 'var(--red)' }}>
            {resetting ? 'Resetting…' : 'Reset Queue'}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid-3" style={{ marginBottom: 20 }}>
        <div className="card" style={{ borderTop: '3px solid var(--navy)', padding: '16px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--navy)', lineHeight: 1 }}>{state.stats.total}</div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gray-500)', marginTop: 6 }}>Total Today</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid var(--green)', padding: '16px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--green)', lineHeight: 1 }}>{state.stats.served}</div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gray-500)', marginTop: 6 }}>Served</div>
        </div>
        <div className="card" style={{ borderTop: '3px solid var(--yellow)', padding: '16px 20px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: 'var(--yellow)', lineHeight: 1 }}>{state.stats.waiting}</div>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--gray-500)', marginTop: 6 }}>Waiting</div>
        </div>
      </div>

      {/* Announcement Manager */}
      <div className="card" style={{ marginBottom: 20, borderLeft: '3px solid var(--yellow)' }}>
        <h3 className="chart-title" style={{ marginBottom: 4 }}>📢 Public Announcement</h3>
        <p style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 12 }}>This message will appear on the public landing page. Leave blank to hide.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. Office will be closed on April 9 — Araw ng Kagitingan"
            value={announcementInput}
            onChange={e => setAnnouncementInput(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn btn-gold" onClick={saveAnnouncement} disabled={savingAnn}>
            {savingAnn ? 'Saving…' : 'Post'}
          </button>
          {announcement && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setAnnouncementInput(''); saveAnnouncement(); }} style={{ color: 'var(--red)' }}>
              Clear
            </button>
          )}
        </div>
        {announcement && (
          <div style={{ marginTop: 10, padding: '8px 12px', background: 'var(--yellow-light)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: '#92400e' }}>
            Live: {announcement}
          </div>
        )}
      </div>

      <div className="grid-2" style={{ gap: 20, alignItems: 'start' }}>

        {/* Left — Issue + Current */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Issue Ticket */}
          <div className="card" style={{ textAlign: 'center', padding: '32px 24px' }}>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16, fontWeight: 500 }}>Issue a new queue ticket to a client</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <div className="form-group" style={{ flex: 1, margin: 0 }}>
                <label className="form-label">Ticket Number (leave blank for auto)</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max="999"
                  placeholder="e.g. 001"
                  value={manualNum}
                  onChange={e => setManualNum(e.target.value)}
                  style={{ textAlign: 'center', fontSize: 20, fontFamily: 'var(--font-display)' }}
                />
              </div>
            </div>
            <button
              className="btn btn-primary"
              onClick={issueTicket}
              disabled={issuing}
              style={{ fontSize: 16, padding: '14px 40px', borderRadius: 10 }}
            >
              {issuing
                ? <><div className="loader" style={{ width: 16, height: 16, borderWidth: 2 }} /> Issuing…</>
                : <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                    </svg>
                    Issue Ticket
                  </>
              }
            </button>

            {lastIssued && (
              <div className="queue-ticket-issued">
                <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 4 }}>Last issued ticket</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 56, color: 'var(--navy)', lineHeight: 1 }}>
                  {String(lastIssued).padStart(3, '0')}
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>Give this number to the client</div>
              </div>
            )}
          </div>

          {/* Now Serving */}
          <div className="card" style={{ textAlign: 'center', padding: '28px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--gray-400)', marginBottom: 12 }}>Now Serving</div>
            {state.current ? (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 72, color: 'var(--navy)', lineHeight: 1, marginBottom: 8 }}>
                {String(state.current.number).padStart(3, '0')}
              </div>
            ) : (
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 48, color: 'var(--gray-300)', lineHeight: 1, marginBottom: 8 }}>—</div>
            )}
            <button
              className="btn btn-gold"
              onClick={callNext}
              disabled={calling || state.stats.waiting === 0}
              style={{ marginTop: 12, padding: '10px 28px', fontSize: 14 }}
            >
              {calling
                ? <><div className="loader" style={{ width: 14, height: 14, borderWidth: 2 }} /> Calling…</>
                : <>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    Call Next
                  </>
              }
            </button>
            {state.stats.waiting === 0 && (
              <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 8 }}>No clients waiting</div>
            )}
          </div>
        </div>

        {/* Right — Waiting List */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <h3 className="chart-title" style={{ marginBottom: 0 }}>Waiting List</h3>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center' }}><div className="loader" style={{ margin: '0 auto' }} /></div>
          ) : state.waiting.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 14 }}>
              No clients in queue
            </div>
          ) : (
            <div style={{ maxHeight: 420, overflowY: 'auto' }}>
              {state.waiting.map((item, i) => (
                <div key={item.id} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 20px',
                  borderBottom: '1px solid var(--gray-100)', gap: 16
                }}>
                  <div style={{
                    fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--navy)',
                    width: 60, flexShrink: 0
                  }}>
                    {String(item.number).padStart(3, '0')}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                      Position #{i + 1} • Issued {new Date(item.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => callSpecific(item.id)}
                    title="Call this number now"
                  >
                    Call
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
