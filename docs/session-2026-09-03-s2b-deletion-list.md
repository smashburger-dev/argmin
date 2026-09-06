# Session S2B-Vorbereitung: Löschliste und w37-Protokoll

Datum: 2026-09-03
Branch: `streamline/integration-pre-s2b`
HEAD: `e274734`
Arbeitskopie: `/Users/no8/Desktop/life/Lifemaxxing-integration-pre-s2b/ki-lernplattform`

Nichts gelöscht. Kein Commit. Kein Push. Produktionscode unverändert.

In diesem Checkout gibt es kein `graphify-out/graph.json`. Caller kamen aus
`rg` und direkten Importen. Der Graph wird nicht still neu gebaut.

## Completed

- `w37-e1` als bestätigte Trennung protokolliert:
  `research/streamlining/s4a-v2/noa-decisions.md`, Nachtrag in
  `block-c-decisions.md` und `family-model.md` Abschnitt 10b.
- Aktuelle Caller der Legacy-Shell geprüft.
- Exakte S2B-Löschliste unten. Wartet auf Noas Dateifreigabe.

## Decisions

- Noa hat die technische Dateifreigabe an den Orchestrator gegeben
  (2026-09-03). Die Sieben-Datei-Liste plus `WeekView` gilt als bestätigt.
  Optional `spikes/set-legacy.html` bleibt draußen, bis S2B den Redirect
  sonst stört.
- S2B bleibt die nächste Implementierungssession. S3 und S4 starten nicht mit.
- Queue-Punkte außer der `w37-e1`-Familienfrage bleiben für ihre Domain-Gates.
- Instance-Key und Mastery sitzen bereits in
  `assets/js/core/exercise_runtime.js` (`buildInstanceId`,
  `masteryFromAttempts`). Preact-Adapter importieren sie. Aus `views.mjs`
  muss vor der Löschung nichts nach S3 verschoben werden.
- `activity_route.mjs` und `content_repository.js` gehören nicht zur
  Legacy-Shell. Preact bzw. Node-Tests nutzen sie weiter.
- CDP-Treiber erst löschen, nachdem der W4-Privatvertrag auf Preact liegt.
  `tests/e2e/local-reading.spec.ts` deckt den öffentlichen Spiegel und die
  Compile-Profile, hängt für den privaten Lesepfad aber noch an
  `index.html#/unit/*`. Units sind in S2A bewusst nicht portiert.

## Open

- Vor der Löschung in der S2B-Session: privaten Lesepfad in Preact
  nachweisen (SourcesView, local-private), danach die zwei Unit-Tests in
  `local-reading.spec.ts` von `index.html` lösen.
- Der Kommentar in `local-reading.spec.ts` behauptet einen Crash von
  SourcesView an `weeks.join` bei Quelle `ki-evidenzsynthese`. Der aktuelle
  Code hat `Array.isArray(source.weeks)`. Das vor dem Umbau im Browser
  prüfen, nicht aus dem Kommentar übernehmen.
- LessonView verlinkt Quellen nur über `canonicalUrl`, nicht über
  `localPath`. Der Preact-W4-Nachweis gehört deshalb auf SourcesView, nicht
  auf die Lektion.
- `decision-queue.json` listet `w37-e1` weiter als offen, bis S4D7 die
  Shards umstellt.

## Caller-Befund

| Pfad | Produktions-Caller | Test-/Build-Caller | Urteil |
|---|---|---|---|
| `index.html` | Einstieg, lädt `assets/js/app.mjs` | `next-shell.spec.ts` Legacy-Fallback, `local-reading.spec.ts` Unit-Routen, beide CDP-Treiber, `build_public.mjs` Allowlist und SCAN_FILES | Inhalt ersetzen durch Preact-Einstieg, Datei behalten |
| `next.html` | Vite-Input, aktueller Preact-Einstieg | fast alle E2E, `validate_next_build.mjs` | nach Umzug des Vite-Inputs auf `index.html` löschen |
| `assets/js/app.mjs` | nur `index.html` | Allowlists | löschen |
| `assets/js/ui/views.mjs` | nur `app.mjs` | vier Node-Tests lesen den Quelltext, Allowlists | löschen, Tests umschreiben |
| `WeekView` in `src/ui/views.tsx` | kein Import in `App.tsx`, nicht geroutet | keiner | Funktion löschen |
| `tools/acceptance_cdp.mjs` | README, AGENTS.md, Baseline-Manifest | `open_core_export.test.mjs`, `verify_session_b_content_fixes.test.mjs` | löschen nach W4-Umzug |
| `tools/acceptance_w01_cdp.mjs` | dasselbe | dasselbe plus `local-reading.spec.ts` als Ersatzkommentar | löschen nach W4-Umzug |
| `assets/js/core/search_index.js` | nur `views.mjs` | Allowlists | mit der Shell löschen |
| `assets/css/base.css` | nur `index.html` | Allowlists | mit der Shell löschen |
| `assets/js/domain/activity_route.mjs` | `ExerciseView`, `LessonView`, `views.tsx`, `learning-plan.ts` | mehrere Node-Tests | behalten |
| `assets/js/core/content_repository.js` | Legacy-App und CDP | `refactor_safety_pins`, `legacy_definition_fallback` | behalten |
| `assets/js/core/progress_store.js` | Preact-Adapter | Progress-/Mastery-Tests | behalten |
| `assets/js/core/exercise_runtime.js` | Preact-Adapter | Mastery-Tests | behalten |
| `content/search-index.json` | `search_index.js`, Public-Build schreibt ihn neu | `validate_content.mjs` | behalten, Autorentool `build_search_index.mjs` bleibt |
| `spikes/set-legacy.html` | Redirect auf `index.html` | keiner im Gate | optional, nicht in der Pflichtliste |

