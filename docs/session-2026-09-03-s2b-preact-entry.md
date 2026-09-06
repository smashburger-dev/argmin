# S2B: Preact als einziger Einstieg

Stand: 2026-09-03. Branch `streamline/integration-pre-s2b`.

## Completed

Preact läuft unter `index.html`. `next.html` und der Legacy-Shell sind weg.

Gelöscht nach der bestätigten Liste:

1. `assets/js/app.mjs`
2. `assets/js/ui/views.mjs`
3. `assets/js/core/search_index.js`
4. `assets/css/base.css`
5. `tools/acceptance_cdp.mjs`
6. `tools/acceptance_w01_cdp.mjs`
7. `next.html`

`WeekView` war schon unreferenziert entfernt. W4 sitzt auf SourcesView: local-private serviert `library/` über ein Vite-Plugin, öffnet die Lesefassung in einem neuen Tab, Public zeigt nur Originalquellen.

Vite-Input, `build_public.mjs`, `validate_next_build.mjs`, Open-Core-Export, E2E und die Node-Pins, die `views.mjs` oder die CDP-Treiber gelesen haben, zeigen auf den Preact-Pfad. `docs/baseline-manifest.json` bleibt der historische S0-Snapshot.

## Decisions

- OSS-Schnitt und öffentlicher GitHub-Dump warten, bis das Programm klarer strukturiert ist. Kein zweites Repo, kein Auth, kein Tutor-SaaS in S2B.
- Eigene Lektionen und Lektüren pro Thema bleiben der Inhaltsplan. Outbound-Links sind Hilfen, nicht der Kern.
- `npm run build:public` ohne `--next-dir` ist der Content-Baum ohne App-Shell. Die lernbare Oberfläche ist `npm run build:release` → `build-next/`.
- Instance-Key und Mastery bleiben in `assets/js/core/exercise_runtime.js`. S3 verschiebt sie nicht.

## Open

- `pyodide-contracts` / `pyodide-cross-browser` / `mobile-touch` nicht über alle drei Browser als ein `npm run test:e2e`-Aufruf. Chromium-Dev, Chromium-Build und Firefox/WebKit für local-reading, route-smoke und next-shell sind grün.
- S3A/S3B, S4B, S4C, Content-/Wochenmigration: nicht in diesem Commit.

## Next session start

Arbeitsbaum: `/Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform`.

```bash
npm run dev:next
# http://127.0.0.1:4173/index.html#/today
```

Nächster Produktschritt nach S2B: S3A (Ereignisnormalisierung), nicht S4. Löschliste: `docs/session-2026-09-03-s2b-deletion-list.md`.
