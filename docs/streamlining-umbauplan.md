# Streamlining-Umbauplan der KI-Lernplattform

Stand: 2026-09-01

## Zweck und Benutzung

Dieses Dokument ist der selbstständige Masterplan für den Umbau der KI-Lernplattform. Eine neue Agent-Session soll zuerst `AGENTS.md` und danach dieses Dokument vollständig lesen. Anschließend führt sie ausschließlich die ausdrücklich beauftragte Session-ID aus. Sie beginnt nie automatisch mit der nächsten Session.

Welle 0 ist von Noa freigegeben. Alle späteren Wellen brauchen eine eigene Freigabe. Löschungen brauchen zusätzlich die ausdrückliche Bestätigung der konkreten Dateien oder Verzeichnisse. Commits und Pushes sind nicht automatisch freigegeben. Ausnahme: Der projektbezogene Baseline-Commit in Session S0 ist bereits genehmigt. Pushes sind nicht genehmigt.

## Entscheidungen von Noa

1. Die 39-Wochen-Roadmap soll aus Produkt und Authoring verschwinden.
2. Ein späteres Timeline-Feature soll LearningModules dynamisch empfehlen und deren Dauer aus Lektionen, Übungen und Projekten berechnen. Dieses Feature gehört nicht in diesen Umbau.
3. Wochen-Gates, Wochen-Selbstmarkierung und Roadmap-Suche werden nicht in die Preact-Shell portiert.
4. Das Fehlerjournal bleibt als produktunabhängige Lernfunktion.
5. Die Legacy-Shell wird vollständig abgelöst.
6. Numbas und FSRS sollen entfernt werden, wenn sie local-only, inaktiv oder ohne unverzichtbare Produktnutzung sind.
7. Generatoren dürfen global neu geordnet werden. Danach ist eine neue, fachlich geprüfte Baseline zulässig.
8. Aufgabenbreite soll aus Aufgabenfamilien, echten Falltypen und Schwierigkeitsprofilen entstehen, nicht aus mechanisch kopierten JSON-Aufgaben.
9. Einzigartiger didaktischer Gehalt bestehender Aufgaben muss vor einer Löschung extrahiert oder bewusst verworfen werden.
10. TypeScript ist kein Selbstzweck. Es wird dort eingesetzt, wo es Interfaces, Typprüfung oder Wartbarkeit verbessert.
11. Alte v1- und v2-Fortschrittsexporte wurden nicht produktiv genutzt. Direkter Import dieser Formate darf entfallen. Aktuelle v3-Attempts werden nicht still gelöscht oder unlesbar gemacht.
12. Die Zielarchitektur muss drei Golden Paths beweisen: neues Kompetenzmodul, neue Aufgabenfamilie und neue Synthese-Lektion.
13. Noa gibt jede Umbauwelle separat frei.

## Bestätigter Ausgangszustand

Die folgenden Werte stammen aus dem Abschlussbericht der vorigen großen Task oder wurden bei der Planung statisch geprüft. Session S0 reproduziert sie, bevor sie als Baseline gelten.

- 46 Kompetenzen und 46 Lektionen.
- 230 Aufgaben in `content/exercises/w01.json` bis `w39.json`.
- 38 eigenständige Definitionen unter `content/exercise-definitions/`.
- 267 öffentliche Definitionen im kompilierten Stand, weil mindestens ein lokales Artefakt herausgefiltert wird.
- 51 registrierte Generator-IDs.
- 98 Pyodide-Definitionen.
- 887 gemeldete Node-Tests, davon 886 bestanden und ein opt-in Skip.
- Gemeldete Node-Laufzeit ungefähr 12 bis 15 Sekunden.
- Gemeldete Produktions-LOC 13.649 und Produktionsbytes 693,7 KiB.
- Gemeldeter initialer Preact-JavaScript-Entry 77,5 KiB gzip.
- Der Compiler lädt alle 39 Wochen-Packs, adaptiert ihre Aufgaben und mischt sie mit den 38 kanonischen Definitionen.
- `catalog.json`, `build_public.mjs` und `export_open_core.mjs` pflegen teilweise dieselben Dateizugehörigkeiten separat.
- Legacy und Preact implementieren Router, Aufgabenansicht, Review, Fortschritt, Quellen und Visualisierungen parallel.
- `attempts` ist die Ereigniswahrheit. `reviewQueue` ist ein daraus abgeleiteter Cache.
- Review-Scheduling und Kompetenz-Evidence sind fachlich getrennte Zeitachsen, normalisieren Instance-Keys, Zeitfelder und Eligibility aber teilweise doppelt.
- Der gesamte neue Plattformstand ist im übergeordneten Repository überwiegend noch nicht versioniert.
- Der frühere Bericht nennt ungefähr 200 ignorierte `.tmp-validate-neg-*`-Verzeichnisse. Sie werden nicht ohne konkrete Freigabe gelöscht.

Unsicher bis Session S0:

- Exakte Test-LOC. Zwei statische Inventare kamen je nach Scope auf ungefähr 15.000 beziehungsweise 19.000 Zeilen.
- Exakte vollständige Release-Laufzeit auf demselben Rechner.
- Welche Legacy-CDP-Assertions gegenüber den Playwright-Suiten noch einzigartig sind.
- Welche der 230 Wochenaufgaben didaktisch einzigartig, mechanisch ähnlich oder überholt sind.

## Problemursachen

1. Zwei Shells erzeugen doppelte UI- und Runtime-Wege.
2. Wochen-Packs und Kompetenzdefinitionen sind zwei Content-Wahrheiten.
3. Der Legacy-Adapter hält zwei Feldvokabulare am Leben, etwa `exerciseId` und `definitionId` sowie `skillIds` und `competencyIds`.
4. Lernereignisse, Instance-IDs und Eligibility werden in mehreren Modulen gebaut.
5. Review- und Evidence-Module teilen Regeln, verwenden aber nicht überall dieselbe Normalisierung.
6. Die Public-Dateiliste wiederholt große Teile des Katalogs.
7. Historische `char_group_*`, `verify_session_b_*` und `verify_w*`-Tests überlagern dauerhafte Vertrags-Tests.
8. Viele gespeicherte Einzelaufgaben sind nicht automatisch nützliche Vielfalt. Nützliche Vielfalt braucht andere Falltypen, Anforderungen, Darstellungen und Schwierigkeiten.

## Zielarchitektur

### ContentCompiler

Ein tiefes Build-Modul besitzt:

