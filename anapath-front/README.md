# Anapath Frontend (V1)

Frontend application for an anatomopathology laboratory workflow, built with React + Vite + TypeScript.

## Tech Stack

- React 19
- Vite 8
- TypeScript
- React Router (for navigation and protected routes)
- CSS (custom, clean, beginner-friendly)

## Getting Started

### 1) Install dependencies

```bash
npm install
```

### 2) Run development server

```bash
npm run dev
```

The app is usually available at `http://localhost:5173`.

### 3) Production build

```bash
npm run build
```

### 4) Preview production build

```bash
npm run preview
```

## Available Pages and Routes

- `/login` - fake login page (localStorage-based authentication)
- `/dashboard` - overview page with key counters and recent exams
- `/patients` - patient list table
- `/patients/new` - patient creation form
- `/patients/:id` - patient details and exam list
- `/patients/:id/exams/new` - exam creation form for a patient
- `/exams/:id` - exam detail + report editor

## Project Structure

```text
src/
  components/   # reusable UI blocks (headers, badges, form fields)
  context/      # Auth context
  data/         # initial mock data
  hooks/        # custom hooks
  layouts/      # shared layout with sidebar navigation
  pages/        # route pages
  routes/       # protected route wrapper
  services/     # API-like service layer (mock/localStorage)
  styles/       # reserved for future style split
  types/        # domain and auth TypeScript types
```

## Current Behavior

- Authentication is simulated using localStorage (`anapath_auth_user`)
- Patients and exams are persisted in localStorage mock database
- Forms and tables are fully functional in frontend-only mode
- Report editor supports save/update flow in localStorage
- Layout and routes are ready for backend integration

## What Still Needs Backend Integration

1. Replace mock/localStorage services with real API calls:
   - `src/services/authService.ts`
   - `src/services/patientService.ts`
   - `src/services/examService.ts`
2. Implement real authentication (JWT/session, password validation, refresh flow)
3. Add backend validation and error mapping for forms
4. Add server-driven pagination/filtering/search for large patient/exam lists
5. Add real exam/report lifecycle rules (permissions, status transitions)
6. Add PDF export integration for finalized reports (not included in V1)

## Notes for Beginner Developers

- Start with page files in `src/pages` to understand route-level logic.
- Shared logic lives in `src/services` and `src/context`.
- UI helpers are intentionally simple and reusable in `src/components`.
- You can clear localStorage in browser devtools to reset mock data.
