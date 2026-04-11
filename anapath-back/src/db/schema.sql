-- Anapath PostgreSQL schema
-- Run with: psql -d anapath -f src/db/schema.sql

CREATE TABLE IF NOT EXISTS laboratories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(50),
  email VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(128) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip_address VARCHAR(64),
  user_agent TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS patients (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  age INTEGER NOT NULL CHECK (age >= 0),
  sex CHAR(1) NOT NULL CHECK (sex IN ('M', 'F')),
  phone VARCHAR(50),
  birth_date DATE,
  general_history TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS exams (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
  patient_id INTEGER NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  exam_number VARCHAR(50) NOT NULL UNIQUE,
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('cytology', 'histology')),
  clinic_name VARCHAR(255),
  requesting_doctor VARCHAR(255),
  requested_date DATE,
  registered_date DATE NOT NULL DEFAULT CURRENT_DATE,
  result_issued_date DATE,
  sample_nature VARCHAR(255),
  exam_history TEXT,
  diagnosis_keywords TEXT[] NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'registered',
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  exam_id INTEGER NOT NULL UNIQUE REFERENCES exams(id) ON DELETE CASCADE,
  clinical_info TEXT NOT NULL DEFAULT '',
  macroscopy TEXT NOT NULL DEFAULT '',
  microscopy TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Persistent counters for exam number generation by lab + type
CREATE TABLE IF NOT EXISTS exam_sequences (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  exam_type VARCHAR(20) NOT NULL CHECK (exam_type IN ('cytology', 'histology')),
  current_value INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (laboratory_id, exam_type)
);

CREATE TABLE IF NOT EXISTS report_templates (
  id            SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE RESTRICT,
  name          TEXT NOT NULL,
  clinical_info  TEXT NOT NULL DEFAULT '',
  macroscopy     TEXT NOT NULL DEFAULT '',
  microscopy     TEXT NOT NULL DEFAULT '',
  conclusion     TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER REFERENCES laboratories(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_session_id INTEGER,
  request_id VARCHAR(100),
  event_type VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id INTEGER,
  ip_address VARCHAR(64),
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_revisions (
  id SERIAL PRIMARY KEY,
  laboratory_id INTEGER NOT NULL REFERENCES laboratories(id) ON DELETE CASCADE,
  exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  report_id INTEGER NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_session_id INTEGER,
  request_id VARCHAR(100),
  snapshot_reason VARCHAR(50) NOT NULL CHECK (snapshot_reason IN ('save', 'validation', 'restore')),
  clinical_info TEXT NOT NULL DEFAULT '',
  macroscopy TEXT NOT NULL DEFAULT '',
  microscopy TEXT NOT NULL DEFAULT '',
  conclusion TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
DECLARE
  snapshot_reason_constraint TEXT;
BEGIN
  SELECT con.conname
  INTO snapshot_reason_constraint
  FROM pg_constraint con
  INNER JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'report_revisions'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) ILIKE '%snapshot_reason%'
  LIMIT 1;

  IF snapshot_reason_constraint IS NOT NULL THEN
    EXECUTE format(
      'ALTER TABLE report_revisions DROP CONSTRAINT %I',
      snapshot_reason_constraint
    );
  END IF;

  ALTER TABLE report_revisions
    ADD CONSTRAINT report_revisions_snapshot_reason_check
    CHECK (snapshot_reason IN ('save', 'validation', 'restore'));
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

CREATE OR REPLACE FUNCTION immutable_text_array_to_string(input_array text[], separator text)
RETURNS text
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT array_to_string(input_array, separator);
$$;

CREATE OR REPLACE FUNCTION current_app_laboratory_id()
RETURNS integer
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_laboratory_id', true), '')::integer;
$$;

UPDATE exams
SET status = 'registered'
WHERE status IS NULL
   OR status NOT IN ('registered', 'in_progress', 'completed');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exams_status_check'
  ) THEN
    ALTER TABLE exams
      ADD CONSTRAINT exams_status_check
      CHECK (status IN ('registered', 'in_progress', 'completed'));
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM exams e
    INNER JOIN patients p ON p.id = e.patient_id
    WHERE e.laboratory_id <> p.laboratory_id
  ) THEN
    RAISE EXCEPTION
      'Cannot add exams_laboratory_patient_fk: some exams reference a patient from another laboratory.';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT laboratory_id, exam_number
      FROM exams
      GROUP BY laboratory_id, exam_number
      HAVING COUNT(*) > 1
    ) duplicate_exam_numbers
  ) THEN
    RAISE EXCEPTION
      'Cannot add lab-scoped exam number uniqueness: duplicate exam numbers already exist in the same laboratory.';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'patients_laboratory_id_id_key'
  ) THEN
    ALTER TABLE patients
      ADD CONSTRAINT patients_laboratory_id_id_key
      UNIQUE (laboratory_id, id);
  END IF;
END $$;

DO $$
DECLARE
  legacy_exam_number_constraint TEXT;
