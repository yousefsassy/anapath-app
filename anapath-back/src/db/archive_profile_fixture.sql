-- Archive profiling fixture for P3 stabilization
-- Run with: psql -d anapath -f src/db/archive_profile_fixture.sql

BEGIN;

INSERT INTO laboratories (id, name, address, phone, email)
VALUES (9001, 'P3 Archive Profiling Lab', 'Fixture technique P3', '', 'p3-archive@anapath.local')
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  address = EXCLUDED.address,
  phone = EXCLUDED.phone,
  email = EXCLUDED.email;

DELETE FROM report_templates WHERE laboratory_id = 9001;
DELETE FROM exam_sequences WHERE laboratory_id = 9001;
DELETE FROM users WHERE laboratory_id = 9001;
DELETE FROM patients WHERE laboratory_id = 9001;

WITH patient_seed AS (
  SELECT
    gs AS seq,
    'Profil' || gs AS first_name,
    'Patient' || gs AS last_name,
    28 + (gs % 42) AS age,
    CASE WHEN gs % 2 = 0 THEN 'F' ELSE 'M' END AS sex,
    '0799' || lpad(gs::text, 6, '0') AS phone,
    DATE '1955-01-01' + ((gs - 1) * 130) AS birth_date,
    CASE
      WHEN gs % 5 = 0 THEN 'Surveillance endocrinienne.'
      WHEN gs % 5 = 1 THEN 'ATCD digestifs intermittents.'
      WHEN gs % 5 = 2 THEN 'Surveillance ganglionnaire.'
      WHEN gs % 5 = 3 THEN 'Suivi gastrique chronique.'
      ELSE 'Surveillance oncologique.'
    END AS general_history
  FROM generate_series(1, 80) AS gs
),
inserted_patients AS (
  INSERT INTO patients (
    laboratory_id,
    first_name,
    last_name,
    age,
    sex,
    phone,
    birth_date,
    general_history
  )
  SELECT
    9001,
    first_name,
    last_name,
    age,
    sex,
    phone,
    birth_date,
    general_history
  FROM patient_seed
  RETURNING id
),
numbered_patients AS (
  SELECT id, row_number() OVER (ORDER BY id) AS seq
  FROM inserted_patients
),
exam_seed AS (
  SELECT
    gs,
    ((gs - 1) % 80) + 1 AS patient_seq,
    CASE gs % 6
      WHEN 0 THEN 'thyroid'
      WHEN 1 THEN 'colon'
      WHEN 2 THEN 'lymph-node'
      WHEN 3 THEN 'gastric'
      WHEN 4 THEN 'breast'
      ELSE 'pleural'
    END AS theme,
    CASE
      WHEN gs % 5 IN (0, 3) THEN 'cytology'
      ELSE 'histology'
    END AS exam_type,
    DATE '2026-01-01' + ((gs - 1) % 95) AS requested_date,
    DATE '2026-01-02' + ((gs - 1) % 95) AS registered_date,
    DATE '2026-01-05' + ((gs - 1) % 95) AS result_issued_date,
    (gs % 17 = 0) AS urgent
  FROM generate_series(1, 200) AS gs
)
INSERT INTO exams (
  laboratory_id,
  patient_id,
  exam_number,
  exam_type,
  clinic_name,
  requesting_doctor,
  requested_date,
  registered_date,
  result_issued_date,
  sample_nature,
  exam_history,
  diagnosis_keywords,
  status,
  urgent
)
SELECT
  9001,
  np.id,
  CASE
    WHEN es.exam_type = 'cytology'
      THEN 'P3C' || lpad(es.gs::text, 4, '0') || '-2026'
    ELSE 'P3H' || lpad(es.gs::text, 4, '0') || '-2026'
  END AS exam_number,
  es.exam_type,
  CASE es.theme
    WHEN 'thyroid' THEN 'Polyclinique thyroidienne'
    WHEN 'colon' THEN 'Centre digestif'
    WHEN 'lymph-node' THEN 'Clinique ORL'
    WHEN 'gastric' THEN 'Clinique digestive'
    WHEN 'breast' THEN 'Centre du sein'
    ELSE 'Hopital respiratoire'
  END AS clinic_name,
  CASE es.theme
    WHEN 'thyroid' THEN 'Dr Endocrino'
    WHEN 'colon' THEN 'Dr Digestif'
    WHEN 'lymph-node' THEN 'Dr Hemato'
    WHEN 'gastric' THEN 'Dr Gastro'
    WHEN 'breast' THEN 'Dr Seno'
    ELSE 'Dr Pneumo'
  END AS requesting_doctor,
  es.requested_date,
  es.registered_date,
  es.result_issued_date,
  CASE
    WHEN es.theme = 'thyroid' AND es.exam_type = 'cytology' THEN 'Ponction thyroidienne'
    WHEN es.theme = 'thyroid' THEN 'Biopsie thyroidienne'
    WHEN es.theme = 'colon' THEN 'Polype colique sigmoide'
    WHEN es.theme = 'lymph-node' THEN 'Biopsie ganglionnaire cervicale'
    WHEN es.theme = 'gastric' THEN 'Biopsie gastrique antrale'
    WHEN es.theme = 'breast' THEN 'Biopsie mammaire'
    WHEN es.exam_type = 'cytology' THEN 'Liquide pleural'
    ELSE 'Biopsie pleurale'
  END AS sample_nature,
  CASE es.theme
    WHEN 'thyroid' THEN 'Nodule thyroidien suspect avec microcalcifications et aspect papillaire.'
    WHEN 'colon' THEN 'Rectorragies et polype avec suspicion d adenocarcinome colique.'
    WHEN 'lymph-node' THEN 'Adenopathie cervicale persistante avec suspicion de lymphome.'
    WHEN 'gastric' THEN 'Douleurs epigastriques et recherche helicobacter pylori.'
    WHEN 'breast' THEN 'Nodule mammaire suspect avec recherche de carcinome infiltrant.'
    ELSE 'Epanchement pleural recidivant avec recherche d adenocarcinome metastatique.'
  END AS exam_history,
  CASE es.theme
    WHEN 'thyroid' THEN ARRAY['papillaire', 'thyroide', 'carcinome']
    WHEN 'colon' THEN ARRAY['adenocarcinome', 'colon', 'dysplasie']
    WHEN 'lymph-node' THEN ARRAY['lymphome', 'ganglion', 'proliferation']
    WHEN 'gastric' THEN ARRAY['helicobacter', 'gastrite', 'inflammation']
    WHEN 'breast' THEN ARRAY['carcinome', 'sein', 'infiltrant']
    ELSE ARRAY['adenocarcinome', 'metastase', 'pleural']
  END AS diagnosis_keywords,
  'completed',
  es.urgent
