# ADR-0014: Forschungs- und Capstone-Phase W31–W39 sowie W2–W4-Integration

Status: Angenommen (Autorenfassung; didaktischer Release bleibt Draft). Datum: 2026-08-31.

## Kontext

Zwei Restarbeiten schließen die erste vollständige Autorenfassung:

1. W31–W39 (Forschung und Capstone) sind Outline-Stubs. Die fünf Zielkompetenzen
   `c-research-question`, `c-research-cards`, `c-research-responsible`,
   `c-research-capstone`, `c-capstone-pipeline` haben Lektion, Lektüre, Aufgaben,
   Evidence und Projekt noch nicht.
2. W2–W4 sind Outline-Stubs, obwohl kanonische Kompetenzen, Lektionen und
   Aufgaben-Definitionen bereits existieren (Foundations-Bestand). Der frühere
   Abschlussbericht behauptete fälschlich „12 Outline-Wochen, nur W31–W39“;
   korrekt ist: W2, W3, W4 und W31–W39 (3+9=12) [VERIFIED,
   content/curriculum.json, 2026-08-31].

Vier Untersuchungen liegen vor (Evidenz-Recherche, Rechte-Audit,
Lernmethodik, Runtime-Architektur). Diese ADR integriert deren belegte Befunde;
jede entscheidungsrelevante Behauptung trägt eine Quellenklasse.

## Teil 1: W2–W4-Integration (Bestand statt Duplikat)

### Entscheidung

- W2–W4 werden mit **bestehenden** Foundations-Kompetenzen und Lektionen
  detailliert; es entstehen keine semantisch identischen Kopien [VERIFIED:
  Lektionen und Definitionen existieren bereits, content/lessons/foundations/,
  content/exercise-definitions/foundations/].
- Wochenzuordnung der Kompetenzen [ENTSCHEIDUNG, fachlich aus WochenTiteln]:
  - W2 „Bedingungen, Schleifen, Strings, Listen“ → `c-python-control-flow`,
    `c-python-collections` (Listen/Strings-Anteil)
  - W3 „Dictionaries, Sets, Exceptions, Git-Branches“ →
    `c-python-collections` (Dicts/Sets), `c-python-files-errors`
    (Exceptions/Dateien), `c-git-basics`
  - W4 „Module, pytest-Grundlagen“ → `c-testing-debugging`; Projekt
    `p-foundations-data-checker` (bereits `legacyWeekId: w04`) bleibt verankert
- `c-python-files-errors` erhält hiermit erstmals eine Roadmap-Wochen-Verknüpfung
  (dokumentierte Legacy-Lücke schließt sich) [VERIFIED: vor dieser ADR hatte
  keine Unit die Kompetenz; coverage-report w02-w04 outline-only].
- Aufgabenzuordnung über `legacyWeekId` an den Bestandsdefinitionen:
  - W2: control-choice, control-trace, control-parsons, control-repair,
    collections-choice, collections-output
  - W3: files-choice, files-parsons, git-choice, git-parsons, git-merge-debug
  - W4: testing-choice, testing-parsons, data-code-repair
  - `f-meta-error-log` bleibt bewusst ohne Wochen-ID (W1-Diagnoseaufgabe)
- Die `future`-Markierungen der Kumulativ-Gates w10→w02, w11→w03, w12→w04
  entfallen, sobald die Wochen detailliert sind (Validatorregel, Authoring-Guide
  §6) [VERIFIED: tests/cumulative_refs.test.mjs].
- **Git-/Testing-Frische vor W17** [VERIFIED, Reviewbefund
  `git-testing-freshness-before-w17`]: Statt freshnessDays zu erhöhen, erhält
  W13 einen zusätzlichen verzögerten Rückgriff w13→w03/`c-git-basics` (Lag +10,
  neue Seeds). `c-testing-debugging` wird über das dann aktive w12→w04-Gate
  (Lag +8) frisch gehalten. Beides bleibt innerhalb der 77-Tage-Frist vor dem
  W17-Final-Boss [INFERENCE aus freshnessDays 77 und Wochenabstand; die
  konkreten Intervalle bleiben Produkt-Heuristiken].