- deklarierte Content-Wurzeln,
- JSON-Schema-Verträge,
- Rechte- und Profilprüfung,
- Referenz- und Orphan-Prüfung,
- Runtime-Index und Lazy Chunks,
- exakte Public-Content-Dateiliste,
- Coverage- und Suchprojektionen.

Der Compiler darf Dateien nur innerhalb deklarierter Wurzeln deterministisch erfassen. Jede nicht zuordenbare Datei ist ein Fehler. Die Runtime lädt nie rohe Parallelquellen als Fallback.

Die unabhängigen Public-Leak-, Rechte-, Lizenz-, Canary- und Hashprüfungen bleiben getrennt. Nur ihre geprüfte Dateigrundlage darf gemeinsam abgeleitet werden.

### LearningModule

`LearningModule` ersetzt die Woche als planbare Lerneinheit. Ein Modul referenziert ausdrücklich:

- Kompetenzen und Voraussetzungen,
- eine geordnete Auswahl von Lektionen,
- Übungsplatzierungen aus Aufgabenfamilien,
- optionale Projekte und Erklärungen,
- Overrides, wenn die abgeleitete Dauer fachlich nicht passt.

Die Dauer wird aus den referenzierten Inhalten abgeleitet. Tracks gruppieren Module. Die heutigen Milestones werden darauf geprüft, ob sie LearningModules oder echte Abschlussnachweise sind.

Die spätere Timeline konsumiert LearningModules, wird hier aber nicht implementiert.

### ExerciseFamily

Eine Aufgabenfamilie besitzt gemeinsam:

- `familyId`,
- Generator und deterministischen Seed-Vertrag,
- Referenzsolver oder eindeutige Answer Tests,
- Falltypen,
- Schwierigkeitsprofile,
- Grader- und Eingabevertrag,
- Feedback-Grammatik,
- Invarianten und Property-Tests.

Zielinterface:

```ts
instantiate(familyId, seed, difficulty, caseId?): ExerciseInstance
grade(instance, answer): Promise<GradeResult>
```

Eine Lektion kann eine Familie referenzieren. Sie erzeugt dadurch nicht automatisch einen vertrauenswürdigen Grader. Autoritative Aufgaben brauchen weiterhin einen deterministischen Solver oder eindeutige Tests.

### LearningLedger

Ein Schreibpfad besitzt Cycle-ID, Instance-ID, Zeitfelder und persistierte Ereignisformen.

```ts
append(event): Promise<CommittedEvent>
snapshot(): Promise<LearnerSnapshot>
```

Die aktuelle IndexedDB-v3-Historie bleibt lesbar. Alte v1/v2-Importzweige und die Wochen-localStorage-Migration dürfen nach Tests entfallen. Ein Schemawechsel ist nur mit einer getesteten Migration erlaubt.

### LearningPolicy

Ein reines Modul normalisiert Ereignisse einmal und erzeugt zwei fachlich getrennte Projektionen:

```ts
evaluate(events, catalog, settings, now): {
  reviewsByDefinition,
  evidenceByCompetency
}
```

Instance-Key, Zeitfeldpriorität, Hint-Schwelle und Lösungsdisqualifikation existieren genau einmal. Aufgaben-Review und Kompetenz-Frische bleiben zwei sichtbare Zeitachsen.

### PythonWorkspace

Pyodide-Host, Worker und Workspace-Protokoll bleiben ein isoliertes Modul. Der aktuelle Sicherheitsvertrag wird nicht mit dem allgemeinen Grader-Code verschmolzen. Keine neue Runtime-Abhängigkeit und kein LLM-Grader.

### Eine Preact-Shell

Preact wird der einzige Shell. Am Ende ist `index.html` der einzige Einstieg. `next.html`, die Legacy-Views und die Legacy-Runtime entfallen. Das Journal bleibt. Wochenansicht, Wochen-Gates, Wochen-Selbstmarkierung und Roadmap-Suche entfallen.

### Sprachstrategie

- Preact, UI-Typen und Vite-seitige Module bleiben TypeScript.
- Direkt in Node und Browser ausgeführte Generator-, Grader- und Build-Module dürfen ESM-JavaScript bleiben, wenn eine TypeScript-Umstellung einen Loader oder zweiten Buildweg erfordern würde.
- Bestehendes JavaScript wird nur migriert, wenn die betreffende Welle das Modul ohnehin ersetzt.
- Es gibt keine eigene mechanische Komplettmigration auf TypeScript.

## Harte Invarianten

1. Statische, deutschsprachige und lokale Plattform.
2. Keine CDN-Abhängigkeit zur Laufzeit.
3. Deterministische Grader und Referenzsolver bleiben autoritativ.
4. Ein LLM darf nie verbindlich graden, Mastery vergeben oder einen Planstatus verändern.
5. Public-Build bleibt fail-closed.
6. Private Quellen, lokale Overlays und Runtimes ohne gehashte Notices gelangen nicht in den Public-Build.
7. Aktuelle v3-Attempts werden nicht still verworfen.
8. Pyodide-Paket-Allowlist, Workspace-Limits, Timeout und Worker-Neustart bleiben geprüft.
9. Generator-Änderungen brauchen eine bewusste neue Baseline.
10. Neue Abstraktionen müssen alte Pfade oder Tests ersetzen. Eine zusätzliche Schicht ohne Löschung fällt durch.
11. `build-public/` und andere generierte Ausgaben werden nie direkt editiert.
12. Lernendeninhalte bleiben deutsch. Codebezeichner und Codekommentare bleiben englisch.

## Quantitative Zielwerte

Session S0 hat die exakten Nenner in `docs/session-2026-09-01-s0-baseline.md` eingefroren:

| Metrik | S0-Baseline | S6-Ziel |
|---|---:|---:|
| Runtime-LOC in `src/` und `assets/js/` | 9.085 | höchstens 7.268, minus 20 Prozent |
| Runtime plus Tools | 13.873 | höchstens 11.792, minus 15 Prozent |
| Test-LOC | 14.208 | höchstens 9.945, minus 30 Prozent |
| Node-Suite | 12,338 Sekunden | höchstens 10 Sekunden, sofern kein Sicherheitsvertrag geschwächt wird |
| Initialer JavaScript-Entry | 77,5 KiB gzip | höchstens 77,5 KiB gzip |

Zusätzlich gelten:

