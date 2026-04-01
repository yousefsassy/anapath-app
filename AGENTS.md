# Anapath — Project Source of Truth

## Project Overview

Anapath is a doctor-facing anatomopathology web app for managing patient records, pathology exams (prélèvements), and structured narrative reports (comptes rendus).

**Current scope:** A stable, doctor-only V1 for a single-lab workflow. The UX is organized around the doctor's operational workflow, not around data entities. This is not a full enterprise LIS — it is MVP-scoped and intentionally minimal.

---

## Language Rules

- **UI language: French.** All user-facing labels, buttons, error messages, status names, field names, and navigation items are in French.
- **DB and API values: unchanged.** Backend canonical values (`registered`, `in_progress`, `completed`, field names) are never renamed for display purposes. Translation happens in the display layer only.
- **Code and comments: English.** Variable names, function names, TypeScript types, and code comments stay in English.
- **Error messages from the API: French.** Validation error messages returned to the frontend are in French (e.g., `"Statut invalide. Valeurs acceptées : …"`).

---

## Status Mapping (display only — DB values never change)

| DB / API value | UI label |
|---|---|
| `registered` | Enregistré |
| `in_progress` | En cours |
| `completed` | Validé |

Translation lives in `anapath-front/src/utils/domainMappings.ts` (`getStatusLabel`). Do not translate status values in the backend or in API responses.

---

## Repo Structure

```
anapath-app/
├── anapath-back/         Express + PostgreSQL backend
│   ├── server.js
│   ├── src/app.js
│   ├── src/routes/       authRoutes, patientRoutes, examRoutes, reportRoutes, reportTemplateRoutes, healthRoutes
│   ├── src/controllers/  authController, patientController, examController, reportController, reportTemplateController, healthController
│   ├── src/db/
│   │   ├── queries.js    All SQL data access (single file)
│   │   ├── schema.sql
│   │   └── seed.sql
│   └── src/config/database.js
└── anapath-front/        React + Vite + TypeScript frontend
    └── src/
        ├── App.tsx                     Route definitions
        ├── components/
        │   ├── navigation/             Sidebar.tsx, NavItem.tsx
        │   └── (shared)               PageHeader, StatusBadge, FormField, Breadcrumb, PageContainer
        ├── context/                    AuthContext
        ├── hooks/                      useAuth
        ├── layouts/                    MainLayout
        ├── pages/                      Route-level page components (see Frontend Pages table)
        ├── routes/                     ProtectedRoute
        ├── services/
        │   ├── apiClient.ts            Generic authenticated HTTP client
        │   ├── authService.ts
        │   ├── patientService.ts
        │   ├── examService.ts
        │   ├── reportTemplateService.ts
        │   ├── printSettingsStorage.ts  Print formatting prefs → localStorage
        │   └── labSettingsStorage.ts   Lab/doctor identity → localStorage
        ├── types/domain.ts             All TypeScript domain types
        └── utils/
            ├── domainMappings.ts       Status labels + sex display helpers
            └── formatting.ts          formatDate(), truncate()
```

---

## Backend API

**Base:** `http://localhost:5000`

