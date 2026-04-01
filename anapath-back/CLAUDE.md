# Backend Notes

This is a backend-scoped companion note for work inside `anapath-back/`.

For the mixed app overview, feature descriptions, and workflow context, use the root [README](../README.md).  
For the full technical source of truth across frontend + backend, use root [CLAUDE.md](../CLAUDE.md).

## Backend purpose

The backend powers the doctor workflow through:
- cookie-backed login/session/logout
- patient CRUD and patient search
- patient exam history
- exam list/detail/create/update
- report load/save with lock on validated exams
- report template CRUD
- lab-scoped dashboard stats
- validated case archive search and preview
- request-scoped DB policy context + PostgreSQL RLS
- append-only audit events + backend-only report revision snapshots

## Folder overview

- `server.js` — backend entrypoint
- `src/app.js` — Express wiring
- `src/routes/` — route groups by domain
- `src/controllers/` — HTTP handlers and validation
- `src/db/queries.js` — SQL data access and transactions
- `src/db/schema.sql` / `src/db/seed.sql` — schema and seed
- `src/db/archive_profile_*` — archive profiling fixture, explain script, and results
- `src/config/database.js` — PostgreSQL pool/query helpers
- `tests/` — backend contract + security regression coverage

## Main routes

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/logout`
- `GET /api/patients`
- `POST /api/patients`
- `GET /api/patients/search`
- `GET /api/patients/:id`
- `PUT /api/patients/:id`
- `GET /api/patients/:id/exams`
- `GET /api/exams`
- `GET /api/exams/stats`
- `POST /api/exams`
- `GET /api/exams/:id`
- `PUT /api/exams/:id`
- `GET /api/reports/:examId`
- `PUT /api/reports/:examId`
- `GET /api/report-templates`
- `POST /api/report-templates`
- `PUT /api/report-templates/:id`
- `DELETE /api/report-templates/:id`
- `GET /api/case-archive/search`
- `GET /api/case-archive/:id/preview`

## Important backend behavior

- All responses use `{ success, message?, data }`.
- Validation/error messages returned to the frontend are in French.
- Requests are scoped by lab from the authenticated server-side session.
- Protected requests set DB policy context for the current lab/user/session/request before tenant-scoped DB work.
- Forced RLS is enabled on lab-scoped business/security tables.
- `GET /api/exams/stats` must remain defined before `GET /api/exams/:id`.
- Exam creation is transactional and auto-creates the linked empty report.
- Exam numbers are generated through `exam_sequences`.
- `PUT /api/reports/:examId` returns `403` when the exam is already `completed`.
- Once an exam is `completed`, direct metadata correction is blocked.
- The only allowed post-validation change is reopening the exam with `status: 'in_progress'`.
- Reopening clears `result_issued_date`.
- Audit events currently cover login success/failure, logout, explicit report save, validation, and reopen.
- Report revisions are backend-only snapshots created on explicit save/validation when the report content changed.

## Backend tests and profiling

- Minimal contract tests exist in `tests/api.contract.test.js`.
- Security regression tests also exist in:
  - `tests/security.auth.test.js`
  - `tests/security.validation.test.js`
  - `tests/security.audit.test.js`
- Run them with `npm test`.
- Archive profiling assets exist in:
  - `src/db/archive_profile_fixture.sql`
  - `src/db/archive_profile_explain.sql`
  - `src/db/archive_profile_results.md`

Useful commands:

```bash
npm run dev
npm test
npm run bootstrap:admin
npm run security:audit:prod
npm run security:audit:full
npm run db:role:check
npm run db:rls:check
psql -d anapath -f src/db/schema.sql
psql -d anapath -f src/db/seed.sql
psql -d anapath -f src/db/archive_profile_fixture.sql
psql -d anapath -f src/db/archive_profile_explain.sql
```

## Known backend limitations

- bootstrap admin creation is env-driven for local/staging
- no RBAC
- no pagination
- no doctor-facing audit/revision viewer or restore workflow
- archive search remains PostgreSQL full-text search, not an external search stack
- rate limiting is process-local / in-memory only
- shared/distributed rate limiting is still deferred

## Session guidance

- Keep backend edits small and workflow-safe by default.
- Preserve canonical DB/API values in English.
- Keep user-facing messages in French.
- Prefer updating root `CLAUDE.md` when behavior changes affect the whole app.
