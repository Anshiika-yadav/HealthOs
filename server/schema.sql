-- HealthOS Full Schema
-- Run this against the Neon database to create all tables

-- ─── Extension ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Tenants (Hospitals) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(40) UNIQUE NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  website VARCHAR(255),
  timezone VARCHAR(80) DEFAULT 'Africa/Lagos',
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'active',
  branch_count INT DEFAULT 0,
  user_count INT DEFAULT 0,
  subscription_plan VARCHAR(50) DEFAULT 'starter',
  subscription_status VARCHAR(30) DEFAULT 'trial',
  license_status VARCHAR(30) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(30) NOT NULL DEFAULT 'hospital_admin',
  phone VARCHAR(50),
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  branch_id BIGINT,
  department_id BIGINT,
  status VARCHAR(20) DEFAULT 'active',
  invitation_status VARCHAR(20) DEFAULT 'accepted',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Branches ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(40),
  address TEXT,
  city VARCHAR(100),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  is_headquarters BOOLEAN DEFAULT false,
  department_count INT DEFAULT 0,
  user_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Departments ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id BIGINT,
  name VARCHAR(200) NOT NULL,
  code VARCHAR(40),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Services ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  department_id BIGINT,
  name VARCHAR(200) NOT NULL,
  category VARCHAR(80),
  description TEXT,
  price NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  tax_rate NUMERIC(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ─── Patients ─────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS patient_mrn_seq START 1001;

CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  mrn VARCHAR(40) UNIQUE NOT NULL DEFAULT ('MRN-' || nextval('patient_mrn_seq')::text),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  gender VARCHAR(30),
  date_of_birth DATE,
  phone VARCHAR(30),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  next_of_kin VARCHAR(200),
  next_of_kin_phone VARCHAR(30),
  emergency_contact VARCHAR(200),
  emergency_phone VARCHAR(30),
  identification_number VARCHAR(100),
  identification_type VARCHAR(50),
  insurance_provider VARCHAR(200),
  insurance_number VARCHAR(100),
  blood_group VARCHAR(10),
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Appointments ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(200),
  patient_mrn VARCHAR(40),
  provider_id BIGINT,
  provider_name VARCHAR(200),
  department_id BIGINT,
  department_name VARCHAR(200),
  branch_id BIGINT,
  branch_name VARCHAR(200),
  date DATE,
  time VARCHAR(10),
  duration INT DEFAULT 30,
  type VARCHAR(30) DEFAULT 'consultation',
  reason TEXT,
  status VARCHAR(20) DEFAULT 'scheduled',
  notes TEXT,
  queue_number INT,
  checked_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Encounters ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS encounters (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(200),
  patient_mrn VARCHAR(40),
  appointment_id BIGINT,
  provider_id BIGINT,
  provider_name VARCHAR(200),
  department_id BIGINT,
  department_name VARCHAR(200),
  branch_id BIGINT,
  branch_name VARCHAR(200),
  date DATE,
  chief_complaint TEXT,
  vitals JSONB,
  examination TEXT,
  diagnoses JSONB DEFAULT '[]',
  treatment_plan TEXT,
  notes TEXT,
  follow_up_date DATE,
  follow_up_instructions TEXT,
  status VARCHAR(20) DEFAULT 'draft',
  finalized_at TIMESTAMPTZ,
  finalized_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Prescriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prescriptions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(200),
  patient_mrn VARCHAR(40),
  encounter_id BIGINT,
  prescriber_id BIGINT,
  prescriber_name VARCHAR(200),
  items JSONB DEFAULT '[]',
  status VARCHAR(30) DEFAULT 'active',
  notes TEXT,
  dispensed_at TIMESTAMPTZ,
  dispensed_by VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Lab Orders ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lab_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  order_number VARCHAR(40) UNIQUE NOT NULL DEFAULT ('LAB-' || (random() * 100000)::int),
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(200),
  patient_mrn VARCHAR(40),
  encounter_id BIGINT,
  ordered_by_id BIGINT,
  ordered_by_name VARCHAR(200),
  priority VARCHAR(20) DEFAULT 'routine',
  tests JSONB DEFAULT '[]',
  sample_type VARCHAR(50),
  sample_collected_at TIMESTAMPTZ,
  sample_received_at TIMESTAMPTZ,
  status VARCHAR(20) DEFAULT 'ordered',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Invoices ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  invoice_number VARCHAR(40) UNIQUE NOT NULL DEFAULT ('INV-' || (random() * 100000)::int),
  patient_id BIGINT REFERENCES patients(id) ON DELETE CASCADE,
  patient_name VARCHAR(200),
  patient_mrn VARCHAR(40),
  encounter_id BIGINT,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount_total NUMERIC(12,2) DEFAULT 0,
  tax_total NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'draft',
  notes TEXT,
  due_date DATE,
  created_by_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Payments ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  invoice_id BIGINT REFERENCES invoices(id) ON DELETE CASCADE,
  invoice_number VARCHAR(40),
  patient_id BIGINT,
  patient_name VARCHAR(200),
  amount NUMERIC(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'USD',
  payment_method VARCHAR(30) DEFAULT 'cash',
  reference VARCHAR(200),
  received_by_id BIGINT,
  received_by_name VARCHAR(200),
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed',
  reversed_at TIMESTAMPTZ,
  reversed_by VARCHAR(200),
  reversal_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Inventory Items ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  sku VARCHAR(60) UNIQUE NOT NULL,
  category VARCHAR(80),
  unit VARCHAR(30),
  stock_on_hand INT DEFAULT 0,
  reorder_level INT DEFAULT 0,
  location VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  expiry_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Stock Movements ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  item_id BIGINT REFERENCES inventory_items(id) ON DELETE CASCADE,
  item_name VARCHAR(200),
  type VARCHAR(20) NOT NULL,
  quantity INT NOT NULL,
  batch_number VARCHAR(100),
  reason TEXT,
  performed_by_id BIGINT,
  performed_by_name VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Suppliers ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  contact_name VARCHAR(200),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Purchase Orders ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchase_orders (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE SET NULL,
  po_number VARCHAR(40) UNIQUE NOT NULL DEFAULT ('PO-' || (random() * 100000)::int),
  supplier_id BIGINT REFERENCES suppliers(id) ON DELETE SET NULL,
  supplier_name VARCHAR(200),
  items JSONB DEFAULT '[]',
  total_amount NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  status VARCHAR(20) DEFAULT 'draft',
  expected_delivery DATE,
  notes TEXT,
  created_by_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Audit Logs ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor VARCHAR(200),
  actor_id BIGINT,
  actor_role VARCHAR(50),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(80),
  entity_id VARCHAR(100),
  tenant_id BIGINT,
  tenant_name VARCHAR(200),
  status VARCHAR(20) DEFAULT 'success',
  ip_address VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT,
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(20) DEFAULT 'info',
  module VARCHAR(50),
  is_read BOOLEAN DEFAULT false,
  link VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sessions (JWT tokens stored for invalidation) ───────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan VARCHAR(50) DEFAULT 'starter',
  billing_cycle VARCHAR(20) DEFAULT 'monthly',
  status VARCHAR(30) DEFAULT 'trial',
  start_date DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT true,
  amount NUMERIC(12,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Licenses ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS licenses (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  tenant_id BIGINT REFERENCES tenants(id) ON DELETE CASCADE,
  tenant_name VARCHAR(200),
  issued_to VARCHAR(200),
  max_users INT DEFAULT 50,
  max_branches INT DEFAULT 5,
  expiry_date DATE,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

-- ─── Settings ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hospital_settings (
  id BIGSERIAL PRIMARY KEY,
  tenant_id BIGINT UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  settings JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Seed data: default tenant + users ────────────────────────────────────────
INSERT INTO tenants (id, name, code, email, status, subscription_plan, subscription_status, license_status, branch_count, user_count)
VALUES (1, 'City General Hospital', 'CGH-001', 'admin@hospital.com', 'active', 'professional', 'active', 'active', 1, 3)
ON CONFLICT (id) DO NOTHING;

-- Default branch
INSERT INTO branches (id, tenant_id, name, code, is_headquarters, is_active)
VALUES (1, 1, 'Main Branch', 'BR-001', true, true)
ON CONFLICT (id) DO NOTHING;

-- Departments
INSERT INTO departments (id, tenant_id, name, code, is_active) VALUES
(1, 1, 'General Medicine', 'DEPT-GM', true),
(2, 1, 'Laboratory', 'DEPT-LAB', true)
ON CONFLICT (id) DO NOTHING;

-- Users with bcrypt hash of 'Test@1234'
-- hash generated: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q
INSERT INTO users (id, name, email, password_hash, role, tenant_id, branch_id, status, invitation_status) VALUES
(1, 'Platform Admin',  'superadmin@test.com',   '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'super_admin',     NULL, NULL, 'active', 'accepted'),
(2, 'Hospital Admin', 'admin@hospital.com',    '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'hospital_admin',   1, 1, 'active', 'accepted'),
(3, 'Dr. Sarah Ahmed', 'doctor@hospital.com',  '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'doctor',          1, 1, 'active', 'accepted'),
(4, 'Nurse Fatima',    'nurse@hospital.com',    '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'nurse',           1, 1, 'active', 'accepted'),
(5, 'Ali Reception',   'reception@hospital.com','$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'receptionist',    1, 1, 'active', 'accepted'),
(6, 'Usman Cashier',   'cashier@hospital.com',  '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'cashier',         1, 1, 'active', 'accepted'),
(7, 'Zara Pharmacist', 'pharmacy@hospital.com','$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'pharmacist',      1, 1, 'active', 'accepted'),
(8, 'Hassan Lab Tech', 'lab@hospital.com',     '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'lab_technician',  1, 1, 'active', 'accepted'),
(9, 'Bilal Inventory', 'inventory@hospital.com','$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'inventory_officer',1, 1, 'active', 'accepted'),
(10,'Nadia Auditor',   'auditor@hospital.com',  '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'auditor',         1, 1, 'active', 'accepted'),
(11,'Hospital Owner',  'owner@hospital.com',    '$2a$10$VwQk8uLOickgx2ZMRZoMyeIjZDcQr7p5.XP1rQX.qVX3qKQX.qVX3q', 'hospital_owner',  1, 1, 'active', 'accepted')
ON CONFLICT (id) DO NOTHING;

-- Default subscription
INSERT INTO subscriptions (id, tenant_id, plan, billing_cycle, status, start_date, end_date, auto_renew, amount, currency)
VALUES (1, 1, 'professional', 'monthly', 'active', CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', true, 500, 'USD')
ON CONFLICT (id) DO NOTHING;

-- Default license
INSERT INTO licenses (id, key, tenant_id, tenant_name, issued_to, max_users, max_branches, expiry_date, status)
VALUES (1, 'HOSO-PRO-2024-CGH001-XX7Q9K', 1, 'City General Hospital', 'Hospital Admin', 100, 10, CURRENT_DATE + INTERVAL '365 days', 'active')
ON CONFLICT (id) DO NOTHING;

-- Some sample services
INSERT INTO services (id, tenant_id, name, category, price, currency, tax_rate, is_active) VALUES
(1, 1, 'General Consultation', 'consultation', 50.00, 'USD', 0, true),
(2, 1, 'Full Blood Count', 'laboratory', 25.00, 'USD', 0, true),
(3, 1, 'X-Ray Chest', 'procedure', 80.00, 'USD', 0, true),
(4, 1, 'Paracetamol 500mg (per tablet)', 'pharmacy', 0.50, 'USD', 0, true),
(5, 1, 'IV Fluid 1000ml', 'consumable', 12.00, 'USD', 0, true)
ON CONFLICT (id) DO NOTHING;