| Method | Route | Notes |
|--------|-------|-------|
| GET | `/api/health` | DB connectivity check |
| POST | `/api/auth/login` | Placeholder credential check |
| GET | `/api/patients` | List all patients |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients/search` | Search by first_name, last_name, phone (up to 5 results) |
| GET | `/api/patients/:id` | Patient detail |
| PUT | `/api/patients/:id` | Update patient (editable fields only) |
| GET | `/api/patients/:id/exams` | Patient's exams. Accepts `?include=report_summary` to JOIN reports |
| GET | `/api/exams` | All exams, `urgent DESC, created_at DESC`. Accepts `?status=`, `?exam_type=`, `?search=`, `?date_from=`, `?date_to=`, `?keyword=` filters |
| GET | `/api/exams/stats` | Aggregate counts: registered, in_progress, completed this calendar month. **Must be registered before `/:id` in examRoutes.js.** |
| POST | `/api/exams` | Create exam (triggers `exam_sequences` transaction, auto-creates empty report) |
| GET | `/api/exams/:id` | Exam detail |
| PUT | `/api/exams/:id` | Update exam. **Side-effects:** (1) if new status = `completed` and `result_issued_date` is null, auto-sets it to today; (2) if transitioning `completed → in_progress`, clears `result_issued_date` via `clearResultIssuedDateForExam()` |
| GET | `/api/reports/:examId` | Exam's report |
| PUT | `/api/reports/:examId` | Update report. **Returns 403** if exam status is `completed`. Auto-creates report row if missing. |
| GET | `/api/report-templates` | List all templates for lab |
| POST | `/api/report-templates` | Create template |
| PUT | `/api/report-templates/:id` | Update template |
| DELETE | `/api/report-templates/:id` | Delete template |

**Response envelope:** `{ success: boolean, message?: string, data: T }`

**Exam number format:** generated by `exam_sequences` table:
- Histology: `1-2026`, `2-2026`, …
- Cytology: `C0001-2026`, `C0002-2026`, …

**`GET /api/exams` filter details:**
- `?status=registered|in_progress|completed` — returns 400 if invalid
- `?exam_type=histology|cytology` — returns 400 if invalid
- `?search=<term>` — ILIKE partial match on patient last name, first name, `exam_number`, `sample_nature`
- `?date_from=YYYY-MM-DD` — filters `registered_date >= date_from`; returns 400 if format invalid
- `?date_to=YYYY-MM-DD` — filters `registered_date <= date_to`; returns 400 if format invalid or `date_from > date_to`
- `?keyword=<term>` — case-insensitive exact match against any element of `diagnosis_keywords[]` (PostgreSQL `unnest` + ILIKE); no 400 validation
- All filters AND-combined at SQL level in `findAllExams(filters)`
- Results ordered `urgent DESC, created_at DESC`

**`GET /api/exams/stats` response shape:**
```json
{ "success": true, "data": { "registered_count": 4, "in_progress_count": 2, "completed_this_month": 7 } }
```
- `completed_this_month` counts exams where `status = 'completed'` AND `result_issued_date` falls within the current calendar month. NULLs are excluded naturally.
- Counts are parsed from PostgreSQL `bigint` strings to integers in the controller.
- Stats are global — not scoped to any filter. `laboratory_id = 1` hardcoded like all other endpoints.

**Key query functions in `queries.js`:**
- `createExamWithReport(payload)` — transactional: sequence → exam → empty report
- `clearResultIssuedDateForExam(examId)` — sets `result_issued_date = NULL` directly (bypasses COALESCE)
- `findExamsByPatientIdWithReportSummary(patientId)` — LEFT JOIN reports, returns `report_conclusion` + `report_updated_at`
- `getExamStats(laboratoryId)` — single-row aggregate using PostgreSQL `FILTER (WHERE ...)` syntax; returns `registered_count`, `in_progress_count`, `completed_this_month`

---

## Frontend Pages

| Route | Page | Notes |
|-------|------|-------|
| `/login` | LoginPage | Credential form |
| `/dashboard` | DashboardPage | Accueil / file de travail — stats strip + status tabs + search + date range + exam type filter + exam table |
| `/patients` | PatientsListPage | Patient directory — text search, sex filter, inline exam expansion per row |
| `/patients/new` | NewPatientPage | Create patient with duplicate detection |
| `/patients/:id` | PatientDetailPage | Patient info (editable) + exam history with conclusion previews |
| `/patients/:id/exams/new` | NewExamPage | Register new prélèvement — includes urgent checkbox |
| `/exams/:id` | ExamDetailPage | Main case workspace — metadata edit (incl. urgent), antécédents, 4-section report, status buttons, report lock/reopen |
| `/exams/:id/print` | ExamPrintPage | Print preview + PDF export. **No sidebar.** Opened in new tab from ExamDetailPage. |
| `/templates` | TemplatesPage | Manage report templates (create, edit, delete, apply) |
| `/settings` | SettingsPage | Lab/doctor identity settings (doctorName, doctorTitle, phone, email, labName, address) |

---

## Domain Relationships

```
Patient
 └── Exams (prélèvements)         one patient → many exams
      └── Report (compte rendu)   one exam → one report (auto-created on exam creation)

