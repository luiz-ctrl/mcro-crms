import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// ── Login rate limiter (in-memory) ───────────────────────────────────────────
// Binibilang ang bilang ng failed login attempts bawat IP address.
// Kapag umabot na sa 10 tries sa loob ng 15 minuto, ibo-block muna.
const loginAttempts = new Map(); // { ip → { count, resetAt } }
const MAX_ATTEMPTS  = 10;
const WINDOW_MS     = 15 * 60 * 1000; // 15 minuto

function checkLoginRateLimit(ip) {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  // Kung wala pang record o expired na ang window, magsimula ulit
  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return null; // OK — pwede pa mag-login
  }

  // Kung hindi pa umabot sa limit, dagdagan lang ang count
  if (entry.count < MAX_ATTEMPTS) {
    entry.count++;
    return null; // OK pa rin
  }

  // Umabot na sa limit — ibalik ang remaining time para sa error message
  const minutesLeft = Math.ceil((entry.resetAt - now) / 60000);
  return minutesLeft;
}

function resetLoginAttempts(ip) {
  loginAttempts.delete(ip); // I-clear pagka-successful login
}

// Linisin ang lumang entries tuwing 30 minuto para hindi lumaki ang memory
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of loginAttempts.entries()) {
    if (now > entry.resetAt) loginAttempts.delete(ip);
  }
}, 30 * 60 * 1000);

const SECRET = process.env.JWT_SECRET || 'af7ab2a0e0109dfc11f46a77fd576d89ce0ef1c4003c8b207fb4d75beeaf52da22784eff0d84b1ab59a9d87d3c59475ed2c26a4252b6d6e2052efc0cc1adaa81';
if (!process.env.JWT_SECRET) {
  console.warn('[mcro-crms] JWT_SECRET is not set; using a built-in default. Set JWT_SECRET in production.');
}

let pool;
function getPool() {
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  return pool;
}
async function query(text, params) { return getPool().query(text, params); }

function signToken(payload) { return jwt.sign(payload, SECRET, { expiresIn: '8h' }); }
function verifyToken(token) { return jwt.verify(token, SECRET); }
function authMiddleware(req) {
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) throw new Error('Unauthorized');
  return verifyToken(token);
}
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