- Keine dauerhaften Dateien mit Namen `session_b`, `char_group` oder `verify_w*`.
- Neues LearningModule aus bestehenden Bausteinen: höchstens zwei Autorendateien und keine Buildlistenänderung.
- Neue Aufgabenfamilie: höchstens drei fachliche Dateien und keine Änderung an UI, Ledger oder Public-Dateilisten.
- Neue Synthese-Lektion: JSON plus Markdown und keine Änderung an zentralen Einzellisten.
- Keine aktiven `wNN`-Contentquellen oder Wochen-Routen nach der Contentmigration.
- Genau ein Event-Builder und eine Instance-Key-Regel.
- Jede Umbauwelle außer einer ausdrücklich genehmigten Migrationswelle ist netto LOC-neutral oder negativ.

## Agenten- und Sessionregeln

Jede neue Session:

1. Liest `AGENTS.md` und dieses Dokument vollständig.
2. Prüft den aktuellen Git-Status nur für `ki-lernplattform/` und überschreibt keine fremden Änderungen.
3. Führt ausschließlich die beauftragte Session-ID aus.
4. Lädt vor Änderungen `shrink-complexity full`.
5. Lädt vor Tests `affected-test-runner` und `fast-then-full`.
6. Verwendet für technische Subagents standardmäßig GLM 5.3 Flash High.
7. Verwendet GLM Flash Max nur für schwierige Architekturentscheidungen, hartnäckige Fehler oder den finalen adversarialen Review.
8. Gibt jedem schreibenden Subagent explizite und disjunkte `OWNED PATHS`.
9. Lässt Schemas, Katalog, zentrale Registry, Lockfile, Package-Scripts und Build-Entrypoints beim Orchestrator, sofern eine Session sie nicht ausdrücklich zuweist.
10. Prüft zuerst die betroffenen Tests, dann den vollständigen Gate-Satz am Checkpoint.
11. Prüft Browserverhalten am echten Artefakt. Ein Build allein genügt nicht.
12. Erstellt am Sessionende einen Digest unter `docs/session-<datum>-<session-id>-<thema>.md`.
13. Commit, Push und Löschungen brauchen die jeweils dokumentierte Freigabe.
14. Aktualisiert den Graph nur, wenn eine spätere graphabhängige Analyse nötig ist und die Aktualisierung freigegeben wurde.

## Sessionübersicht

| ID | Welle | Ergebnis | Status |
|---|---|---|---|
| S0 | 0 | Baseline verifizieren, messen und committen | abgeschlossen, Commit `1998d57` |
| S0R | 0 | Ignorierte Pyodide-Vertragsquellen und Clean-Checkout-Gates reparieren | freigegeben, eigener Repair-Commit |
| S1A | 1 | FSRS vollständig entfernen | Inventar abgeschlossen; Variante A freigegeben; wartet auf S0R und S1B-Repair |
| S1B | 1 | Numbas vollständig entfernen oder einzigartigen Inhalt ersetzen | Commit `f257b57` isoliert; Korrektur vor Integration freigegeben |
| S2A | 2 | Preact-Parität ohne Wochenfunktionen, Journal und Acceptance-Ersatz | abgeschlossen in isolierter Worktree; Commit und Integration offen |
| I0 | Integration | S0R, S1A, S1B, S2A, S4A-v1/v2 auf einen grünen Pre-S2B-Branch bringen | S4A-v2 abgeschlossen in Commit `101b344` (132 Familien, Assembler grün); Doku-Handoff und Clean-Checkout-Abnahme laufen; Continuation `docs/idle-task-pre-s2b-continuation.md` |
| S2B | 2 | Preact zum einzigen Einstieg machen, Legacy-Shell löschen | abgeschlossen auf `streamline/integration-pre-s2b`; Digest `docs/session-2026-09-03-s2b-preact-entry.md` |
| S3A | 3 | LearningPolicy und gemeinsame Ereignisnormalisierung | abgeschlossen |
| S3B | 3 | LearningLedger, ein Event-Builder, alte Importpfade entfernen | implementiert, Commit offen; Digest `docs/session-2026-09-03-s3b-learning-ledger.md` |
| S4A | 4 | Vollständige Content- und Aufgabenfamilien-Taxonomie | v1 integriert; v2 abgeschlossen (7 Shards, 7 Domänenreviews, 4 Cross-Reviews, Adversarial-Review, Commit `101b344`); Noa-Queue mit 36 Punkten offen |
| S4B | 4 | LearningModule und normalisiertes Authoring-Modell | committet `c9b31d4` (Review-Fixes: ModuleView faul, Vor/Zurück nach Modul, Chunkmuster; JS 78.1) |
| S4C | 4 | ExerciseFamily-Vertrag und neue Generator-Baseline | implementiert, uncommitted (GP2 auf `classify-git-operation`, 512er-Korpus, JS 78.1); Commit und GP2-Abweichung freigeben |
| S4D1 | 4 | Foundations W01 bis W04 migrieren | Freigabe nötig |
| S4D2 | 4 | Lineare Algebra und NumPy W05 migrieren | Freigabe nötig |
| S4D3 | 4 | Data und klassisches ML W06 bis W17 migrieren | Freigabe nötig |
| S4D4 | 4 | Deep Learning W18 bis W21 migrieren | Freigabe nötig |
| S4D5 | 4 | Transformer und LLM-Grundlagen W22 bis W26 migrieren | Freigabe nötig |
| S4D6 | 4 | GenAI-Systeme W27 bis W30 migrieren | Freigabe nötig |
| S4D7 | 4 | Research und Capstone W31 bis W39 migrieren | Freigabe nötig |
| S4E | 4 | Wochenkern, Legacy-Contentvertrag und Adapter löschen | Freigabe nötig |
| S5A | 5 | Testverträge ersetzen historische Tests | Freigabe nötig |
| S5B | 5 | Public-Dateiliste und Build-Helfer streamlinen | Freigabe nötig |
| S6 | 6 | Vollabnahme, Golden Paths und adversarialer Review | Freigabe nötig |

Eine Session darf weiter geteilt werden, wenn sie mehr als einen sauber verifizierbaren Outcome enthält oder der Kontext zu groß wird. Sie darf nicht mehrere Tabellenzeilen ohne neue Freigabe zusammenziehen.

## Session S0: Baseline

Ziel: Den aktuellen, bereits umfangreich verifizierten Refactorstand reproduzieren, exakt messen und als projektbezogenen Git-Rückfallpunkt sichern. Keine Refactor-Änderung.

Ergebnis: abgeschlossen in Commit `1998d57`. Der projektbezogene Arbeitsbaum war danach sauber. Alle statischen Zähler, Node-, Python-, Content-, Build-, Public-, Audit- und CDP-Gates wurden reproduziert. Der vollständige Release-Gesamtloop blieb wegen der in `docs/session-2026-09-01-s0-baseline.md` dokumentierten E2E-Abweichungen A bis C nicht durchgehend grün. Diese Abweichungen gehören zu S2A und werden nicht als erreichte grüne Baseline umgedeutet.

