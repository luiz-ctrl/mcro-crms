import { useState, useEffect, useRef, useCallback } from 'react';
import API from '../utils/api.js';

/* ─────────────────────────────────────────────────────────────
   ARIA — Admin Registry Intelligence Assistant
   Powered by Google Gemini 2.5 Flash (FREE — 500 req/day)

   SETUP (one-time):
   1. Go to https://aistudio.google.com/app/apikey
   2. Click "Create API Key" — it's free, no credit card needed
   3. In your project root create a .env file and add:
        VITE_GEMINI_KEY=AIzaSy...your_key_here
   4. For Vercel: Settings → Environment Variables → add:
        VITE_GEMINI_KEY = AIzaSy...your_key_here
   5. Redeploy: vercel --prod

   MODEL: gemini-2.5-flash (free tier — 10 RPM, 500 RPD)
   Gemini 1.5-flash and 2.0-flash are deprecated as of 2026.
   ───────────────────────────────────────────────────────────── */

const GEMINI_KEY = import.meta.env.VITE_GEMINI_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

/* ── Real transaction types (mirrors Reports.jsx) ────────── */
const TRANSACTION_TYPES = [
  'ON-TIME REGISTRATION OF BIRTH',
  'ON-TIME REGISTRATION OF MARRIAGE',
  'ON-TIME REGISTRATION OF DEATH',
  'DELAYED REGISTRATION OF BIRTH',
  'BRAP DELAYED REGISTRATION OF BIRTH',
  'CTC OF BIRTH',
  'CTC OF MARRIAGE',
  'CTC OF DEATH',
  'BREQS BIRTH - REQUEST',
  'BREQS BIRTH - CLAIMED',
  'BREQS MARRIAGE - REQUEST',
  'BREQS MARRIAGE - CLAIMED',
  'BREQS DEATH - REQUEST',
  'BREQS DEATH - CLAIMED',
  'BREQS CENOMAR - REQUEST',
  'BREQS CENOMAR - CLAIMED',
  'MARRIAGE APPLICANT',
  'COURT DECREE',
  'LEGITIMATION',
  'R.A. 9048',
  'MIGRANT PETITION',
  'R.A. 10172',
  'SUPPLEMENTAL',
];

/* ── Mock data fallback ──────────────────────────────────── */
const MOCK_DATA = {
  _source: 'mock',
  summary: { total: 1284, pending: 18, processing: 7, completed: 1259, today: 14, thisMonth: 91 },
  topTransactions: [
    { transaction_type: 'CTC OF BIRTH',                  count: '312' },
    { transaction_type: 'CTC OF MARRIAGE',               count: '198' },
    { transaction_type: 'BREQS BIRTH - REQUEST',         count: '154' },
    { transaction_type: 'CTC OF DEATH',                  count: '133' },
    { transaction_type: 'MARRIAGE APPLICANT',            count: '89'  },
    { transaction_type: 'DELAYED REGISTRATION OF BIRTH', count: '67'  },
    { transaction_type: 'ON-TIME REGISTRATION OF BIRTH', count: '54'  },
    { transaction_type: 'R.A. 9048',                     count: '31'  },
  ],
  monthly: [
    { month: 'Nov', count: '138' },
    { month: 'Dec', count: '112' },
    { month: 'Jan', count: '167' },
    { month: 'Feb', count: '143' },
    { month: 'Mar', count: '189' },
    { month: 'Apr', count: '91'  },
  ],
  statusDist: [
    { status: 'Pending',    count: '18'   },
    { status: 'Processing', count: '7'    },
    { status: 'Completed',  count: '1259' },
  ],
  queue: {
    today: { totalIssued: 22, totalServed: 19, abandoned: 3, avgWaitMin: 14, nowServing: 20 },
    weeklyAvg: { dailyIssued: 18.4, avgWaitMin: 13.9 },
  },
};

/* ── Quick-prompt chips ──────────────────────────────────── */
const QUICK_PROMPTS = [
  'What are the top transactions this month?',
  'How many records are still pending?',
  "What's today's queue status?",
  'Which document type is most requested?',
  'Give me a quick summary of this month.',
  'Any records that need attention?',
];

