# Anapath Frontend

React + Vite + TypeScript frontend for the Anapath pathology workflow app.

For the full product overview and detailed feature description, see the root [README](../README.md).  
For the technical source of truth across the whole repo, see root [CLAUDE.md](../CLAUDE.md).

## Stack

- React 19
- Vite 8
- TypeScript
- React Router
- custom CSS

## What this package is responsible for

The frontend provides:
- login and protected navigation
- dashboard/work queue
- patient directory and patient detail
- patient creation
- exam creation
- case workspace
- print preview / PDF export
- templates management
- settings
- archive search
- contextual `Cas similaires`

## Main routes

- `/login`
- `/dashboard`
- `/archive`
- `/patients`
- `/patients/new`
- `/patients/:id`
- `/patients/:id/exams/new`
- `/exams/:id`
- `/exams/:id/print`
- `/templates`
- `/settings`

## Project structure

```text
src/
  App.tsx
  components/
  context/
  hooks/
  layouts/
  pages/
  pages/exam-detail/
  routes/
  services/
  test/
  types/
  utils/
```

## Useful scripts

```bash
npm install
npm run dev
npm run build
npm run security:csp:check
npm run security:csp:build-check
npm test
npx tsc --noEmit
```

## Frontend notes

- The UI is in French.
- Canonical DB/API values stay in English (`registered`, `in_progress`, `completed`).
- `ExamPrintPage` is standalone and intentionally outside the sidebar layout.
- `apiClient.ts` uses same-origin cookie-backed auth requests with `credentials: 'include'`.
- `examService.getWorkspaceByExamId()` explicitly loads `Exam` then `Report`; there is no dedicated backend workspace endpoint.
- `DashboardPage` has stale-request protection so slow previous requests do not overwrite the latest filter state.

## Main pages

- `DashboardPage` — work queue with stats, filters, urgency, and keyword search
- `ArchivePage` — validated-case archive and advanced search
- `PatientsListPage` — annuaire-style patient directory
- `PatientDetailPage` — patient record and exam history
- `NewExamPage` — prélèvement registration form
- `ExamDetailPage` — main dossier workspace
- `ExamPrintPage` — print preview and PDF export
- `TemplatesPage` — report template management
- `SettingsPage` — lab/doctor print identity settings

## Frontend tests

Minimal smoke tests are present in:

- [src/test/ExamPrintPage.test.tsx](src/test/ExamPrintPage.test.tsx)

They cover:
- draft print rendering
- validated print rendering

Run with:

```bash
npm test
```

## Dependencies

- Requires the backend running on port `5000`
- Defaults to same-origin `/api` access, with the Vite dev proxy forwarding to the backend
- Uses cookie-backed auth sessions and stores only print/lab settings in localStorage

## CSP rollout (P3 security)

This repo does not currently contain the real staging/production frontend-serving layer
(no nginx, Caddy, or reverse-proxy config is versioned here), so CSP is not enforced
from this package directly.

What is now implemented in this repo:
- `npm run security:csp:check` scans the built `dist/` bundle for inline scripts/styles, inline event handlers, external asset URLs in HTML, and `eval` / `Function` usage in built JavaScript
- `npm run security:csp:build-check` runs a fresh production build and then runs that guard
- the goal is to keep the frontend compatible with the documented strict policy before any serving-layer enforcement flip

Current known blocker discovered by the guard on April 1, 2026:
- the dynamically loaded PDF chunk generated from `html2pdf.js` still contains a `Function(...)` constructor path, so the current frontend is **not yet ready for enforced** `script-src 'self'` without reworking that PDF dependency path
- because of that, the correct rollout for this repo remains `Content-Security-Policy-Report-Only` first

Recommended staging/production policy for the current app:

```text
Content-Security-Policy-Report-Only:
  default-src 'self';
  base-uri 'self';
  object-src 'none';
  frame-ancestors 'none';
  form-action 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' data: blob:;
  font-src 'self' data:;
  connect-src 'self';
  worker-src 'self' blob:;
  manifest-src 'self';
  frame-src 'none';
  upgrade-insecure-requests;
```

Why this policy fits the current frontend:
- same-origin SPA + API calls (`connect-src 'self'`)
- bundled JS only (`script-src 'self'`)
- no required inline styles after the P2 cleanup in this repo
- print/PDF and header image compatibility kept through `img-src 'self' data: blob:` and `worker-src 'self' blob:`

Serving-layer rollout examples:

```nginx
add_header Content-Security-Policy-Report-Only "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-src 'none'; upgrade-insecure-requests" always;
```

```caddy
header {
  Content-Security-Policy-Report-Only "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:; manifest-src 'self'; frame-src 'none'; upgrade-insecure-requests"
}
```

Rollout notes:
- keep Vite dev outside this strict policy unless you explicitly add dev-time websocket/connect allowances
- run `npm run security:csp:build-check` before any staging CSP rollout
- apply `Content-Security-Policy-Report-Only` only at the real frontend-serving layer, not in the backend API responses
- verify `/dashboard`, `/archive`, `/templates`, `/exams/:id`, `/exams/:id/print`, PDF export, and `/entete-compte-rendu.png` in Report-Only before any enforcement
- review staging browser violations after a real navigation pass through the main workflow
- do not switch from Report-Only to enforced CSP until the PDF export dependency path stops failing the CSP guard

## Known frontend limitations

- no pagination on list pages
- no URL-persisted dashboard filters
- PDF generation is client-side only
- lab settings are local to the browser via localStorage