Ablauf:

1. Projektregeln und diesen Plan lesen.
2. `git status --short -- .`, projektbezogenen Diff und Ignore-Regeln prüfen.
3. Sicherstellen, dass keine Secrets, temporären Profile, Buildausgaben oder private Bibliotheksinhalte in den Commit gelangen.
4. Reproduzierbare Messdefinitionen festlegen und in einem Session-Digest dokumentieren:
   - Runtime-LOC: `src/` und `assets/js/`, ohne Vendor und generierte Dateien.
   - Tool-LOC: `tools/`.
   - Test-LOC: ausführbare Dateien unter `tests/`, ohne JSON-Fixtures.
   - Testdateien, Laufzeittests und Laufzeit.
   - Initial- und Lazy-Chunk-Größen.
   - Anzahl Kompetenzen, Lektionen, Wochenaufgaben, kanonische Definitionen und Generatorfamilien.
5. Fast Gate ausführen.
6. Wenn Fast Gate grün ist, vollständige Baseline ausführen:
   - `node --test tests/`
   - `npm run test:project-runner`
   - `npm run coverage:check`
   - `npm run typecheck`
   - `npm run build:release`
   - `npm run test:e2e`
   - `npm run test:e2e:build`
   - `node tools/compile_content.mjs --profile public`
   - `node tools/compile_content.mjs --profile local-private`
   - `node tools/validate_content.mjs`
   - `node tools/validate_content.mjs --legacy`
   - `node tools/build_public.mjs`
   - `node tools/validate_content.mjs --dir build-public`
   - beide dokumentierten Browser-Acceptance-Flows über HTTP
   - `npm audit`
   - `git diff --check`
7. Falls ein Test flakt, isoliert reproduzieren und ehrlich protokollieren. In S0 keine funktionale Reparatur vornehmen. Stoppen und Noa berichten.
8. Session-Digest schreiben.
9. Nur `ki-lernplattform/` stagen. Den vollständigen Staging-Diff und sensible Inhalte prüfen.
10. Den bereits genehmigten Baseline-Commit erstellen. Vorgeschlagener Betreff: `chore(learning-platform): freeze pre-streamlining baseline`.
11. Nicht pushen.

OWNED PATHS: keine Produktionsdateien. Erlaubt sind nur der bereits angeforderte Plan, der neue S0-Digest und durch dokumentierte Befehle erzeugte ignorierte Buildausgaben.

Gate: Alle reproduzierbaren Baseline-Prüfungen grün oder exakt als bereits bekannter Flake dokumentiert.

Rückfallpunkt: Baseline-Commit.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe ausschließlich Session S0 aus. Der projektbezogene Baseline-Commit ist genehmigt, ein Push nicht. Ändere keinen Produktionscode und keinen Lerninhalt. Stoppe bei jeder neuen funktionalen Abweichung und berichte sie, statt sie in S0 zu reparieren.

## Session S0R: Pyodide-Vertragsquellen und Clean Checkout

Ziel: Den durch die übergeordnete Ignore-Regel `*Contract*` verursachten Baseline-Defekt in einem eigenen Repair-Commit beheben. Ein sauberer Checkout muss ohne lokal kopierte oder ignorierte Quelldateien test- und exportfähig sein.

Als Quellen zu tracken sind mindestens `tools/pyodide_contract_matrix.mjs`, `tests/pyodide_contract_matrix.test.mjs` und `tests/e2e/pyodide-contracts.spec.ts`. Die generierten Dateien `tests/e2e/pyodide-contract-matrix.json` und `tests/e2e/pyodide-contract-receipt.json` bleiben Build- beziehungsweise Testartefakte und werden nicht allein deshalb versioniert. Projektlokale Negationen dürfen die drei Quelldateien gezielt aus den übergeordneten Ignore-Mustern lösen; die Root-`.gitignore` bleibt unangetastet.

Beide E2E-Einstiege müssen die Matrix vor Playwright deterministisch erzeugen. Die Node-Suite darf in einem sauberen Checkout vor dem ersten Browserlauf nicht an einem fehlenden Receipt scheitern. Der Browser-Spec bleibt der autoritative Beweis, dass jede Pyodide-Definition im echten Worker besteht und der gebrochene Gegenfall abgelehnt wird. Ein vorhandenes Receipt darf zusätzlich auf Frische geprüft werden, ist aber keine lokale Vorbedingung für Unit-Tests.

Die Verifikation erfolgt in einer zweiten, frisch aus dem Repair-Commit erzeugten Arbeitskopie ohne kopierte Ignore-Artefakte. Mindestens `node --test tests/`, der Open-Core-Export-Test, beide E2E-Einstiege und `git ls-tree` für die drei Quelldateien müssen bestehen.

Der eigene S0R-Repair-Commit ist freigegeben. Ein Push ist nicht freigegeben.

Startprompt:

> Lies `AGENTS.md`, `docs/streamlining-umbauplan.md` und `docs/session-2026-09-01-s0-baseline.md`. Führe ausschließlich S0R aus. Repariere den durch die Root-Ignore-Regel verursachten Clean-Checkout-Defekt der fünf Pyodide-Vertragsdateien. Tracke die drei Quelldateien gezielt, behandle Matrix und Receipt als generierte Artefakte, erzeuge die Matrix vor beiden E2E-Einstiegen und entferne die harte Unit-Test-Vorbedingung eines bereits vorhandenen Browser-Receipts, ohne den echten Worker-Beweis zu schwächen. Verifiziere den fertigen Commit in einer zweiten sauberen Arbeitskopie. Der Repair-Commit ist genehmigt, ein Push nicht.

## Session S1A: FSRS entfernen

Ziel: Den inaktiven FSRS-Versuch samt Runtime-, Vendor-, Notice-, Test- und Dokumentationsfläche vollständig entfernen. Der produktive Expanding-Retrieval-Vertrag bleibt identisch.

Vor jeder Löschung eine exakte Pfad- und Referenzliste vorlegen und Noas Freigabe abwarten. Erwartete Kandidaten sind `vendor/ts-fsrs/`, der FSRS-Block in `review_scheduler.js`, FSRS-spezifische Tests, Notices und Dokumentation. Build- und Notice-Dateien integriert der Orchestrator.

