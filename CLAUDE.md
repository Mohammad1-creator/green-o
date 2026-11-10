@AGENTS.md

# green-o: notes for Claude

Arabic-only (RTL) factory management system: admin panel (`/admin`) and employee PWA (`/m`).
Approved plan: `docs/plan.md`. Technical decisions and confirmed assumptions: `docs/decisions.md`.

## Working agreement

- Talk to the user in Arabic. Build one phase at a time and end each phase with: what is done, remaining problems, and test steps.
- Commit and push every change to `dev`. Merge into `main` (production) only after the user approves the phase. Never force push.
- Record new technical decisions in `docs/decisions.md`.

## Code rules

- UI text is Arabic. Format dates and numbers with `src/lib/format.ts` (Western digits, Gregorian calendar, factory time zone).
- Layout uses logical Tailwind classes (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`, `text-start`), never `ml-`, `mr-`, `pl-`, `pr-`, `left-`, `right-`.
- Cache Components is on. Per-user data is read at request time inside `<Suspense>`; never put `"use cache"` on user data.
- Secrets never go in client code or `NEXT_PUBLIC_` variables. Modules that touch secrets import `"server-only"`.
- Every table gets RLS. Permissions are enforced in the database and on the server, not by hiding buttons.
- Demo data lives only in the dev environment.

## Checks before pushing

`npm run check`, then `npm run build && npm run check:secrets`, then `npm run test:e2e`.
