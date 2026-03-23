-- Anapath seed data
-- Run with: psql -d anapath -f src/db/seed.sql

-- Default laboratory (id=1)
INSERT INTO laboratories (id, name, address, phone, email)
VALUES (1, 'Default Laboratory', 'Not set yet', 'Not set yet', 'lab@anapath.local')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;

-- Minimal admin user placeholder
INSERT INTO users (laboratory_id, full_name, email, password_hash, role)
VALUES (1, 'Default Admin', 'admin@anapath.local', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- One sample patient
INSERT INTO patients (
  id,
  laboratory_id,
  first_name,
  last_name,
  age,
  sex,
  phone,
  birth_date,
  general_history
)
VALUES (
  1,
  1,
  'Fatima',
  'Bennani',
  46,
  'F',
  '0600000000',
  NULL,
  'No major history reported.'
)
ON CONFLICT (id) DO NOTHING;

-- Initialize exam number sequences for lab 1 (start at 0 so first generated is 1)
INSERT INTO exam_sequences (laboratory_id, exam_type, current_value)
VALUES
  (1, 'cytology', 0),
  (1, 'histology', 0)
ON CONFLICT (laboratory_id, exam_type) DO NOTHING;

-- Keep serial IDs in sync after manual IDs above
SELECT setval('laboratories_id_seq', COALESCE((SELECT MAX(id) FROM laboratories), 1), true);
SELECT setval('patients_id_seq', COALESCE((SELECT MAX(id) FROM patients), 1), true);
