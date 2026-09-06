# Session S2A: Preact-Parität und Acceptance-Ersatz

Datum: 2026-09-01  
Basis: Commit `1998d574e67998e9651fb10d9765a8cf3d11f3db`  
Arbeitskopie: `/Users/no8/Desktop/life/Lifemaxxing-s2a-1998d57/ki-lernplattform`

## Ergebnis

S2A ist umgesetzt. Preact deckt die erhaltenen Lernflüsse einschließlich Fehlerjournal ab. Wochenansicht, Wochen-Gates, Wochen-Selbstmarkierung und Roadmap-Suche wurden nicht portiert. Die Preact-Wochenroute und ihre Links sind entfernt; die unreferenzierte `WeekView`-Implementierung und die gesamte Legacy-Shell bleiben für S2B im Quellbaum.

Die drei S0-Abweichungen A, B und C wurden reproduziert, auf getrennte Ursachen zurückgeführt und im isolierten sowie vollständigen Lastkontext geprüft. Der vollständige Dev-E2E-Lauf und der vollständige Chromium-Build-E2E-Lauf sind grün. Der initiale JavaScript-Entry sank von 77,5 auf 77,1 KiB gzip.

Kein Commit und kein Push wurden erstellt. Keine Legacy-Datei wurde gelöscht. S2B wurde nicht begonnen. Der abschließende schreibgeschützte GLM-High-Review fand keine blockierenden Befunde; drei kleine Härtungen für Ladefehler, Worked-Example-Persistenz und Screenreader-Live-Regions wurden übernommen.

## Completed

- Beide CDP-Treiber, alle Playwright-Specs, Preact-Routen und Legacy-Views assertionweise verglichen.
- Erhaltene Preact-Flüsse geprüft oder ergänzt: Heute, Lernen, Kompetenzen, Lektionen, Aufgaben, Review, Fortschritt, Einstellungen, Quellen, Werkzeuge, Qualität, Projekte, Lab, Visualisierungen, JSON-Import/Export und Fehlerjournal.
- Fehlerjournal in Preact ergänzt:
  - falsche, diagnostizierte Antworten außer `invalid-input` schreiben wie die Legacy-Runtime in den bestehenden `journal`-Store;
  - Python-Lab-Checks verwenden dieselbe Regel;
  - Fortschritt zeigt Gesamtzahl und die letzten zehn Einträge;
  - Export, Import und Reload behalten Einträge.
- Aufgabenparität ergänzt:
  - sichtbarer aktueller Seed;
  - gespeicherter Seed wird gegen die sichtbare Variante geprüft;
  - Mastery-Status für qualifizierte und Diagnose-/Reflexionsaufgaben;
  - Worked-Example-Studium und echte Completion-Prüfung;
  - whitespace-tolerante Predict-Output-Prüfung.
- Browserverträge ergänzt:
  - v1-IndexedDB nach v3, Eventfelder, Backfill, Review-Link und Reload-Stabilität;
  - doppelter v3-Import ohne Eventduplikate, Plan/Draft/Cycle-Erhalt;
  - Pyodide-Grading, Timeout, Neustart, globale Isolation, 64-KiB-Ausgabelimit, Workdir- und Dateipfadschutz sowie Multi-File-Isolation in allen drei Browsern;
  - `pageerror` zusätzlich zu `console.error`.
- Preact-Wochenroute entfernt. Roadmap bleibt als 39-Wochen-Projektion sichtbar, enthält aber keinen Link in eine Wochenansicht. Der tote Wochenlink der Visualisierung wurde entfernt.

## Paritätsmatrix: `tools/acceptance_cdp.mjs`

