# P3 — Archive query profiling

## Dataset
- Fixture lab: `laboratory_id = 9001`
- Target size: `200` completed exams with associated reports
- Themes represented: `carcinome`, `papillaire`, `thyroide`, `lymphome`, `adenocarcinome`, `helicobacter`

## Reproduction
```bash
psql -d anapath -f anapath-back/src/db/archive_profile_fixture.sql
psql -d anapath -f anapath-back/src/db/archive_profile_explain.sql
```

## Queries profiled
1. Recent completed cases without search term
2. Full-text search `carcinome`
3. Histology search `papillaire thyroide`
4. Section filter on `conclusion`
5. Contextual lookup with `source_exam_id`
6. Search with `exam_type + date range`

## Results
- Measured on the local fixture after loading `200` completed cases + `200` reports in lab `9001`.
- Query 1 — recent completed cases, no search term:
  - execution time: `1.352 ms`
  - plan: `idx_exams_archive_completed_date` + `idx_reports_exam_id` + `patients_pkey`
- Query 2 — `q = carcinome`:
  - execution time: `5.346 ms`
  - plan: indexed scan on `exams`, seq scan on `reports`, hash join, top-N sort
- Query 3 — `q = papillaire thyroide`, `exam_type = histology`:
  - execution time: `2.815 ms`
  - plan: indexed scan on `exams`, post-filter on `exam_type`, seq scan on `reports`
- Query 4 — `section = conclusion`, `q = adenocarcinome`:
  - execution time: `1.002 ms`
  - plan: indexed scan on `exams`, `idx_reports_exam_id` on reports, per-row conclusion filter
- Query 5 — contextual lookup with `source_exam_id`:
  - execution time: `5.295 ms`
  - plan: indexed scan on `exams`, seq scan on `reports`, extra subplans for keyword overlap/context boost
- Query 6 — `q = helicobacter` with `exam_type + date range`:
  - execution time: `3.199 ms`
  - plan: `idx_exams_archive_completed_date` is used for the lab/status/date window, then `exam_type` is filtered in memory

## Verdict
- Current archive performance is acceptable on a realistic medium fixture.
- Existing indexes are already doing the heavy lifting for the current product scope.
- No additional index is justified in P3.
- The heaviest queries are the contextual and broad FTS searches, but they are still comfortably low on this dataset.
- The only notable observation is that `exam_type` is still a post-filter in the date-window query, but the row counts remain small enough that the extra composite index is not warranted yet.

## Expected reading guide
- Look first for index usage on:
  - `idx_exams_archive_completed_date`
  - `idx_exams_archive_search`
  - `idx_reports_archive_search`
- Watch for:
  - large sequential scans on `exams`
  - expensive sort nodes for date-filtered typed queries
  - repeated headline/rank cost dominating even after filtering
