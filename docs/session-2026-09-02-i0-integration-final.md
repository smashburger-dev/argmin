# I0-Integrationsdigest: Pre-S2B-Handoff (2026-09-03)

Branch `streamline/integration-pre-s2b`, HEAD `101b344`. `main` steht auf
`1998d57`, kein Push. Quell-Worktrees und Branches unangetastet.

## Commitstapel ab Baseline

1. `1998d57` Baseline (S0)
2. `50254e1` S0R Pyodide-Verträge
3. `33bf9e8` S1B Numbas-Retirement
4. `2599f32` S1B-Härtung
5. `4301763` S1A FSRS-Retirement
6. `9e46f47` S2A Preact-Parität
7. `e447cc0` S2A-Integration
8. `8ed7102` S4A-v1-Artefakte
9. `9421d62` S4A-v1-Reproduktion
10. `101b344` S4A-v2-Taxonomie (Commit 8)

## Gate-Stand

- S4A-v2: Assembler alle Assertions grün, Selbsttest 27/27, 268/268 IDs,
  132 Familien, Registry sauber, 7+4+1 Reviews entschieden und korrigiert.
- Produkt-Gates (Node-Suite, E2E, Builds) sind von S4A-v2 unberührt
  (reine Forschungsdateien). Vollständiger Clean-Checkout-Lauf in Block I
  noch offen.
- Modelleinschränkung: Alle Reviews liefen auf einem Modell in getrennten
  Kontexten (Noa-Weisung gegen GPT/GLM-Vorgaben). Für S2B–S4C gilt dieselbe
  Ehrlichkeit: Unabhängigkeit kommt aus Kontexten und Briefings, nicht aus
  Modellnamen.

## Folgeprompts (Copy-Paste, nicht implementiert)

Jeder Prompt startet auf `101b344f2b201eea7627e466593be8841e299525`.
Lösch- und Commitfreigaben sind überall offen. Stop bei rotem Gate mit
Root-Cause-Reparatur.

### S2B: Preact als einziger Einstieg

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe
> ausschließlich S2B aus auf
> `101b344f2b201eea7627e466593be8841e299525`. Mache Preact unter `index.html`
> zum einzigen Einstieg. Lösche Legacy-Shell (`assets/js/ui/views.mjs`,
> Legacy-Router, Legacy-ContentRepository), unreferenzierte `WeekView` in
> `src/ui/views.tsx` und ersetzte CDP-Treiber erst nach Caller-Prüfung
> (Graphify oder `git grep`): reine Funktionen (Instance-Key, Mastery) vorher
> an S3-Besitzer übergeben. OWNED PATHS: Orchestrator hält `index.html`,
> `next.html`, `vite.config.ts`, Build-Allowlists; UI-Agent nur `src/ui/`,
> Test-Agent nur `tests/e2e/`. Lege die exakte Löschliste vor und warte auf
> Noas Bestätigung. Kein Content- und kein Wochenumbau. Fast-Gate: S2A-Verträge
> (Journal, Settings, Review, Migration, Pyodide). Full-Gate: Node-Suite,
> Typecheck, Release-Build, Public-Build mit Validierung, Open-Core, beide
> E2E-Läufe, manueller Browsercheck. Kein Commit, kein Push ohne Freigabe.
> Stop bei rotem Gate.

S2B-Lösch- und Caller-Matrix (Entscheidungsvorlage, read-only erstellt, nichts
gelöscht): Legacy-Einstieg `index.html` → Altlast; `next.html` → wird Einstieg;
`assets/js/ui/views.mjs` + Legacy-Router → löschen nach Caller-Check;
`WeekView` (unreferenziert) → löschen; CDP-Treiber → löschen sobald
Playwright-Eigentümertests stehen (W4-Vertrag aus S2A-Integration beachten);
`activity_route.mjs`-Reste → prüfen; reine Funktionen → nach S3 verschieben,
nicht löschen.