| ID | Verhalten und Legacy-Beleg | Preact-/Playwright-Beleg | Einstufung und S2B-Eigentümer |
|---|---|---|---|
| A1 | Roadmap rendert, `acceptance_cdp.mjs:178-182` | Legacy-Fallback und native Roadmap in `next-shell.spec.ts` | ersetzt |
| A2 | v1-Datenbank migriert auf Schema 3 und erhält `plans`/`drafts`, `:184-194` | Test `a seeded v1 IndexedDB migrates...` | ersetzt |
| A3 | Backfill erzeugt nur den qualifizierten Review und verliert keine Attempts, `:195-197` | derselbe Migrationstest | ersetzt |
| A4 | Legacy-Events erhalten eindeutige IDs, Versionen, Kompetenzen, Instanz und Zeitfelder, `:198-207` | derselbe Migrationstest | ersetzt |
| A5 | Fälliger Review wird sichtbar, `:208-211` | `ReviewView` mit geseedeter Queue und sichtbarem Link | ersetzt; Wochenlabel bewusst entfallen |
| A6 | Falschantwort zeigt Diagnose, `:213-220` | bestehende Grader-, Code-Trace- und Journal-Tests | redundant |
| A7 | korrekte Antwort zeigt befristeten Mastery-Status, `:221-228` | `.mastery-note` in `ExerciseView` und Grader-E2E | ersetzt |
| A8 | neuer Attempt trägt v3-Felder, `:229-236` | Migrationstest und Diagnose-Attempt im Grader-E2E | ersetzt |
| A9 | erster qualifizierter Treffer plant +2 Wochen, `:231-238` | Migrationstest plus `review_scheduler.test.mjs` | ersetzt |
| A10 | manipulierte Fälligkeit und Attempt-/Journalzahl überleben Reload, `:240-291` | Migrationstest | ersetzt |
| A11 | Review-Link öffnet die Aufgabe, `:264-270` | Migrationstest | ersetzt |
| A12 | Wochen-Gate sichtbar, `:293-296` | nicht portiert | ausdrücklich ausgeschlossen |
| A13 | Worked-Example-Schaltfläche vorhanden, `:299-303` | bestehender Aufgaben-E2E | redundant |
| A14 | drei Worked-Example-Schritte, Completion und nicht qualifizierendes Studium, `:303-313` | Test `worked-example completion...` | ersetzt |
| A15 | Parsons-Reorder über reale Bedienelemente, `:314-350` | `mobile-touch.spec.ts` und Aufgaben-E2E | redundant |
| A16 | Code-Trace nennt falsche Variable, `:352-371` | `collection step trace...` | redundant |
| A17 | Predict-Output toleriert fachlich erlaubten Whitespace, `:373-382` | Test `worked-example completion...` | ersetzt |
| A18 | neuer sauberer Versuch vorhanden, `:383-385` | `canonical Foundations exercise...` | redundant |
| A19 | Katalog-ID, Counts und Graphgröße, `:387-413` | Compiler-, Coverage- und Node-Verträge sind autoritativ | durch Node/Build ersetzt, kein UI-E2E nötig |
| A20 | Pyodide-Isolation, Truncation, Workdir, Multi-File und Pfadschutz, `:415-450` | `pyodide-cross-browser.spec.ts` in Chromium, Firefox und WebKit | ersetzt |
| A21 | v3-Doppelimport, Event-Eindeutigkeit, Plan, Draft und Cycle, `:452-478` | Migrationstest | ersetzt |
| A22 | keine gesammelten Runtimefehler, `:480-483` | `console.error` plus `pageerror`, Full-E2E und manueller Buildcheck | ersetzt |

## Paritätsmatrix: `tools/acceptance_w01_cdp.mjs`

