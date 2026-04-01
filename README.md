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
- placeholder login and protected navigation
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
- a small automated regression layer and archive profiling artifacts for stabilization

## Main doctor workflow

### 1. Login
The app starts with a placeholder login flow. Once authenticated, the doctor is redirected to the work queue.

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

### Authentication placeholder flow
- Login is functional but intentionally lightweight.
- Credentials are checked against the backend.
- The session stores a placeholder token and the current `laboratory_id`.
- This is enough for the current single-doctor workflow, but it is not full production-grade auth.

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
- frontend smoke test for print draft/final rendering
- stale-request protection on the dashboard
- archive query profiling with realistic completed-case fixtures and `EXPLAIN ANALYZE`

## Architecture at a glance

### Frontend
- React + Vite + TypeScript
- React Router for navigation
- service-based API layer
- localStorage for auth session placeholder, print settings, and lab settings

### Backend
- Express
- PostgreSQL with plain SQL through `pg`
- one main SQL access file: `anapath-back/src/db/queries.js`
- API envelope: `{ success, message?, data }`

### Data model
- one patient -> many exams
- one exam -> one report
- report templates are standalone

### Laboratory scoping
- Requests carry `X-Laboratory-Id`
- the backend scopes data access by laboratory
- current auth is still placeholder, so this is workflow scoping rather than full security-grade multi-tenancy

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
cd anapath-front && npm test
cd anapath-front && npx tsc --noEmit
```

### Archive profiling
```bash
psql -d anapath -f anapath-back/src/db/archive_profile_fixture.sql
psql -d anapath -f anapath-back/src/db/archive_profile_explain.sql
```

### Default login
- `admin@anapath.local`
- `admin123`

## Voluntary limitations

Anapath is intentionally not trying to do everything yet.

Current deliberate limitations include:
- placeholder auth, no JWT middleware
- no RBAC
- no pagination
- client-side PDF export only
- lab settings stored locally, not synced through the backend
- no audit trail or version history for reports
- no CIN field on patients
- no URL-persisted dashboard filters
- no real enterprise-grade multi-tenant authorization

## Where to read what

- `README.md` at repo root: mixed product + app overview
- `CLAUDE.md` at repo root: technical source of truth for the whole project
- `anapath-back/README.md`: backend-focused setup and API guide
- `anapath-front/README.md`: frontend-focused setup and route guide
- `anapath-back/CLAUDE.md`: backend companion notes
- `anapath-front/CLAUDE.md`: frontend companion notes
