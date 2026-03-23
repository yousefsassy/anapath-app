# Anapath - Project Source of Truth

## Project Overview
Anapath is a doctor-facing anatomopathology web app for managing patient records, pathology exams, and narrative reports.

Current scope is a stable, doctor-only V1 for a single lab workflow.

## Doctor-Only User Model
- Authentication exists via `POST /api/auth/login` using users stored in PostgreSQL.
- Frontend stores the returned auth payload/token in localStorage and sends bearer headers.
- Backend auth is still placeholder-level (no JWT verification middleware on protected routes yet).
- Practical model today: a single authenticated doctor/admin workflow.

## Repo Structure
- `anapath-front/` - React + Vite + TypeScript frontend
- `anapath-back/` - Express + PostgreSQL backend
- `anapath-back/src/db/schema.sql` and `anapath-back/src/db/seed.sql` - DB schema and seed data

## Frontend Architecture and Main Pages
- App shell:
  - `anapath-front/src/App.tsx` defines routes
  - protected routes via `anapath-front/src/routes/ProtectedRoute.tsx`
  - layout via `anapath-front/src/layouts/MainLayout.tsx` and sidebar navigation
- API integration:
  - `anapath-front/src/services/apiClient.ts` uses `VITE_API_BASE_URL`
  - service layer in `patientService.ts`, `examService.ts`, `authService.ts`
- Core pages:
  - `/login`
  - `/dashboard`
  - `/patients`
  - `/patients/new`
  - `/patients/:id`
  - `/patients/:id/exams/new`
  - `/exams/:id`
- UX state handling is implemented in key forms/pages (loading, error, success, save/cancel/edit patterns).

## Backend Architecture and Main Capabilities
- Entry and routing:
  - `anapath-back/server.js`
  - `anapath-back/src/app.js`
  - route groups in `anapath-back/src/routes/index.js`
- API groups:
  - `/api/health`
  - `/api/auth`
  - `/api/patients`
  - `/api/exams`
  - `/api/reports`
- Implemented capabilities:
  - health check with DB status
  - login (placeholder credential check against `users` table)
  - patient list/create/detail/update
  - patient exams listing
  - exam list/create/detail/update
  - report get/update (with auto-create-on-update if missing)
- Data layer:
  - SQL query functions in `anapath-back/src/db/queries.js`
  - transactional exam creation with persistent `exam_number` generation by lab/type/year via `exam_sequences`

## Completed End-to-End Workflows
- Login -> authenticated navigation to dashboard
- Create patient -> list/detail visibility
- Update patient from patient detail (PUT)
- Create exam from patient detail -> backend-generated `exam_number` -> appears in patient/dashboard tables
- Update exam metadata from exam detail (PUT)
- Read and update report from exam detail (GET/PUT)

## Recent Completed Work
- Phase 2 frontend UX/UI polish across dashboard, patients, exam pages, and shared layout components
- Exam update support added end-to-end (`PUT /api/exams/:id` + exam detail edit UI)
- Patient update support added end-to-end (`PUT /api/patients/:id` + patient detail edit UI)
- Dashboard recent exams ordering fixed to recency (`created_at DESC`)
- Patient exams ordering aligned with dashboard (`created_at DESC`)
- New exam cleanup:
  - status values standardized to backend canonical values (`registered`, `in_progress`, `completed`)
  - vestigial `exam_number` removed from new-exam input flow
- Removed unused misleading backend helper (`findExamByPatientId`)

## Known Limitations / Intentionally Missing
- Placeholder auth only:
  - plaintext password check
  - no JWT signing/verification middleware
  - no backend route-level authorization enforcement
- No RBAC/multi-role behavior in UI or API
- No list pagination or server-side filtering for large datasets
- No PDF export/signoff pipeline
- No automated test suite currently in the repo
- Frontend `ExamStatus` type still allows backend and legacy display variants (works, but not fully normalized)

## Current Stability Status
Core doctor-only V1 workflows are stable and integrated across frontend and backend. Recent regressions and consistency fixes have been applied, and the main CRUD/report workflows are functioning.

## Recommended Next Steps
1. Harden auth/security (hashed passwords, JWT auth middleware, protected API authorization checks).
2. Add integration tests for critical workflows (patient create/update, exam create/update, report update).
3. Normalize frontend status typing to backend canonical values only.
4. Add pagination/filter query support for patient and exam listings as data volume grows.
