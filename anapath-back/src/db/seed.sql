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
VALUES
  (2, 1, 'Karim', 'Boussetta', 58, 'M', '0611111111', NULL, 'Tabagisme chronique.'),
  (3, 1, 'Leila', 'Trabelsi', 44, 'F', '0622222222', NULL, 'Suivi gynecologique regulier.'),
  (4, 1, 'Sami', 'Khelifi', 67, 'M', '0633333333', NULL, 'Diabete type 2 equilibre.'),
  (5, 1, 'Mouna', 'Gharbi', 49, 'F', '0644444444', NULL, 'Goitre multinodulaire connu.'),
  (6, 1, 'Hatem', 'Ben Salem', 62, 'M', '0655555555', NULL, 'BPCO moderee.'),
  (7, 1, 'Aicha', 'Ferjani', 63, 'F', '0666666666', NULL, 'HTA traitee.')
ON CONFLICT (id) DO NOTHING;

-- Initialize exam number sequences for lab 1 (start at 0 so first generated is 1)
INSERT INTO exam_sequences (laboratory_id, exam_type, current_value)
VALUES
  (1, 'cytology', 0),
  (1, 'histology', 0)
ON CONFLICT (laboratory_id, exam_type) DO NOTHING;

INSERT INTO exams (
  id,
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
VALUES
  (1, 1, 1, '1-2026', 'histology', 'Clinique du Lac', 'Dr Ben Amor', '2026-01-10', '2026-01-11', '2026-01-15', 'Biopsie mammaire droite', 'Nodule mammaire spicule classe ACR5.', ARRAY['carcinome', 'sein', 'infiltrant'], 'completed', TRUE),
  (2, 1, 2, '2-2026', 'histology', 'Hopital central', 'Dr Maalej', '2026-01-22', '2026-01-23', '2026-01-28', 'Polype colique sigmoide', 'Rectorragies intermittentes et alteration du transit.', ARRAY['adenocarcinome', 'colon', 'dysplasie'], 'completed', FALSE),
  (3, 1, 3, 'C0001-2026', 'cytology', 'Centre femme', 'Dr Kefi', '2026-02-02', '2026-02-03', '2026-02-05', 'Frottis cervico-vaginal', 'Depistage de routine chez patiente asymptomatique.', ARRAY['lsil', 'dysplasie', 'col'], 'completed', FALSE),
  (4, 1, 4, '3-2026', 'histology', 'Clinique les Jasmins', 'Dr Ghorbel', '2026-02-15', '2026-02-16', '2026-02-19', 'Biopsie cutanee du cuir chevelu', 'Plaque ulceree chronique augmentant de taille.', ARRAY['carcinome', 'basocellulaire', 'peau'], 'completed', TRUE),
  (5, 1, 5, '4-2026', 'histology', 'Polyclinique Ennasr', 'Dr Kharrat', '2026-02-27', '2026-02-28', '2026-03-02', 'Piece de thyroidectomie partielle', 'Nodule thyroidien TIRADS 4 du lobe droit.', ARRAY['papillaire', 'thyroide', 'carcinome'], 'completed', FALSE),
  (6, 1, 5, 'C0002-2026', 'cytology', 'Polyclinique Ennasr', 'Dr Kharrat', '2026-03-01', '2026-03-02', '2026-03-04', 'Ponction thyroidienne', 'Nodule thyroidien suspect avec microcalcifications.', ARRAY['bethesda', 'thyroide', 'papillaire'], 'completed', FALSE),
  (7, 1, 2, '5-2026', 'histology', 'Hopital central', 'Dr Maalej', '2026-03-08', '2026-03-09', '2026-03-12', 'Biopsie gastrique antrale', 'Douleurs epigastriques et recherche Helicobacter.', ARRAY['gastrite', 'helicobacter', 'inflammation'], 'completed', FALSE),
  (8, 1, 7, '6-2026', 'histology', 'Clinique Hannibal', 'Dr Mzabi', '2026-03-10', '2026-03-11', '2026-03-15', 'Biopsie endometriale', 'Metrorragies post-menopausiques avec endometre epaissi.', ARRAY['hyperplasie', 'endometre', 'atypies'], 'completed', FALSE),
  (9, 1, 6, 'C0003-2026', 'cytology', 'Hopital militaire', 'Dr Nefzi', '2026-03-18', '2026-03-19', '2026-03-21', 'Liquide pleural', 'Epanchement pleural recidivant chez patient dyspneique.', ARRAY['adenocarcinome', 'metastase', 'pleural'], 'completed', TRUE),
  (10, 1, 4, '7-2026', 'histology', 'Clinique les Jasmins', 'Dr Ghorbel', '2026-03-22', '2026-03-23', '2026-03-26', 'Biopsie ganglionnaire cervicale', 'Adenopathie cervicale persistante.', ARRAY['lymphome', 'ganglion', 'proliferation'], 'completed', FALSE),
  (11, 1, 6, '8-2026', 'histology', 'Hopital militaire', 'Dr Nefzi', '2026-03-26', '2026-03-27', '2026-03-30', 'Biopsie hepatique', 'Cytolyse chronique avec syndrome inflammatoire modere.', ARRAY['hepatite', 'fibrose', 'foie'], 'completed', FALSE)
ON CONFLICT DO NOTHING;

INSERT INTO reports (
  id,
  exam_id,
  clinical_info,
  macroscopy,
  microscopy,
  conclusion
)
SELECT *
FROM (
  VALUES
    (1, 1, 'Nodule mammaire droit suspect radiologiquement.', 'Trois carottes beigeatres mesurant jusqu a 1.4 cm.', 'Proliferation carcinomateuse infiltrante organisee en amas et traves avec atypies marquees.', 'Carcinome canalaire infiltrant du sein.'),
    (2, 2, 'Polype sigmoide avec rectorragies.', 'Fragments polypoides brunatres totalisant 2.1 cm.', 'Proliferation glandulaire atypique infiltrant le chorion avec dysplasie de haut grade.', 'Adenocarcinome infiltrant du colon sur adenome dysplasique.'),
    (3, 3, 'Depistage cervico-vaginal.', 'Etalement cytologique conventionnel.', 'Cellules malpighiennes koilocytaires avec atypies nucleaires legeres.', 'LSIL avec effet koilocytaire.'),
    (4, 4, 'Plaque cutanee ulceree du cuir chevelu.', 'Fragment cutane ellipse de 1.6 cm.', 'Proliferation basaloide infiltrante en massifs et cordons avec palissade peripherique.', 'Carcinome basocellulaire infiltrant.'),
    (5, 5, 'Nodule thyroidien du lobe droit.', 'Lobectomie droite contenant un nodule blanchatre de 1.8 cm.', 'Architecture papillaire avec noyaux eclaircis, pseudo-inclusions et rainures nucleaires.', 'Carcinome papillaire thyroidien classique.'),
    (6, 6, 'Ponction d un nodule thyroidien suspect.', 'Frottis riches et bien etales.', 'Amas folliculaires avec noyaux chevauches, rainures et pseudo-inclusions.', 'Frottis compatible avec une lesion suspecte de carcinome papillaire thyroidien.'),
    (7, 7, 'Biopsies antrales pour douleurs epigastriques.', 'Quatre fragments muqueux brunatres de 0.2 a 0.4 cm.', 'Muqueuse gastrique siege d une gastrite chronique active avec Helicobacter pylori abondant.', 'Gastrite chronique active associee a Helicobacter pylori.'),
    (8, 8, 'Metrorragies post-menopausiques.', 'Curetage fragmentaire hemorragique.', 'Glandes endometriales crowded avec atypies architecturales et nucleaires focales.', 'Hyperplasie complexe de l endometre avec atypies focales.'),
    (9, 9, 'Liquide pleural hemorragique recidivant.', 'Culot cellulaire prepare sur lames et bloc cellulaire.', 'Cellules epitheliales malignes en amas tridimensionnels avec nucleoles evidents.', 'Presence de cellules malignes compatibles avec un adenocarcinome metastatique.'),
    (10, 10, 'Adenopathie cervicale persistante.', 'Fragment ganglionnaire de 1.9 cm.', 'Effacement de l architecture par proliferation lymphoide monomorphe diffuse.', 'Proliferation lymphoide suspecte necessitant immunohistochimie complementaire.'),
    (11, 11, 'Biopsie hepatique pour cytolyse chronique.', 'Carotte hepatique brune de 1.7 cm.', 'Inflammation portale avec activite interface et fibrose portale delicate.', 'Hepatite chronique active avec fibrose portale.')
) AS report_seed(id, exam_id, clinical_info, macroscopy, microscopy, conclusion)
WHERE EXISTS (
  SELECT 1
  FROM exams e
  WHERE e.id = report_seed.exam_id
)
ON CONFLICT DO NOTHING;

UPDATE exam_sequences
SET current_value = GREATEST(current_value, 3),
    updated_at = NOW()
WHERE laboratory_id = 1
  AND exam_type = 'cytology';

UPDATE exam_sequences
SET current_value = GREATEST(current_value, 8),
    updated_at = NOW()
WHERE laboratory_id = 1
  AND exam_type = 'histology';

-- Keep serial IDs in sync after manual IDs above
SELECT setval('laboratories_id_seq', COALESCE((SELECT MAX(id) FROM laboratories), 1), true);
SELECT setval('patients_id_seq', COALESCE((SELECT MAX(id) FROM patients), 1), true);
SELECT setval('exams_id_seq', COALESCE((SELECT MAX(id) FROM exams), 1), true);
SELECT setval('reports_id_seq', COALESCE((SELECT MAX(id) FROM reports), 1), true);
