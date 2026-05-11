import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { SERVICES, RECORDS_ON_FILE, FAQS, PH_HOLIDAYS_2024_2025 } from '../../lib/constants'

/* ── Helpers ──────────────────────────────────────────────── */
function getPHTime() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Manila' }))
}
function isOfficeOpen() {
  const now  = getPHTime()
  const day  = now.getDay()  // 0=Sun, 6=Sat
  const hour = now.getHours()
  const dateStr = now.toISOString().slice(0, 10)
  if (day === 0 || day === 6) return false
  if (PH_HOLIDAYS_2024_2025.includes(dateStr)) return false
  return hour >= 8 && hour < 17
}
function isHoliday() {
  const dateStr = getPHTime().toISOString().slice(0, 10)
  return PH_HOLIDAYS_2024_2025.includes(dateStr)
}

/* ── Sub-components ───────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(getPHTime())
  useEffect(() => {
    const id = setInterval(() => setTime(getPHTime()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <span style={{ fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: '0.85rem', color: 'rgba(255,255,255,0.75)', letterSpacing: '.03em' }}>
      🕐 {time.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} PST
    </span>
  )
}

function QueueCard({ small = false }) {
  const [queue, setQueue] = useState({ serving: null, waiting: 0, total: 0 })

  async function fetchQueue() {
    const today = getPHTime().toISOString().slice(0, 10)
    const { data } = await supabase
      .from('queue')
      .select('*')
      .gte('created_at', today + 'T00:00:00')

    if (!data) return
    const serving = data.find(q => q.status === 'serving')
    const waiting = data.filter(q => q.status === 'waiting').length
    setQueue({ serving: serving?.number ?? null, waiting, total: data.length })
  }

  useEffect(() => {
    fetchQueue()
    const id = setInterval(fetchQueue, 2500)
    return () => clearInterval(id)
  }, [])

  if (small) return (
    <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '0.8rem' }}>
      <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--gold)', letterSpacing: '-0.02em' }}>
        {queue.serving ?? '—'}
      </div>
      <div>Now Serving · {queue.waiting} waiting</div>
    </div>
  )

  return (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(255,255,255,0.15)',
      borderRadius: 'var(--radius-lg)',
      padding: '28px 32px',
      minWidth: 260,
    }}>
      <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.75rem', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>
        Live Queue
      </div>
      <div style={{ fontSize: '4rem', fontWeight: 900, color: 'var(--gold)', lineHeight: 1, fontFamily: 'var(--font-head)', marginBottom: 8 }}>
        {queue.serving ?? '—'}
      </div>
      <div style={{ color: 'rgba(255,255,255,.75)', fontSize: '0.9rem', marginBottom: 4 }}>Now Serving</div>
      <div style={{ display: 'flex', gap: 20, marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.12)' }}>
        <div>
          <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.25rem' }}>{queue.waiting}</div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: '0.75rem' }}>Waiting</div>
        </div>
        <div>
          <div style={{ color: 'var(--gold)', fontWeight: 700, fontSize: '1.25rem' }}>{queue.total}</div>
          <div style={{ color: 'rgba(255,255,255,.55)', fontSize: '0.75rem' }}>Today</div>
        </div>
      </div>
    </div>
  )
}

function Accordion({ items }) {
  const [open, setOpen] = useState(null)
  return (
    <div>
      {items.map((item, i) => (
        <div key={i} className="accordion-item">
          <button
            className={`accordion-trigger${open === i ? ' open' : ''}`}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q || item.title}</span>
            <span style={{ fontSize: '1.25rem', transition: 'transform .2s', transform: open === i ? 'rotate(45deg)' : 'none' }}>+</span>
          </button>
          {open === i && (
            <div className="accordion-content">
              {item.a && <p style={{ marginBottom: 0 }}>{item.a}</p>}
              {item.content && item.content}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function ServiceCard({ service }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      onClick={() => setOpen(!open)}
      style={{
        background: 'var(--white)',
        border: `1px solid var(--gray-200)`,
        borderTop: open ? `3px solid var(--gold)` : '3px solid transparent',
        borderRadius: 'var(--radius-md)',
        padding: '28px 26px',
        cursor: 'pointer',
        transition: 'all .25s',
        boxShadow: open ? 'var(--shadow-lg)' : 'var(--shadow-sm)',
        transform: open ? 'translateY(-4px)' : 'none',
      }}
      onMouseEnter={e => { if (!open) e.currentTarget.style.borderTopColor = 'var(--gold)' }}
      onMouseLeave={e => { if (!open) e.currentTarget.style.borderTopColor = 'transparent' }}
    >
      <div style={{ fontSize: '2.25rem', marginBottom: 14 }}>{service.icon}</div>
      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>{service.title}</h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginBottom: 12 }}>
        ₱{service.fee.includes('Free') ? 'Free' : service.fee.split('₱')[1]?.split(' ')[0]} · {service.processing}
      </p>
      {open && (
        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: 16, marginTop: 8 }} onClick={e => e.stopPropagation()}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Types</div>
            <ul style={{ paddingLeft: 18, color: 'var(--gray-600)', fontSize: '0.875rem' }}>
              {service.types.map(t => <li key={t}>{t}</li>)}
            </ul>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--gold)', marginBottom: 6 }}>Requirements</div>
            <ul style={{ paddingLeft: 18, color: 'var(--gray-600)', fontSize: '0.875rem' }}>
              {service.requirements.map(r => <li key={r} style={{ marginBottom: 4 }}>{r}</li>)}
            </ul>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--gold-pale)', borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem' }}>
              <strong>Fee:</strong> {service.fee}
            </div>
            <div style={{ background: '#E0F2FE', borderRadius: 6, padding: '6px 12px', fontSize: '0.8rem' }}>
              <strong>Processing:</strong> {service.processing}
            </div>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600 }}>
        {open ? 'Close' : 'View Details'}
        <span style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </div>
    </div>
  )
}

/* ── Main Landing Page ────────────────────────────────────── */
export default function LandingPage() {
  const [announcement, setAnnouncement] = useState('')
  const [showTop, setShowTop]           = useState(false)
  const [navOpen, setNavOpen]           = useState(false)

  useEffect(() => {
    supabase.from('settings').select('value').eq('key', 'announcement').single()
      .then(({ data }) => data?.value && setAnnouncement(data.value))

    const onScroll = () => setShowTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const open = isOfficeOpen()
  const holiday = isHoliday()

  const navLinks = [
    { label: 'Services', href: '#services' },
    { label: 'Requirements', href: '#requirements' },
    { label: 'Fees', href: '#fees' },
    { label: 'FAQ', href: '#faq' },
    { label: 'Contact', href: '#contact' },
  ]

  return (
    <div style={{ background: 'var(--cream)' }}>
      {/* Holiday Banner */}
      {holiday && (
        <div style={{ background: '#DC2626', color: '#fff', textAlign: 'center', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 600, zIndex: 100, position: 'relative' }}>
          🇵🇭 Today is a Philippine National Holiday. The MCRO office is closed.
        </div>
      )}

      {/* Announcement Banner */}
      {announcement && (
        <div style={{ background: 'var(--navy)', color: 'var(--gold)', textAlign: 'center', padding: '10px 20px', fontSize: '0.9rem', fontWeight: 500 }}>
          📢 {announcement}
        </div>
      )}

      {/* Sticky Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(15,31,61,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(201,151,58,.25)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 70 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--white)', lineHeight: 1.1 }}>MCRO</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--gold)', letterSpacing: '.1em', textTransform: 'uppercase' }}>General Luna, Quezon</div>
          </div>
          <nav style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} style={{ color: 'rgba(255,255,255,.8)', fontSize: '0.875rem', fontWeight: 500, transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--gold)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.8)'}
              >{l.label}</a>
            ))}
            <LiveClock />
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{
        minHeight: '90vh',
        background: `linear-gradient(rgba(9,21,41,.75), rgba(15,31,61,.85)), url('/municipal-hall.png') center/cover no-repeat`,
        display: 'flex', alignItems: 'center',
        padding: '80px 24px',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'flex', gap: 60, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(201,151,58,.15)', border: '1px solid rgba(201,151,58,.35)', borderRadius: 20, padding: '6px 16px', marginBottom: 24 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: open ? '#22C55E' : '#EF4444', display: 'inline-block' }} />
              <span style={{ color: 'rgba(255,255,255,.85)', fontSize: '0.8rem', fontWeight: 600 }}>
                {open ? 'Office Open — We\'re serving clients' : 'Office Closed'}
              </span>
            </div>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, color: 'var(--white)', lineHeight: 1.1, marginBottom: 24 }}>
              Municipal Civil<br />
              <span style={{ color: 'var(--gold)' }}>Registrar's</span><br />
              Office
            </h1>
            <p style={{ color: 'rgba(255,255,255,.75)', fontSize: '1.1rem', lineHeight: 1.7, maxWidth: 520, marginBottom: 36 }}>
              Serving the residents of General Luna, Quezon with accurate, timely, and accessible civil registry services since 1945.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <a href="#services" className="btn btn-gold btn-lg">Our Services</a>
              <a href="#contact" className="btn btn-outline btn-lg" style={{ color: 'var(--white)', borderColor: 'rgba(255,255,255,.5)' }}>Contact Us</a>
            </div>
          </div>
          <QueueCard />
        </div>
      </section>

      {/* Stats Strip */}
      <section style={{ background: 'var(--navy)', padding: '28px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', gap: 48, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[
            { n: '6', label: 'Civil Services' },
            { n: 'Same Day', label: 'Processing for most transactions' },
            { n: 'Mon–Fri', label: '8:00 AM – 5:00 PM' },
            { n: 'Free', label: 'Queue System' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '1.75rem', fontWeight: 800, color: 'var(--gold)' }}>{s.n}</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '0.8rem', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Services Section */}
      <section id="services" style={{ padding: 'var(--section-py) 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">What we offer</div>
            <h2 className="section-title" style={{ margin: '0 auto 16px' }}>Our Services</h2>
            <p className="section-subtitle" style={{ margin: '0 auto' }}>Click on any service card to view complete requirements, fees, and processing details.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {SERVICES.map(s => <ServiceCard key={s.id} service={s} />)}
          </div>
        </div>
      </section>

      {/* Records on File */}
      <section style={{ background: 'var(--navy)', padding: 'var(--section-py) 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ marginBottom: 48 }}>
            <div className="section-eyebrow">Civil Registry Archives</div>
            <h2 className="section-title light">Records Available</h2>
            <p style={{ color: 'rgba(255,255,255,.6)', fontSize: '1rem', marginTop: 8 }}>* Incomplete records for certain years</p>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--white)' }}>
              <thead>
                <tr>
                  {['Year Range', 'Birth', 'Marriage', 'Death'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', background: 'rgba(201,151,58,.2)', borderBottom: '2px solid var(--gold)', textAlign: h === 'Year Range' ? 'left' : 'center', fontSize: '0.8rem', letterSpacing: '.08em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RECORDS_ON_FILE.map(r => (
                  <tr key={r.year} style={{ borderBottom: '1px solid rgba(255,255,255,.08)' }}>
                    <td style={{ padding: '13px 20px', fontWeight: 600 }}>{r.year}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'center', color: 'var(--gold)' }}>{r.birth}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'center', color: 'var(--gold)' }}>{r.marriage}</td>
                    <td style={{ padding: '13px 20px', textAlign: 'center', color: 'var(--gold)' }}>{r.death}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Staff Section */}
      <section style={{ display: 'flex', minHeight: 420, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', background: `url('/staff.png') center/cover no-repeat`, minHeight: 360 }} />
        <div style={{ flex: '1 1 400px', background: 'var(--navy)', padding: '64px 52px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div className="section-eyebrow">Our Team</div>
          <h2 className="section-title light" style={{ marginBottom: 20 }}>Committed to Serving You</h2>
          <p style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.8, marginBottom: 32 }}>
            Our dedicated team of civil registry professionals ensures that every transaction is processed with accuracy, efficiency, and the utmost respect for your records.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {['PSA Accredited', 'Trained Staff', 'Secure Records', 'Fast Processing'].map(b => (
              <span key={b} style={{ background: 'rgba(201,151,58,.2)', border: '1px solid rgba(201,151,58,.4)', borderRadius: 20, padding: '6px 16px', color: 'var(--gold)', fontSize: '0.8rem', fontWeight: 600 }}>{b}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section id="requirements" style={{ padding: 'var(--section-py) 24px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">What to bring</div>
            <h2 className="section-title">Requirements</h2>
          </div>
          <Accordion items={SERVICES.map(s => ({
            title: s.title,
            content: (
              <ul style={{ paddingLeft: 20, color: 'var(--gray-600)' }}>
                {s.requirements.map(r => <li key={r} style={{ marginBottom: 6 }}>{r}</li>)}
              </ul>
            )
          }))} />
        </div>
      </section>

      {/* Fees & Processing */}
      <section id="fees" style={{ background: 'var(--gray-50)', padding: 'var(--section-py) 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">Pricing Guide</div>
            <h2 className="section-title">Fees & Processing Time</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 32 }}>
            {/* Fees Table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: 'var(--navy)', color: 'var(--white)' }}>
                <h3 style={{ color: 'var(--white)', fontSize: '1.1rem' }}>Schedule of Fees</h3>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ padding: '12px 20px', textAlign: 'left', fontWeight: 600, color: 'var(--navy)' }}>Service</th>
                    <th style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 600, color: 'var(--navy)' }}>Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Registration of Birth', 'Free'],
                    ['Registration of Marriage', 'Free'],
                    ['Registration of Death', 'Free'],
                    ['CTC / CRF (per page)', '₱50.00'],
                    ['BREQS PSA Copy', '₱215.00'],
                    ['Marriage License', '₱200.00'],
                    ['R.A. 9048 Petition', '₱3,000.00+'],
                    ['R.A. 10172 Petition', '₱3,000.00+'],
                    ['Legitimation', '₱2,000.00'],
                  ].map(([s, f]) => (
                    <tr key={s} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '12px 20px' }}>{s}</td>
                      <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 700, color: f === 'Free' ? 'var(--green)' : 'var(--navy)' }}>{f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Processing Times */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', background: 'var(--navy)', color: 'var(--white)' }}>
                <h3 style={{ color: 'var(--white)', fontSize: '1.1rem' }}>Processing Times</h3>
              </div>
              <div style={{ padding: '16px 20px' }}>
                {[
                  { service: 'Registration (Birth/Marriage/Death)', time: 'Same Day', color: '#065F46', bg: '#D1FAE5' },
                  { service: 'CTC / CRF Copy', time: 'Same Day', color: '#065F46', bg: '#D1FAE5' },
                  { service: 'BREQS Request', time: '3–5 Working Days', color: '#1E40AF', bg: '#DBEAFE' },
                  { service: 'Marriage License', time: '10 Days (mandatory posting)', color: '#92400E', bg: '#FEF3C7' },
                  { service: 'R.A. 9048 Correction', time: '30–90 Days', color: '#991B1B', bg: '#FEE2E2' },
                  { service: 'R.A. 10172 Correction', time: '30–90 Days', color: '#991B1B', bg: '#FEE2E2' },
                  { service: 'Legitimation', time: '30–60 Days', color: '#92400E', bg: '#FEF3C7' },
                  { service: 'Delayed Registration', time: '3–6 Months (PSA)', color: '#991B1B', bg: '#FEE2E2' },
                ].map(row => (
                  <div key={row.service} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid var(--gray-100)' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--gray-700)' }}>{row.service}</span>
                    <span style={{ background: row.bg, color: row.color, borderRadius: 20, padding: '3px 12px', fontSize: '0.75rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{row.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ padding: 'var(--section-py) 24px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">Got questions?</div>
            <h2 className="section-title">Frequently Asked Questions</h2>
          </div>
          <Accordion items={FAQS} />
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ background: 'var(--gray-50)', padding: 'var(--section-py) 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div className="section-eyebrow">Find us</div>
            <h2 className="section-title">Contact & Location</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginBottom: 40 }}>
            {/* Address */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>📍</div>
              <h3 style={{ marginBottom: 8 }}>Office Address</h3>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>
                Municipal Civil Registrar's Office<br />
                Municipal Hall, General Luna<br />
                Quezon Province, Philippines
              </p>
            </div>
            {/* Hours */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🕐</div>
              <h3 style={{ marginBottom: 8 }}>Office Hours</h3>
              <p style={{ color: 'var(--gray-600)', lineHeight: 1.7 }}>
                Monday – Friday<br />
                8:00 AM – 5:00 PM<br />
                <span style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>Closed on weekends & holidays</span>
              </p>
            </div>
            {/* Facebook */}
            <div className="card" style={{ padding: '28px' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>📱</div>
              <h3 style={{ marginBottom: 8 }}>Connect With Us</h3>
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1877F2', color: '#fff', borderRadius: 8, padding: '10px 20px', fontWeight: 600, fontSize: '0.9rem', marginTop: 8 }}>
                Facebook Page →
              </a>
            </div>
          </div>
          {/* Google Maps */}
          <div style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden', boxShadow: 'var(--shadow-md)', height: 400 }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3893.5!2d122.07!3d13.73!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zM5QC+8CX+General+Luna,+Quezon!5e0!3m2!1sen!2sph!4v1"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy"
              title="MCRO Location"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ background: 'var(--navy)', color: 'rgba(255,255,255,.7)' }}>
        <div style={{ height: 4, background: 'var(--gold)' }} />
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '64px 24px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 48 }}>
          {/* Brand */}
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--white)', marginBottom: 12 }}>MCRO</div>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.7, marginBottom: 16 }}>Municipal Civil Registrar's Office<br />General Luna, Quezon</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,.4)', lineHeight: 1.6 }}>
              In accordance with R.A. 10173 (Data Privacy Act of 2012), all personal information collected is protected and used solely for civil registry purposes.
            </p>
          </div>
          {/* Quick Links */}
          <div>
            <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>Quick Links</h4>
            {['#services', '#requirements', '#fees', '#faq', '#contact'].map(href => (
              <a key={href} href={href} style={{ display: 'block', marginBottom: 10, fontSize: '0.9rem', transition: 'color .15s' }}
                onMouseEnter={e => e.target.style.color = 'var(--gold)'}
                onMouseLeave={e => e.target.style.color = 'rgba(255,255,255,.7)'}
              >{href.slice(1).charAt(0).toUpperCase() + href.slice(2)}</a>
            ))}
          </div>
          {/* Contact */}
          <div>
            <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>Contact</h4>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.8 }}>
              Municipal Hall, General Luna<br />
              Quezon Province, Philippines<br /><br />
              Mon–Fri · 8:00 AM – 5:00 PM
            </p>
          </div>
          {/* Live Queue mini */}
          <div>
            <h4 style={{ color: 'var(--gold)', fontSize: '0.8rem', letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 20 }}>Live Queue</h4>
            <QueueCard small />
            <p style={{ fontSize: '0.75rem', marginTop: 16, color: 'rgba(255,255,255,.4)' }}>Updates every 2.5 seconds</p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,.08)', padding: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'rgba(255,255,255,.35)' }}>
          Affiliated with PSA · PhilSys · LGU General Luna · Province of Quezon
        </div>
      </footer>

      {/* Scroll to Top */}
      {showTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 99,
            width: 48, height: 48,
            background: 'var(--navy)',
            color: 'var(--gold)',
            border: '2px solid var(--gold)',
            borderRadius: '50%',
            fontSize: '1.25rem',
            boxShadow: 'var(--shadow-lg)',
            transition: 'transform .2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-3px)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'none'}
        >↑</button>
      )}
    </div>
  )
}