Fast Gate: Review-Scheduler-, Mastery- und Policy-Tests.

Full Gate: Node-Suite, Typecheck, Release-Build und Public-Validierung.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S1A aus. Beweise zuerst, dass FSRS keinen produktiven Caller besitzt. Lege danach die exakte Löschliste und Testauswirkung vor und warte auf meine Bestätigung. Der Expanding-Scheduler darf sich semantisch nicht ändern. Kein Commit und kein Push ohne neue Freigabe.

## Session S1B: Numbas entfernen

Ziel: Numbas und seinen MathJax-spezifischen Runtimezweig entfernen, sofern kein einzigartiges Lernziel verloren geht.

Zuerst werden alle Numbas-Caller, Contentdefinitionen, privaten Artefakte, Vendor-Verzeichnisse, Builder, Notices, Tests und Dokumentationsverträge inventarisiert. `w05-e7` wird fachlich mit bestehenden deterministischen oder Pyodide-Aufgaben verglichen. Ein einzigartiges Lernziel wird vor der Löschung auf einen unterstützten Grader übertragen. Mechanisch redundanter Inhalt darf nach Freigabe entfallen.

Pyodide, SymPy, NumPy, KaTeX, JSXGraph und MathLive sind nicht Teil dieser Löschung.

Fast Gate: betroffene Content-, Grader-, Lizenz- und Public-Tests.

Full Gate: Release-Build, Public-Validierung, Open-Core-Test und Browserlauf.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S1B aus. Inventarisiere zuerst Numbas und w05-e7. Lege die fachliche Ersatz- oder Löschentscheidung sowie die exakten Pfade vor und warte vor jeder Löschung auf meine Bestätigung. Pyodide, SymPy, NumPy, KaTeX, JSXGraph und MathLive bleiben unangetastet.

## Session S2A: Preact-Parität und Acceptance-Ersatz

Ziel: Alles erhaltenswerte Nutzerverhalten in Preact nachweisen, ohne die Legacy-Shell bereits zu löschen.

Erhalten werden Today, Lernen, Kompetenzen, Lektionen, Aufgaben, Reviews, Fortschritt, Einstellungen, Quellen, Tools, Qualität, Projekte, Lab, Visualisierungen, Import/Export und Fehlerjournal. Wochenansicht, Wochen-Gates, Wochen-Selbstmarkierung und Roadmap-Suche werden ausdrücklich nicht portiert.

Die beiden Legacy-CDP-Treiber werden Assertion für Assertion inventarisiert. Jede einzigartige Nutzer- oder IndexedDB-Assertion wird in bestehende Playwright-Suiten oder einen gemeinsamen Browservertrag übertragen. Kein zweites paralleles E2E-Gerüst einführen.

S2A besitzt außerdem die drei S0-Abweichungen aus `docs/session-2026-09-01-s0-baseline.md`: Firefox-Timeout beim migrierten Legacy-Grader, WebKit-Persistenzrace bei `weeklyMinutes` und die reihenfolgenabhängige Lazy-Chunk-Beobachtung im Chromium-Buildlauf. Für jede Abweichung gilt der Diagnosezyklus Reproduktion, Root Cause, kleinster Fix, isolierte Wiederholung und Volllast-Wiederholung. Tests dürfen nicht durch höhere Timeouts, zusätzliche Sleeps oder schwächere Assertions grün gemacht werden, solange keine belegte technische Notwendigkeit vorliegt.

OWNED PATHS für Write-Agents dürfen nur disjunkt vergeben werden, etwa `src/ui/` und `tests/e2e/`. Zentrale Router-, Package- und Builddateien bleiben beim Orchestrator.

Gate: Preact am Dev-Server und am gebauten Artefakt, A11y, Mobile, IndexedDB, Pyodide und Journal.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S2A aus. Lösche die Legacy-Shell noch nicht. Erstelle zuerst eine Paritätsmatrix, wobei Wochenfunktionen bewusst entfallen. Implementiere oder prüfe das Fehlerjournal in Preact und übertrage nur einzigartige Legacy-CDP-Assertions in die vorhandenen Playwright-Suiten. Verifiziere am echten Browserartefakt.

## Session S2B: Legacy-Shell löschen

Ziel: Preact wird der einzige Einstieg. Legacy-Bootstrap, Legacy-Views, Legacy-ContentRepository und nachweislich ersetzte Acceptance-Treiber entfallen.

Vor Löschungen wird mit Graphify oder gezielter Suche die aktuelle Caller-Liste verifiziert. Reine Funktionen wie Instance-Key oder Mastery dürfen nicht zusammen mit einer DOM-Runtime verschwinden. Sie werden vorher an den in S3 vorgesehenen Fachbesitzer verschoben oder über ein kleines bestehendes Modul weitergeführt.

Der Orchestrator besitzt `index.html`, `vite.config.ts`, Build-Allowlists und zentrale Integrationsdateien. Ein UI-Agent darf nur `src/ui/` und ein Test-Agent nur `tests/e2e/` besitzen.

Gate: Alle S2A-Verträge, Release-Build, Public-Build, Open-Core und visueller Browsercheck.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S2B aus. Prüfe zuerst die S2A-Paritätsmatrix und alle aktuellen Caller. Lege die exakte Legacy-Löschliste vor und warte auf meine Bestätigung. Mache danach Preact unter `index.html` zum einzigen Einstieg und lösche nur vollständig ersetzte Pfade. Keine Content- oder Wochenmigration in dieser Session.

## Session S3A: LearningPolicy

Ziel: Eine gemeinsame Ereignisnormalisierung und Policy mit zwei getrennten Projektionen.

Vor dem Umbau werden Charakterisierungstests für folgende Entscheidungen festgelegt:

- `occurredAt` ist das kanonische v3-Zeitfeld; Legacy-Fallbacks werden ausdrücklich dokumentiert.
- `instanceId` gewinnt. Der Fallback verwendet genau eine gemeinsame Kombination aus Definition, Cycle und Seed.
- Hint-Schwelle und Lösungsdisqualifikation existieren nur einmal.
- Aufgaben-Review und Kompetenz-Frische bleiben getrennte Ergebnisse.

Das neue Interface muss ReviewScheduler- und EvidenceEngine-Tests ersetzen, nicht zusätzlich duplizieren. Direkte Node-Testbarkeit ohne neuen Loader ist wichtiger als eine erzwungene TypeScript-Dateiendung.