BEGIN
  SELECT con.conname
  INTO legacy_exam_number_constraint
  FROM pg_constraint con
  WHERE con.conrelid = 'exams'::regclass
    AND con.contype = 'u'
    AND con.conkey = ARRAY[
      (
        SELECT attnum
        FROM pg_attribute
        WHERE attrelid = 'exams'::regclass
          AND attname = 'exam_number'
      )
    ]
  LIMIT 1;

  IF legacy_exam_number_constraint IS NOT NULL
    AND legacy_exam_number_constraint <> 'exams_laboratory_exam_number_key'
  THEN
    EXECUTE format(
      'ALTER TABLE exams DROP CONSTRAINT %I',
      legacy_exam_number_constraint
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exams_laboratory_exam_number_key'
  ) THEN
    ALTER TABLE exams
      ADD CONSTRAINT exams_laboratory_exam_number_key
      UNIQUE (laboratory_id, exam_number);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'exams_laboratory_patient_fk'
  ) THEN
    ALTER TABLE exams
      ADD CONSTRAINT exams_laboratory_patient_fk
      FOREIGN KEY (laboratory_id, patient_id)
      REFERENCES patients (laboratory_id, id)
      ON DELETE CASCADE
      NOT VALID;
  END IF;
END $$;

ALTER TABLE exams
  VALIDATE CONSTRAINT exams_laboratory_patient_fk;

CREATE INDEX IF NOT EXISTS idx_patients_laboratory_id ON patients(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exams_laboratory_id ON exams(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient_id ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_exam_id ON reports(exam_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_audit_events_laboratory_created_at
  ON audit_events(laboratory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type_created_at
  ON audit_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_report_revisions_laboratory_exam_created_at
  ON report_revisions(laboratory_id, exam_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_exams_archive_completed_date
  ON exams(laboratory_id, status, result_issued_date DESC);
CREATE INDEX IF NOT EXISTS idx_exams_archive_search
  ON exams
  USING GIN (
    (
      setweight(to_tsvector('simple', COALESCE(sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', COALESCE(exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', COALESCE(immutable_text_array_to_string(diagnosis_keywords, ' '), '')), 'B')
    )
  );
CREATE INDEX IF NOT EXISTS idx_reports_archive_search
  ON reports
  USING GIN (
    (
      setweight(to_tsvector('simple', COALESCE(clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', COALESCE(macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', COALESCE(microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', COALESCE(conclusion, '')), 'A')
    )
  );

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'patients'
      AND policyname = 'patients_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY patients_laboratory_isolation_policy
      ON patients
      USING (laboratory_id = current_app_laboratory_id())
      WITH CHECK (laboratory_id = current_app_laboratory_id());
  END IF;
END $$;

ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exams'
      AND policyname = 'exams_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY exams_laboratory_isolation_policy
      ON exams
      USING (laboratory_id = current_app_laboratory_id())
      WITH CHECK (laboratory_id = current_app_laboratory_id());
  END IF;
END $$;

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'reports'
      AND policyname = 'reports_exam_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY reports_exam_laboratory_isolation_policy
      ON reports
      USING (
        EXISTS (
          SELECT 1
          FROM exams e
          WHERE e.id = reports.exam_id
            AND e.laboratory_id = current_app_laboratory_id()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM exams e
          WHERE e.id = reports.exam_id
            AND e.laboratory_id = current_app_laboratory_id()
        )
      );
  END IF;
END $$;

ALTER TABLE exam_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sequences FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'exam_sequences'
      AND policyname = 'exam_sequences_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY exam_sequences_laboratory_isolation_policy
      ON exam_sequences
      USING (laboratory_id = current_app_laboratory_id())
      WITH CHECK (laboratory_id = current_app_laboratory_id());
  END IF;
END $$;

ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_templates'
      AND policyname = 'report_templates_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY report_templates_laboratory_isolation_policy
      ON report_templates
      USING (laboratory_id = current_app_laboratory_id())
      WITH CHECK (laboratory_id = current_app_laboratory_id());
  END IF;
END $$;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'audit_events'
      AND policyname = 'audit_events_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY audit_events_laboratory_isolation_policy
      ON audit_events
      USING (
        laboratory_id = current_app_laboratory_id()
        OR (
          laboratory_id IS NULL
          AND current_app_laboratory_id() IS NULL
        )
      )
      WITH CHECK (
        laboratory_id = current_app_laboratory_id()
        OR (
          laboratory_id IS NULL
          AND current_app_laboratory_id() IS NULL
        )
      );
  END IF;
END $$;

ALTER TABLE report_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_revisions FORCE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'report_revisions'
      AND policyname = 'report_revisions_laboratory_isolation_policy'
  ) THEN
    CREATE POLICY report_revisions_laboratory_isolation_policy
      ON report_revisions
      USING (laboratory_id = current_app_laboratory_id())
      WITH CHECK (laboratory_id = current_app_laboratory_id());
  END IF;
END $$;