| ID | Verhalten und Legacy-Beleg | Preact-/Playwright-Beleg | Einstufung und S2B-Eigentümer |
|---|---|---|---|
| W1 | Phase-1-Karte expandiert Wochen, `acceptance_w01_cdp.mjs:143-151` | keine Preact-Wochenansicht | ausdrücklich ausgeschlossen |
| W2 | Wochenzeile verlinkt Unit und zeigt Gate, `:153-161` | keine Unit-/Gate-Portierung | ausdrücklich ausgeschlossen |
| W3 | `#/unit/*` mit Reading-Path-Karten, `:163-177` | keine Unit-Route | Wochenstruktur, ausgeschlossen |
| W4 | lokale Lesefassung antwortet 200 und öffnet sicher, `:168-204` | öffentliche Quellenkarten, Same-Origin und Lektionsquellen geprüft | teilweise ersetzt; lokales Privatprofil bleibt S2B-Blocker |
| W5 | Serlo-Zugriff aus einer Unit, `:206-216` | keine Unit-Route | ausgeschlossen; allgemeine Quellenansicht bleibt |
| W6 | Diagnoseaufgabe wird korrekt bewertet, `:218-226` | Grader-E2E | redundant |
| W7 | Diagnose zählt nicht als Mastery, `:227-228` | `.mastery-note` und Attempt-Assertion | ersetzt |
| W8 | Diagnose-Attempt ist korrekt, aber nicht evidence-/mastery-fähig und nie in der Review-Queue, `:229-235` | Grader-E2E | ersetzt |
| W9 | neue Seed-Variante ändert Prompt und sichtbaren Seed, `:239-251` | `legacy seeded activity...` | ersetzt |
| W10 | Attempt speichert den sichtbaren Seed, `:253-270` | derselbe Seed-E2E | ersetzt |
| W11 | drei Worked-Example-Schritte und Completion-Verdict, `:272-289` | `worked-example completion...` | ersetzt |
| W12 | Parsons per Buttons lösbar, `:291-320` | Mobile- und Aufgaben-E2E | redundant |
| W13 | Wochen-Gate, Evidence-Zeilen und Unit-Karten, `:322-333` | nicht portiert | ausdrücklich ausgeschlossen |
| W14 | Attempts und Journal bleiben über Reload stabil, `:335-344` | Migrationstest und Journal-E2E | ersetzt |
| W15 | keine gesammelten Runtimefehler, `:346-349` | `console.error`, `pageerror`, Full-E2E und Buildcheck | ersetzt |

## Erhaltene Produktbereiche

| Bereich | Preact-Route oder Eigentümer | Browserbeleg |
|---|---|---|
| Heute | `#/today`, `TodayView` | Hauptfluss, Mobile, A11y |
| Lernen und Kompetenzen | `#/learn`, `#/competency/*` | Suche, Trackwechsel, Voraussetzungen, Aktivitäten |
| Lektionen und Aufgaben | `#/lesson/*`, `#/exercise/*` | Quellen, Lazy Content, Grader, Seed, Worked Example |
| Review und Fortschritt | `#/review`, `#/progress` | geseedete Fälligkeit, Reload, Evidence, Journal |
| Einstellungen | `#/settings` | persistierte Werte, WebKit-Lastlauf, Reload |
| Quellen, Tools und Qualität | `#/sources`, `#/tools`, `#/quality` | Counts, Same-Origin, JSXGraph, Findings |
| Projekte, Lab und Visualisierungen | `#/project/*`, `#/lab/*`, `#/visualization/*` | Projektbericht, Pyodide, Mobile-Reflow, JSXGraph |
| JSON-Import/Export | Einstellungen und `progress-admin.ts` | UI-Roundtrip, ungültiges JSON, v3-Doppelimport |
| Fehlerjournal | `#/progress`, bestehender IndexedDB-Store | falsche Antwort, Anzeige, Export, Reload |

## Bewusst nicht portiert

- Preact-`#/week/*` ist nicht mehr geroutet und liefert `Nicht gefunden`.
- Roadmap-Karten verlinken nicht in Wochenansichten.
- Wochen-Gates bleiben ausschließlich Legacy-Code bis S2B.
- Wochen-Selbstmarkierung bleibt ausschließlich Legacy-Code bis S2B.
- Roadmap-Suche wurde nicht in Preact ergänzt.
- `#/unit/*` wurde nicht ergänzt, da es Teil der Wochenstruktur ist.

## Root-Cause-Bericht A: Firefox/SymPy

**Reproduktion vor Fix**

```text
npx playwright test tests/e2e/next-shell.spec.ts:165 --project=firefox --repeat-each=6 --workers=3
4 fehlgeschlagen, 2 bestanden
```

Der Klick und der MathLive-Wert waren korrekt. Die Trace zeigte den echten UI-Zustand `Prüft…`. Der erste SymPy-Aufruf erzeugt den Pyodide-Worker, lädt etwa 15 MB Runtime- und Paketdaten, kompiliert WASM und installiert SymPy. Unter Last begann das Paketladen erst nach rund 19,4 Sekunden und endete nach rund 20,8 Sekunden. Der Host-Grader erlaubt nach dem Worker-Start 60 Sekunden, der Test und beide Ergebnisassertionen aber nur 30 Sekunden.

**Root Cause**

Der Testvertrag war kürzer als der reale, bereits dokumentierte Pyodide-Gradervertrag. Es lag kein verlorener Klick, kein MathLive-Fehler und kein IndexedDB-Blocker vor.

**Kleinster Fix**