S2A-Blocker `tools/pyodide_contract_matrix.mjs` ist durch S0R erledigt. Die
Datei existiert und der Open-Core-Export verlangt sie weiter.

## Exakte Löschliste (Freigabe nötig)

Diese Dateien sollen in der S2B-Implementierungssession entfernt werden,
nachdem die Vorbedingungen in derselben Session grün sind:

1. `assets/js/app.mjs`
2. `assets/js/ui/views.mjs`
3. `assets/js/core/search_index.js`
4. `assets/css/base.css`
5. `tools/acceptance_cdp.mjs`
6. `tools/acceptance_w01_cdp.mjs`
7. `next.html`

Dazu ohne eigene Datei: die Funktion `WeekView` in `src/ui/views.tsx`.

Nicht auf der Liste, obwohl der Handoff sie nannte:

- `assets/js/domain/activity_route.mjs`
- `assets/js/core/content_repository.js`
- irgendwelche Generatoren, Grader, Scheduler, Evidence- oder Policy-Module
- Wochen-JSON oder Lektionen

## Umschreiben in derselben Session, nicht löschen

- `index.html` wird der Preact-Einstieg (heute `next.html`).
- `vite.config.ts` `build.rollupOptions.input` zeigt auf `index.html`.
- `tools/build_public.mjs` Allowlist und `SCAN_FILES`.
- `tools/export_open_core.mjs` Dateiliste und generierte README-Passage.
- `tools/validate_next_build.mjs`, `tools/measure_next_timing.mjs`.
- E2E: alle `/next.html` auf `/index.html` oder `/`. Der Test
  `combined build keeps the legacy roadmap fallback loadable` entfällt oder
  prüft die Preact-Roadmap.
- Node-Tests, die `views.mjs` als Quelltext pinnen:
  `tests/generator_registry.test.mjs`,
  `tests/verify_session_b_graders_reseed.test.mjs`,
  `tests/verify_session_b_coverage_retention.test.mjs`,
  `tests/verify_w18_w30.test.mjs`.
- `tests/open_core_export.test.mjs` und
  `tests/verify_session_b_content_fixes.test.mjs` (CDP-Pfade).
- `tests/e2e/local-reading.spec.ts` Unit-Navigation.
- `README.md`, `AGENTS.md` Verification-Zeilen, `docs/adr/0011-open-core-release-candidate.md`.

## Vorbedingungen vor dem ersten `rm`

1. SourcesView im Profil `local-private` im Browser: lokale Lesefassung
   sichtbar, HTTP 200, neuer Tab mit `target=_blank` und `rel=noopener` oder
   gleichwertig `noreferrer`.
2. Die zwei Unit-Tests in `local-reading.spec.ts` laufen gegen Preact, nicht
   gegen `#/unit/*`.
3. Node-Tests, die `views.mjs` lesen, sind auf Preact oder den gemeinsamen
   Registry-Pfad umgestellt.
4. Fast-Gate laut Umbauplan: Journal, Settings, Review, Migration, Pyodide.

Erst dann die sieben Dateien und `WeekView`.

## Next session start

> Lies `AGENTS.md`, `docs/streamlining-umbauplan.md` und
> `docs/session-2026-09-03-s2b-deletion-list.md`. Startcommit `e274734`.
> Führe ausschließlich S2B aus. Die Löschliste ist bestätigt: sieben Dateien
> plus `WeekView`. Erfülle zuerst die vier Vorbedingungen, lösche danach nur
> diese Pfade. `index.html` wird Preact-Einstieg. Kein Content- oder
> Wochenumbau. Kein S3, kein S4. Kein Commit und kein Push ohne neue
> Freigabe. Stop bei rotem Gate.
