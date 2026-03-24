const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// GET /api/analytics/summary
router.get('/summary', authMiddleware, async (req, res) => {
  try {
    const [total, pending, processing, completed, today, transactionTypes] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM visitors'),
      pool.query("SELECT COUNT(*) FROM visitors WHERE status = 'Pending'"),
      pool.query("SELECT COUNT(*) FROM visitors WHERE status = 'Processing'"),
      pool.query("SELECT COUNT(*) FROM visitors WHERE status = 'Completed'"),
      pool.query("SELECT COUNT(*) FROM visitors WHERE DATE(created_at) = CURRENT_DATE"),
      pool.query(`
        SELECT transaction_type, COUNT(*) as count
        FROM visitors
        GROUP BY transaction_type
        ORDER BY count DESC
      `),
    ]);

    res.json({
      total: parseInt(total.rows[0].count),
      pending: parseInt(pending.rows[0].count),
      processing: parseInt(processing.rows[0].count),
      completed: parseInt(completed.rows[0].count),
      today: parseInt(today.rows[0].count),
      transaction_types: transactionTypes.rows,
    });
  } catch (err) {
    console.error('Analytics summary error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/analytics/top-barangays
router.get('/top-barangays', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT barangay, COUNT(*) as count
      FROM visitors
      GROUP BY barangay
      ORDER BY count DESC
      LIMIT 10
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Top barangays error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/analytics/monthly
router.get('/monthly', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        TO_CHAR(created_at, 'Mon YYYY') as month,
        TO_CHAR(created_at, 'YYYY-MM') as month_key,
        COUNT(*) as count
      FROM visitors
      WHERE created_at >= NOW() - INTERVAL '12 months'
      GROUP BY month, month_key
      ORDER BY month_key ASC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Monthly analytics error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/analytics/status-breakdown
router.get('/status-breakdown', authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM visitors
      GROUP BY status
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Status breakdown error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
