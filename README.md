# Anapath

Anapath is a doctor-facing anatomopathology web application for managing patients, registering pathology exams, writing structured reports, validating them, printing/exporting them, and reusing the lab's past validated cases as a clinical reference archive.

## Who the app is for

Anapath is built for a doctor working inside a pathology laboratory.

It is intentionally:
- workflow-first
- doctor-facing
- serious and minimal
- scoped to a practical V1 rather than a full enterprise LIS

The product is organized around the daily pathologist workflow:
1. identify or create the patient
2. register the prélèvement
3. write and revise the report
4. validate the case
5. print/export the document
6. refer back to older validated cases when needed

## What the app does today

Anapath currently covers:
- cookie-backed login/session and protected navigation
- patient management
- duplicate-aware patient creation
- exam registration and tracking
- dashboard/work queue with filters, stats, urgency, and keyword search
- structured 4-section pathology reports
- validation, report locking, and controlled reopening
- report templates
- print preview and PDF export
- lab/doctor print settings
- case archive and advanced search over validated cases
- contextual `Cas similaires` lookup inside the case workspace
- backend audit events + minimal backend-only report revision snapshots
- security regression coverage, dependency audit scripts, and CSP rollout preparation
- archive profiling artifacts for stabilization

## Main doctor workflow

### 1. Login
The app starts with a server-side login flow. Once authenticated, the doctor receives a same-origin session cookie and is redirected to the work queue.

### 2. Work queue
The dashboard (`/dashboard`) is the operational home screen. It shows:
- a stats strip for registered, in-progress, and completed-this-month cases
- status tabs
- text search
- exam type filter
- registered date range filter
- diagnostic keyword filter
- urgent cases surfaced first

The queue is designed for active work, not for historical research.

### 3. Patient management
The doctor can:
- browse the patient directory
- filter by text and sex
- expand each patient row to see prélèvements inline
- open a patient record with editable demographic/history information
- review the patient's exam history with conclusion previews

At patient creation time, duplicate detection warns when a same-name patient already exists and requires confirmation before continuing.

### 4. Exam registration
From a patient record, the doctor can create a new prélèvement with:
- exam type (`histology` or `cytology`)
- clinic/requesting doctor metadata
- requested and registered dates
- sample nature
- clinical history
- diagnostic keywords
- urgency flag

Exam creation generates a persistent exam number and automatically creates the empty linked report.

### 5. Case workspace
The main workspace (`/exams/:id`) is where the doctor manages one case end to end.

It combines:
- prélèvement metadata
- patient antecedents
- structured report editing
- validation/reopen actions
- template application/saving
- contextual archive lookup through `Cas similaires`

This is the app's central working screen.

## Detailed features

### Authentication and protected workflow
- Login is handled by the backend and creates a real server-side session.
- The frontend uses same-origin requests with `credentials: 'include'`.
- Protected business routes derive the current user and `laboratory_id` from the backend session, not from frontend-provided lab headers.
- This is production-oriented session handling for the current single-doctor workflow, even though broader user-management/RBAC scope is still intentionally limited.

### Dashboard / Accueil
- The dashboard is the live work queue, not a patient registry and not the historical archive.
- Filters are AND-combined server-side.
- Diagnostic keyword filtering searches within `diagnosis_keywords`.
- Urgent cases always rise to the top.
- Only the latest active request can update the table, so rapid filter changes no longer cause stale results to overwrite newer ones.

### Patient directory
- The patient list is an annuaire-style view of current lab patients.
- It supports text search, sex filtering, and lazy-loaded inline exam expansion.
- The directory is oriented toward quickly finding an existing patient before opening or creating a case.

### New patient creation
- Creating a patient requires core identity data including `birth_date`.
- Duplicate detection warns on likely same-name collisions before final creation.
- The doctor can still choose to continue if the case is truly distinct.

### Patient detail and exam history
- The patient detail screen shows identity/history information plus all past prélèvements for that patient.
- Each exam row can expose a short report conclusion preview.
- `birth_date` is displayed but remains read-only after creation.

### Exam registration
- New exams are attached to an existing patient.
- Each new exam auto-creates the linked report row.
- Exam numbering is persistent and lab-aware:
  - Histology: `1-2026`, `2-2026`, ...
  - Cytology: `C0001-2026`, `C0002-2026`, ...

### Exam workspace
- The exam workspace is the operational dossier screen.
- It supports viewing and editing metadata while the case is not validated.
- It exposes other exams from the same patient as antecedents.
- It keeps reporting, templates, validation, archive lookup, and print access in one place.

### Structured 4-section report
Each case report is structured into four narrative sections:
- `clinical_info` — Renseignement clinique
- `macroscopy` — Macroscopie
- `microscopy` — Microscopie
- `conclusion` — Conclusion

The doctor writes and saves the report explicitly. There is no autosave.

### Validation / locking / reopening
- Validation is driven by `exam.status`.
- When a case becomes `completed`, the report becomes read-only.
- The backend refuses report updates on completed exams.
- Direct metadata correction is also blocked once the exam is validated.
- The only allowed post-validation path is reopening the dossier back to `in_progress`.
- Reopening clears `result_issued_date` and unlocks the report for correction.

This keeps the workflow simple and explicit: validate, lock, reopen if correction is needed.

### Audit trail and backend report revisions
- Critical security/workflow events are stored append-only in the backend audit ledger:
  - login success/failure
  - logout
  - explicit report save
  - validation
  - reopening
- The backend also stores minimal 4-section report snapshots on explicit save and validation when the content changed.
- This traceability is currently backend-only. There is not yet a doctor-facing history or restore screen.

### Urgent cases
- A prélèvement can be marked urgent at creation or edit time before validation.
- Urgent exams are visually flagged and sorted first in the dashboard.
- This is operational prioritization, not a separate workflow state.

