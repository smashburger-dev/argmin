# Session S1A — FSRS-Inventar und Beweisphase (2026-09-01)

Auftrag: Ausschließlich Inventar- und Beweisphase von S1A (`docs/streamlining-umbauplan.md`).
Beweisen, dass FSRS produktiv ungenutzt ist, und die vollständige Lösch-/Änderungsfläche
darlegen. Keine Löschung, kein Produktionscode-Change, kein Commit, kein Push.
Basis: isolierte Arbeitskopie (`git worktree`) auf Commit `1998d57`, sauber ausgecheckt.

Methode: `git grep` über den gesamten getrackten Baum des Commits (erschöpfend, inklusive
`vendor/`, `tests/`, `tools/`, `docs/`, `schemas/`, `content/`, `src/`, HTML-Entrypoints),
ergänzend Graphify-Community-Check. Alle Zeilenangaben beziehen sich auf `1998d57`.

## Ergebnis in Kürze

- **FSRS ist produktiv vollständig ungenutzt.** Der einzige Codepfad, der ts-fsrs laden
  könnte (`fsrsReviewState`, dynamischer Import), hat null produktive Caller — nur Tests.
  `schedulerModeFor()` liefert bedingungslos das Literal `'expanding'`.
- **`fsrsThreshold` und `postLadderPolicy` sind sauber getrennt:** `fsrsThreshold` ist ein
  toter Experiment-Knob (Default + Repair, nie konsumiert), `postLadderPolicy` gehört zum
  produktiven Expanding-Vertrag und bleibt unangetastet.
- **Löschfläche:** 1 Vendor-Verzeichnis (4 Dateien, 2.558 Zeilen, 92 KB), 1 Notice-Block,
  5 Tests, Code-/Kommentarblöcke in 2 Tests + 1 Produktionsdatei + 1 Build-Tool,
  4 Dokumente (davon 1 verpflichtend: ADR-0008-Amendment).
- **Erwartete Reduktion:** ca. −2.653 Zeilen gesamt (dominiert von Vendor), Public-Build
  358 → 355 Dateien, Node-Tests 887 → 882, Runtime-LOC 9.085 → ~9.039.
- **Keine versteckte Nutzung gefunden.** Keine Referenzen in `schemas/`, `content/`,
  `src/`, `tests/e2e/`, Acceptance-CDP, `package.json` (keine Dependency), Schemas oder
  Workern. `vendor_fetch.sh` fetched ts-fsrs nicht (manueller Vendoring, dokumentiert).

## 1. Vollständige Caller- und Referenzliste

`git grep -i fsrs` über alle getrackten Dateien liefert exakt diese Dateien (ts-fsrs,
FSRS, fsrsThreshold, fsrsReviewState, attemptToRating, schedulerModeFor, TS_FSRS_URL):

