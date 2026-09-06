# Session S0 — Baseline-Messung und -Commit (2026-09-01)

Auftrag: Den aktuellen Refactorstand reproduzieren, exakt messen und als projektbezogenen Git-Rückfallpunkt sichern (`docs/streamlining-umbauplan.md`, Session S0). Keine Refactor-Änderung, keine funktionale Reparatur. Baseline-Commit genehmigt, Push nicht.

## Ergebnis in Kürze

- Alle statischen Zähler des Plans reproduziert (46/46/230/38/267/51/98, 887 Node-Tests, Initial-Entry 77,5 KiB gzip).
- Drei neue, bisher nicht dokumentierte E2E-Testabweichungen gefunden (A, B, C unten). Keine repariert. A und C sind wiederkehrend unter Volllast, alle drei einzeln nicht reproduzierbar beziehungsweise kontextabhängig.
- Der gemeldete Produktions-LOC/Bytes-Wert (13.649 / 693,7 KiB) ist mit keiner geprüften Scope-Kombination exakt reproduzierbar; die neuen Nenner stehen unten mit exakten Befehlen.
- `npm run verify:release` als Gesamtloop ist dadurch nicht grün durchgelaufen (Abbruch bei Flake A nach 86 s); alle Einzelprüfungen wurden trotzdem vollständig ausgeführt.
- Baseline-Commit erstellt (siehe unten), kein Push.

## Messdefinitionen (reproduzierbare Nenner für S1–S6)

Alle Befehle aus `ki-lernplattform/`, gemessen am 2026-09-01, Node v26.0.0, macOS (arm64).

| Metrik | Befehl | Wert |
|---|---|---|
| Runtime-LOC | `find src assets/js -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' \) -print0 \| xargs -0 wc -l` | 9.085 Zeilen, 57 Dateien, 448,5 KiB |
| Tool-LOC | `find tools -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.py' -o -name '*.sh' \) -print0 \| xargs -0 wc -l` | 4.788 Zeilen, 22 Dateien |
| Runtime+Tools | Summe beider | 13.873 Zeilen, 722,4 KiB |
| Test-LOC | `find tests -type f \( -name '*.mjs' -o -name '*.js' -o -name '*.py' \) -print0 \| xargs -0 wc -l` (JSON-Fixtures ausgeschlossen; `tests/fixtures/` enthält genau 1 JSON) | 14.208 Zeilen, 66 Dateien (60 `*.test.mjs`, 3 `.py`, 3 `.mjs`-Helfer) |
| Node-Suite | `node --test tests/` | 887 Tests, 886 Pass, 0 Fail, 1 Skip (opt-in), `duration_ms` 12.338 |
| Python-Runner | `npm run test:project-runner` | 20 Tests, 1,48 s |
| E2E Dev (3 Browser) | `npm run test:e2e` | 183 gelistete Tests; grüner Lauf: 100 Pass / 83 Skip, ca. 1,0–1,2 min |
| E2E Build (Chromium) | `PLAYWRIGHT_PREVIEW=1 npx playwright test --project=chromium` | 61 gelistete Tests; 43 Pass / 17 Skip, ca. 19–20 s |
| Initial-Entry | `npm run build:release` → Validierungsausgabe | JS 77,5 KiB gzip, CSS 6,3 KiB gzip, 702 Dateien |
| Lazy-Chunks | Vite-Output `.next-ui/assets/*.js` | 322 JS-Chunks |
| Public-Build | `node tools/build_public.mjs` | 358 Dateien, 27,4 MB |
| Release-Gesamtloop | `npm run verify:release` | Abbruch nach 86 s bei Flake A; grüne Komponenten: 12,3 s + 1,5 s + ~25 s (typecheck inkl. Pre-Hooks) + ~66 s (e2e) + ~80 s (build+e2e:build) ≈ 3 min geschätzt |

Runtime-LOC-Split: `src/` 2.130, `assets/js/app.mjs` 61, `assets/js/core/` 4.839, `assets/js/domain/` 557, `assets/js/runtime/` 365, `assets/js/ui/` 1.133.

## Content-Zähler

| Zähler | Befehl/Quelle | Wert | Plan-Wert |
|---|---|---|---|
| Kompetenzen | `content/competencies/core.json` → `.competencies.length` | 46 | 46 ✓ |
| Lektionen | `find content/lessons -name '*.json'` | 46 | 46 ✓ |
| Wochenaufgaben | Summe `.exercises.length` über `content/exercises/w01..w39.json` | 230 (39 Packs) | 230 ✓ |
| Kanonische Definitionsdateien | `find content/exercise-definitions -type f` | 38 | 38 ✓ |
| Quelldefinitionen gesamt | 230 + 38 | 268 | 268 ✓ |
| Öffentliche Definitionen (kompiliert) | `compile_content --profile public` | 267 | 267 ✓ |
| Lokale Definitionen (kompiliert) | `compile_content --profile local-private` | 268 | — |
| Generator-IDs | `Object.keys(SEED_GENERATORS).length` | 51 | 51 ✓ |
| Pyodide-Definitionen | Graderfamilie über alle 268 Quellen | 98 (Wochen: 92 `pyodide` + 2 `pyodide-sympy`; kanonisch: 3 + 1) | 98 ✓ |

Wochen-Graderverteilung (230): 133 `deterministic`, 92 `pyodide`, 2 `pyodide-sympy`, 2 `manual-rubric`, 1 `numbas`. Der einzige Numbas-Grader in den Wochen-Packs ist relevant für S1B.

## Baseline-Prüfungen