### Diagnostic keywords
- Exams can store diagnostic keywords as a list.
- In the workspace they appear as chips in view mode and as comma-separated input in edit mode.
- On the dashboard they support server-side filtering.
- In archive search they also participate in contextual retrieval and matching.

### Report templates
- Templates are standalone reusable report structures with the same four sections as a case report.
- The doctor can create, edit, and delete templates.
- Inside the case workspace, templates can be applied to the current report.
- The current report can also be saved as a new template.

Templates are a writing aid, not a historical case archive.

### Print preview and PDF export
- Each case can be opened in a dedicated print page (`/exams/:id/print`).
- The page has no sidebar and is optimized for document preview/export.
- PDF generation is client-side through `html2pdf.js`.
- Formatting preferences are adjustable and stored locally.
- The printable document can use an image header if `/public/entete-compte-rendu.png` exists, otherwise it falls back to configured lab/doctor text identity.

### Draft vs final printed document
- A non-validated exam is explicitly marked as `Brouillon — prélèvement non validé`.
- That draft marker appears in the printable document and therefore in the exported PDF as well.
- The draft PDF filename is prefixed `CR-BROUILLON-...`.
- A validated exam instead shows `Document validé`, with validation date when available.

### Lab and doctor settings
- The settings page stores lab/doctor identity used in printed output.
- These values live in localStorage, not in the database.
- Defaults are prefilled so the app works immediately without manual setup.

### Case archive / registry
- The archive page (`/archive`) is the validated-case registry.
- It is not the operational work queue.
- It searches only validated cases.
- Search combines exam metadata, report content, date filters, section filters, and exam type filters.
- Results provide:
  - matched section
  - excerpt/snippet
  - conclusion preview
  - contextual match reasons
  - read-only preview

The archive is designed as a clinical reference and retrieval tool, not an AI writing assistant.

### `Cas similaires` in the case workspace
- Inside the case workspace, `Cas similaires` searches archived validated cases that resemble the current dossier.
- It uses the saved current case context:
  - sample nature
  - diagnostic keywords
  - clinical history
  - exam type
- It helps the doctor compare past cases while writing the current report.
- It does not inject text automatically and does not write the report for the doctor.

### Recent stabilization work
Recent stabilization work focused on safety rather than new product scope:
- backend contract tests for critical API workflows
- backend security tests for auth, RLS, audit, validation hardening, and tenant isolation
- frontend smoke test for print draft/final rendering
- frontend auth/session smoke tests
- stale-request protection on the dashboard
- PostgreSQL row-level security and request-scoped DB policy context
- dependency audit scripts and frontend CSP compatibility checks
- archive query profiling with realistic completed-case fixtures and `EXPLAIN ANALYZE`

## Architecture at a glance

### Frontend
- React + Vite + TypeScript
- React Router for navigation
- service-based API layer
- cookie-backed auth session via same-origin requests
- localStorage only for print settings and lab settings

### Backend
- Express
- PostgreSQL with plain SQL through `pg`
- one main SQL access file: `anapath-back/src/db/queries.js`
- API envelope: `{ success, message?, data }`
- request-scoped DB policy context for tenant isolation
- forced PostgreSQL RLS on lab-scoped data tables
- append-only audit events and backend-only report revision snapshots

### Data model
- one patient -> many exams
- one exam -> one report
- report templates are standalone

### Laboratory scoping
- the backend derives the current laboratory from the authenticated server session
- application queries remain lab-scoped
- PostgreSQL RLS now adds DB-side tenant defense-in-depth on lab-scoped tables
- this is still a single-doctor/admin workflow, not a broad enterprise tenant administration product

## Run and test locally

### Prerequisites
- Node.js
- PostgreSQL

### Backend setup
```bash
cd anapath-back
npm install
cp .env.example .env
psql -d anapath -f src/db/schema.sql
psql -d anapath -f src/db/seed.sql
npm run bootstrap:admin
npm run dev
```

### Frontend setup
```bash
cd anapath-front
npm install
npm run dev
```

### Useful checks
```bash
cd anapath-back && npm test
cd anapath-back && npm run security:audit:prod
cd anapath-back && npm run db:role:check
cd anapath-back && npm run db:rls:check
cd anapath-front && npm test
cd anapath-front && npx tsc --noEmit
cd anapath-front && npm run security:audit:prod
cd anapath-front && npm run security:csp:build-check
```

### Archive profiling
```bash
psql -d anapath -f anapath-back/src/db/archive_profile_fixture.sql
psql -d anapath -f anapath-back/src/db/archive_profile_explain.sql
```

### Local/staging login
- run `cd anapath-back && npm run bootstrap:admin`
- then log in with `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD`

## Voluntary limitations

Anapath is intentionally not trying to do everything yet.

Current deliberate limitations include:
- bootstrap-admin / local-staging oriented auth administration, with no self-service password reset or onboarding UI
- no RBAC
- no pagination
- client-side PDF export only
- lab settings stored locally, not synced through the backend
- no doctor-facing audit history, diff viewer, or restore workflow
- no CIN field on patients
- no URL-persisted dashboard filters
- rate limiting remains process-local/in-memory
- CSP is prepared for serving-layer `Report-Only`, but not yet enforceable because the current PDF export dependency path still fails strict CSP compatibility checks

## Where to read what

- `README.md` at repo root: mixed product + app overview
- `CLAUDE.md` at repo root: technical source of truth for the whole project
- `anapath-back/README.md`: backend-focused setup and API guide
- `anapath-front/README.md`: frontend-focused setup and route guide
- `anapath-back/CLAUDE.md`: backend companion notes
- `anapath-front/CLAUDE.md`: frontend companion notes
