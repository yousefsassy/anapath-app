# Backend Notes

This is a backend-scoped companion note for Claude sessions working inside `anapath-back/`.

For project-wide status (frontend + backend), use root `CLAUDE.md` as the source of truth.

## Backend Purpose
The backend provides the Anapath V1 API for doctor-only workflow operations:
- authentication login (placeholder)
- patient CRUD (list/create/detail/update)
- exam CRUD (list/create/detail/update)
- report read/update per exam

## Folder Overview
- `server.js` - backend boot entry (port selection + startup logs)
- `src/app.js` - Express app wiring (`cors`, JSON, `/api`, error handlers)
- `src/routes/` - route groups by domain (`auth`, `health`, `patients`, `exams`, `reports`)
- `src/controllers/` - HTTP handlers and validation
- `src/db/queries.js` - SQL data access and transaction logic
- `src/db/schema.sql` / `src/db/seed.sql` - schema and seed
- `src/config/database.js` - PostgreSQL pool/query helpers

## Main Routes, Controllers, Queries
- `GET /api/health` -> `healthController.getHealth`
- `POST /api/auth/login` -> `authController.login`
- `GET/POST/GET:id/PUT:id /api/patients` -> `patientController`
- `GET /api/patients/:id/exams` -> `patientController.getPatientExams` (supports `?include=report_summary`)
- `GET/POST/GET:id/PUT:id /api/exams` -> `examController` (`GET /api/exams` supports `?status=` filter)
- `GET/PUT /api/reports/:examId` -> `reportController`
- Data access is centralized in `src/db/queries.js`

## Implemented Backend Capabilities
- Health endpoint includes DB connectivity status
- Login checks `users` table and returns placeholder token payload
- Patient create/detail/list/update with validation and read-only field protection
- Exam create/detail/list/update with validation and read-only field protection
- `GET /api/exams` accepts optional `?status=registered|in_progress|completed` filter; returns 400 for invalid values; LEFT JOINs patients to include `patient_first_name`, `patient_last_name`
- `GET /api/patients/:id/exams` accepts optional `?include=report_summary`; when set, LEFT JOINs reports and returns `report_summary: { conclusion, updated_at } | null` per exam (uses `findExamsByPatientIdWithReportSummary`)
- Transactional exam creation with persistent `exam_number` generation via `exam_sequences`
- Auto-create-empty-report behavior on report update when report row is missing
- Recency ordering consistency:
  - all exams: `created_at DESC`
  - exams by patient: `created_at DESC`

## Important Data / Update Flows
- Create exam (`POST /api/exams`):
  1) validate patient exists
  2) increment/get sequence by `(laboratory_id, exam_type)`
  3) generate `exam_number` (`C####-YYYY` for cytology, `N-YYYY` for histology)
  4) insert exam + default empty report in one transaction
- Update patient/exam (`PUT`): only editable fields are accepted; read-only fields are rejected with `400`
- Reports: `PUT /api/reports/:examId` guarantees report row existence before update

## Known Backend Limitations
- Auth is placeholder only:
  - plaintext password comparison
  - no JWT signing/verification middleware
  - no route-level authorization enforcement
- No RBAC or multi-tenant authorization checks beyond stored IDs
- No pagination support for list endpoints
- No automated backend test suite currently present

## Session Guidance
- Keep backend edits small and workflow-safe by default.
- Preserve response envelope format: `{ success, message?, data }`.
- If behavior changes impact full app workflow, update root `CLAUDE.md` as well.