| Prüfung | Ergebnis |
|---|---|
| `node --test tests/` | ✓ 887/886/1 Skip, 12,3 s |
| `npm run test:project-runner` | ✓ 20 Tests OK |
| `npm run coverage:check` | ✓ 46 Kompetenzen, 39 Themen |
| `npm run typecheck` | ✓ |
| `npm run build:release` | ✓ 702 Dateien, JS 77,5 KiB gzip, CSS 6,3 KiB gzip |
| `npm run test:e2e` (Lauf 1) | 2 Fehler (Flake A firefox, Flake B webkit), 98 Pass |
| `npm run test:e2e` (Lauf 2) | ✓ 100 Pass, 83 Skip |
| `npm run test:e2e:build` (Lauf 1) | 1 Fehler (Abweichung C), 43 Pass |
| Preview-Chromium Volllauf (Lauf 2) | 1 Fehler (Abweichung C, erneut) |
| `node tools/compile_content.mjs --profile public` | ✓ 46/46/267 |
| `node tools/compile_content.mjs --profile local-private` | ✓ 46/46/268 |
| `node tools/validate_content.mjs` | ✓ |
| `node tools/validate_content.mjs --legacy` | ✓ |
| `node tools/build_public.mjs` | ✓ 358 Dateien, 27,4 MB |
| `node tools/validate_content.mjs --dir build-public` | ✓ |
| `node tools/acceptance_cdp.mjs` | ✓ ACCEPTANCE OK (Port 8765, s. Umgebungshinweise) |
| `node tools/acceptance_w01_cdp.mjs` | ✓ W1 ACCEPTANCE OK (Port 8765) |
| `npm audit` | ✓ 0 Vulnerabilities |
| `git diff --check` (nur Projekt) | ✓ sauber |
| `npm run verify:release` | Abbruch bei Flake A nach 86 s |

Fast Gate vor der Vollbaseline: Node-Suite, `coverage:check`, `typecheck` — alle grün.

## Neue Abweichungen (nicht repariert, Noa entscheiden)

**Flake A — firefox, `tests/e2e/next-shell.spec.ts:165` „migrated legacy graders work in the next UI".** Timeout (30 s) auf Heading `/Exakt äquivalent/` nach „Antwort prüfen". Gescheitert in 2 von 3 vollen Dev-Läufen (Lauf 1 und `verify:release`); isoliert und in Dev-Lauf 2 grün. Firefox-spezifisch, lastabhängig.

**Flake B — webkit, `tests/e2e/next-shell.spec.ts:293` „learning preferences persist locally and update the today view".** `weeklyMinutes` gespeichert 180 statt 240 (Deep-Equal-Diff nur im ersten Array-Element). 1 von 3 vollen Dev-Läufen gescheitert; isoliert und in Lauf 2 grün. Sieht nach Speicher-/Timing-Race unter Last aus.

**Abweichung C — chromium, `tests/e2e/next-shell.spec.ts:409` „route content loads lazily and a failed content chunk shows a visible error".** `lazyRequests.length` war 0 — der Lazy-Chunk-Request wurde nicht beobachtet. Im vollständigen Chromium-Preview-Suite-Lauf 2×/2× gescheitert; isoliert (1,7 s), als Einzel-Datei-Suite (21/21 grün) und in allen Dev-Läufen grün. Kontext- beziehungsweise reihenfolgenabhängige Beobachtungslücke (mutmaßlich Prefetch-Race), kein nachgewiesener Produktdefekt — aber reproduzierbar rot im wichtigsten Lauf (Echtes-Artefakt-Vollsuite).

**Messabweichung Produktions-LOC/Bytes.** Plan meldet 13.649 LOC / 693,7 KiB. Reproduziert: Runtime+Tools 13.873 LOC / 722,4 KiB; Runtime-only 9.085 / 448,5 KiB; keine Kombination trifft 13.649 exakt. Die Zielmetriken („−15 % Produktions- und Tool-Code") sollten ab sofort mit den oben dokumentierten Nennemessungen (13.873 / 9.085) gerechnet werden.

## Umgebungshinweise

- Port 8970 (Acceptance-Default) ist durch einen alten, hängenden IPv4-Python-Listener (fremder Prozess, nicht angetastet) blockiert. Beide Acceptance-Flows liefen deshalb mit `ACCEPTANCE_BASE=http://127.0.0.1:8765` gegen den bereits laufenden, projektkorrekten Server (cwd = `ki-lernplattform/`).
- `git diff --check` meldet eine Nachspann-Leerzeile in `extension/creative-research-scout/lib/theme.js` — außerhalb des Projekts, nicht Teil des S0-Commits.
- Der projektbezogene `git status` umfasst 40 modifizierte und 158 unversionierte Einträge; Ignore-Regeln (Projekt-`.gitignore`) decken Buildausgaben, `.tmp-acceptance-*`, `tmp-validate-neg-*`, `/library*`, `.env*` und `*.local.json` ab.
- `shrink-complexity` wurde nicht geladen: S0 ändert keinen Code. Keine Schreib-Subagents eingesetzt.

## Offene Punkte (für Folgesessions)

- Flakes A/B und Abweichung C klären (S2A bietet sich für C an, da die Legacy-CDP-Assertions dort inventarisiert werden; A/B sind Last-/Timing-Races).
- Einzigartige Legacy-CDP-Assertions gegenüber Playwright (S2A-Inventar).
- Didaktische Klassifikation der 230 Wochenaufgaben (S4A).
- Exakte grüne `verify:release`-Gesamtlaufzeit nachrieren, sobald A/B/C geklärt sind.

## Commit

`chore(learning-platform): freeze pre-streamlining baseline` — nur `ki-lernplattform/` gestaged, Push wie geplant nicht ausgeführt.
