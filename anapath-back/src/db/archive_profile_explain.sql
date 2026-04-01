-- Archive profiling explain script for P3 stabilization
-- Run with: psql -d anapath -f src/db/archive_profile_explain.sql

\timing on
\echo ''
\echo 'P3 archive profiling — representative queries on laboratory 9001'
\echo ''

\echo '1) Recent completed cases without search term (default archive page)'
EXPLAIN (ANALYZE, BUFFERS)
WITH search_input AS (
  SELECT NULL::tsquery AS search_query
)
SELECT
  e.id AS exam_id,
  e.exam_number,
  e.exam_type,
  e.sample_nature,
  e.result_issued_date,
  p.age AS patient_age,
  p.sex AS patient_sex,
  e.diagnosis_keywords,
  e.status,
  NULL::text AS matched_section,
  NULL::text AS matched_excerpt,
  NULLIF(left(regexp_replace(coalesce(r.conclusion, ''), E'\\s+', ' ', 'g'), 220), '') AS conclusion_preview,
  ARRAY[]::text[] AS match_reasons,
  0 AS relevance_score
FROM exams e
INNER JOIN reports r ON r.exam_id = e.id
INNER JOIN patients p ON p.id = e.patient_id
CROSS JOIN search_input
WHERE e.laboratory_id = 9001
  AND e.status = 'completed'
ORDER BY relevance_score DESC, e.result_issued_date DESC NULLS LAST, e.created_at DESC
LIMIT 24;

