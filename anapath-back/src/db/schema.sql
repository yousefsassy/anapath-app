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

CREATE OR REPLACE FUNCTION immutable_text_array_to_string(input_array text[], separator text)
RETURNS text
LANGUAGE SQL
IMMUTABLE
STRICT
AS $$
  SELECT array_to_string(input_array, separator);
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

CREATE INDEX IF NOT EXISTS idx_patients_laboratory_id ON patients(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exams_laboratory_id ON exams(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient_id ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_exam_id ON reports(exam_id);
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
