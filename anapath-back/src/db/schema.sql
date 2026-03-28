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

CREATE INDEX IF NOT EXISTS idx_patients_laboratory_id ON patients(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exams_laboratory_id ON exams(laboratory_id);
CREATE INDEX IF NOT EXISTS idx_exams_patient_id ON exams(patient_id);
CREATE INDEX IF NOT EXISTS idx_reports_exam_id ON reports(exam_id);