ReportTemplate                    standalone — not linked to patient or exam
```

**Report fields (4 structured sections):**
- `clinical_info` — Renseignement clinique (RC)
- `macroscopy` — Macroscopie
- `microscopy` — Microscopie
- `conclusion` — Conclusion

**Report template fields:** same 4 sections + `name`.

**Exam type values:** `histology` | `cytology` (DB/API canonical)

**Report finalization model:**
- There is **no separate report status field**. `exam.status === 'completed'` is the finalized state.
- When an exam is `completed`, the report is locked (backend enforces 403; frontend hides save controls).
- `result_issued_date` is auto-set to today on transition to `completed` (if null).
- Reopen: setting status back to `in_progress` unlocks the report and clears `result_issued_date`.

---

## Key Frontend Files

### Services
- `examService.ts` — `getStats()`, `list(filters)`, `getById`, `create`, `update`, `updateStatus`, `getReportByExamId`, `saveReportByExamId`
  - `ExamListFilters = { status?, exam_type?, search?, date_from?, date_to?, keyword? }` — all optional, passed as query params
  - `getStats()` → `GET /api/exams/stats` → `ExamStats`
  - `updateStatus(id, status)` is reused for both forward transitions and reopen (`in_progress`)
- `patientService.ts` — `list`, `getById`, `create`, `update`, `search`, `getExamsByPatientId`, `getExamsWithReportSummary`
- `reportTemplateService.ts` — `list`, `create`, `update`, `remove`
- `printSettingsStorage.ts` — `loadPrintSettings()`, `savePrintSettings()` — localStorage key `anapath_print_settings`
- `labSettingsStorage.ts` — `loadLabSettings()`, `saveLabSettings()` — localStorage key `anapath_lab_settings`

### Shared Utilities
- `utils/formatting.ts` — `formatDate(value)` (→ `dd/mm/yyyy` or `—`), `truncate(text, max)`
- `utils/domainMappings.ts` — `getStatusLabel(status)`, `mapExamStatusToBackend(status)`, `displaySexFrench(value)`, `mapSexBackendToDisplay(value)`

### Types (`types/domain.ts`)
- `Patient`, `Exam`, `Report`, `ReportTemplate`, `NewPatientInput`, `NewExamInput`, `ReportInput`
- `ReportSummary { conclusion, updated_at }`
- `ExamWithReportSummary` — extends `Exam` with `report_summary: ReportSummary | null`
- `ExamStats { registered_count: number, in_progress_count: number, completed_this_month: number }`
- `Exam` includes optional `patient_first_name?`, `patient_last_name?` (populated by `GET /api/exams` LEFT JOIN)
- `Exam.urgent: boolean` — present in DB schema, accepted on create/update, affects list ordering
- `PrintSettings` — `{ sectionSpacing, labelStyle, conclusionStyle, fontSize }` + `defaultPrintSettings`
- `LabSettings` — `{ doctorName, doctorTitle, doctorPhone, doctorEmail, labName, labAddress, labPhone }` + `defaultLabSettings` (pre-filled with real lab identity — app works without any manual configuration)

### Shared Components
- `StatusBadge` — renders colored badge from DB status value
- `PageHeader` — title, subtitle, breadcrumbs, optional action button
- `FormField` — label + children wrapper
- `PageContainer` — maxWidth wrapper (`'default' | 'wide'`)

---

## Completed Features (end-to-end)

### Core workflow
- Login → authenticated session → Accueil work queue
- Create patient (with duplicate detection) → patient detail with empty exam list
- Update patient info from patient detail (inline edit form)
- Create prélèvement → exam workspace (redirects on save)
- Update exam metadata from exam workspace (inline edit form)
- Read + write 4-section compte rendu (explicit save, no auto-save)
- Status transitions: Enregistré → En cours → Validé

### Accueil / file de travail
- **Stats strip** (above the work queue panel): 3 stat cards — Enregistrés, En cours, Validés ce mois. Fetched once on mount from `GET /api/exams/stats`. Global — not tied to any active filter.
- Status filter tabs: Tous / Enregistré / En cours / Validé
- Text search bar: patient name, exam number, sample nature (debounced 300ms, server-side ILIKE)
- **Date range filter**: Du / Au date pickers — filter on `registered_date`. Both optional; AND-combined with other filters. "✕ Effacer" resets search + type + dates + keyword without touching the active status tab.
- Exam type segmented control: Tous / Histologie / Cytologie (server-side)
- **Keyword filter**: "Mot-clé" text input (debounced 300ms) — filters by `diagnosis_keywords` array match (server-side, case-insensitive). Included in "✕ Effacer" clear action.
- Exam list ordered `urgent DESC, created_at DESC` — urgent exams always surface first within each filter.
- Urgent exams show a red `Urgent` badge (`.badge--urgent`) in the Réf. Prélèvement column.

### Patient workflow
- Patient list: inline prélèvements per row (lazy loaded, cached per toggle), sex filter, text search
- Patient detail: exams table shows conclusion preview (first 120 chars from report)
- Patient detail: shows `birth_date` (Date de naissance) in view mode, formatted via `formatDate()`. Read-only — not editable (backend blocks `birth_date` updates in `updatePatient`).
- Duplicate detection on creation: warns if same name exists, requires explicit confirmation to proceed

### Exam workspace
- Antécédents section: other exams for same patient, with conclusion preview (current exam excluded)
- 4-section compte rendu editor with explicit save
- Status action buttons with workflow-appropriate labels
- **Urgent flag**: checkbox "Prélèvement urgent" visible in both NewExamPage and ExamDetailPage edit mode. Displayed as a badge in view mode. Stored as `BOOLEAN NOT NULL DEFAULT FALSE` in DB. Affects list ordering (urgent exams sort first).
- **Diagnosis keywords**: displayed as chips (`.keyword-chip`) in view mode. Comma-separated textarea in edit mode. Stored as `TEXT[]` in DB; chips only render when the array is non-empty.

### Report templates
- `TemplatesPage` at `/templates`
- Create, edit, delete named templates with the same 4 sections as a compte rendu
- Apply from `ExamDetailPage` (confirmation required if report already has content)
- Save current report as a new template directly from `ExamDetailPage`

### Report lifecycle (validation, locking, reopen)
- **Validation:** clicking "Valider" sets `exam.status = 'completed'`
  - `result_issued_date` auto-set to today if null (`examController.js`)
  - Backend: `PUT /api/reports/:examId` returns 403 from this point
  - Frontend: all 4 report textareas disabled, save/template buttons hidden, "Rapport validé — lecture seule" banner shown
- **Reopen:** "Rouvrir le rapport" button + confirmation dialog
  - Sets `exam.status = 'in_progress'` via existing `updateStatus`
  - Backend clears `result_issued_date` via `clearResultIssuedDateForExam()` (separate targeted UPDATE — bypasses COALESCE)
  - Report becomes editable again, date will be re-set on next validation

### PDF export / Aperçu PDF
- `ExamPrintPage` at `/exams/:id/print` — opens in new tab from exam workspace, no sidebar
- Client-side PDF generation via `html2pdf.js` (lazy-loaded), filename `CR-{exam_number}.pdf`
- **Print format settings panel** (collapsible, persisted in localStorage via `printSettingsStorage`):
  - `sectionSpacing`: `compact` | `normal` (default) | `spacious`
  - `labelStyle`: `underline-bold` (default) | `bold` | `normal`
  - `conclusionStyle`: `boxed` (default) | `plain`
  - `fontSize`: `small` | `normal` (default) | `large`
  - Reset button returns all to defaults
- `buildSheetClasses()` translates the settings object into CSS modifier classes on the `.print-sheet` element (e.g. `print-sheet--spacing-compact`, `print-sheet--label-bold`, `print-sheet--conclusion-plain`, `print-sheet--font-small`). The `.print-sheet--exporting` class is added just before `html2pdf` capture to suppress screen-only chrome.
- Document structure: entête → exam block (patient meta includes birth_date) → report sections (only rendered if section has content) → signature footer
- Header: tries `/entete-compte-rendu.png` from `/public` first; falls back to configured text identity

### Lab/doctor settings
- `SettingsPage` at `/settings` (4th item in sidebar)
- Fields: doctorName, doctorTitle (multiline), doctorPhone, doctorEmail, labName, labAddress (multiline), labPhone
- Persisted in localStorage (`anapath_lab_settings`) — not backed by DB/API
- Default values = real lab identity, so app works immediately without configuration
- `ExamPrintPage` loads these at mount and injects them into the text fallback header and signature footer
- Includes explanatory note: if `/entete-compte-rendu.png` is present, it overrides the text fallback

---

## Known Limitations / Intentionally Deferred

- **Auth is placeholder:** plaintext password comparison, mock token string, no JWT middleware, no route-level authorization
- **No RBAC** — single doctor/admin workflow only
- **No pagination** — all lists load in full; deferred until data volume requires it
- **PDF is client-side only** — `html2pdf.js` in the browser. No server-side rendering, no cryptographic/official signature on the document.
- **Lab settings are localStorage-only** — not synced across devices. If localStorage is cleared, settings reset to defaults (which are the real lab defaults).
- **No report audit trail** — reopen works but leaves no trace beyond `updated_at` timestamps. No version history, no recovery of overwritten text.
- **No CIN field on patients** — requires schema migration; deferred
- **No URL-based filter persistence** — Accueil filters reset on page reload; deferred
- **Multi-tenancy** — `laboratories` table supports it; backend hardcodes `laboratory_id = 1` everywhere
- **Dashboard stats not filter-responsive** — the 3 stat cards always show global lab totals regardless of active status tab, search, date range, or exam type. Intentional by design.
- **Dashboard stats not auto-refreshed** — fetched once on page mount. If an exam is completed in another tab, stats are stale until page reload.

---

## Implementation Philosophy

- Solve what is actually needed. Do not add features, configuration layers, or abstractions for hypothetical future use.
- Keep DB schema and API response values stable. Display translation is the only acceptable transformation.
- Prefer editing existing files over creating new ones.
- Shared utilities (`formatting.ts`, `domainMappings.ts`) exist for things used across 3+ pages. Do not create helpers for one-off use.
- Do not add pagination, sorting, or extra endpoints unless the current approach causes a real visible problem.
- The app is workflow-first, not CRUD-first. UI flows should match how a doctor actually works through cases — not how the data model is organized.

---

## Working Norms for Future Codex Sessions

**Before making changes:**
- Read root `AGENTS.md` first. Then inspect the actual files relevant to the task before proposing changes.
- Do not assume the codebase matches this AGENTS.md state — verify by reading the actual files.
- Do not silently fake or stub backend features in the frontend. If a backend capability doesn't exist, either build it or surface the limitation.

**When making changes:**
- Prefer minimal, targeted edits. A bug fix does not need surrounding refactors.
- Keep user-facing labels in French; keep DB/API values in English (canonical form).
- Do not rename DB columns or change API response field names for display reasons — translation belongs in `domainMappings.ts`.
- Avoid unnecessary schema churn. Only migrate the schema when a real workflow change requires a new column or table.
- Do not introduce `.button.secondary` on light backgrounds — it is styled for the dark sidebar context only.
- Use `var(--primary)` for accent color. `var(--accent)` is not defined. `var(--surface-soft)` is available for hover backgrounds.
- Always return `{ success, data }` or `{ success, message }` from backend controllers — never raw arrays.
- After backend changes: `node --check anapath-back/src/db/queries.js` (or relevant file).
- After frontend changes: `cd anapath-front && npx tsc --noEmit`.
- **Route ordering in `examRoutes.js`**: `GET /stats` must remain before `GET /:id` or Express will match the string `'stats'` as an exam ID.

**Style and scope:**
- Breadcrumbs on every non-root page via `PageHeader`. Exception: `ExamPrintPage` has no sidebar or breadcrumbs (it's a standalone print view).
- Favor workflow clarity over cosmetic polish. If it doesn't improve a real doctor task, it's out of scope.
- Avoid feature bloat. Consult the "Known Limitations / Intentionally Deferred" list before proposing additions.

---

## Dev Commands

```bash
# Backend
cd anapath-back && npm run dev     # starts on port 5000

# Frontend
cd anapath-front && npm run dev    # starts on port 5173

# TypeScript check (frontend)
cd anapath-front && npx tsc --noEmit

# Syntax check (backend file)
node --check anapath-back/src/db/queries.js
```

**Default login:** `admin@anapath.local` / `admin123`
