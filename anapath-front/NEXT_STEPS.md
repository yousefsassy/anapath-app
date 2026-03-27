# V1 Status

All core workflows are stable and integrated end-to-end.

## Completed

- Login against backend (PostgreSQL `users` table)
- Patient list, create, detail, update
- Duplicate patient detection on creation (warns + requires confirmation)
- Exam (prélèvement) list, create, detail, update
- Report (compte rendu) — 4 sections, auto-created on first save
- Status transitions: Enregistré → En cours → Validé (via action buttons, forward only)
- Accueil work queue:
  - Status filter tabs (Tous / Enregistré / En cours / Validé)
  - Text search bar (patient name, exam number, nature — debounced, server-side)
  - Exam type segmented control (Tous / Histologie / Cytologie)
  - All filters AND-combined; "✕ Effacer" resets search + type
- Patient list: inline prélèvements with lazy loading and sex/text filters
- Patient detail: conclusion previews (120 char truncated)
- Exam workspace: antécédents section (other exams for same patient with conclusion previews)
- Report templates: create, edit, delete at `/templates`; applicable from exam workspace
- All UI labels in French; DB/API values unchanged

## Known Deferred Items

- Auth hardening (hashed passwords, JWT middleware)
- No pagination (full lists load in memory)
- No PDF export
- No automated test suite
- No CIN field (requires schema migration)
- No urgency flag
- No date range filter on Accueil (no date picker yet)
- No URL-based filter persistence on Accueil
