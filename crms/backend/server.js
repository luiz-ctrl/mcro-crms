require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pool = require('./config/db');

const authRoutes = require('./routes/auth');
const visitorRoutes = require('./routes/visitors');
const analyticsRoutes = require('./routes/analytics');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger (development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'MCRO General Luna CRMS API',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/visitors', visitorRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found.` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

// Initialize DB tables and start server
async function initializeDB() {
  try {
    // Migration: drop old visitors table if it has the old schema
    const oldSchema = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'visitors' AND column_name = 'first_name'
    `);
    if (oldSchema.rows.length > 0) {
      console.log('🔄 Migrating visitors table to new schema...');
      await pool.query('DROP TABLE IF EXISTS visitors CASCADE');
      console.log('✅ Old visitors table dropped');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        role VARCHAR(50) DEFAULT 'staff',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS visitors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        sex VARCHAR(10) NOT NULL,
        barangay VARCHAR(100) NOT NULL,
        mobile_number VARCHAR(20) NOT NULL,
        transaction_type VARCHAR(100) NOT NULL,
        document_owner_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'Pending',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        action VARCHAR(100) NOT NULL,
        description TEXT,
        performed_by VARCHAR(255) DEFAULT 'system',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Seed admin user if not exists
    const bcrypt = require('bcryptjs');
    const adminEmail = 'admin@mcro-generalluna.gov.ph';
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hashed = await bcrypt.hash('Admin@1234', 10);
      await pool.query(
        'INSERT INTO users (email, password, full_name, role) VALUES ($1, $2, $3, $4)',
        [adminEmail, hashed, 'System Administrator', 'admin']
      );
      console.log('✅ Default admin user created');
      console.log('   Email:', adminEmail);
      console.log('   Password: Admin@1234');
    }

    console.log('✅ Database tables initialized');
  } catch (err) {
    console.error('❌ Database initialization failed:', err.message);
    process.exit(1);
  }
}

initializeDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 MCRO CRMS API running on port ${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health: http://localhost:${PORT}/health\n`);
  });
});

module.exports = app;
