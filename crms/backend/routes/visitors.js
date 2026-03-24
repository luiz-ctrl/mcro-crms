const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /api/visitors
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { search, status, transaction_type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (search) {
      conditions.push(`(name ILIKE $${idx} OR barangay ILIKE $${idx} OR document_owner_name ILIKE $${idx})`);
      params.push(`%${search}%`);
      idx++;
    }
    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }
    if (transaction_type) {
      conditions.push(`transaction_type = $${idx}`);
      params.push(transaction_type);
      idx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM visitors ${where}`,
      params
    );

    const dataResult = await pool.query(
      `SELECT * FROM visitors ${where} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      visitors: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    console.error('Get visitors error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/visitors/:id
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM visitors WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found.' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get visitor error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/visitors
router.post('/', authMiddleware, async (req, res) => {
  const { name, sex, barangay, mobile_number, transaction_type, document_owner_name, status } = req.body;

  if (!name || !sex || !barangay || !mobile_number || !transaction_type || !document_owner_name) {
    return res.status(400).json({ error: 'Required fields: name, sex, barangay, mobile_number, transaction_type, document_owner_name.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO visitors (name, sex, barangay, mobile_number, transaction_type, document_owner_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, sex, barangay, mobile_number, transaction_type, document_owner_name, status || 'Pending']
    );

    const visitor = result.rows[0];

    await pool.query(
      'INSERT INTO audit_logs (action, description, performed_by) VALUES ($1, $2, $3)',
      [
        'CLIENT_ADDED',
        `New client registered: ${name} | Transaction: ${transaction_type} | Barangay: ${barangay} | Doc Owner: ${document_owner_name}`,
        req.user.email,
      ]
    );

    res.status(201).json(visitor);
  } catch (err) {
    console.error('Create visitor error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PATCH /api/visitors/:id/status
router.patch('/:id/status', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['Pending', 'Processing', 'Completed'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const result = await pool.query(
      'UPDATE visitors SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found.' });
    }

    const visitor = result.rows[0];

    await pool.query(
      'INSERT INTO audit_logs (action, description, performed_by) VALUES ($1, $2, $3)',
      [
        'STATUS_UPDATED',
        `Client ${visitor.name} status updated to "${status}"`,
        req.user.email,
      ]
    );

    res.json(visitor);
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/visitors/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM visitors WHERE id = $1 RETURNING *', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visitor not found.' });
    }

    const visitor = result.rows[0];

    await pool.query(
      'INSERT INTO audit_logs (action, description, performed_by) VALUES ($1, $2, $3)',
      [
        'CLIENT_DELETED',
        `Client record deleted: ${visitor.name} | ID: ${visitor.id}`,
        req.user.email,
      ]
    );

    res.json({ message: 'Client deleted successfully.' });
  } catch (err) {
    console.error('Delete visitor error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