### S3A: LearningPolicy

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe
> ausschließlich S3A aus auf `101b344`. Entwirf LearningPolicy mit gemeinsamer
> Instance-, Zeit-, Hint- und Eligibility-Normalisierung bei getrennten
> Review-/Evidence-Projektionen (`evaluate` → `reviewsByDefinition`,
> `evidenceByCompetency`). Charakterisierungstests zuerst (occurredAt-Kanon,
> instanceId-Regel, Hint-Schwelle, Lösungsdisqualifikation). Alte Scheduler-
> und Evidence-Tests ersetzen, nicht duplizieren. Keine TypeScript-
> Zwangsmigration. Fast-Gate: Policy-Contract-Tests. Full-Gate:
> Scheduler-/Evidence-Differentialtests, Node-Suite. Kein Commit/Push ohne
> Freigabe. Stop bei rotem Gate.

### S3B: LearningLedger

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe
> ausschließlich S3B aus auf dem S3A-Endcommit. Baue genau einen Event-Builder
> und Schreibpfad (`append`, `snapshot`, Cycle-/Instance-IDs, Zeitfelder).
> v1/v2-Importzweige und Wochen-localStorage-Migration entfernen; v3-Exporte
> und Attempts bleiben lesbar (getesteter Roundtrip). Journal-Schema nur mit
> Migration und Freigabe anfassen. Fast-Gate: Event-Contract. Full-Gate:
> v3-Roundtrip, IndexedDB-Browsertest, Review-/Journalfluss. Kein Commit/Push
> ohne Freigabe. Stop bei rotem Gate.

### S4B: LearningModule und Authoring-Modell

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe
> ausschließlich S4B aus (Startcommit nennen lassen). Nutze
> `research/streamlining/s4a-v2/` (132 Familien, 268 Placements, 84
> Lektionsmengen, Noa-Queue mit S4B-Auflagen: Bearbeitungsnachweis-IDs,
> Lektionszuordnungen `w05-e3`/`w05-e15`/Capstone). LearningModule mit
> deklarierten Content-Wurzeln, deterministischer Dauerableitung, Orphan-Fehler,
> fail-closed Public-Ausgabe. Golden Path 1 (Kompetenzmodul aus zwei Dateien).
> OWNED PATHS: Schemas/Compiler/Katalog beim Orchestrator. Fast-Gate:
> Schema-/Compiler-/Orphan-Tests. Full-Gate: Rechte, Public, Golden Path.
> Kein Commit/Push ohne Freigabe. Stop bei rotem Gate.

### S4C: ExerciseFamily-Runtime

> Lies `AGENTS.md` und `docs/streamlining-umbauplan.md` vollständig. Führe
> ausschließlich S4C aus (Startcommit nennen lassen). Implementiere den
> Familienvertrag auf Basis der finalen S4A-v2-Taxonomie (132 Verträge,
> Feedback-Zielpfade aus `feedback-disposition.json`, Archetyp-Registry mit
> 9 aktiven Adaptern, Council-Entscheide in `family-model.md` Abschnitt 10b:
> rationale-note-Ausnahme, vacuous-axis-Präzedenz, Token-Multimengen-Prosa).
> Registry und Contract-Test gemeinsam, Generator-Implementierungen getrennt
> wo fachlich verschieden. Golden Path 2 (neue Familie, 2 Falltypen,
> Profile, ohne UI-/Ledger-/Buildänderung). Danach Generator-Baseline einmalig
> und ausdrücklich neu setzen (Diff offenlegen). Fast-Gate: Registry- und
> Property-Tests. Full-Gate: Solver-Kreuzprüfung, Negativfälle, Golden Path.
> Kein Commit/Push ohne Freigabe. Stop bei rotem Gate.

## Handoff-Dokumente

- Masterplan: `docs/streamlining-umbauplan.md` (I0/S4A-Zeilen aktualisiert)
- Einfach-Erklärung: `docs/streamlining-status-einfach.md`
- S4A-v2-Digest: `docs/session-2026-09-02-s4a-v2-family-review.md`
- Entscheide: `research/streamlining/s4a-v2/block-c-decisions.md`
- Vergleich: `research/streamlining/s4a-v2/v1-v2-comparison.md`
- Queue: `research/streamlining/s4a-v2/decision-queue.json` (36 Punkte)

Commit 9 (`docs(learning-platform): finalize pre-S2B integration handoff`)
nach Block H2/I.