\echo ''
\echo '2) Full-text search: q = carcinome'
EXPLAIN (ANALYZE, BUFFERS)
WITH search_input AS (
  SELECT websearch_to_tsquery('simple', 'carcinome') AS search_query
)
SELECT
  e.id AS exam_id,
  e.exam_number,
  CASE
    WHEN to_tsvector('simple', coalesce(r.conclusion, '')) @@ search_input.search_query THEN 'conclusion'
    WHEN to_tsvector('simple', coalesce(r.microscopy, '')) @@ search_input.search_query THEN 'microscopy'
    WHEN to_tsvector('simple', coalesce(r.macroscopy, '')) @@ search_input.search_query THEN 'macroscopy'
    WHEN to_tsvector('simple', coalesce(r.clinical_info, '')) @@ search_input.search_query THEN 'clinical_info'
    WHEN to_tsvector('simple', coalesce(e.sample_nature, '')) @@ search_input.search_query THEN 'sample_nature'
    WHEN to_tsvector('simple', coalesce(e.exam_history, '')) @@ search_input.search_query THEN 'exam_history'
    WHEN to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')) @@ search_input.search_query THEN 'diagnosis_keywords'
    ELSE NULL
  END AS matched_section,
  CASE
    WHEN to_tsvector('simple', coalesce(r.conclusion, '')) @@ search_input.search_query THEN ts_headline('simple', coalesce(r.conclusion, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ')
    WHEN to_tsvector('simple', coalesce(r.microscopy, '')) @@ search_input.search_query THEN ts_headline('simple', coalesce(r.microscopy, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ')
    WHEN to_tsvector('simple', coalesce(r.macroscopy, '')) @@ search_input.search_query THEN ts_headline('simple', coalesce(r.macroscopy, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ')
    WHEN to_tsvector('simple', coalesce(r.clinical_info, '')) @@ search_input.search_query THEN ts_headline('simple', coalesce(r.clinical_info, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ')
    WHEN to_tsvector('simple', coalesce(e.sample_nature, '')) @@ search_input.search_query THEN ts_headline('simple', coalesce(e.sample_nature, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=18, MinWords=6, ShortWord=2')
    WHEN to_tsvector('simple', coalesce(e.exam_history, '')) @@ search_input.search_query THEN ts_headline('simple', coalesce(e.exam_history, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ')
    ELSE ts_headline('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ', '), ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=18, MinWords=4, ShortWord=2')
  END AS matched_excerpt,
  (
    ts_rank_cd(
      (
        setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
      ),
      search_input.search_query,
      32
    )
  ) AS relevance_score
FROM exams e
INNER JOIN reports r ON r.exam_id = e.id
INNER JOIN patients p ON p.id = e.patient_id
CROSS JOIN search_input
WHERE e.laboratory_id = 9001
  AND e.status = 'completed'
  AND (
    (
      setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B')
    ) @@ search_input.search_query
    OR (
      setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
    ) @@ search_input.search_query
  )
ORDER BY relevance_score DESC, e.result_issued_date DESC NULLS LAST, e.created_at DESC
LIMIT 24;

\echo ''
\echo '3) Histology search: q = papillaire thyroide, exam_type = histology'
EXPLAIN (ANALYZE, BUFFERS)
WITH search_input AS (
  SELECT websearch_to_tsquery('simple', 'papillaire thyroide') AS search_query
)
SELECT
  e.id AS exam_id,
  e.exam_number,
  ts_headline('simple', coalesce(r.conclusion, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ') AS matched_excerpt,
  ts_rank_cd(
    (
      setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
    ),
    search_input.search_query,
    32
  ) AS relevance_score
FROM exams e
INNER JOIN reports r ON r.exam_id = e.id
CROSS JOIN search_input
WHERE e.laboratory_id = 9001
  AND e.status = 'completed'
  AND e.exam_type = 'histology'
  AND (
    (
      setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B')
    ) @@ search_input.search_query
    OR (
      setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
    ) @@ search_input.search_query
  )
ORDER BY relevance_score DESC, e.result_issued_date DESC NULLS LAST, e.created_at DESC
LIMIT 24;

\echo ''
\echo '4) Section filter: conclusion'
EXPLAIN (ANALYZE, BUFFERS)
WITH search_input AS (
  SELECT websearch_to_tsquery('simple', 'adenocarcinome') AS search_query
)
SELECT
  e.id AS exam_id,
  e.exam_number,
  ts_headline('simple', coalesce(r.conclusion, ''), search_input.search_query, 'StartSel=, StopSel=, MaxWords=28, MinWords=10, ShortWord=2, MaxFragments=2, FragmentDelimiter= … ') AS matched_excerpt,
  ts_rank_cd(
    setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A'),
    search_input.search_query,
    32
  ) AS relevance_score
FROM exams e
INNER JOIN reports r ON r.exam_id = e.id
CROSS JOIN search_input
WHERE e.laboratory_id = 9001
  AND e.status = 'completed'
  AND to_tsvector('simple', coalesce(r.conclusion, '')) @@ search_input.search_query
ORDER BY relevance_score DESC, e.result_issued_date DESC NULLS LAST, e.created_at DESC
LIMIT 24;

\echo ''
\echo '5) Contextual lookup with source_exam_id'
EXPLAIN (ANALYZE, BUFFERS)
WITH source_exam AS (
  SELECT
    e.id AS source_exam_id,
    e.exam_type AS source_exam_type,
    ARRAY(
      SELECT lower(keyword)
      FROM unnest(e.diagnosis_keywords) AS keyword
    ) AS source_keywords
  FROM exams e
  WHERE e.laboratory_id = 9001
    AND e.status = 'completed'
    AND e.sample_nature ILIKE '%thyroid%'
  ORDER BY e.id
  LIMIT 1
),
search_input AS (
  SELECT websearch_to_tsquery('simple', 'papillaire thyroide') AS search_query
)
SELECT
  e.id AS exam_id,
  e.exam_number,
  array_remove(
    ARRAY[
      CASE
        WHEN e.exam_type = source_exam.source_exam_type THEN 'same_exam_type'
        ELSE NULL
      END,
      CASE
        WHEN EXISTS (
          SELECT 1
          FROM unnest(e.diagnosis_keywords) AS candidate_keyword
          WHERE lower(candidate_keyword) = ANY(source_exam.source_keywords)
        ) THEN 'shared_keyword'
        ELSE NULL
      END
    ],
    NULL
  ) AS match_reasons,
  (
    ts_rank_cd(
      (
        setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
        setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
      ),
      search_input.search_query,
      32
    )
    + CASE
        WHEN e.exam_type = source_exam.source_exam_type THEN 0.18
        ELSE 0
      END
    + CASE
        WHEN EXISTS (
          SELECT 1
          FROM unnest(e.diagnosis_keywords) AS candidate_keyword
          WHERE lower(candidate_keyword) = ANY(source_exam.source_keywords)
        ) THEN 0.14
        ELSE 0
      END
  ) AS relevance_score
FROM exams e
INNER JOIN reports r ON r.exam_id = e.id
CROSS JOIN source_exam
CROSS JOIN search_input
WHERE e.laboratory_id = 9001
  AND e.status = 'completed'
  AND e.id <> source_exam.source_exam_id
  AND (
    (
      setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B')
    ) @@ search_input.search_query
    OR (
      setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
    ) @@ search_input.search_query
  )
ORDER BY relevance_score DESC, e.result_issued_date DESC NULLS LAST, e.created_at DESC
LIMIT 6;

\echo ''
\echo '6) Search with exam_type + date window'
EXPLAIN (ANALYZE, BUFFERS)
WITH search_input AS (
  SELECT websearch_to_tsquery('simple', 'helicobacter') AS search_query
)
SELECT
  e.id AS exam_id,
  e.exam_number,
  e.result_issued_date,
  ts_rank_cd(
    (
      setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
    ),
    search_input.search_query,
    32
  ) AS relevance_score
FROM exams e
INNER JOIN reports r ON r.exam_id = e.id
CROSS JOIN search_input
WHERE e.laboratory_id = 9001
  AND e.status = 'completed'
  AND e.exam_type = 'histology'
  AND e.result_issued_date >= DATE '2026-02-01'
  AND e.result_issued_date <= DATE '2026-03-31'
  AND (
    (
      setweight(to_tsvector('simple', coalesce(e.sample_nature, '')), 'B') ||
      setweight(to_tsvector('simple', coalesce(e.exam_history, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(immutable_text_array_to_string(e.diagnosis_keywords, ' '), '')), 'B')
    ) @@ search_input.search_query
    OR (
      setweight(to_tsvector('simple', coalesce(r.clinical_info, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.macroscopy, '')), 'C') ||
      setweight(to_tsvector('simple', coalesce(r.microscopy, '')), 'A') ||
      setweight(to_tsvector('simple', coalesce(r.conclusion, '')), 'A')
    ) @@ search_input.search_query
  )
ORDER BY relevance_score DESC, e.result_issued_date DESC NULLS LAST, e.created_at DESC
LIMIT 24;