- Testbudget auf die bereits für Pyodide verwendeten 150 Sekunden gesetzt.
- Nur die beiden SymPy-Ergebnisassertionen auf den bestehenden 120-Sekunden-Pyodide-Wert gesetzt.
- Keine Sleeps, kein Preload und keine schwächere Assertion.

**Nachweis nach Fix**

- derselbe Firefox-Lastloop: 6/6 grün;
- vollständiger Dev-E2E-Lauf: grün;
- vollständiger Chromium-Build-E2E-Lauf: grün.

## Root-Cause-Bericht B: WebKit/Einstellungen

**Reproduktion vor Fix**

- 20 isolierte parallele Wiederholungen waren grün.
- Der vollständige Dev-Lauf reproduzierte den S0-Diff: `weeklyMinutes` 180 statt 240, während Track und Review-Slots korrekt waren.
- Die Trace zeigte: `fill("240")` startete, vor der nächsten Aktion stand das kontrollierte Zahlenfeld wieder auf 180.

**Root Cause**

Das Formular war vor Abschluss des ersten lokalen Fortschritts-Snapshots interaktiv. WebKit und Playwright können `input[type=number]` über `insertText` aktualisieren, ohne einen stabil übernommenen kontrollierten Preact-State zu garantieren. Ein späterer Render schrieb den alten Wert 180 zurück. Der Store speicherte anschließend korrekt den tatsächlich im Formular vorhandenen Wert; es gab kein IndexedDB-Commit- oder Leserace.

**Verworfene Gegenprobe**

Ein Key aus den geladenen Einstellungen remountete das Formular nach dem Speichern und löschte den Erfolgsstatus. Der Lastloop war damit 20/20 rot. Dieser Ansatz wurde vollständig verworfen.

**Kleinster Fix**

- Formular erst nach dem ersten lokalen Snapshot montieren.
- Felder als native, unkontrollierte Formfelder verwenden; `FormData` war bereits die Submit-Wahrheit.
- Vor Submit die drei sichtbaren Werte mit Web-First-Assertions prüfen.
- Keine Refills, Sleeps oder schwächeren Assertions.

**Nachweis nach Fix**

- WebKit 30/30, 15/15 und final 20/20 grün;
- vollständiger Dev-E2E-Lauf grün;
- gebautes Artefakt behält 240 nach Reload.

## Root-Cause-Bericht C: Chromium-Build/Lazy Request

**Reproduktion vor Fix**

```text
PLAYWRIGHT_PREVIEW=1 npx playwright test tests/e2e/next-shell.spec.ts:397 --project=chromium --repeat-each=10 --workers=1
8 fehlgeschlagen, 2 bestanden
```

`ExerciseView` rendert das sichtbare `h1` aus dem bereits geladenen Katalog-Summary. Erst danach startet ein `useEffect` den dynamischen Exercise-Chunk. Der Test wartete auf das frühe `h1` und prüfte `lazyRequests.length` unmittelbar mit einer nicht wiederholenden synchronen Assertion. Unter Preview-Last erreichte das echte Request-Event den Node-Listener erst danach.

Cache, Service Worker, Prefetch und Chunk-Naming wurden ausgeschlossen: Jeder Test nutzt einen frischen BrowserContext, es gibt keinen Service Worker oder Prefetch, und der Build erzeugt `f-git-choice-01-<hash>.js`.

**Kleinster Fix**

`page.waitForRequest()` wird vor der Navigation registriert und anschließend direkt erwartet. Der Test wartet damit auf das tatsächliche Ereignis statt auf ein frühes Proxy-Signal. Kein Sleep, kein höherer Timeout, keine schwächere Assertion.

**Nachweis nach Fix**

- derselbe Preview-Loop: 10/10 grün;
- vollständiger Chromium-Build-E2E-Lauf: 47 bestanden, 16 übersprungen, 0 Fehler.

## Umgesetzte Änderungen