Gate: Policy-Contract-Tests, Scheduler-Differentialtests, Evidence-Differentialtests und Node-Suite.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S3A aus. Charakterisiere zuerst Instance-Key, Zeitsemantik, Hint-Schwelle und Solution-Reveal. Entwirf dann ein gemeinsames LearningPolicy-Interface mit getrennten Review- und Evidence-Projektionen. Alte Tests müssen ersetzt oder gelöscht werden, nicht als zweite Schicht bestehen bleiben.

## Session S3B: LearningLedger

Ziel: Genau ein Builder und ein Schreibpfad für Lernereignisse.

Alle Recorder für Antworten, Hinweise, Teillösung, Lösung, Worked Example, Python, Projekt und Journal werden auf einen gemeinsamen Eventvertrag gebracht. Cycle- und Instance-IDs werden nicht in Views gebaut. Die IndexedDB bleibt lokal.

V1/V2-Importzweige und die Wochen-localStorage-Migration werden entfernt. Aktuelle v3-Exporte und Attempts bleiben lesbar. Das Journal wird bevorzugt aus Attemptdaten abgeleitet, aber nur wenn die Gleichwertigkeit vollständig bewiesen ist. Andernfalls bleibt sein Store bis zu einer eigenen getesteten Migration.

Gate: Event-Contract, v3-Import/Export-Roundtrip, IndexedDB-Browsertest, Review- und Journalfluss.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S3B aus. Inventarisiere zuerst jeden aktuellen Event-Recorder. Implementiere genau einen Event-Builder und Schreibpfad, ohne aktuelle v3-Attempts zu verlieren. Entferne nur ungenutzte v1/v2-Import- und Wochen-localStorage-Pfade. Prüfe das Journal als Ableitung, ändere sein Persistenzschema aber nicht ohne explizite Migration und Freigabe.

## Session S4A: Content- und Aufgabenfamilien-Taxonomie

Ziel: Vollständige, prüfbare Migrationstabelle vor jeder Contentlöschung. Keine Produktionsänderung.

GLM-Flash-Agents dürfen parallel und rein lesend nach Fachdomäne arbeiten. Die Ergebnisse werden in einer gemeinsamen maschinenlesbaren Matrix und einer kurzen Zusammenfassung gespeichert. Jede der 230 Wochenaufgaben und 38 kanonischen Definitionen erhält:

- heutige ID und Quelle,
- Kompetenz und Lernziel,
- Aufgaben- und Graderart,
- vorgeschlagene Familie,
- Falltyp und Schwierigkeit,
- Referenzsolver oder Testvertrag,
- Feedbackstatus,
- fachlich einzigartig, mechanisch ähnlich oder überholt,
- Zielaktion und Begründung,
- notwendige ID-Kompatibilität für v3-Attempts.

Die bekannten 273 Python-Feedbackregeln ohne Konsumenten und die ungefähr 62 bis 64 Regeln außerhalb der aktuellen Gradergrammatik werden vollständig aufgenommen.

Gate: 100 Prozent der 268 Quelldefinitionen sind genau einmal zugeordnet. Keine Löschung und keine Generator-Neubaseline.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S4A aus. Nutze parallele GLM-Flash-Agents mit disjunkten Fachdomänen und nur Lesezugriff. Erstelle eine vollständige maschinenlesbare Migrationstabelle für alle 230 Wochenaufgaben und 38 kanonischen Definitionen. Ändere keinen Produktionscode und lösche keinen Inhalt.

## Session S4B: LearningModule und Authoring-Modell

Ziel: Woche durch LearningModule als kanonische Komposition ersetzen, zunächst mit kontrollierter Legacy-Brücke.

Der Orchestrator besitzt Schemas, Compiler, Katalog und zentrale Typen. Das Source-Modell deklariert Membership nur an einer Stelle. Ein LearningModule listet seine geordneten Lektionen, Aufgabenfamilienplatzierungen und Projekte ausdrücklich. Dauer und Reverse-Indizes werden abgeleitet. Keine semantische Aufnahme nur über unscharfe Kompetenzschnittmengen.

Content-Wurzeln sind im Manifest deklariert. Der Compiler entdeckt nur darunter, sortiert deterministisch und lehnt Orphans ab. Die Public-Ausgabe bleibt fail-closed.

Golden Path 1 wird umgesetzt: ein kleines neues Kompetenzmodul aus bestehenden Bausteinen, ohne zentrale Einzellisten manuell zu ändern.

Gate: Schema-, Compiler-, Orphan-, Rechte-, Public- und Golden-Path-Tests.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S4B aus. Entwirf und implementiere LearningModule als kanonische Komposition mit deterministischer Dauerableitung. Membership darf nur an einer Stelle gepflegt werden. Verwende deklarierte Content-Wurzeln mit Orphan-Fehlern, keine offene Plugin-Discovery. Beweise Golden Path 1 und lasse die Wochenmigration für spätere Sessions stehen.

## Session S4C: ExerciseFamily und Generator-Baseline

Ziel: Familienvertrag, Falltypen und Schwierigkeitsprofile als einzige Erweiterungsstelle für Aufgabenvariation.

Der Vertrag muss die S4A-Taxonomie tragen. Generator und Referenzsolver werden nicht blind in eine Datei verschmolzen. Fachlich unterschiedliche Generatoren dürfen getrennte Implementierungen behalten. Registry und Contract-Test sind gemeinsam.

Golden Path 2 wird umgesetzt: eine kleine neue Familie mit mindestens zwei echten Falltypen und mehreren Schwierigkeitsprofilen, ohne Änderungen an UI, Ledger oder Builddateiliste.

Danach wird die neue globale Generator-Baseline einmalig und ausdrücklich gesetzt. Determinismus, Solverkreuzprüfung und Invarianten bleiben Pflicht. Byte-Pinning kosmetischer Objekt-Key-Reihenfolgen soll nur bestehen, wenn es Nutzerverhalten schützt.

Gate: Registry, Property-Tests, unabhängige Solver, negative Fälle, Golden Path und expliziter Baseline-Diff.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S4C aus. Verwende die S4A-Taxonomie. Implementiere einen kleinen ExerciseFamily-Vertrag mit Falltypen, Schwierigkeit, Generator, Referenzsolver und Feedbackvertrag. Beweise Golden Path 2. Lege jede Generator-Baseline-Änderung separat offen und baselined nichts still.

## Sessions S4D1 bis S4D7: Fachmigrationen

### Voraussetzung: Identitätsabbildung Familieninstanz → S3-Ereignis

