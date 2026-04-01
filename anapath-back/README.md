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
- placeholder login
- patient CRUD
- patient exam history
- exam list/detail/create/update
- report load/save with lock on validated exams
- report template CRUD
- lab-scoped dashboard stats
- case archive search and preview

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
├── tests/
│   └── api.contract.test.js
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

## Useful scripts

```bash
npm run dev
npm start
npm test
npm run db:schema
npm run db:seed
```

## Main API routes

- `GET /api/health`
- `POST /api/auth/login`
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
- Authenticated requests are lab-scoped through `X-Laboratory-Id`.
- `GET /api/exams/stats` must stay registered before `GET /api/exams/:id`.
- Exam creation auto-creates the linked report.
- Report updates are blocked when `exam.status === 'completed'`.
- Once an exam is already `completed`, direct metadata correction is blocked.
- The only allowed post-validation mutation is `status: 'in_progress'` to reopen the case.
- Reopening clears `result_issued_date`.

## Tests

Minimal backend contract tests are present in:

- [tests/api.contract.test.js](tests/api.contract.test.js)

They cover:
- patient creation
- exam creation
- report load/save
- validation / reopen
- template CRUD
- archive search
- archive preview

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

- auth is still placeholder
- no JWT verification middleware
- no RBAC
- no pagination
- no audit trail/version history for reports
- archive search stays on PostgreSQL full-text search, with no external search engine
