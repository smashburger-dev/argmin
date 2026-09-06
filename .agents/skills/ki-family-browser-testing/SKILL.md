---
name: ki-family-browser-testing
description: Run local browser acceptance checks for KI-Lernplattform family routes, grading, and IndexedDB progress.
---

# Local setup
- Use Node 22 through `source ~/.nvm/nvm.sh`; install dependencies with `npm ci` when missing.
- Run `npm run dev:next`; its prehook compiles public content and checks coverage. Open http://127.0.0.1:4173.
- Alternatively build with `npm run build:release` and serve `build-next`; never serve raw TypeScript with Python HTTP server.
- No account is needed. Progress is stored in the browser's IndexedDB; reuse the same origin when checking reload persistence.

# Family acceptance
- Routes are `#/family/<familyId>/<caseId>/<seed>/<profile>`; `-` selects a case.
- Read `content/families/<familyId>.json` for static profiles, answers and starter/reference code.
- Check lazy `split/families/<familyId>.json` responses alongside visible prompts and grading; Vite appends query parameters.
- For Python cases, verify untouched starter submission as well as reference code; include imports required by the starter. Allow up to 120 seconds for initial vendored Pyodide/NumPy loading.
- After wrong answers, use Fortschritt → Fehlerjournal and reload to verify durable storage.
- Solution reveal requires confirming a browser dialog and disables independent grading of that instance; reload before testing another answer.
- Assert static-case mastery independently from the family-level contract.
- Verify trace cases show necessary function definitions as well as table rows, not merely a correct grade.

# Recording diagnostics
- If attaching Playwright over CDP solely to observe console/network, register a `dialog` listener without automatically dismissing dialogs so native confirmation controls remain testable.
- After incoming changes, preserve unaffected results and reload only affected routes; do not reuse obsolete screenshots of changed UI.

# Devin Secrets Needed
None for local static-app testing.