## Teil 2: W31–W39 Struktur (Progression und Evidenz)

### Progression [ENTSCHEIDUNG nach Methodik-Gutachten]

- W31 `c-research-question` — prüfbare Frage, Hypothese, UV/DV, feste Metrik,
  Baseline, Abbruchregel, Preregistrierung; deterministische Goal-Shift-Erkennung.
- W32 `c-research-cards` — Data/Model/System Cards als Vertrag mit Pflichtfeld-
  und Konsistenzvalidator; keine vertraulichen Werte.
- W33 `c-research-responsible` — Subgruppenmetriken, Schwellenwerte,
  Betriebskosten (deterministisch); Risk Register bleibt menschliche Arbeitsevidenz.
- W34 `c-research-capstone` — Golden Set (Hash), Baselinewerte, Fehlerliste,
  erster Projektcheckpoint.
- W35–W39 `c-capstone-pipeline` — Scope-Freeze/Manifest, Hauptfunktion und
  Integration, feste Evaluation und defensives Red-Team, Reproduktion und
  Dokumentation, Demo/Abschlussdiagnose/Retrospektive. Dieselbe Capstone wird
  fünf Wochen weiterentwickelt; keine fünf Miniprojekte.

### Evidenzregeln (verbindlich)

- Hausmuster je Woche: e1 single-choice/diff1 Konzept-Erkennung
  (`masteryEligible: false`), e2 numeric, e3 predict-output oder code-trace,
  e4–e6 python-code/parsons (diff 2–4, mastery-fähig) [VERIFIED: Muster in
  content/exercises/w27–w30.json].
- Forschungsartefakte (experiment.md-Prosa, Paperzusammenfassung, Risk
  Register, Demo, Retrospektive, Selbstbericht) sind **Work Evidence, nie
  Mastery** [VERIFIED: Produktvertrag; graders.js erzwingt masteryEligible:false
  für manual-rubric].
- Falsifizierbarkeit, Protokollreihenfolge, Kartenpflichtfelder,
  Subgruppenmetriken, Kostenrechnung, Goal-Shift- und Overclaim-Erkennung sind
  deterministisch prüfbar (deterministic/pyodide-Grader) [VERIFIED:
  Grader-Whitelist und bestehende Muster].
- Delayed-Review: die Stub-Gates w35–w39 (+4-Lags) und w39 (+8) liefern die
  verzögerten Treffer; Gate-Replays laufen mit neuen Seeds (Autoringregel der
  W6-Pipeline). Enges Fenster für `c-research-capstone` (W34) und
  `c-capstone-pipeline` (W35): w38→w34 und w39→w35 sind die in-window Delayed
  Hits [VERIFIED: evidence_engine.mjs minimumDelayDays 1; Gate-Stubs].
- Minutensumme je Woche 600 (Lektüre 45–90 + Praxis 160–210 + Projekt 310–380)
  [PRODUKT-HEURISTIK; methodisch begründete Richtung, exakte Werte unkaliert].

## Teil 3: Capstone-Projektstruktur (Design A)

### Entscheidung: EIN Projekt `p-rag-capstone`, Phasen als Vertrag im Paket

- `content/projects/rag-capstone/` mit `legacyWeekId: "w39"`,
  `competencyIds: ["c-capstone-pipeline"]`, `requires: ["c-research-capstone",
  "c-ml-repro", "c-genai-security"]` [ENTSCHEIDUNG nach Runtime-Gutachten].
- W30-Vertrag bleibt unangetastet: `src/w30_core.py` ist eine **byte-identische,
  sha256-gepinnte Kopie** des W30-Retrieval-Kerns (erweitern, nicht forken);
  ein Repo-Test erzwingt die Hash-Gleichheit mit dem W30-Original und dass das
  Golden Set die W30-QUERIES als Teilmenge enthält [VERIFIED: Mechanismus
  check-manifest.json + validateProjectPackages, tools/compile_content.mjs].
