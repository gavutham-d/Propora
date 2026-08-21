-- Propora database schema
-- Entities mirror the data model already used by the frontend
-- (frontend/src/App.jsx): properties, tenants, payments, maintenance.
-- Safe to re-run: every statement is guarded with IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS properties (
  id         SERIAL PRIMARY KEY,
  address    TEXT NOT NULL,
  city       TEXT NOT NULL,
  units      INTEGER NOT NULL DEFAULT 1,
  rent       INTEGER NOT NULL DEFAULT 0,
  occupancy  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  phone         TEXT,
  property_id   INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit          TEXT NOT NULL,
  rent          INTEGER NOT NULL DEFAULT 0,
  move_in_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id         SERIAL PRIMARY KEY,
  tenant_id  INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  due_date   DATE NOT NULL,
  paid_date  DATE,
  status     TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS maintenance (
  id           SERIAL PRIMARY KEY,
  property_id  INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  unit         TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT DEFAULT '',
  priority     TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High')),
  status       TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Progress', 'Completed')),
  submitted    DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_to  TEXT,
  cost         INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_property_id ON maintenance(property_id);