Familieninstanzen tragen `familyId:caseId:difficulty:seed`, aber kein
`definitionId`/`cycleId`. Der Schreibpfad wirft ohne `cycleId`. Bevor S4D
die Übungsansicht anschließt, baut S4D1 einmalig die Abbildung (eine
Funktion, z. B. `familyEventInput` in `exercise_registry.mjs`):

- `definitionId` = `familyId:caseId` (stabil je Fall, kein neues Authoring)
- `activityId` = `familyId`, `instanceId` = Registry-Form (Policy bevorzugt sie)
- `competencyIds`, `masteryEligible`, `graderId` aus dem Familienvertrag
- `seed` durchgereicht, `cycleId` vom Ledger
- Keine Änderung an Policy, Ledger oder Builder nötig

Gates dafür: Roundtrip Instanz → `record()` → Review/Evidence liest zurück,
Kreuzprüfung gegen den Familien-Korpus, unbekannte Familie/Fall fällt zu.
Ohne diese Abbildung bleiben Varianten im Browser unspeicherbar.

Gemeinsamer Ablauf je Session:

1. Nur die zugewiesene Fachdomäne bearbeiten.
2. S4A-Matrix und S4C-Familienvertrag verwenden.
3. Einzigartige Lernziele, Prompts, Fehlermuster und Solver erhalten.
4. Mechanische Einzelinstanzen in Falltypen und Schwierigkeitsprofile überführen.
5. Lektionsquellen und Rechte nachvollziehbar halten.
6. Für geänderte IDs eine ausdrückliche Alias- oder Retire-Entscheidung dokumentieren.
7. Betroffene Wochen-Packs und historische Tests nur nach exakter Löschfreigabe entfernen.
8. Gemeinsame Schemas, Registry und Compiler integriert der Orchestrator.
9. Jede Session endet mit Contentvalidierung, Property-Tests und Browserprobe einer leichten sowie einer schweren Aufgabe.

Fachdomänen und erwartete OWNED PATHS:

| Session | Domäne | Contentpfade | Generatorpfade |
|---|---|---|---|
| S4D1 | Foundations W01 bis W04 | `content/lessons/foundations/`, `content/exercise-definitions/foundations/`, W01 bis W04 | Foundations- und W01-Generatoren |
| S4D2 | Lineare Algebra und NumPy W05 | `content/lessons/linear-algebra/`, entsprechende Definitionen, W05 | W05- und Linalg-Generatoren |
| S4D3 | Data und klassisches ML W06 bis W17 | `content/lessons/data-ml/`, W06 bis W17 | Data-ML-Generatoren |
| S4D4 | Deep Learning W18 bis W21 | `content/lessons/deep-learning/`, W18 bis W21 | W18-W21-Generatoren |
| S4D5 | Transformer und LLM-Grundlagen W22 bis W26 | `content/lessons/transformer-llm/`, W22 bis W26 | W22-W26-Generatoren |
| S4D6 | GenAI-Systeme W27 bis W30 | `content/lessons/genai-systems/`, W27 bis W30 | W27-W30-Generatoren |
| S4D7 | Research und Capstone W31 bis W39 | `content/lessons/research/`, Projekte, W31 bis W39 | W31-W39-Generatoren |

Startprompt-Vorlage:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich Session [S4D1 bis S4D7] aus. Bearbeite nur die dort zugewiesene Fachdomäne und nutze die S4A-Migrationstabelle sowie den S4C-Familienvertrag. Erhalte jedes einzigartige Lernziel, überführe mechanische Varianten in Falltypen und Schwierigkeitsprofile und lege vor jeder Löschung die exakten Pfade vor. Gemeinsame Schemas, Registry, Katalog und Compiler bleiben beim Orchestrator. Stoppe nach den Gates dieser Fachdomäne.

## Session S4E: Wochenkern entfernen

Ziel: Nach vollständiger Fachmigration existiert kein wochenbasierter Source-of-Truth-Pfad mehr.

Erwartete Lösch- und Änderungsbereiche werden vor Ausführung exakt neu inventarisiert:

- `content/curriculum.json`,
- verbleibende `content/exercises/wNN.json`,
- `content/legacy/`,
- Legacy-Mapping und Migrationswerkzeug,
- `legacyProjection` im Compiler,
- Legacy-Exercise-Adapter,
- Wochen-Routen und Wochen-Coverage,
- `--legacy`-Validierung,
- Wochen- und historische Tests,
- generierter Legacy-Suchindex, falls ohne Wochenpfad ungenutzt,
- veraltete ADR-, README- und AGENTS-Verträge.

Golden Path 3 wird umgesetzt: eine Synthese-Lektion als JSON plus Markdown, die ein LearningModule und bestehende Familien nutzt, ohne zentrale Einzellisten zu ändern.

Gate: 100 Prozent S4A-Mapping abgeschlossen, alle LearningModules valide, Public-Build grün, keine aktiven `wNN`-Referenzen außerhalb ausdrücklich archivierter Dokumentation, Golden Path 3 im Browser.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S4E aus. Beweise zuerst, dass S4D1 bis S4D7 vollständig abgenommen sind und jede alte Aufgabe in der S4A-Matrix eine abgeschlossene Zielaktion hat. Lege dann die exakte Wochen- und Legacy-Löschliste vor und warte auf meine Bestätigung. Entferne nach Freigabe den gesamten Wochen-Source-of-Truth-Pfad und beweise Golden Path 3.

## Session S5A: Testarchitektur konsolidieren

Ziel: Dauerhafte Verträge ersetzen historische Testschichten.

Zielschichten:

1. Contract-Tests pro tiefem Modul.
2. Property-Tests pro ExerciseFamily.
3. Eine bewusste Generator-Baseline.
4. Compiler- und Schema-Negativtests.
5. Unabhängige Public-Leak-, Rechte- und Lizenztests.
6. Wenige vollständige Browserflüsse.

Vor jeder Testlöschung wird eine Assertion-Matrix erstellt: alter Test, geschütztes Verhalten, neuer Eigentümertest. Quelltext-String-Assertions werden durch beobachtbares Verhalten ersetzt. `char_group_*`, `verify_session_b_*` und `verify_w*` verschwinden erst nach belegter Vertragsabdeckung.

Die absolute Testzahl ist keine Primärmetrik. Test-LOC, Setup-Duplikation, Laufzeit, Interface-Stabilität und Fehlerlokalisierung sind die Kriterien.