| Datei | Änderung |
|---|---|
| `src/adapters/exercise-session.ts` | Journalregel für nicht korrekte diagnostizierte Attempts; Mastery- und Review-Fälligkeitsdaten im Outcome |
| `src/adapters/local-progress.ts` | bestehendes Journal in den Fortschritts-Snapshot aufgenommen |
| `src/adapters/python-workspace.ts` | dieselbe Journalregel für geprüfte Python-Antworten |
| `src/ui/App.tsx` | lokaler Snapshot-Gate für Einstellungen; Preact-Wochenroute entfernt |
| `src/ui/ExerciseView.tsx` | Seed, Mastery-Status, Worked-Example-Studium und Completion-Verdict |
| `src/ui/views.tsx` | Journalanzeige; unkontrollierte Settings-Felder; Roadmap ohne Wochenlinks |
| `src/ui/VisualizationView.tsx` | toten Wochenlink entfernt |
| `tests/e2e/next-shell.spec.ts` | A/B/C-Fixes sowie Migration, Review, Journal, Seed, Mastery, Worked Example und v3-Roundtrip |
| `tests/e2e/pyodide-cross-browser.spec.ts` | vollständiger Pyodide-Vertrag in allen drei Browsern |
| `tests/e2e/route-smoke.spec.ts` | ausgeschlossene Wochenroute entfernt |

## Verifikation

| Prüfung | Ergebnis |
|---|---|
| fokussierte Node-Verträge für Progress, Review, Mastery, Runner und Workspace | 58/58 grün |
| `char_group_f_retention.test.mjs` | 26/26 grün |
| vollständige Node-Suite | 883 bestanden, 1 bekannter Vorbestandsfehler, 1 opt-in Skip |
| `npm run coverage:check` | grün, 46 Kompetenzen und 39 Themen |
| `npm run typecheck` | grün |
| `npm run build:release` | grün, 702 Dateien, 77,1 KiB JS gzip, 6,3 KiB CSS gzip |
| Flake A, Firefox, 6 Wiederholungen mit 3 Workern | 6/6 grün |
| Flake B, WebKit, final 20 Wiederholungen mit 5 Workern | 20/20 grün |
| Flake C, Preview Chromium, 10 Wiederholungen | 10/10 grün |
| Pyodide Chromium/Firefox/WebKit | 3/3 grün |
| Journal/Migration/Seed/Worked Example/Route-Smoke fokussiert | grün |
| vollständiger Dev-E2E-Lauf | 107 bestanden, 82 übersprungen, 0 Fehler |
| vollständiger Chromium-Build-E2E-Lauf | 47 bestanden, 16 übersprungen, 0 Fehler |
| gebautes Artefakt, direkter Browsercheck | Journal und Settings über Reload stabil, Wochenroute nicht gefunden, 320-Pixel-Overflow 0, 0 serious/critical Axe-Findings, keine Console-/Page-Errors |
| `git diff --check` | grün |

Die bereits bekannten Vite-Warnungen zu fehlenden Pyodide-Sourcemaps und nicht analysierbaren vendorten Dynamic Imports blieben unverändert. Sie verursachten keinen Testfehler.

## Vollständige Node-Suite: Vorbestandsblocker

Commit `1998d57` enthält `tools/export_open_core.mjs`, dessen `toolFiles`-Liste `tools/pyodide_contract_matrix.mjs` verlangt. Diese Datei ist in Commit `1998d57` nicht versioniert. Sie existiert nur im ursprünglichen, nicht isolierten Arbeitsbaum und wurde deshalb nicht in die isolierte S2A-Kopie übernommen.

Exakter Fehler:

```text
open-core export recompiles from filtered sources without private content
Error: Exportquelle fehlt: tools/pyodide_contract_matrix.mjs
```

Dieser Fehler ist kein S2A-Diff. Das isolierte Commit listet 885 statt der in S0 gemeldeten 887 Node-Tests. S2B darf nicht auf einer vermeintlich vollständig grünen, aber unvollständigen Commit-Baseline starten. Noa muss separat entscheiden, ob und wie die unversionierte Datei geprüft und übernommen wird.

## CDP-Assertions, die S2B später ersetzen darf

Nach erneuter grüner Verifikation darf S2B folgende Assertions als ersetzt behandeln:

- `acceptance_cdp.mjs`: A1 bis A11, A13 bis A18 sowie A20 bis A22.
- A19 wird durch Compiler-, Coverage-, Schema- und Node-Verträge ersetzt, nicht durch einen zusätzlichen UI-Test.
- `acceptance_w01_cdp.mjs`: W6 bis W12 sowie W14 und W15.
- A12, W1 bis W3, W5 und W13 schützen ausdrücklich entfallende Wochen-, Unit- oder Gate-Funktionen und werden nicht portiert.

