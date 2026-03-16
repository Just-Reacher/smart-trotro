-- ─────────────────────────────────────────────────────────────────────────────
-- Smart Trotro — PostgreSQL Schema
-- Run: psql -U postgres -d smart_trotro -f src/db/schema.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────
-- ENUMS
-- ─────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role       AS ENUM ('passenger', 'driver', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status     AS ENUM ('active', 'pending', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE driver_approval AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE admin_approval  AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE route_status    AS ENUM ('active', 'inactive');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE trip_status     AS ENUM ('running', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE parcel_status   AS ENUM ('pending','accepted','picked_up','delivered','declined','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE txn_type        AS ENUM ('fare', 'parcel_delivery', 'refund');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE txn_status      AS ENUM ('pending', 'completed', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE pay_method      AS ENUM ('mtn_momo','vodafone_cash','airteltigo','cash');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE log_level       AS ENUM ('info', 'warning', 'error', 'success');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────
-- TABLE 1: users
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name    VARCHAR(100) NOT NULL,
  last_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20)  UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  role          user_role    NOT NULL DEFAULT 'passenger',
  status        user_status  NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email  ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone  ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);

-- ─────────────────────────────────────────
-- TABLE 2: driver_profiles
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS driver_profiles (
  id               UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID            NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_number   VARCHAR(50)     NOT NULL,
  primary_route_id UUID,
  license_number   VARCHAR(100),
  approval_status  driver_approval NOT NULL DEFAULT 'pending',
  is_online        BOOLEAN         NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_user ON driver_profiles(user_id);

-- ─────────────────────────────────────────
-- TABLE 3: admin_profiles
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_profiles (
  id              UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organisation    VARCHAR(200),
  department      VARCHAR(200),
  access_code     VARCHAR(100),
  approval_status admin_approval NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─────────────────────────────────────────
-- TABLE 4: routes
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS routes (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  route_name     VARCHAR(200) NOT NULL,
  start_location VARCHAR(200) NOT NULL,
  end_location   VARCHAR(200) NOT NULL,
  status         route_status NOT NULL DEFAULT 'active',
  created_by     UUID         REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_routes_status ON routes(status);

-- Add FK from driver_profiles → routes now that routes exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_driver_route'
  ) THEN
    ALTER TABLE driver_profiles
      ADD CONSTRAINT fk_driver_route
      FOREIGN KEY (primary_route_id) REFERENCES routes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────
-- TABLE 5: trips
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trips (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID        NOT NULL REFERENCES users(id),
  route_id        UUID        NOT NULL REFERENCES routes(id),
  start_time      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time        TIMESTAMPTZ,
  passenger_count INT         NOT NULL DEFAULT 0,
  status          trip_status NOT NULL DEFAULT 'running',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trips_driver   ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_route    ON trips(route_id);
CREATE INDEX IF NOT EXISTS idx_trips_status   ON trips(status);

-- ─────────────────────────────────────────
-- TABLE 6: vehicle_locations
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_locations (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id   UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trip_id     UUID          REFERENCES trips(id) ON DELETE SET NULL,
  latitude    NUMERIC(10,7) NOT NULL,
  longitude   NUMERIC(10,7) NOT NULL,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- Unique per driver so we can upsert (one live location row per driver)
CREATE UNIQUE INDEX IF NOT EXISTS uq_vehicle_locations_driver ON vehicle_locations(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_locations_trip ON vehicle_locations(trip_id);

-- ─────────────────────────────────────────
-- TABLE 7: parcels
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parcels (
  id               UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id        UUID          NOT NULL REFERENCES users(id),
  driver_id        UUID          REFERENCES users(id),
  trip_id          UUID          REFERENCES trips(id),
  pickup_location  VARCHAR(255)  NOT NULL,
  drop_location    VARCHAR(255)  NOT NULL,
  description      TEXT,
  receiver_contact VARCHAR(20)   NOT NULL,
  delivery_fee     NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  status           parcel_status NOT NULL DEFAULT 'pending',
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_parcels_sender  ON parcels(sender_id);
CREATE INDEX IF NOT EXISTS idx_parcels_driver  ON parcels(driver_id);
CREATE INDEX IF NOT EXISTS idx_parcels_status  ON parcels(status);

-- ─────────────────────────────────────────
-- TABLE 8: transactions
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID          NOT NULL REFERENCES users(id),
  trip_id        UUID          REFERENCES trips(id),
  parcel_id      UUID          REFERENCES parcels(id),
  amount         NUMERIC(10,2) NOT NULL,
  payment_method pay_method    NOT NULL,
  type           txn_type      NOT NULL DEFAULT 'fare',
  status         txn_status    NOT NULL DEFAULT 'pending',
  reference      VARCHAR(100),
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user   ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);

-- ─────────────────────────────────────────
-- TABLE 9: fare_rules
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS fare_rules (
  id          UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id    UUID          NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  base_fare   NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  per_km_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE(route_id)
);

-- ─────────────────────────────────────────
-- TABLE 10: system_logs
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        REFERENCES users(id) ON DELETE SET NULL,
  level      log_level   NOT NULL DEFAULT 'info',
  action     TEXT        NOT NULL,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_user_id    ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_level      ON system_logs(level);

-- ─────────────────────────────────────────
-- Auto-update updated_at trigger
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['users','driver_profiles','admin_profiles','routes','parcels'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'trg_' || tbl || '_updated_at'
    ) THEN
      EXECUTE format(
        'CREATE TRIGGER trg_%I_updated_at
         BEFORE UPDATE ON %I
         FOR EACH ROW EXECUTE FUNCTION update_updated_at()',
        tbl, tbl
      );
    END IF;
  END LOOP;
END $$;
