-- MCRO General Luna Quezon – Civil Registry Management System
-- Database Schema

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'staff',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Visitors / Transactions table
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

-- Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  description TEXT,
  performed_by VARCHAR(255) DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default admin user (password: admin123)
INSERT INTO users (email, password, full_name, role)
VALUES (
  'admin@mcro-generalluna.gov.ph',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'Admin MCRO',
  'admin'
) ON CONFLICT (email) DO NOTHING;