- Phasenvertrag `phases.json` im Paket: Woche→Phase→Testdatei→Deliverable;
  geprüft durch einen neuen Node-Test (jede Phase referenziert eine
  existierende Curriculum-Woche, jede Testdatei gehört zu genau einer Phase,
  `legacyWeekId` = letzte Phase). Wochen W35–W38 tragen dokumentiert `no-project`
  in knownGaps; ihre Wochen-Evidenz kommt aus den Browser-Wochenpaketen
  (Aufgaben zählen über `exercise.legacyWeekId`) [VERIFIED:
  build_coverage_matrix.mjs Z. 177–196; no-project ist Flag, kein Gate].
- Runner: unverändert das eine fixe pytest-Kommando über `tests/`
  (`allowedCommands`-Muster W30). Phasenweise Verifikation erfolgt
  **reposeitig** per unittest-Stdlib-Solution-Test (Muster
  test_foundations_project_solution.py), registriert in `test:project-runner`
  [VERIFIED: Runner-Kontrakt, tools/learner_project_check.py]. Projekt-Reports
  bleiben Selbstberichte ohne Mastery-Evidence [VERIFIED: project-session.ts].
- Automatisch prüfbar: Manifest vollständig (sha256), feste Seeds,
  reproduzierbare Resultate (Doppellauf, Digest-Vergleich), Golden Set
  unverändert (Hash), Retrieval-/Subgruppen-/Kostenmetriken exakt,
  Sicherheitsregeln vorhanden, verbotene Aktionen abgelehnt, erwartete Fehler
  sichtbar (keine stillen Fallbacks), frischer Lauf in sauberem Verzeichnis,
  keine absoluten Benutzerpfade (Scan + PRIVATE_MARKERS), README nennt echte
  Grenzen (Overclaim-Scanner).
- Browser vs. lokal: Browser-Pyodide (numpy, keine neuen Pakete) übt Formeln auf
  kleinen Instanzen; Karten werden als dict-Literal eingebettet (kein
  Mehrdateien-Workspace); die volle Pipeline läuft im lokalen Projekt
  (stdlib-only wie W30) [VERIFIED: Worker-Whitelist; Grader-Pfad reicht keine
  Workspace-Dateien durch]. Keine neuen Pyodide-Vertragsfamilien nötig; Matrix
  und Receipt werden regeneriert.
- Abgelehnt: (B) fünf Wochen-Pakete (höchste Duplikats-/Autorenfläche, nur
  Reporting-Ästhetik), (C) W30 auf version 2 heben (Coverage-Projektion lügt,
  Re-Pinning eines freigegebenen Projekts) [ENTSCHEIDUNG].

## Teil 4: Quellen und Rechte

### Neue Quellen W31–W39 (24 Quellen; Evidenz-Recherche 2026-08-31)

- open (CC BY 4.0/CC0/MIT/Apache-2.0): cos-prereg, hf-model-cards-docs,
  fairlearn, aequitas-toolkit, helm-leaderboard, lm-evaluation-harness,
  cookiecutter-data-science, turing-way, wilson-good-enough,
  sandve-repro-rules, rougier-figures, kass-statistical-practice
- link-only (NC/ND/SA/arXiv/keine offene Lizenz): stanford-encyclopedia-popper,
  jhangiani-research-methods, neurips-paper-checklist,
  datasheets-for-datasets, data-cards-playbook, gpt4-system-card, fairmlbook,
  strubell-energy, patterson-carbon, stanford-ai-index-2025, helm-paper,
  acm-artifact-badging
- Lizenzfallen [VERIFIED, Primärseiten]: AI Index 2025 ist CC BY-ND (nicht CC
  BY), fairmlbook CC BY-NC-ND, SEP „All rights reserved“ (nicht offen).

### Reklassifizierungen Bestand (Rechte-Audit 2026-08-31, Primärbelege gelesen)