Gate: Kein verlorener Sicherheitsvertrag, mindestens 30 Prozent weniger Test-LOC gegenüber S0, Node-Suite höchstens 10 Sekunden oder dokumentierte technische Grenze.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S5A aus. Erstelle zuerst eine Assertion-Matrix für historische und dauerhafte Tests. Ersetze Implementierungs- und Session-Pins durch Contract-, Property- oder E2E-Tests am zuständigen Interface. Lösche keinen Test ohne nachgewiesenen neuen Eigentümer. Miss Test-LOC und Laufzeit gegen S0.

## Session S5B: Build und Public-Dateiliste streamlinen

Ziel: Eine geprüfte Content-Dateigrundlage ohne selbstbestätigende Security-Tests.

Der validierte Katalog beziehungsweise das Compilergebnis liefert die exakte Content-Dateiliste. Eine kleine feste Runtime-Allowlist bleibt getrennt. Source-Scan, Output-Scan, Rechte-Mirror, Lizenz-Hashes und Manifestvalidierung bleiben unabhängig.

Weitere Zusammenführungen wie Walker oder Notice-Validatoren erfolgen nur, wenn sie netto Code löschen und ihre Symlink- beziehungsweise Fail-closed-Semantik ausdrücklich erhalten. Der Tempdir-Helfer verwendet ein System-Tempverzeichnis und garantiert Cleanup über Test-Hooks oder `finally`.

Gate: alle positiven und negativen Public-Build-Tests, Open-Core, keine privaten Marker, keine Symlinks, bytegültige Manifeste, weniger Tool-LOC als S0.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S5B aus. Leite nur die Content-Dateiliste aus dem validierten Compilergebnis ab. Halte Runtime-Allowlist, Source-Scan, Output-Scan, Rechte-Mirror und Hashvalidierung unabhängig. Zentralisiere keinen Security-Test mit seiner Produktionsquelle. Behebe außerdem die Tempdir-Leaks und miss Tool-LOC gegen S0.

## Session S6: Vollabnahme

Ziel: Den gesamten Umbau am realen Produkt und an den festgelegten Metriken abnehmen.

Ablauf:

1. Alle schnellen und vollständigen Projektgates.
2. Beide Buildprofile und Open-Core-Export.
3. Public-Leak-, Rechte-, Lizenz-, Manifest- und Symlinkprüfung.
4. Pyodide-Receipt und Workspace-Verträge.
5. Browserabnahme am gebauten Artefakt, Desktop und Mobile.
6. Drei Golden Paths ausführen und die tatsächlich berührten Dateien zählen.
7. S0-gegen-S6-Tabelle für LOC, Bytes, Test-LOC, Testlaufzeit, Bundle und Authoring-Touchpoints.
8. GLM Flash Max als adversarialer Abschlussreview.
9. Nur bestätigte Findings reparieren, danach betroffene und vollständige Gates erneut ausführen.
10. Abschlussdigest schreiben. Kein Push ohne neue Freigabe.

Timeline-Feature, massenhafte neue Lektionsgenerierung und externe LLM-Integration bleiben außerhalb dieser Session.

Startprompt:

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md`. Führe ausschließlich S6 aus. Verifiziere den realen gebauten Stand, führe alle drei Golden Paths aus, vergleiche jede Zielmetrik mit S0 und nutze GLM Flash Max für einen adversarialen Abschlussreview. Repariere nur bestätigte Findings. Implementiere weder Timeline noch neue Lektionsmassenproduktion. Kein Push ohne meine Freigabe.

## Bewusst nicht zentralisieren

- Public-Leak-Test und Produktionsscanner.
- Rechte-Mirror und Rechtevalidator.
- Pyodide-Host und Worker.
- Fachlich unterschiedliche Generatorimplementierungen.
- Aufgaben-Review und Kompetenz-Frische als einen einzigen Status.
- UI-Fehlerbehandlung und Build-Fehlerbehandlung.
- Beliebige Grader hinter einem Runtime-Plugin-System.
- Alle Tests in eine monolithische Datei.

## Rückfall- und Stopregeln

- Jede Session beginnt am grünen Rückfallpunkt der vorherigen Session.
- Eine neue rote Prüfung wird zuerst reproduziert und der auslösenden Änderung zugeordnet.
- Keine Metrik wird durch Code-Golf, Kommentarentfernung, schwächere Validierung oder weniger Browserabdeckung erzwungen.
- Wird eine geplante Löschung durch einen einzigartigen Vertrag blockiert, stoppt die Session und legt Optionen vor.
- Wird der Public-Build weniger streng, wird die Änderung verworfen.
- Wird aktuelle v3-Historie unlesbar, wird die Änderung verworfen oder um eine getestete Migration ergänzt.
- Überschreitet eine Session ihren definierten Outcome, wird sie geteilt. Die nächste Session beginnt mit einem Digest.

---

## Completed

- Gesamtes Programm durch sieben GLM-Flash-Inventare nach Shell, Content, Grading, Lernlogik, Tests, Build und Hotspots kartiert.
- Vier alternative Zielarchitekturen entworfen und mit GLM Flash Max adversarial geprüft.
- Entscheidungen, Zielmodule, Invarianten, Zielmetriken und Session-Schnitte in diesem Masterplan festgehalten.
- Für jede empfohlene Session einen Startprompt und eigene Gates definiert.
- Keine Produktionsdatei und kein Lerninhalt verändert. Keine Tests oder Builds in der Planungs-Session ausgeführt.

## Decisions

- Welle 0 und der projektbezogene Baseline-Commit sind freigegeben. Ein Push ist nicht freigegeben.
- Alle weiteren Wellen, Commits und konkreten Löschungen brauchen neue Freigaben.
- Wochenmodell, Legacy-Shell, FSRS und voraussichtlich Numbas werden kontrolliert entfernt.
- LearningModule, ExerciseFamily, LearningLedger und LearningPolicy bilden das Zielmodell.
- Timeline und massenhafte neue Lektionsgenerierung bleiben eigene spätere Vorhaben.

## Open

- S0 muss die gemeldeten Ausgangsmetriken reproduzieren und den unversionierten Plattformstand sichern.
- S4A muss den didaktischen Gehalt aller 268 Quelldefinitionen klassifizieren, bevor Content gelöscht wird.
- Numbas darf erst nach Prüfung von w05-e7 gelöscht werden.
- Legacy-CDP-Treiber dürfen erst nach Ersatz ihrer einzigartigen Assertions entfallen.

## Next session start

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe ausschließlich Session S0 aus. Der projektbezogene Baseline-Commit ist genehmigt, ein Push nicht. Ändere keinen Produktionscode und keinen Lerninhalt. Stoppe bei jeder neuen funktionalen Abweichung und berichte sie, statt sie in S0 zu reparieren.