FROM exam_seed es
INNER JOIN numbered_patients np
  ON np.seq = es.patient_seq;

WITH exam_seed AS (
  SELECT
    gs,
    CASE gs % 6
      WHEN 0 THEN 'thyroid'
      WHEN 1 THEN 'colon'
      WHEN 2 THEN 'lymph-node'
      WHEN 3 THEN 'gastric'
      WHEN 4 THEN 'breast'
      ELSE 'pleural'
    END AS theme,
    CASE
      WHEN gs % 5 IN (0, 3) THEN 'cytology'
      ELSE 'histology'
    END AS exam_type
  FROM generate_series(1, 200) AS gs
)
INSERT INTO reports (
  exam_id,
  clinical_info,
  macroscopy,
  microscopy,
  conclusion
)
SELECT
  e.id,
  CASE es.theme
    WHEN 'thyroid' THEN 'Nodule thyroidien suspect avec ponction ou biopsie orientee vers un carcinome papillaire.'
    WHEN 'colon' THEN 'Polype colique avec tableau oriente vers un adenocarcinome colique.'
    WHEN 'lymph-node' THEN 'Adenopathie cervicale durable avec suspicion de lymphome.'
    WHEN 'gastric' THEN 'Biopsies gastriques pour recherche d helicobacter pylori et gastrite chronique.'
    WHEN 'breast' THEN 'Biopsie mammaire orientee vers un carcinome infiltrant.'
    ELSE 'Prelevement pleural a la recherche d un adenocarcinome metastatique.'
  END AS clinical_info,
  CASE es.theme
    WHEN 'thyroid' THEN 'Fragments blanchatres et friables compatibles avec un prelevement thyroidien.'
    WHEN 'colon' THEN 'Fragments polypoides brunatres totalisant plusieurs millimetres.'
    WHEN 'lymph-node' THEN 'Fragment ganglionnaire grisatre de petite taille.'
    WHEN 'gastric' THEN 'Fragments muqueux gastriques brunatres de petite taille.'
    WHEN 'breast' THEN 'Carottes tissulaires beigeatres provenant d une biopsie mammaire.'
    ELSE 'Culot cellulaire et/ou fragments pleuraux prepares pour etude.'
  END AS macroscopy,
  CASE es.theme
    WHEN 'thyroid' THEN 'Architecture papillaire avec atypies nucleaires, rainures et pseudo-inclusions evocatrices.'
    WHEN 'colon' THEN 'Proliferation glandulaire atypique avec dysplasie de haut grade et foyers d adenocarcinome.'
    WHEN 'lymph-node' THEN 'Effacement de l architecture ganglionnaire par une proliferation lymphoide monomorphe suspecte.'
    WHEN 'gastric' THEN 'Muqueuse gastrique siege d une gastrite chronique active avec helicobacter pylori abundant.'
    WHEN 'breast' THEN 'Proliferation carcinomateuse infiltrante organisee en traves et amas irreguliers.'
    ELSE 'Cellules epitheliales malignes en amas, compatibles avec un adenocarcinome pleural ou metastatique.'
  END AS microscopy,
  CASE es.theme
    WHEN 'thyroid' THEN 'Aspect compatible avec un carcinome papillaire thyroidien.'
    WHEN 'colon' THEN 'Adenocarcinome colique sur lesion dysplasique.'
    WHEN 'lymph-node' THEN 'Proliferation lymphoide suspecte de lymphome.'
    WHEN 'gastric' THEN 'Gastrite chronique active associee a helicobacter pylori.'
    WHEN 'breast' THEN 'Carcinome infiltrant du sein.'
    ELSE 'Presence de cellules malignes compatibles avec un adenocarcinome metastatique.'
  END AS conclusion
FROM exam_seed es
INNER JOIN exams e
  ON e.laboratory_id = 9001
 AND e.exam_number = CASE
   WHEN es.exam_type = 'cytology'
     THEN 'P3C' || lpad(es.gs::text, 4, '0') || '-2026'
   ELSE 'P3H' || lpad(es.gs::text, 4, '0') || '-2026'
 END;

COMMIT;