| Datei | Referenzen (Zeilen bei 1998d57) | Typ |
|---|---|---|
| `assets/js/core/review_scheduler.js` | L2–7 (Header-Kommentar), L28–29 (`fsrsThreshold`), L45–47 (Repair), L118–122 (`schedulerModeFor`), L137 (Caller), L158–193 (FSRS-Block: `TS_FSRS_URL` L162, `attemptToRating` L168–171, `isGradedAttempt` L173, `fsrsReviewState` L179–193) | Code |
| `tests/review_scheduler.test.mjs` | L3–4 (Header), L10 (Imports), L153–160 (Mode-Test), L166/169 (`fsrsThreshold`-Asserts), L208–238 (FSRS-Stage: 4 Tests) | Test |
| `tests/char_group_d_registry.test.mjs` | L614, L624, L626 (`fsrsThreshold`-Asserts in Params-Tests) | Test |
| `tools/build_public.mjs` | L225 (Kommentar), L310–312 (Allowlist: `index.mjs`, `LICENSE`, `package.json`) | Build |
| `vendor/licenses/THIRD_PARTY_NOTICES.json` | L121–136 (ts-fsrs-Block mit Hash) | Notice |
| `vendor/ts-fsrs/` | `LICENSE` (21 Z.), `index.d.ts` (593 Z., nur Quellbaum), `index.mjs` (1.874 Z., mit Provenanz-Header), `package.json` (70 Z.) — 2.558 Zeilen, 92 KB | Vendor |
| `docs/dependency-matrix.md` | L17 (Zeile ts-fsrs 5.4.1), L20 (Vendoring-Satz mit Tarball-SHA) | Doc |
| `docs/license-register.md` | L38 (`ts-fsrs` in Runtime-Liste) | Doc |
| `docs/adr/0008-review-scheduling-of3.md` | L1, L15, L27–30, L38–39, L61, L78–80 | Doc |
| `docs/adr/0009-competency-learning-core.md` | L53 („Aktivierung von FSRS" unter „Nicht entschieden") | Doc |
| `docs/baseline-manifest.json` | L112–113 (BASE-RV-001, historischer Bug-Evidence) | Doc (historisch) |
| `README.md` | L96 („ts-fsrs bleibt vendort und isoliert getestet …") | Doc |
| `docs/streamlining-umbauplan.md` | L18, L216, L289–301, L590 | Plan (bleibt) |

**Null-Referenzen (explizit geprüft):** `tests/e2e/`, `tools/acceptance_cdp.mjs`,
`tools/acceptance_w01_cdp.mjs`, `tools/validate_content.mjs`, `tools/export_open_core.mjs`,
`tools/vendor_fetch.sh`, `src/` (aufer `local-progress.ts` nutzt nur
`resolveReviewParams().expandingSlotsWeeks` — expanding, nicht FSRS), `schemas/`,
`content/`, `index.html`, `next.html`, `vite.config.ts`, `package.json` (keine
Dependency, nur vendored), `assets/js/core/progress_store.js`,
`assets/js/core/exercise_runtime.js` (beide importieren nur expanding-Relevantes),
`assets/js/domain/`, `assets/js/runtime/` (Pyodide-Worker), `tests/char_group_f_retention.test.mjs`,
`tests/verify_session_b_coverage_retention.test.mjs`, `tests/refactor_safety_pins.test.mjs`.

### Caller je Symbol

- **`schedulerModeFor`** — produktiver Caller: nur `buildReviewQueueEntry`
  (`review_scheduler.js:137`). Tests: `review_scheduler.test.mjs:154–159`. Doc:
  ADR-0008:79. Sonst niemand.
- **`fsrsReviewState`** — **kein produktiver Caller.** Nur Definition (L179) und Tests
  (`review_scheduler.test.mjs:217,220,221,229,230,236,237`) sowie Docs (ADR-0008:28,
  baseline-manifest:113).
- **`attemptToRating`** — interner Caller nur `fsrsReviewState` (L190); sonst nur Tests
  (`review_scheduler.test.mjs:211–213`).
- **`fsrsThreshold`** — nur `review_scheduler.js:29,45,46` (Default + Selbst-Repair);
  Tests `review_scheduler.test.mjs:166,169`, `char_group_d_registry.test.mjs:614,624,626`;
  Doc ADR-0008:61. **Kein Scheduler-Konsum.**
- **`postLadderPolicy`** — `review_scheduler.js:27,42,43,107`; ADR-0008:59,66;
  `docs/authoring-guide.md:75`; Tests `char_group_d:481–490,597–599,613,624–625`,
  `char_group_f:77–134`, `verify_session_b:474`, `review_scheduler.test:61–67,165–168`.
  **Gehört zum Expanding-Vertrag, nicht zu FSRS — bleibt unangetastet.**
- **`vendor/ts-fsrs`** — einzige Runtime-Pfadreferenz: `TS_FSRS_URL`
  (`review_scheduler.js:162`, dynamischer Import in `fsrsReviewState`). Build:
  `build_public.mjs:225,310–312`. Notices: `THIRD_PARTY_NOTICES.json:121–136`. Docs:
  dependency-matrix, license-register, ADR-0008, README.

## 2. Beweis: Der produktive Modus ist immer `expanding`

1. `schedulerModeFor()` (`review_scheduler.js:120–122`) gibt **bedingungslos das Literal
   `'expanding'` zurück** — keine Verzweigung, Argumente (`activeExerciseCount`,
   `params`) werden akzeptiert, aber ignoriert.
2. Der einzige produktive Caller `buildReviewQueueEntry` (L137) stempelt damit **jeden**
   Queue-Eintrag mit `mode: 'expanding'`.
3. `fsrsReviewState` — der einzige Code, der FSRS-Termine erzeugen und das vendorte
   Modul laden könnte — hat **null produktive Caller** (erschöpfendes `git grep` +
   Graphify-Community: nur `review_scheduler.js`/`review_scheduler.test.mjs`).
4. `fsrsThreshold` wird **nirgends konsumiert**: `reviewStateFromAttempts` liest nur
   `expandingSlotsWeeks`, `postLadderPolicy`, `maxHints`. Selbst ein Import-Override
   `{mode: 'fsrs', fsrsThreshold: 1}` ändert kein einziges Datum (`p.mode` und
   `p.fsrsThreshold` werden von keiner Produktiventscheidung gelesen).
5. Der dynamische `import(TS_FSRS_URL)` existiert nur in `fsrsReviewState` → in
   Produktion wird ts-fsrs **nie geladen**. Die 3 kopierten Dateien im Public-Build
   sind totes Gewicht (fail-closed erlaubt, aber ungenutzt).
6. **Nichts liest `queue.mode` zur Laufzeit**: `git grep '\.mode'` über `assets/`+`src/`
   trifft nur den Numbas-Template-String (unabhängig). Die Import-Validierung prüft
   `reviewQueue`-Zeilen nur auf `exerciseId` (`progress_store.js:210–213`).
7. **Persistierte Daten sicher:** `refreshReviewEntry` (`progress_store.js:321–334`)
   und jeder Import (`progress_store.js:517–518`, Queue wird aus Attempts neu
   abgeleitet) schreiben Queue-Einträge ausschließlich über `buildReviewQueueEntry` →
   immer `mode: 'expanding'`. Historische `mode:'fsrs'`-Zeilen aus der pre-Fix-Ära
   (BASE-RV-001) würden beim nächsten Refresh/Import überschrieben. **Keine Migration
   nötig.**

## 3. Expanding-Vertrag — muss nach der Löschung unverändert bleiben

Semantik und Ausgaben aller folgender Elemente dürfen sich nicht ändern (byte-identische
Queue-Einträge, identische Mastery-Entscheidungen):

- **Konstanten/Parameter:** `DAY_MS`, `WEEK_MS`, `MASTERY_MAX_HINTS` (inkl. Re-Export in
  `exercise_runtime.js`), `DEFAULT_REVIEW_PARAMS` mit `mode: 'expanding'`,
  `expandingSlotsWeeks: [2, 5, 11]`, `postLadderPolicy: 'repeat-last'`, `maxHints: 1`
  (nur `fsrsThreshold` entfällt).
- **Funktionen:** `resolveReviewParams` (Merge/Repair für Slots/Policy/maxHints),
  `attemptInstanceKey`, `isQualifiedHit`, Zeitfeld-Priorität `ts → occurredAt → now`
  (ADR-0015), `reviewStateFromAttempts` (Leiter + `consolidate`-Altimport-Zweig +
  Locking), `buildReviewQueueEntry`/`buildReviewQueueEntries` (Ausgabeform inkl.
  `mode: 'expanding'`, `nextDueAt`, `consolidated`, `updatedAt`).
- **Konsumenten, die grün bleiben müssen:** `exercise_runtime.masteryFromAttempts`
  (+ Re-Export), `progress_store` (`activeReviewParams` L316, `refreshReviewEntry` L321,
  Import-Ableitung L517, `validateImportPayload` v1/v2/v3),
  `src/adapters/local-progress.ts:59,89`, Review-Rendering `assets/js/ui/views.mjs:376,653`,
  E2E- und CDP-Flüsse.
- **Charakterisierende Tests, die unberührt grün bleiben müssen:** alle nicht-FSRS-Tests
  in `review_scheduler.test.mjs`; `char_group_d`-Scheduler/Mastery/Params-Blöcke;
  `char_group_f_retention`; `verify_session_b` (repeat-last-Pin + „kein Kursende"-Source-Scan);
  `refactor_safety_pins` (Instance-Key); Migrations-/Import-Tests.

## 4. Vorgeschlagene Löschliste (exakte Pfade)

| # | Pfad | Umfang |
|---|---|---|
| 1 | `vendor/ts-fsrs/LICENSE` | 21 Zeilen |
| 2 | `vendor/ts-fsrs/index.d.ts` | 593 Zeilen (nie im Public-Build) |
| 3 | `vendor/ts-fsrs/index.mjs` | 1.874 Zeilen (im Public-Build) |
| 4 | `vendor/ts-fsrs/package.json` | 70 Zeilen (im Public-Build) |

Gesamtverzeichnis `vendor/ts-fsrs/` (4 Dateien, 2.558 Zeilen, 92 KB).

## 5. Vorgeschlagene Änderungsdateien (exakte Edits)

| # | Datei | Edit |
|---|---|---|
| 1 | `assets/js/core/review_scheduler.js` | Header-Kommentar L2–7 (FSRS-Modus-Satz streichen); L28–29 `fsrsThreshold`-Kommentar+Key; L45–47 Repair-Zweig; L158–193 gesamter FSRS-Block; **Variante A (empfohlen):** zusätzlich L118–122 `schedulerModeFor` löschen und L137 auf das Literal `mode: 'expanding'` ändern (Ausgabe identisch), Doc-Kommentar L124–127 (`activeExerciseCount`-Hinweis) anpassen. Variante B: Funktion als Trivial-Wrapper behalten. |
| 2 | `tests/review_scheduler.test.mjs` | L3–4 Header; L10 Imports (`attemptToRating`, `fsrsReviewState`, bei A auch `schedulerModeFor`); L153–160 Mode-Test (bei A); L166/L169 `fsrsThreshold`-Bestandteile; L208–238 FSRS-Stage (Banner + 4 Tests). |
| 3 | `tests/char_group_d_registry.test.mjs` | L614 streichen; L624 `fsrsThreshold: -3` aus dem Input-Objekt entfernen; L626 streichen (L625 postLadderPolicy-Assert bleibt). |
| 4 | `tools/build_public.mjs` | L225 Kommentar; L310–312 drei Allowlist-Einträge. |
| 5 | `vendor/licenses/THIRD_PARTY_NOTICES.json` | ts-fsrs-Block L121–136 inkl. Klammern (regeneriertes `.md` läuft im Build mit). |
| 6 | `docs/dependency-matrix.md` | L17 (ts-fsrs-Zeile); L20 ts-fsrs-Vendoring-Nachsatz. |
| 7 | `docs/license-register.md` | L38 `ts-fsrs` aus der Runtime-Liste. |
| 8 | `README.md` | L96 ts-fsrs-Teilsatz. |
| 9 | `docs/adr/0008-review-scheduling-of3.md` | Statuszeilens-Amendment: „FSRS-Experiment am 2026-09-XX vollständig entfernt (S1A)"; Punkt 2 der Entscheidung um Removal-Vermerk ergänzen; Expanding-Vertragtext bleibt. |
| 10 | *(optional, Empfehlung: unverändert)* `docs/adr/0009-competency-learning-core.md` | L53 steht unter „Nicht entschieden" — historisch korrekt für 2026-08; nach S1A irreführend. Minimal-Edit: streichen oder „(entfernt, S1A)" anmerken. |
| 11 | *(kein Edit)* `docs/baseline-manifest.json` | BASE-RV-001 ist historischer Evidence-Eintrag (point-in-time), beschreibt den bereits behobenen Zustand. Unverändert lassen. |

**Explizit keine Änderung:** `tools/vendor_fetch.sh` (fetched ts-fsrs nie — Vendoring war
manuell mit Provenanz-Header, s. `index.mjs` Kopf und dependency-matrix L20),
`tools/export_open_core.mjs` (kopiert `vendor/` per `copyTree` aus dem Public-Build,
L235 — schrumpft automatisch), `tools/validate_content.mjs` (kennt ts-fsrs nicht
literalsich, validiert Notices generisch), `package.json`, Schemas, Content, E2E, Acceptance.

## 6. Betroffene Fast- und Full-Gates

**Fast Gate (S1A-Definition: Review-Scheduler-, Mastery- und Policy-Tests):**
`node --test tests/review_scheduler.test.mjs tests/char_group_d_registry.test.mjs
tests/char_group_f_retention.test.mjs tests/verify_session_b_coverage_retention.test.mjs
tests/refactor_safety_pins.test.mjs` — die ersten beiden werden editiert, die letzten
drei müssen unverändert grün bleiben (Expanding-Charakterisierung).

**Full Gate:** `node --test tests/` (erwartet 882 Tests statt 887), `npm run typecheck`,
`npm run build:release`, `node tools/build_public.mjs`,
`node tools/validate_content.mjs` (+ `--legacy`, + `--dir build-public`),
`npm run coverage:check`, `npm run test:project-runner`, `npm run test:e2e`,
`npm run test:e2e:build`, beide CDP-Acceptance-Flows (Port 8765). Public-Leak- und
Notice-Tests (`tests/validate_public_neg.test.mjs` u. a., synthetische Fixtures) müssen
grün bleiben. `npm audit` und `git diff --check` zur Abrundung.

## 7. Erwartete Reduktion

| Metrik | S0-Baseline | nach S1A (erwartet) | Δ |
|---|---:|---:|---:|
| Vendor ts-fsrs | 2.558 Zeilen / 4 Dateien / 92 KB | 0 | −2.558 |
| Runtime-LOC (`src/`+`assets/js/`) | 9.085 | ~9.039 | −46 |
| Tool-LOC (`tools/`) | 4.788 | ~4.784 | −4 |
| Test-LOC | 14.208 | ~14.163 | −45 |
| Node-Tests | 887 (886 Pass/1 Skip) | 882 | −5 Tests |
| Public-Build-Dateien | 358 | 355 | −3 (~62 KB unkomprimiert) |
| Notices-Einträge | 10 Runtimes | 9 Runtimes | −1 Block |
| Initial-Entry (gzip) | 77,5 KiB | 77,5 KiB (unverändert — ts-fsrs wurde nie gebundelt) | 0 |

Gesamt netto: ca. −2.653 Zeilen. Kein Test- oder Security-Vertrag geschwächt.

## 8. Risiken und versteckte Nutzung

1. **Reihenfolge-/Konsistenzrisiko:** Vendor-Dateien, `build_public`-Allowlist und
   Notice-Block müssen in derselben Änderung verschwinden. Läuft einer von dreien
   allein mit, schlägt die fail-closed Notice-/Hash- bzw. Allowlist-Prüfung korrekt an.
2. **Alte Exporte mit `mode: 'fsrs'`-Zeilen:** zulässig (Validierung prüft `mode`
   nicht), werden bei Import/Refresh aus Attempts neu abgeleitet und überschrieben.
   Kein Datenverlust, keine Migration.
3. **Settings-Overrides mit `fsrsThreshold`/`mode`:** bleiben als tote Schlüssel im
   Spread liegen (kein Fehler, kein Effekt) — konsistent mit heutigem Verhalten.
4. **Public-Build-Dateizahl 358 → 355:** kein Test pinned die Zahl (Public-Tests nutzen
   synthetische Fixtures über `tests/build_dir_helper.mjs`).
5. **ADR-Drift:** Ohne ADR-0008-Amendment widerspräche die ADR („bleibt erhalten") dem
   Code. Amendment ist deshalb Teil der Änderungsliste, nicht optional.
6. **Variante A (`schedulerModeFor` löschen)** ist ein API-Bruch für externe Importeure;
   im Projekt existieren keine (alle Importer inventarisiert, s. §1). Queue-Ausgabe
   bleibt byte-identisch (`mode: 'expanding'` als Literal).
7. **Keine versteckte Nutzung gefunden:** kein zweiter dynamischer Import, kein Worker-,
   Pyodide-, Schema-, Content-, E2E- oder CDP-Bezug; `package.json` hat keine
   ts-fsrs-Dependency; Graphify-Community bestätigt das Bild (Graph-Zeilennummern
   selbst sind stale, deshalb Code-Verifikation am Commit).

## Offene Entscheidungen für Noa

1. **Löschfreigabe** für die 4 Pfade in §4 (Verzeichnis `vendor/ts-fsrs/`).
2. **Variante A oder B** für `schedulerModeFor` (A empfohlen: löschen, Literal stempeln).
3. **ADR-0009 L53**: historisch lassen (empfohlen) oder Minimal-Edit.
4. Danach erst Umsetzung + Fast/Full-Gates; Commit/Push wie immer nur mit neuer Freigabe.