Noch nicht ersetzbar ist W4 in seinem lokalen Privatprofil: lokale Lesefassung, HTTP 200 sowie sichere neue Registerkarte mit `target=_blank` und `rel=noopener`.

## Exakte Blocker für S2B

1. `tools/pyodide_contract_matrix.mjs` fehlt in Commit `1998d57`, obwohl der Open-Core-Exporter die Datei verlangt. Die fremde unversionierte Fassung aus dem ursprünglichen Arbeitsbaum wurde nicht übernommen.
2. Der lokale Privatprofil-Vertrag W4 braucht einen Playwright-Eigentümertest, bevor `acceptance_w01_cdp.mjs` vollständig entfallen darf.
3. `src/ui/views.tsx` enthält noch die unreferenzierte `WeekView`. Sie ist nicht geroutet und nicht gebündelt, darf aber erst in S2B zusammen mit der bestätigten Löschliste entfernt werden.
4. Legacy-Router, Legacy-Views, `index.html`, beide CDP-Treiber und ihre Hilfsartefakte sind weiterhin vorhanden. Ihre konkrete Löschung braucht Noas neue Freigabe.
5. S2B muss vor jeder Löschung die aktuelle Caller-Liste neu prüfen. Der Graph wurde nach den S2A-Änderungen bewusst nicht aktualisiert.

## Komplexitätscheck

| Funktion | CC nach S2A | Einordnung |
|---|---:|---|
| `appendLearningEvent` | 3 | unkritisch |
| `gradeAndRecord` | 6 | beobachtbar, unter Schwelle |
| `loadProgressSnapshot` | 5 | unkritisch |
| `checkPython` | 4 | unkritisch |
| `masteryStatus` | 3 | unkritisch |
| `WorkedExample` | 8 | unter Schwelle |
| `ProgressView` | 9 | unter Schwelle |
| `App` | größer 15 | vorbestehender Router-Hotspot; S2A entfernte einen Wochenzweig und ergänzte einen Settings-Gate-Zweig, keine breite Routermigration in S2A |

Das Projekt hat keinen konfigurierten JS-/TS-Lint-Befehl. Es wurde kein zweiter Workflow und keine neue Abhängigkeit eingeführt. Typecheck, Build und Browsergates sind grün.

## Decisions

- Der Fehlerjournal-Store und sein Schema bleiben unverändert.
- Journal schreibt dieselbe Regel wie Legacy: falsch, diagnostiziert, nicht `invalid-input`, Notiz höchstens 200 Zeichen.
- `attempts` bleibt Ereigniswahrheit; in S2A wird das Journal nicht aus Attempts neu abgeleitet.
- Einstellungen verwenden native Formwerte. Der erste lokale Snapshot ist vor Interaktion Pflicht.
- Preact hat keine Wochenroute mehr. Die Roadmap bleibt nur als getestete Legacy-Projektion sichtbar.
- Die technisch notwendigen Pyodide-Timeouts gelten nur für die zwei echten SymPy-Ergebnisassertionen und den Testgesamtvertrag.
- Keine Build-Allowlist wurde gelockert. Ein verworfener Journal-Lazy-Prototyp erzeugte einen unerlaubten `jsxRuntime.module-*`-Chunk und wurde vollständig entfernt.

## Open

- Noas Entscheidung zur fehlenden, unversionierten `tools/pyodide_contract_matrix.mjs`.
- Lokaler Privatprofil-Test für W4.
- S2B-Freigabe, Caller-Neuprüfung und konkrete Löschliste.
- Keine Timeline, Contentmigration oder andere Welle wurde begonnen.

## Next session start

> Lies `AGENTS.md`, `docs/streamlining-umbauplan.md`, `docs/session-2026-09-01-s0-baseline.md` und `docs/session-2026-09-01-s2a-preact-parity.md` vollständig. Starte S2B nur nach Noas ausdrücklicher Freigabe. Kläre zuerst die fehlende versionierte Datei `tools/pyodide_contract_matrix.mjs` und den lokalen Privatprofil-Vertrag W4. Inventarisiere danach aktuelle Caller und lege die exakte Legacy-Löschliste vor. Lösche nichts, committe nichts und pushe nichts ohne neue Freigabe.
