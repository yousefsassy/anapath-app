# Frontend Notes

This file is frontend-scoped guidance only.

For full project status and source of truth (frontend + backend), see:
- `CLAUDE.md` at repository root.
- [`README.md`](../README.md) at repository root for the mixed product + feature overview.

## Frontend Quick Context
- Stack: React + Vite + TypeScript
- Main app routes are defined in `src/App.tsx`
- API integration is handled through `src/services/*` using `VITE_API_BASE_URL`
- Authentication state is managed via `src/context/AuthContext.tsx` and localStorage
- Minimal frontend smoke tests live in `src/test/`

When project-level status changes, update the root `CLAUDE.md` first.