`mit-ocw-18-06sc` (CC BY-NC-SA 4.0), `serlo-mathe` (CC BY-SA 4.0),
`wikibooks-mfnf` (CC BY-SA 4.0), `serlo-algebra-grundlagen-w01` (CC BY-SA 4.0),
`openintro-statistics` (CC BY-SA 3.0): `open` → `link-only`. Mechanisch entsteht
keine Coverage-Lücke (link-only bleibt publicEligible für Lektüren) [VERIFIED:
build_coverage_matrix.mjs sourceRecord]. Ersatz-Primärquellen für W7/W10/W11
(OpenStax) bleiben UNKNOWN, bis die Lizenzseite statisch verifizierbar ist —
bis dahin bleibt openintro als link-only referenzierbar.

### Register und Validator

- `docs/license-register.md` wird mit sources.json synchronisiert (Klasse
  link-only dokumentieren, fehlende Einträge ergänzen, verwaiste Einträge
  kennzeichnen).
- `tools/validate_content.mjs` erhält eine fail-closed-Regel: `contentClass:
  "open"` darf keinen Lizenz-String mit NC/ND/SA-Markern tragen; außerdem einen
  Abgleich fehlender/verwaister Source-IDs zwischen Quellenreferenzen und
  sources.json.

## Teil 5: Performance- und Qualitätsgrenzen

- Initial-JS bleibt **150 KiB gzip** (keine Erhöhung); Lazy-Chunks max 250 KiB
  gzip [VERIFIED: validate_next_build.mjs]. Prognose: 9 Wochenpakete
  (≈ 6 Aufgaben × ~752 B Summary) ≈ +40–50 KiB raw ≈ +12–15 KiB gzip Entry
  [INFERENCE aus ADR-0013-Messwerten] — Messung mit
  tools/measure_next_timing.mjs, 7 Läufe, Median/min–max.
- Content-Index-Strukturtest ergänzt: keine Prompts (außer ≤120-Zeichen-
  Snippet), keine Lektionsblöcke, keine vollständigen Lösungen, keine
  Starter/Tests im Index [Fortführung ADR-0013].
- User-Intent-Prefetch (pointerenter/Fokus/pointerdown) nur als Experiment mit
  Messung; Verwerfen, wenn kein belastbarer Effekt [ENTSCHEIDUNG].
- Kein vorgezogener Großrefactor (ExerciseSession, UI-Zusammenführung,
  Exportmanifest, IndexedDB-Umbau folgen separat).

## Rückfallplan

Alles ist additiv: neue Lektions-/Aufgaben-/Projektdateien, Katalog-,
Allowlist- und Test-Ergänzungen. Rollback = neue Dateien entfernen,
Registrierungen zurücknehmen, Coverage regenerieren. W30-, W17-, W1-Verträge
und Vendor bleiben unberührt.

## UNKNOWN-Felder

- Ob 5 Wochen `c-capstone-pipeline` ohne Kohortendaten ausreichen
  (Kalibrierung erste Kohorte).
- Delayed-Hit-Deckel am Kursende [VERIFIED, Methodik-Review 2026-08-31]:
  `c-research-cards`, `c-research-responsible` und `c-research-capstone`
  erhalten genau EINEN verzögerten Treffer innerhalb des Kurses (Gates w36/w37/w38,
  Lag +4); ein zweiter läge jenseits von w39. Bewusste Entscheidung: das
  Review-Ladder (Slots 2/5/11 Wochen) läuft in die Nachkurs-Phase; ein
  optionaler Exit-Review-Block in w39 ist eine spätere Option.
- RAM/Laufzeit schwerster Browseraufgaben auf Zielgeräten (auch ADR-0013
  UNKNOWN).
- OpenStax-Ersatzlizenz (JS-SPA, statisch nicht verifizierbar).
- NeurIPS-Checklisten-Jahrgang (Seite ohne Datum; bei Integration dokumentieren).
- Data-Cards-Playbook-Content-Lizenz der Website (Repo Apache-2.0 verifiziert;
  Site selbst ohne Angabe — konservativ link-only).
