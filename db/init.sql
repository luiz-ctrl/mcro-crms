-- MCRO General Luna Quezon – Civil Registry Management System
-- Database Initialization Script

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'staff' CHECK (role IN ('admin','staff')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Records Table
CREATE TABLE IF NOT EXISTS records (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  client_name VARCHAR(255) NOT NULL,
  sex VARCHAR(10) CHECK (sex IN ('Male','Female')),
  address TEXT,
  mobile_number VARCHAR(20),
  transaction_type VARCHAR(100) NOT NULL,
  document_owner_name VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Processing','Completed')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs Table
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Admin user
-- Email:    admin@mcro-generaluna.gov.ph
-- Password: Admin@2024
INSERT INTO users (email, password, role)
VALUES (
  'admin@mcro-generaluna.gov.ph',
  '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
  'admin'
)
ON CONFLICT (email) DO NOTHING;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_records_status ON records(status);
CREATE INDEX IF NOT EXISTS idx_records_created_at ON records(created_at);
CREATE INDEX IF NOT EXISTS idx_records_transaction_type ON records(transaction_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
