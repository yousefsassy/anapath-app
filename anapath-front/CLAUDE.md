# Frontend Notes

This file is frontend-scoped guidance only.

For full project status and source of truth (frontend + backend), see:
- `CLAUDE.md` at repository root.
- [`README.md`](../README.md) at repository root for the mixed product + feature overview.

## Frontend Quick Context
- Stack: React + Vite + TypeScript
- Main app routes are defined in `src/App.tsx`
- API integration is handled through `src/services/*`, defaulting to same-origin `/api` and supporting `VITE_API_BASE_URL` override when explicitly configured
- Authentication state is managed via `src/context/AuthContext.tsx` and the backend session cookie
- Minimal frontend smoke tests live in `src/test/`
- CSP rollout is documented in `anapath-front/README.md`; the repo includes `security:csp:check` and `security:csp:build-check`, but enforced CSP is still blocked by the current PDF export dependency path

When project-level status changes, update the root `CLAUDE.md` first.