/* ── System prompt ───────────────────────────────────────── */
function buildSystemPrompt(data) {
  const src = data._source === 'mock' ? ' (DEMO — mock data, not live)' : ' (live data)';
  return `You are ARIA (Admin Registry Intelligence Assistant), the AI analytics assistant embedded in the MCRO General Luna admin panel.

You help admin staff of the Municipal Civil Registrar's Office, General Luna, Quezon, Philippines understand their civil registry data at a glance.

DATA SNAPSHOT${src}:
${JSON.stringify(data, null, 2)}

TRANSACTION TYPES used at this office:
${TRANSACTION_TYPES.join(', ')}

YOUR STYLE:
- Professional but warm — like a sharp, helpful colleague
- Always cite specific numbers; never say "some" or "several" when you have exact data
- Keep answers to 2–4 sentences unless detail is explicitly asked for
- Compute % changes when comparing periods and state direction (↑ up / ↓ down)
- Use ₱ for peso amounts
- If data is mock/demo, mention it once briefly then move on
- Offer one proactive observation at the end when relevant ("Also worth noting: …")
- If asked something outside your data, say so briefly

TOPICS YOU CAN HELP WITH:
- Record counts by status (Pending / Processing / Completed)
- Top transaction types and their volumes
- Monthly volume trends (last 6 months)
- Today's count and this month's running total
- Queue performance: issued, served, abandoned, avg wait time
- Which document types or statuses may need staff attention`;
}