export default async function handler(req, res) {
  cors(res);
  if (req.method === 'OPTIONS') return res.status(200).end();

  const url = req.url.replace(/^\/api/, '').split('?')[0];
  const parts = url.split('/').filter(Boolean);
  const method = req.method;

  if (url === '/auth/login' && method === 'POST') {
    try {
      // Kunin ang IP address ng nag-request
      const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';

      // Suriin kung hindi pa naka-block ang IP na ito
      const blockedMinutes = checkLoginRateLimit(ip);
      if (blockedMinutes !== null) {
        return res.status(429).json({
          error: `Masyadong maraming pagtatangka. Subukan ulit pagkatapos ng ${blockedMinutes} minuto.`
        });
      }

      const { username, password } = req.body;
      if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
      const result = await query('SELECT * FROM users WHERE username = $1', [username]);
      const user = result.rows[0];
      if (!user) return res.status(401).json({ error: 'Invalid credentials' });
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      // Matagumpay na login — i-clear ang attempts para sa IP na ito
      resetLoginAttempts(ip);

      const token = signToken({ id: user.id, username: user.username, role: user.role });
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'LOGIN', `User ${user.username} logged in`]);
      return res.status(200).json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (err) { return res.status(500).json({ error: 'Server error', detail: err.message }); }
  }

  if (url === '/analytics/summary' && method === 'GET') {
    try {
      authMiddleware(req);
      const barangay = req.query?.barangay;
      let conditions = [], params = [], idx = 1;
      if (barangay) { conditions.push(`address = $${idx++}`); params.push(barangay); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const [total, pending, processing, completed, today, thisMonth] = await Promise.all([
        query(`SELECT COUNT(*) FROM records ${where}`, params),
        query(`SELECT COUNT(*) FROM records ${where ? where + ' AND' : 'WHERE'} status='Pending'`, params),
        query(`SELECT COUNT(*) FROM records ${where ? where + ' AND' : 'WHERE'} status='Processing'`, params),
        query(`SELECT COUNT(*) FROM records ${where ? where + ' AND' : 'WHERE'} status='Completed'`, params),
        query(`SELECT COUNT(*) FROM records ${where ? where + ' AND' : 'WHERE'} DATE(date)=CURRENT_DATE`, params),
        query(`SELECT COUNT(*) FROM records ${where ? where + ' AND' : 'WHERE'} DATE_TRUNC('month',date)=DATE_TRUNC('month',CURRENT_DATE)`, params),
      ]);
      return res.status(200).json({ total: parseInt(total.rows[0].count), pending: parseInt(pending.rows[0].count), processing: parseInt(processing.rows[0].count), completed: parseInt(completed.rows[0].count), today: parseInt(today.rows[0].count), thisMonth: parseInt(thisMonth.rows[0].count) });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  if (url === '/analytics/top-transactions' && method === 'GET') {
    try {
      authMiddleware(req);
      const [topTx, monthly] = await Promise.all([
        query(`SELECT transaction_type, COUNT(*) as count FROM records GROUP BY transaction_type ORDER BY count DESC LIMIT 10`),
        query(`SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') as month, COUNT(*) as count FROM records WHERE created_at >= NOW() - INTERVAL '6 months' GROUP BY DATE_TRUNC('month', created_at) ORDER BY DATE_TRUNC('month', created_at)`),
      ]);
      return res.status(200).json({ topTransactions: topTx.rows, monthly: monthly.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/analytics/status-distribution' && method === 'GET') {
    try {
      authMiddleware(req);
      const [statusDist, sexDist] = await Promise.all([
        query(`SELECT status, COUNT(*) as count FROM records GROUP BY status`),
        query(`SELECT sex, COUNT(*) as count FROM records GROUP BY sex`),
      ]);
      return res.status(200).json({ statusDist: statusDist.rows, sexDist: sexDist.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/analytics/barangay-distribution' && method === 'GET') {
    try {
      authMiddleware(req);
      const result = await query(`SELECT address, COUNT(*) as count FROM records WHERE address IS NOT NULL AND address != '' GROUP BY address ORDER BY count DESC LIMIT 15`);
      return res.status(200).json({ barangayDist: result.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/audit' && method === 'GET') {
    try {
      authMiddleware(req);
      const { page = 1, limit = 30, search, action } = req.query;
      const offset = (page - 1) * limit;
      let conditions = [], params = [], idx = 1;
      if (search) { conditions.push(`(al.description ILIKE $${idx} OR u.email ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
      if (action) { conditions.push(`al.action = $${idx++}`); params.push(action); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await query(`SELECT COUNT(*) FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${where}`, params);
      params.push(parseInt(limit), offset);
      const result = await query(`SELECT al.id, al.action, al.description, al.created_at, u.email as user_email FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ${where} ORDER BY al.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`, params);
      return res.status(200).json({ logs: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page) });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/records' && method === 'GET') {
    try {
      authMiddleware(req);
      const { search, status, transaction_type, date_from, date_to, page = 1, limit = 15 } = req.query;
      const offset = (page - 1) * limit;
      let conditions = [], params = [], idx = 1;
      if (search) { conditions.push(`(client_name ILIKE $${idx} OR document_owner_name ILIKE $${idx} OR mobile_number ILIKE $${idx})`); params.push(`%${search}%`); idx++; }
      if (status) { conditions.push(`status = $${idx++}`); params.push(status); }
      if (transaction_type) { conditions.push(`transaction_type = $${idx++}`); params.push(transaction_type); }
      if (date_from) { conditions.push(`date >= $${idx++}`); params.push(date_from); }
      if (date_to) { conditions.push(`date <= $${idx++}`); params.push(date_to + ' 23:59:59'); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const countResult = await query(`SELECT COUNT(*) FROM records ${where}`, params);
      params.push(parseInt(limit), offset);
      const result = await query(`SELECT * FROM records ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx+1}`, params);
      return res.status(200).json({ records: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/records' && method === 'POST') {
    try {
      const user = authMiddleware(req);
      const { date, client_name, sex, address, mobile_number, transaction_type, document_owner_name, status } = req.body;
      if (!client_name || !transaction_type) return res.status(400).json({ error: 'Missing required fields' });
      const result = await query(`INSERT INTO records (date, client_name, sex, address, mobile_number, transaction_type, document_owner_name, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [date || new Date(), client_name, sex, address, mobile_number, transaction_type, document_owner_name, status || 'Pending']);
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'CREATE', `Created record for ${client_name} - ${transaction_type}`]);
      return res.status(201).json(result.rows[0]);
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }


  // ── PATCH /records/bulk-status ───────────────────────────────────────────────
  if (url === '/records/bulk-status' && method === 'PATCH') {
    try {
      const user = authMiddleware(req);
      const { ids, status, reason } = req.body || {};
      if (!ids || !Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array is required' });
      if (!status) return res.status(400).json({ error: 'status is required' });
      if (!reason || !reason.trim()) return res.status(400).json({ error: 'reason is required' });
      const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
      await query(`UPDATE records SET status=$${ids.length + 1} WHERE id IN (${placeholders})`, [...ids, status]);
      for (const id of ids) {
        await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'UPDATE', `Bulk status update to "${status}" for record #${id}. Reason: ${reason}`]);
      }
      return res.status(200).json({ updated: ids.length });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  if (parts[0] === 'records' && parts[1] && method === 'PUT') {
    try {
      const user = authMiddleware(req);
      const id = parts[1];
      const { date, client_name, sex, address, mobile_number, transaction_type, document_owner_name, status, reason } = req.body;
      if (!client_name || !transaction_type) return res.status(400).json({ error: 'Missing required fields' });
      const result = await query(`UPDATE records SET date=$1, client_name=$2, sex=$3, address=$4, mobile_number=$5, transaction_type=$6, document_owner_name=$7, status=$8 WHERE id=$9 RETURNING *`, [date || new Date(), client_name, sex || null, address || null, mobile_number || null, transaction_type, document_owner_name || null, status || 'Pending', id]);
      if (result.rows.length === 0) return res.status(404).json({ error: `Record #${id} not found` });
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'UPDATE', `Updated record #${id} for ${client_name}. Reason: ${reason || 'No reason provided'}`]);
      return res.status(200).json(result.rows[0]);
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (parts[0] === 'records' && parts[1] && method === 'DELETE') {
    try {
      const user = authMiddleware(req);
      const id = parts[1];
      const { reason } = req.body || {};
      const existing = await query('SELECT * FROM records WHERE id=$1', [id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: `Record #${id} not found` });
      const rec = existing.rows[0];
      await query('DELETE FROM records WHERE id=$1', [id]);
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'DELETE', `Deleted record #${id} for ${rec.client_name}. Reason: ${reason || 'No reason provided'}`]);
      return res.status(200).json({ message: 'Record deleted successfully' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/queue' && method === 'GET') {
    try {
      const [current, waiting, today_total, today_served] = await Promise.all([
        query(`SELECT * FROM queue WHERE status='serving' ORDER BY called_at DESC LIMIT 1`),
        query(`SELECT * FROM queue WHERE status='waiting' ORDER BY number ASC`),
        query(`SELECT COUNT(*) FROM queue WHERE DATE(created_at)=CURRENT_DATE`),
        query(`SELECT COUNT(*) FROM queue WHERE DATE(created_at)=CURRENT_DATE AND status='done'`),
      ]);
      return res.status(200).json({ current: current.rows[0] || null, waiting: waiting.rows, stats: { total: parseInt(today_total.rows[0].count), served: parseInt(today_served.rows[0].count), waiting: waiting.rows.length } });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/queue' && method === 'POST') {
    try {
      authMiddleware(req);
      const { action, id } = req.body || {};
      if (action === 'issue') {
        let nextNum;
        if (req.body.manualNumber && !isNaN(req.body.manualNumber)) {
          nextNum = parseInt(req.body.manualNumber);
          const exists = await query(`SELECT id FROM queue WHERE number=$1 AND DATE(created_at)=CURRENT_DATE`, [nextNum]);
          if (exists.rows.length > 0) return res.status(400).json({ error: `Ticket number ${nextNum} already exists today` });
        } else {
          const last = await query(`SELECT MAX(number) as max FROM queue WHERE DATE(created_at)=CURRENT_DATE`);
          nextNum = (parseInt(last.rows[0].max) || 0) + 1;
        }
        const result = await query(`INSERT INTO queue (number, status) VALUES ($1, 'waiting') RETURNING *`, [nextNum]);
        return res.status(201).json(result.rows[0]);
      }
      if (action === 'next') {
        await query(`UPDATE queue SET status='done', done_at=NOW() WHERE status='serving'`);
        const next = await query(`SELECT * FROM queue WHERE status='waiting' ORDER BY number ASC LIMIT 1`);
        if (next.rows.length === 0) return res.status(200).json({ message: 'No more waiting', current: null });
        const result = await query(`UPDATE queue SET status='serving', called_at=NOW() WHERE id=$1 RETURNING *`, [next.rows[0].id]);
        return res.status(200).json(result.rows[0]);
      }
      if (action === 'call') {
        await query(`UPDATE queue SET status='done', done_at=NOW() WHERE status='serving'`);
        const result = await query(`UPDATE queue SET status='serving', called_at=NOW() WHERE id=$1 RETURNING *`, [id]);
        return res.status(200).json(result.rows[0]);
      }
      if (action === 'reset') {
        await query(`DELETE FROM queue WHERE DATE(created_at)=CURRENT_DATE`);
        return res.status(200).json({ message: 'Queue reset successfully' });
      }
      return res.status(400).json({ error: 'Invalid action' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/users' && method === 'GET') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const result = await query('SELECT id, email, role, created_at FROM users ORDER BY created_at ASC');
      return res.status(200).json({ users: result.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (url === '/users' && method === 'POST') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { email, password, role } = req.body || {};
      if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
      const hash = await bcrypt.hash(password, 10);
      const result = await query('INSERT INTO users (email, password, role) VALUES ($1,$2,$3) RETURNING id, email, role, created_at', [email, hash, role || 'staff']);
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'CREATE', `Created user: ${email}`]);
      return res.status(201).json(result.rows[0]);
    } catch (err) {
      if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
      return res.status(500).json({ error: err.message });
    }
  }

  if (parts[0] === 'users' && parts[1] && method === 'PUT') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const id = parts[1];
      const { email, password, role } = req.body || {};
      let result;
      if (password) {
        const hash = await bcrypt.hash(password, 10);
        result = await query('UPDATE users SET email=$1, password=$2, role=$3 WHERE id=$4 RETURNING id, email, role', [email, hash, role, id]);
      } else {
        result = await query('UPDATE users SET email=$1, role=$2 WHERE id=$3 RETURNING id, email, role', [email, role, id]);
      }
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json(result.rows[0]);
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  if (parts[0] === 'users' && parts[1] && method === 'DELETE') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const id = parts[1];
      if (parseInt(id) === user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
      const existing = await query('SELECT email FROM users WHERE id=$1', [id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      await query('DELETE FROM users WHERE id=$1', [id]);
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'DELETE', `Deleted user: ${existing.rows[0].email}`]);
      return res.status(200).json({ message: 'User deleted' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // ── GET /announcement ────────────────────────────────────────────────────────
  if (url === '/announcement' && method === 'GET') {
    try {
      const result = await query(`SELECT value FROM settings WHERE key='announcement'`);
      const msg = result.rows[0]?.value || '';
      return res.status(200).json({ message: msg });
    } catch (err) { return res.status(200).json({ message: '' }); }
  }

  // ── POST /announcement ───────────────────────────────────────────────────────
  if (url === '/announcement' && method === 'POST') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { message } = req.body || {};
      await query(`INSERT INTO settings (key, value) VALUES ('announcement', $1) ON CONFLICT (key) DO UPDATE SET value=$1`, [message || '']);
      return res.status(200).json({ message: message || '' });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // ── GET /settings/permissions ────────────────────────────────────────────────
  if (url === '/settings/permissions' && method === 'GET') {
    try {
      authMiddleware(req);
      const result = await query(`SELECT value FROM settings WHERE key='staff_permissions'`);
      const staff = result.rows[0]?.value ? JSON.parse(result.rows[0].value) : null;
      return res.status(200).json({ staff });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── POST /settings/permissions ───────────────────────────────────────────────
  if (url === '/settings/permissions' && method === 'POST') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { staff } = req.body || {};
      if (!staff) return res.status(400).json({ error: 'Missing staff permissions' });
      await query(
        `INSERT INTO settings (key, value) VALUES ('staff_permissions', $1) ON CONFLICT (key) DO UPDATE SET value=$1`,
        [JSON.stringify(staff)]
      );
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)',
        [user.id, 'UPDATE', 'Updated staff role permissions']);
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── GET /settings/office ─────────────────────────────────────────────────────
  if (url === '/settings/office' && method === 'GET') {
    try {
      authMiddleware(req);
      const result = await query(`SELECT value FROM settings WHERE key='office_settings'`);
      const settings = result.rows[0]?.value ? JSON.parse(result.rows[0].value) : {};
      return res.status(200).json(settings);
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── POST /settings/office ────────────────────────────────────────────────────
  if (url === '/settings/office' && method === 'POST') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const settings = req.body || {};
      await query(
        `INSERT INTO settings (key, value) VALUES ('office_settings', $1) ON CONFLICT (key) DO UPDATE SET value=$1`,
        [JSON.stringify(settings)]
      );
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)',
        [user.id, 'UPDATE', 'Updated office settings']);
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── GET /settings/holidays ───────────────────────────────────────────────────
  if (url === '/settings/holidays' && method === 'GET') {
    try {
      authMiddleware(req);
      await query(`CREATE TABLE IF NOT EXISTS holidays (id SERIAL PRIMARY KEY, date DATE NOT NULL, label TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'holiday', created_at TIMESTAMPTZ DEFAULT NOW())`);
      const result = await query(`SELECT * FROM holidays ORDER BY date ASC`);
      return res.status(200).json({ holidays: result.rows });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── POST /settings/holidays ──────────────────────────────────────────────────
  if (url === '/settings/holidays' && method === 'POST') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const { date, label, type } = req.body || {};
      if (!date || !label) return res.status(400).json({ error: 'Date and label are required' });
      await query(`CREATE TABLE IF NOT EXISTS holidays (id SERIAL PRIMARY KEY, date DATE NOT NULL, label TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'holiday', created_at TIMESTAMPTZ DEFAULT NOW())`);
      const result = await query(`INSERT INTO holidays (date, label, type) VALUES ($1, $2, $3) RETURNING *`, [date, label, type || 'holiday']);
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'CREATE', `Added closure/holiday: ${label} on ${date}`]);
      return res.status(201).json(result.rows[0]);
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── DELETE /settings/holidays/:id ────────────────────────────────────────────
  if (parts[0] === 'settings' && parts[1] === 'holidays' && parts[2] && method === 'DELETE') {
    try {
      const user = authMiddleware(req);
      if (user.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
      const id = parts[2];
      const existing = await query('SELECT label, date FROM holidays WHERE id=$1', [id]);
      if (existing.rows.length === 0) return res.status(404).json({ error: 'Holiday not found' });
      await query('DELETE FROM holidays WHERE id=$1', [id]);
      await query('INSERT INTO audit_logs (user_id, action, description) VALUES ($1,$2,$3)', [user.id, 'DELETE', `Removed closure/holiday: ${existing.rows[0].label}`]);
      return res.status(200).json({ message: 'Deleted' });
    } catch (err) { return res.status(err.message === 'Unauthorized' ? 401 : 500).json({ error: err.message }); }
  }

  // ── GET /settings/holidays/public (no auth — for landing page) ───────────────
  if (url === '/settings/holidays/public' && method === 'GET') {
    try {
      const result = await query(`SELECT date, label, type FROM holidays WHERE date >= CURRENT_DATE ORDER BY date ASC LIMIT 10`).catch(() => ({ rows: [] }));
      return res.status(200).json({ holidays: result.rows });
    } catch (err) { return res.status(500).json({ error: err.message }); }
  }

  // ── POST /chat — ARIA AI assistant proxy ─────────────────────────────────────
  if (url === '/chat' && method === 'POST') {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set');
      return res.status(500).json({ error: 'API key not configured on server' });
    }
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         process.env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(req.body),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Anthropic error:', response.status, JSON.stringify(data));
        return res.status(response.status).json(data);
      }
      return res.status(200).json(data);
    } catch (err) {
      console.error('ARIA proxy error:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(404).json({ error: 'Route not found' });
}
