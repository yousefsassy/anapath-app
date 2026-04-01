# Anapath Backend

Express + PostgreSQL backend for the Anapath doctor workflow app.

For the full product overview, feature map, and workflow description, see the root [README](../README.md).  
For the technical source of truth across the whole repo, see root [CLAUDE.md](../CLAUDE.md).

## Stack

- Node.js
- Express
- PostgreSQL
- plain SQL through `pg`

## What this package is responsible for

The backend provides:
- cookie-backed login/session/logout
- patient CRUD
- patient exam history
- exam list/detail/create/update
- report load/save with lock on validated exams
- report template CRUD
- lab-scoped dashboard stats
- case archive search and preview
- request-scoped DB policy context + PostgreSQL RLS tenant defense-in-depth
- append-only audit events and minimal backend-only report revision snapshots

## Project structure

```text
anapath-back/
├── src/
│   ├── app.js
│   ├── config/
│   │   └── database.js
│   ├── controllers/
│   ├── db/
│   │   ├── queries.js
│   │   ├── schema.sql
│   │   ├── seed.sql
│   │   ├── archive_profile_fixture.sql
│   │   ├── archive_profile_explain.sql
│   │   └── archive_profile_results.md
│   ├── middlewares/
│   ├── routes/
│   └── utils/
├── tests/              # contract + security regression tests
├── server.js
├── .env.example
└── package.json
```

## Install and configure

```bash
npm install
cp .env.example .env
```

Example `.env`:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=anapath
```

## Database setup

Create the database if needed:

```bash
createdb anapath
```

Apply schema:

```bash
psql -d anapath -f src/db/schema.sql
```

Load seed data:

```bash
psql -d anapath -f src/db/seed.sql
```

Create or rotate the local/staging admin:

```bash
npm run bootstrap:admin
```

## Useful scripts

```bash
npm run dev
npm start
npm test
npm run bootstrap:admin
npm run security:audit:prod
npm run security:audit:full
npm run db:role:check
npm run db:rls:check
npm run db:schema
npm run db:seed
```

## Main API routes

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

## Important backend rules

- All responses follow `{ success, message?, data }`.
- User-facing API messages are in French.
- Authenticated requests are lab-scoped through the server-side session, not through a trusted frontend lab header.
- Protected business requests apply a request-scoped DB policy context before tenant-scoped queries/transactions.
- Forced PostgreSQL RLS is enabled on lab-scoped business/security tables for tenant defense-in-depth.
- `GET /api/exams/stats` must stay registered before `GET /api/exams/:id`.
- Exam creation auto-creates the linked report.
- Report updates are blocked when `exam.status === 'completed'`.
- Once an exam is already `completed`, direct metadata correction is blocked.
- The only allowed post-validation mutation is `status: 'in_progress'` to reopen the case.
- Reopening clears `result_issued_date`.
- Audit events are append-only and currently cover login success/failure, logout, explicit report save, validation, and reopen.
- Report revisions are backend-only snapshots created on explicit save/validation when the narrative changed.

## Tests

Backend tests are present in:

- [tests/api.contract.test.js](tests/api.contract.test.js)
- [tests/security.auth.test.js](tests/security.auth.test.js)
- [tests/security.validation.test.js](tests/security.validation.test.js)
- [tests/security.audit.test.js](tests/security.audit.test.js)

Coverage includes:
- patient creation
- exam creation
- report load/save
- validation / reopen
- template CRUD
- archive search
- archive preview
- authentication/session invalidation
- login throttling
- request validation hardening
- log redaction / request-id checks
- DB policy context + RLS catalog checks
- audit ledger writes and report revision behavior

Run them with:

```bash
npm test
```

The suite runs against the configured PostgreSQL database, creates a temporary dedicated laboratory, and cleans up automatically.

## Archive profiling

Profiling assets are in:
- [archive_profile_fixture.sql](src/db/archive_profile_fixture.sql)
- [archive_profile_explain.sql](src/db/archive_profile_explain.sql)
- [archive_profile_results.md](src/db/archive_profile_results.md)

Run locally:

```bash
psql -d anapath -f src/db/archive_profile_fixture.sql
psql -d anapath -f src/db/archive_profile_explain.sql
```

## Known backend limitations

- bootstrap admin creation is env-driven for local/staging
- no RBAC
- no pagination
- no doctor-facing audit/history UI or restore workflow
- rate limiting is still process-local / in-memory
- CSP enforcement lives at the real frontend serving layer and is not handled directly by this package
- archive search stays on PostgreSQL full-text search, with no external search engine
