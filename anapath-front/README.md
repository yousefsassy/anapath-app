# Anapath Frontend (V1)

Frontend application for an anatomopathology laboratory workflow, built with React + Vite + TypeScript.

## Tech Stack

- React 19
- Vite 8
- TypeScript
- React Router (navigation and protected routes)
- CSS (custom variables, no component library)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

The app is usually available at `http://localhost:5173`. Requires the backend running on port 5000.

### 3) TypeScript check

```bash
npx tsc --noEmit
```

### 4) Production build

```bash
npm run build
```

## Pages and Routes

| Route | Purpose |
|-------|---------|
| `/login` | Credential form (authenticates against backend) |
| `/dashboard` | Accueil / file de travail — status tabs + search + exam type filter + exam table |
| `/patients` | Patient directory with inline prélèvements per row, text search, sex filter |
| `/patients/new` | Create patient form with duplicate detection |
| `/patients/:id` | Patient detail + prélèvements history with conclusion previews |
| `/patients/:id/exams/new` | Register new prélèvement |
| `/exams/:id` | Main case workspace — metadata, antécédents, compte rendu, status actions |
| `/templates` | Manage report templates (create, edit, delete) |

## Project Structure

```text
src/
  components/   # Shared UI (PageHeader, StatusBadge, FormField)
  context/      # AuthContext
  layouts/      # MainLayout + Sidebar
  pages/        # Route-level page components
  routes/       # ProtectedRoute wrapper
  services/     # API service layer (apiClient, patientService, examService, authService, reportTemplateService)
  types/        # TypeScript domain types (domain.ts)
  utils/        # formatting.ts (formatDate, truncate), domainMappings.ts (status labels, sex display)
```

## Key Utilities

- `utils/formatting.ts` — `formatDate(value)` → `dd/mm/yyyy` or `—`, `truncate(text, max)` → truncated with `…`
- `utils/domainMappings.ts` — `getStatusLabel(status)`, `displaySexFrench(value)`

## Notes

- All UI labels are in French. DB/API canonical values (`registered`, `in_progress`, `completed`) are never renamed — translation is display-only.
- Authentication is backed by PostgreSQL (`users` table); token stored in localStorage. Auth middleware is placeholder only (no JWT verification on protected routes).
- For full project context, see root `CLAUDE.md`.