/* ── Gemini API call ─────────────────────────────────────── */
async function callGemini(systemPrompt, messages) {
  if (!GEMINI_KEY) {
    throw new Error('VITE_GEMINI_KEY is not set. Add it to your .env file.');
  }

  // Gemini needs the system prompt injected as the first user turn
  // then alternating user/model turns
  const contents = [
    // System context as first user message
    {
      role: 'user',
      parts: [{ text: systemPrompt }],
    },
    // Acknowledge system context
    {
      role: 'model',
      parts: [{ text: 'Understood. I am ARIA, ready to help with MCRO analytics.' }],
    },
    // Actual conversation
    ...messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    })),
  ];

  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        temperature: 0.7,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `Gemini error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty response from Gemini');
  return text;
}

/* ── Fetch live context ──────────────────────────────────── */
async function fetchLiveContext() {
  try {
    const [summaryRes, topTxRes, statusRes] = await Promise.all([
      API.get('/analytics/summary'),
      API.get('/analytics/top-transactions'),
      API.get('/analytics/status-distribution'),
    ]);

    let queueData = MOCK_DATA.queue;
    try {
      const qRes = await API.get('/queue');
      // Map /queue response shape to what ARIA expects
      const stats = qRes.data?.stats || {};
      queueData = {
        today: {
          totalIssued:  stats.total    ?? 0,
          totalServed:  stats.served   ?? 0,
          abandoned:    0,
          avgWaitMin:   14,
          nowServing:   qRes.data?.current?.number ?? null,
        },
        weeklyAvg: MOCK_DATA.queue.weeklyAvg,
      };
    } catch { /* use mock queue */ }

    return {
      _source:         'live',
      fetchedAt:       new Date().toISOString(),
      summary:         summaryRes.data,
      topTransactions: topTxRes.data.topTransactions || [],
      monthly:         topTxRes.data.monthly || [],
      statusDist:      statusRes.data.statusDist || [],
      sexDist:         statusRes.data.sexDist || [],
      queue:           queueData,
    };
  } catch {
    return { ...MOCK_DATA, _source: 'mock' };
  }
}

/* ══════════════════════════════════════════════════════════
   Component
   ══════════════════════════════════════════════════════════ */
export default function MCROAdminAI() {
  const [open, setOpen]             = useState(false);
  const [messages, setMessages]     = useState([]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [ctxLoading, setCtxLoading] = useState(false);
  const [context, setContext]       = useState(null);
  const [pulseBadge, setPulseBadge] = useState(true);
  const [error, setError]           = useState('');
  const bottomRef                   = useRef(null);
  const inputRef                    = useRef(null);
  const contextRef                  = useRef(null);

  useEffect(() => {
    if (open && !context) {
      setCtxLoading(true);
      fetchLiveContext().then(data => {
        setContext(data);
        contextRef.current = data;
        setCtxLoading(false);
      });
    }
    if (open) setPulseBadge(false);
  }, [open, context]);

  useEffect(() => { contextRef.current = context; }, [context]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 160);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    setInput('');
    setError('');

    const userMsg = { role: 'user', content: userText };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setLoading(true);

    const ctx = contextRef.current || MOCK_DATA;

    try {
      const reply = await callGemini(buildSystemPrompt(ctx), updated);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      const msg = err.message.includes('VITE_GEMINI_KEY')
        ? '⚙️ Gemini API key not configured. Add VITE_GEMINI_KEY to your .env file.'
        : err.message.includes('API_KEY_INVALID')
        ? '🔑 Invalid Gemini API key. Check your VITE_GEMINI_KEY in Vercel settings.'
        : `Sorry, I couldn't get a response right now. (${err.message})`;
      setMessages(prev => [...prev, { role: 'assistant', content: msg }]);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages]);

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── KPI values ───────────────────────────────────────── */
  const ctx        = context || MOCK_DATA;
  const isLive     = ctx._source === 'live';
  const totalTx    = ctx.summary?.total ?? '—';
  const pending    = ctx.summary?.pending ?? '—';
  const today      = ctx.summary?.today ?? '—';
  const qServed    = ctx.queue?.today?.totalServed ?? '—';
  const qIssued    = ctx.queue?.today?.totalIssued ?? '—';
  const qWait      = ctx.queue?.today?.avgWaitMin ?? '—';
  const pendingNum = parseInt(pending) || 0;
  const pendingColor = pendingNum > 10 ? 'var(--red)' : pendingNum > 0 ? 'var(--yellow)' : 'var(--green)';

  const noKey = !GEMINI_KEY;

  return (
    <>
      <style>{`
        .aria-wrap * { box-sizing: border-box; }

        .aria-fab {
          position: fixed; bottom: 26px; right: 26px; z-index: 9990;
          width: 50px; height: 50px; border-radius: 50%;
          background: var(--navy, #0f2044); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #fff;
          box-shadow: 0 4px 16px rgba(15,32,68,.35), 0 0 0 0 rgba(201,151,58,.4);
          transition: transform .18s ease, box-shadow .18s ease;
        }
        .aria-fab:hover { transform: scale(1.07); box-shadow: 0 6px 22px rgba(15,32,68,.45); }
        .aria-fab.pulsing { animation: ariaPulse 2.2s ease infinite; }
        @keyframes ariaPulse {
          0%  { box-shadow: 0 4px 16px rgba(15,32,68,.35), 0 0 0 0 rgba(201,151,58,.5); }
          65% { box-shadow: 0 4px 16px rgba(15,32,68,.35), 0 0 0 12px rgba(201,151,58,0); }
          100%{ box-shadow: 0 4px 16px rgba(15,32,68,.35), 0 0 0 0 rgba(201,151,58,0); }
        }
        .aria-fab-dot {
          position: absolute; top: 2px; right: 2px;
          width: 12px; height: 12px;
          background: var(--gold, #c9973a); border-radius: 50%;
          border: 2px solid #fff;
        }

        .aria-panel {
          position: fixed; bottom: 84px; right: 26px; z-index: 9991;
          width: min(390px, calc(100vw - 34px));
          height: min(570px, calc(100svh - 108px));
          background: var(--white, #fff);
          border-radius: var(--radius, 12px);
          border: 1px solid var(--gray-100, #f3f4f6);
          box-shadow: var(--shadow-lg, 0 10px 30px rgba(0,0,0,.10)), 0 0 0 1px rgba(15,32,68,.04);
          display: flex; flex-direction: column; overflow: hidden;
          transform-origin: bottom right;
          animation: ariaOpen .2s cubic-bezier(.22,1,.36,1) both;
        }
        @keyframes ariaOpen {
          from { opacity:0; transform: scale(.9) translateY(8px); }
          to   { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes ariaIn {
          from { opacity:0; transform: translateY(4px); }
          to   { opacity:1; transform: translateY(0); }
        }

        .aria-header {
          background: var(--navy-card-bg, linear-gradient(135deg,#0f2044 0%,#1a3a70 100%));
          padding: 13px 15px 11px;
          display: flex; align-items: center; gap: 10px; flex-shrink: 0;
        }
        .aria-av {
          width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
          background: rgba(201,151,58,.15); border: 1.5px solid rgba(201,151,58,.4);
          display: flex; align-items: center; justify-content: center;
        }
        .aria-hname {
          font-family: var(--font-display,'Sora',sans-serif);
          font-size: 13px; font-weight: 600; color: #fff; line-height: 1.2;
        }
        .aria-hbadge {
          display: inline-block; font-size: 8px; font-weight: 700;
          background: rgba(201,151,58,.25); color: #f4d03f;
          border: 1px solid rgba(201,151,58,.35);
          border-radius: 4px; padding: 1px 5px;
          letter-spacing: .05em; text-transform: uppercase;
          margin-left: 5px; vertical-align: middle;
        }
        .aria-hsub {
          font-size: 10px; color: rgba(255,255,255,.45); margin-top: 1px;
          display: flex; align-items: center; gap: 4px;
        }
        .aria-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
        .aria-dot.live    { background: #4ade80; box-shadow: 0 0 5px #4ade80; }
        .aria-dot.mock    { background: var(--yellow,#d97706); }
        .aria-dot.loading { background: var(--gray-400,#9ca3af); animation: blink .8s ease infinite; }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.25} }
        .aria-xbtn {
          margin-left: auto; background: rgba(255,255,255,.1); border: none;
          border-radius: var(--radius-xs,6px); width: 27px; height: 27px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: rgba(255,255,255,.6); font-size: 13px;
          transition: background .13s, color .13s; flex-shrink: 0;
        }
        .aria-xbtn:hover { background: rgba(255,255,255,.2); color: #fff; }

        /* No-key warning banner */
        .aria-nokey {
          background: #fffbeb; border-bottom: 1px solid #fde68a;
          padding: 8px 14px; font-size: 11px; color: #92400e;
          flex-shrink: 0; display: flex; gap: 7px; align-items: flex-start;
          line-height: 1.5;
        }
        .aria-nokey a { color: #b45309; font-weight: 600; }

        .aria-kpis {
          background: var(--gray-50,#f9fafb);
          border-bottom: 1px solid var(--gray-100,#f3f4f6);
          padding: 6px 12px; display: flex; flex-shrink: 0;
          overflow-x: auto; scrollbar-width: none;
        }
        .aria-kpis::-webkit-scrollbar { display: none; }
        .aria-kpi {
          flex: 1; min-width: 48px; display: flex; flex-direction: column;
          align-items: center; gap: 1px; padding: 2px 5px;
        }
        .aria-kpi + .aria-kpi { border-left: 1px solid var(--gray-200,#e5e7eb); }
        .aria-kv {
          font-family: var(--font-display,'Sora',sans-serif);
          font-size: 13.5px; font-weight: 700; color: var(--navy,#0f2044);
          line-height: 1; white-space: nowrap;
        }
        .aria-kl {
          font-size: 8.5px; font-weight: 600; text-transform: uppercase;
          letter-spacing: .05em; color: var(--gray-400,#9ca3af); white-space: nowrap;
        }

        .aria-body {
          flex:1; overflow-y: auto; padding: 13px 11px 4px;
          display: flex; flex-direction: column; gap: 9px;
          scrollbar-width: thin; scrollbar-color: var(--gray-200,#e5e7eb) transparent;
        }
        .aria-body::-webkit-scrollbar { width: 3px; }
        .aria-body::-webkit-scrollbar-thumb { background: var(--gray-200,#e5e7eb); border-radius: 99px; }

        .aria-empty {
          flex:1; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          padding: 14px; text-align: center; gap: 7px;
          animation: ariaIn .3s ease .05s both;
        }
        .aria-eicon {
          width: 44px; height: 44px; border-radius: 50%;
          background: linear-gradient(135deg,rgba(15,32,68,.06),rgba(201,151,58,.1));
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; margin-bottom: 2px;
        }
        .aria-etitle {
          font-family: var(--font-display,'Sora',sans-serif);
          font-size: 13.5px; font-weight: 600; color: var(--navy,#0f2044);
        }
        .aria-esub { font-size: 11px; color: var(--gray-400,#9ca3af); line-height: 1.6; max-width: 210px; }
        .aria-chips { display: flex; flex-wrap: wrap; gap: 5px; justify-content: center; margin-top: 2px; }
        .aria-chip {
          background: var(--white,#fff); border: 1px solid var(--gray-200,#e5e7eb);
          border-radius: var(--radius-pill,999px); padding: 4px 10px;
          font-size: 11px; font-weight: 500; color: var(--gray-600,#4b5563);
          cursor: pointer; font-family: var(--font-body,'DM Sans',sans-serif);
          transition: background .12s, border-color .12s, color .12s;
        }
        .aria-chip:hover { background: var(--navy,#0f2044); border-color: var(--navy,#0f2044); color: #fff; }
        .aria-chip:disabled { opacity: .5; cursor: not-allowed; }

        .aria-msg { display: flex; gap: 7px; align-items: flex-end; animation: ariaIn .2s ease both; }
        .aria-msg.user { flex-direction: row-reverse; }
        .aria-mav {
          width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center; font-size: 10px;
          margin-bottom: 1px;
        }
        .aria-mav.ai  { background: rgba(15,32,68,.07); border: 1px solid var(--gray-100,#f3f4f6); color: var(--navy,#0f2044); }
        .aria-mav.usr { background: var(--gray-100,#f3f4f6); }
        .aria-bub {
          max-width: 85%; padding: 8px 11px;
          border-radius: var(--radius,12px); border-bottom-left-radius: 3px;
          font-size: 12.5px; line-height: 1.65;
          color: var(--gray-800,#1f2937);
          background: var(--gray-50,#f9fafb);
          border: 1px solid var(--gray-100,#f3f4f6);
          white-space: pre-wrap; word-break: break-word;
        }
        .aria-msg.user .aria-bub {
          background: var(--navy,#0f2044); border-color: var(--navy,#0f2044);
          color: #fff; border-bottom-right-radius: 3px; border-bottom-left-radius: var(--radius,12px);
        }

        .aria-typing {
          display: flex; align-items: center; gap: 4px; padding: 8px 11px;
          background: var(--gray-50,#f9fafb);
          border: 1px solid var(--gray-100,#f3f4f6);
          border-radius: var(--radius,12px); border-bottom-left-radius: 3px; width: fit-content;
        }
        .aria-typing span {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--gray-400,#9ca3af); animation: dot 1.1s ease infinite;
        }
        .aria-typing span:nth-child(2){animation-delay:.16s}
        .aria-typing span:nth-child(3){animation-delay:.32s}
        @keyframes dot{0%,80%,100%{transform:scale(.6);opacity:.3}40%{transform:scale(1);opacity:1}}

        .aria-inputbar {
          padding: 8px 10px 10px; border-top: 1px solid var(--gray-100,#f3f4f6);
          display: flex; gap: 6px; align-items: flex-end;
          background: var(--white,#fff); flex-shrink: 0;
        }
        .aria-ta {
          flex:1; resize: none; border: 1px solid var(--gray-200,#e5e7eb);
          border-radius: var(--radius-xs,6px); padding: 7px 10px;
          font-size: 12.5px; font-family: var(--font-body,'DM Sans',system-ui,sans-serif);
          color: var(--gray-800,#1f2937); background: var(--gray-50,#f9fafb);
          outline: none; line-height: 1.5; min-height: 34px; max-height: 88px;
          transition: border-color .14s, box-shadow .14s;
        }
        .aria-ta:focus { border-color: var(--blue,#2563eb); box-shadow: 0 0 0 3px rgba(37,99,235,.1); background: var(--white,#fff); }
        .aria-ta::placeholder { color: var(--gray-400,#9ca3af); }
        .aria-sendbtn {
          width: 32px; height: 32px; border-radius: var(--radius-xs,6px);
          background: var(--navy,#0f2044); border: none; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          color: #fff; flex-shrink: 0;
          transition: background .14s, transform .11s, opacity .14s;
        }
        .aria-sendbtn:hover:not(:disabled) { background: var(--navy-mid,#1a3260); transform: scale(1.05); }
        .aria-sendbtn:disabled { opacity: .38; cursor: not-allowed; }

        .aria-foot {
          padding: 0 10px 9px; display: flex; align-items: center; gap: 6px;
          background: var(--white,#fff); flex-shrink: 0;
        }
        .aria-flink {
          background: none; border: none; font-size: 10px;
          color: var(--gray-400,#9ca3af); cursor: pointer; padding: 1px 3px;
          font-family: var(--font-body,'DM Sans',sans-serif);
          display: flex; align-items: center; gap: 3px; transition: color .13s;
        }
        .aria-flink:hover { color: var(--navy,#0f2044); }
        .aria-srctag {
          margin-left: auto; font-size: 9px; font-weight: 600;
          padding: 2px 7px; border-radius: var(--radius-pill,999px);
          text-transform: uppercase; letter-spacing: .04em;
        }
        .aria-srctag.live { background: var(--green-light,#f0fdf4); color: var(--green,#16a34a); }
        .aria-srctag.mock { background: var(--yellow-light,#fffbeb); color: var(--yellow,#d97706); }

        @media (max-width: 480px) {
          .aria-fab   { bottom: 14px; right: 14px; }
          .aria-panel { bottom: 72px; right: 8px; left: 8px; width: auto; }
        }
      `}</style>

      <div className="aria-wrap">

        {/* FAB */}
        <button
          className={`aria-fab${pulseBadge ? ' pulsing' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-label="Toggle ARIA assistant"
          aria-expanded={open}
          title="ARIA — Powered by Gemini 2.5 Flash"
        >
          {open ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              <line x1="9" y1="10" x2="15" y2="10"/><line x1="9" y1="14" x2="13" y2="14"/>
            </svg>
          )}
          {pulseBadge && !open && <span className="aria-fab-dot" />}
        </button>

        {/* Panel */}
        {open && (
          <div className="aria-panel" role="dialog" aria-label="ARIA Admin Assistant">

            {/* Header */}
            <div className="aria-header">
              <div className="aria-av">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(201,151,58,.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="aria-hname">
                  ARIA
                  <span className="aria-hbadge">Gemini 2.5</span>
                </div>
                <div className="aria-hsub">
                  <span className={`aria-dot ${ctxLoading ? 'loading' : isLive ? 'live' : 'mock'}`} />
                  {ctxLoading ? 'Loading analytics…' : isLive ? 'Live · MCRO General Luna' : 'Demo mode · MCRO General Luna'}
                </div>
              </div>
              <button className="aria-xbtn" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>

            {/* No API key warning */}
            {noKey && (
              <div className="aria-nokey">
                ⚙️ <span>
                  Gemini key not set. Get a free key at{' '}
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">
                    aistudio.google.com
                  </a>
                  , then add <strong>VITE_GEMINI_KEY</strong> to your <code>.env</code> or Vercel environment variables and redeploy.
                </span>
              </div>
            )}

            {/* KPI strip */}
            <div className="aria-kpis">
              <div className="aria-kpi">
                <span className="aria-kv">{typeof totalTx === 'number' ? totalTx.toLocaleString() : totalTx}</span>
                <span className="aria-kl">Records</span>
              </div>
              <div className="aria-kpi">
                <span className="aria-kv" style={{ color: pendingColor }}>{pending}</span>
                <span className="aria-kl">Pending</span>
              </div>
              <div className="aria-kpi">
                <span className="aria-kv">{today}</span>
                <span className="aria-kl">Today</span>
              </div>
              <div className="aria-kpi">
                <span className="aria-kv">{qServed}<span style={{ fontSize: 9, fontWeight: 400 }}>/{qIssued}</span></span>
                <span className="aria-kl">Queue</span>
              </div>
              <div className="aria-kpi">
                <span className="aria-kv">{qWait}<span style={{ fontSize: 9, fontWeight: 400 }}> min</span></span>
                <span className="aria-kl">Avg wait</span>
              </div>
            </div>

            {/* Body */}
            {messages.length === 0 ? (
              <div className="aria-empty">
                <div className="aria-eicon">📊</div>
                <div className="aria-etitle">How can I help today?</div>
                <div className="aria-esub">
                  Ask me about records, pending items, transaction trends, or queue stats.
                </div>
                <div className="aria-chips">
                  {QUICK_PROMPTS.map(q => (
                    <button
                      key={q} className="aria-chip"
                      onClick={() => sendMessage(q)}
                      disabled={ctxLoading || noKey}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="aria-body">
                {messages.map((m, i) => (
                  <div key={i} className={`aria-msg${m.role === 'user' ? ' user' : ''}`}>
                    <div className={`aria-mav ${m.role === 'user' ? 'usr' : 'ai'}`}>
                      {m.role === 'assistant' ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                        </svg>
                      ) : '👤'}
                    </div>
                    <div className="aria-bub">{m.content}</div>
                  </div>
                ))}
                {loading && (
                  <div className="aria-msg">
                    <div className="aria-mav ai">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                      </svg>
                    </div>
                    <div className="aria-typing"><span /><span /><span /></div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>
            )}

            {/* Input */}
            <div className="aria-inputbar">
              <textarea
                ref={inputRef}
                className="aria-ta"
                rows={1}
                placeholder={noKey ? 'Add VITE_GEMINI_KEY to enable chat…' : 'Ask about records, queue, trends…'}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKey}
                disabled={loading || ctxLoading || noKey}
              />
              <button
                className="aria-sendbtn"
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading || ctxLoading || noKey}
                aria-label="Send"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
                </svg>
              </button>
            </div>

            {/* Footer */}
            <div className="aria-foot">
              {messages.length > 0 && (
                <button className="aria-flink" onClick={() => setMessages([])}>✕ Clear</button>
              )}
              <button className="aria-flink" onClick={() => setContext(null)}>↺ Refresh data</button>
              <span className={`aria-srctag ${isLive ? 'live' : 'mock'}`}>
                {isLive ? '● Live' : '◌ Demo'}
              </span>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
