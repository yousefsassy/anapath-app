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
npm test
npx tsc --noEmit
```

## Frontend notes

- The UI is in French.
- Canonical DB/API values stay in English (`registered`, `in_progress`, `completed`).
- `ExamPrintPage` is standalone and intentionally outside the sidebar layout.
- `apiClient.ts` injects the auth token placeholder and `X-Laboratory-Id`.
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
- Uses `VITE_API_BASE_URL` for API access
- Stores auth placeholder session and print/lab settings in localStorage

## Known frontend limitations

- auth UX is backed by a placeholder auth system
- no pagination on list pages
- no URL-persisted dashboard filters
- PDF generation is client-side only
- lab settings are local to the browser via localStorage
