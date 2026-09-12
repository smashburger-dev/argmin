# Aufgaben-Autoring-Guide (KI-Lernplattform)

Stand: 2026-08-25 (erweitert um LM-R2/LM-R4/LM-R5-Felder). Gilt für alle Aufgaben, die in die Plattform aufgenommen werden.

## 1. Pflichtfelder je Aufgabe

`exerciseId`, `schemaVersion`, `skillIds`, `type`, `prompt`, `locale` (immer `de`), `grader`, `parameters`, `deterministicSeed`, `expectedAnswer` ODER `referenceSolver`, `tolerancePolicy`, `hints`, `feedbackRules`, `fullSolution`, `difficulty` (1-5: 1 Basic, 2 Core, 3 Advanced, 4-5 Final Boss; die Coverage-Matrix mappt entsprechend), `estimatedMinutes`, `sourceLineage`, `license`, `validationStatus`, `testedSeedCount`. Der Validator (`tools/validate_content.mjs`) erzwingt sie und prüft den Typ gegen eine Whititelist: `numeric`, `single-choice`, `vector`, `algebraic-expression`, `python-code`, `short-rationale`, `parsons`, `code-trace`, `predict-output`.

## 2. Quellenlinie und Lizenz

- `sourceLineage.concept`: konzeptionelle Quelle mit Seitenanker, z. B. „MML §2.2, S. 22-23 (Draft 2024-01-15)".
- `sourceLineage.statement`: „eigenständig entwickelt" — Aufgabe, Zahlen und Formulierung müssen wirklich eigenständig sein. Keine Übersetzung geschützter Aufgabentexte; „inspiriert durch" heißt eigene Instanz.
- Klasse `generated` + `license: CC BY 4.0` ist der Standard für öffentliche Aufgaben.
- Inhalte aus `private`-Quellen (MML, Murphy …) niemals wörtlich übernehmen.

## 3. Parametrisierte Aufgaben

1. Generator in `assets/js/core/linalg_generators.mjs` / `foundations_generators.mjs` (Muster; wird pro Thema erweitert) — deterministischer Seed, keine Zufallsabbrüche.
2. **Invarianten dokumentieren und im Test erzwingen**: z. B. `genLinear2` — det ≠ 0, ganzzahlige Lösung in [-9,9], keine Division durch null; `genMatmulEntry` — |c_ij| ≤ 50 für Kopfrechnen.
3. Referenzsolver separat (`solveLinear2`, `solveLinearEquation`) und im Test gegen die Generator-Erwartung kreuzprüfen.
4. Eingabevalidator (`parseIntegerAnswer`, `parseIntegerPair`) — Validierung ist Feedback-Stufe 1, keine Exception im Grader.
5. Property-Tests in `tests/`: mindestens 200 Seeds je Generator; fehlgeschlagene Seeds werden als Regressionstest fixiert.
6. Grenzfalltests: vertauschte Paare, Vorzeichenfehler, leere/unsinnige Eingaben — typische Fehlertypen in `feedbackRules` abbilden.

### Learning-Module-Schema

Jedes LearningModule trägt Placements mit Family-ID, Case-ID, Seed,
Schwierigkeitsprofil und den dafür freigegebenen Kompetenzen. Quellen bleiben
am Placement bzw. an der Lektion referenziert; lokale Pfade werden im
Public-Build entfernt.

Dazu in `content/sources.json` je Quelle eine öffentliche `canonicalUrl`. Die UI verlinkt diese Originalquelle in einem neuen Tab; lokale Lesepfade und private Volltextkopien gehören nicht zum Public-Profil.

### Seed-Generatoren für Familienfälle

- `parameters.seedGenerator: 'genLinearEquation'|'genPowerExpr'|'genLogExpr'` + `deterministicSeed` in der Aufgabe; der Grader (`expectedNumeric`) berechnet `expected` aus Generator + **aktuellem** Seed.
- Der im JSON dokumentierte `prompt` ist die Generator-Ausgabe zum Default-Seed (Test erzwingt Identität — kein Seed-Drift).
- „Neue Zahlen“-Knopf (nur bei `seedGenerator`): `ExerciseRuntime.reseed()` zieht einen frischen Seed; Prompt wird neu generiert, der nächste Versuch wird mit diesem Seed gewertet und persistiert (`attempt.seed`).
- Hinweise/Lösung beschreiben den Lösungsweg generisch (zahlenunabhängig), nie die konkrete Instanz.

## 4. Graderwahl

| Typ | Grader | Warum |
|---|---|---|
| Numerik ganzzahlig, Auswahl, Vektor/Matrix (int) | `deterministic` | exakt, schnell, offline sofort |
| `parsons` (Zeilen ordnen + Distraktoren) | `deterministic` | reine Reihenfolgeprüfung; Adaptivität ist Content-Sache (Muster: w05-e14) |
| `code-trace` (Variablenwerte nach n Schritten) | `deterministic` | ganzzahliger Vergleich je Variable; Tracing vor Schreiben (Muster: w05-e15) |
| `predict-output` (Ausgabe vorhersagen) | `deterministic` | whitespace-normalisierte Ausgabenormalisierung, exakte Werte (Muster: w05-e16) |
| Term-Vereinfachung, exakte Algebra | `pyodide-sympy` | exakte Äquivalenz (SymPy); niemals Stringgleichheit |
| Python/NumPy | `pyodide` | getrennte Tests, Zeitlimit, deterministischer Seed |
| Begründung, Kritik | `manual-rubric` | Rubric mit Pflichtbestandteilen; zählt nie als Mastery |

Schema der neuen Antwortformate (LM-R4):

- `parsons`: `parameters.fragments` = `[{id, text}]` (Lösungszeilen **und** Distraktoren), `parameters.initialOrder` = Permutation aller IDs (Startanzeige); `expectedAnswer` = `{kind: 'ordered-lines', solutionOrder: [id…], distractors: [id…]}`. UI: Auf/Ab-/Aussortieren-Knöpfe (Tastatur-bedienbar, kein DnD nötig).
- `code-trace`: `parameters.snippet` (Python-Code als String), `parameters.variables` = `[{name, value}]` (ganzzahlige Endwerte); `expectedAnswer` = `{kind: 'variable-values'}`.
- `predict-output`: `parameters.snippet`; `expectedAnswer` = `{kind: 'output-lines', output: '<print-Ausgabe>'}` (Python-Listennotation).

## 5. Feedback-Stufen und Mastery-Policy

Worked-Example-Stufe (neu, LM-R5) → Eingabevalidierung → richtig/falsch → diagnosebezogenes Feedback (`feedbackRules`) → Hinweis 1 → Hinweis 2 → Teillösung → volle Lösung **nach** eigenem Versuch (reveal markiert den Versuch als nicht-mastery-fähig). Nie die volle Lösung ungefragt im selben Blickfang wie die Aufgabe zeigen.

**Worked-Example mit Fading** (optionales Feld `workedExample`, Muster w05-e14): `title`, `steps[]` mit je `subgoalLabel` (Teilziel-Label) und `text`, optional `completion: {prompt, answer}` pro Step. Sequenz: Beispiel studieren → Completion-Ausschnitte selbst füllen (lokal geprüft) → volles Problem. Das Studium wird als Ereignis `event: 'studied'` persistiert: **sperrt nicht, qualifiziert nicht** — kein Mastery-Versuch.

Verbindliche, in der Aufgabenansicht sichtbare Policy (`exercise_runtime.js` + `review_scheduler.js`, abgeleitet aus ADR-0005/ADR-0008 und diesem Guide — keine stillen Schwellen):

- Korrekt **ohne** zuvor angezeigte Lösung und mit **höchstens einem Hinweis** → Mastery-Nachweis erfüllt.
- **Teillösung** zeigt den letzten Hinweis und zählt daher so, als wären alle Hinweise verbraucht (mindestens 2 Hinweise). Die aktuelle Instanz liefert keine Evidence.
- Eine **angezeigte Lösung** disqualifiziert nur dieselbe `instanceId`. Eine neue Seed-Instanz oder ein ausdrücklich gestarteter Zyklus kann frische Evidence liefern. „Aufgabe zurücksetzen“ bleibt die getrennte Aktion zum Löschen der Historie.
- Grader-Ausgänge mit `masteryEligible: false` (z. B. `manual-rubric`) erzeugen **nie** Mastery — sie bleiben Bearbeitungsnachweise. Gleiches gilt für das Worked-Example-Studium.
- **Aufgaben-Level `masteryEligible: false`** (Diagnose-Muster, W1): Diagnoseaufgaben tragen das Feld direkt am Aufgabenobjekt; jeder Versuch wird mit `masteryEligible: false` persistiert, kann nie Mastery erzeugen, nie das Gate öffnen und erscheint nie in der Wiederholungsliste. Die Statuszeile zeigt ausdrücklich „zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis“. Gate-Evidenzaufgaben dürfen das Feld nicht tragen (Validator-/Testregel).
- **`single-choice` als Mastery-Nachweis** (R14, präzisiert): Choice-Fälle dürfen Mastery-Evidence liefern, wenn sie Diagnose oder Transfer verlangen statt bloßer Wiedererkennung — konkret: mindestens zwei plausible Distraktoren, die typische Fehlkonzepte adressieren, und `fullSolution`/`feedbackRules`, die erklären, warum jede Alternative falsch ist. Reine Auffrischungs- oder Wiedererkennungsfragen bleiben `masteryEligible: false` und tragen eine `fullSolution`-Notiz als Bearbeitungsnachweis. `manual-rubric` und `short-rationale` sind nie mastery-fähig.
- **Mastery ist zeitlich bedingt** (ADR-0008): gültig bis Woche+2 / +5 / +11 nach dem letzten qualifizierten Treffer (Expanding-Slots, konfigurierbar über `reviewParams` im settings-Store); nach Ablauf erscheint die Aufgabe in der Wiederholungsliste, ein qualifizierter Review-Treffer erneuert. Nach dem dritten Slot wiederholt der Default das 11-Wochen-Intervall. `postLadderPolicy: 'consolidate'` bleibt nur für Altimporte lesbar.
- Ein Woche-Gate öffnet nur, wenn alle seine Evidenzaufgaben nach genau dieser Policy **aktuell** erfüllt sind; Evidenzaufgaben mit `manual-rubric` können ein Gate nie öffnen.

Jedes Hilfeereignis (Beispiel, Hinweis, Teillösung, Lösung) wird als Versuch-Eintrag mit `event` und `hintsUsed` persistiert und in der Statuszeile der Aufgabe angezeigt.

## 6. Aufnahme-Checkliste

- [ ] Validator grün (`node tools/validate_content.mjs`) — prüft Katalog, Module, Lektionen und Familien
- [ ] Generator-Property-Tests grün (`node --test tests/…`)
- [ ] typische falsche Antworten geprüft (auch im Browser einmal wirklich falsch antworten)
- [ ] Quellenlinie + Lizenz eingetragen
- [ ] Seed dokumentiert, `testedSeedCount` wahrheitsgemäß
- [ ] öffnende Lösung nur nach Versuch sichtbar (UI-Test)
- [ ] bei neuen Typen: Pilotfall als Grader-Beweis
- [ ] bei Lektionen mit Lesepfad: `locatorPath` zeigt auf eine existierende Seite (Validator), Public-Build bleibt frei davon

## 7. Seed-Generator-Pattern und lokale Lesezugänge

**Generatoren** (`assets/js/core/foundations_generators.mjs` als Muster):

- Familiengeneratoren exportieren identisches `rng()`-Verhalten (mulberry32) — Browser und Node ziehen dieselben Instanzen.
- Signatur `genX(seed) -> { parameters, expected, prompt }`: `prompt` ist der **komplette deutsche Aufgabentext** als Plain Text mit Unicode-Mathematik (z. B. `log₂(64)`, `3^4`, `·`) — bewusst **ohne** `$...$`-KaTeX, damit der Prompt nach „Neue Zahlen“ ohne Math-Neurendering austauschbar ist.
- `expected` wird IMMER von einem exportierten Referenzsolver berechnet (`solveLinearEquation`, `logInt`, …), nie hardcodet; die Invarianten (ganzzahlig, handrechenbare Bereiche, kein Divisions-Normalfall, Log-Argument > 0 und echte Potenz der Basis) stehen als Docstring am Generator UND werden im Property-Test über ≥ 200 Seeds erzwungen.
- Antworten bleiben standardmäßig ganzzahlig; für Deep-Learning-/Metrik-Aufgaben sind toleranzbasierte Dezimalantworten erlaubt (Rundung auf 3 Stellen, dokumentierte `tolerancePolicy`, Referenzsolver rechnet den Sollwert) (`parseIntegerAnswer`), damit Eingabe-UI und Grader einheitlich bleiben; „kurze Dezimalbrüche“ sind als Bereich erlaubt, aber nicht nötig.
- Grader-Anbindung: `parameters.seedGenerator` in der Aufgabe; `expectedNumeric` nutzt Generator + aktuellen Seed (Fix-Instanzen mit `expectedAnswer.value` bleiben vorrangig). Tests: gleicher Seed = identischer Prompt, 20 Seeds je Generator gegen den echten Grader, plus Negativtest Seed-Drift zwischen JSON und Generator.

**Lokale Lesezugänge** (Konvention, private-build-only):

- Fremde Ressourcen werden ausschließlich über ihre öffentlichen `canonicalUrl`-Links referenziert. Private Volltexte, lokale Bibliothekspfade und lokale Overlays gehören nicht in dieses Repository.

## 8. Neuer public-first Content-Vertrag

### Visualisierungsblock

Ein Visualisierungsblock verweist auf eine typisierte JSON-Datei mit der Endung
`.viz.json` unter `content/lessons/`. Die Datei beschreibt eine lokale
JSXGraph-Szene mit Boundingbox, optionalen Slidern und mindestens einem Objekt.
Ausdrücke werden beim Content-Compile validiert; Slider-Namen sind die einzigen
freien Variablen. Der Block steht direkt nach dem Worked Example und verwendet
`type: "visualization"` sowie eine maschinenlesbare `blockId`.

- `content/catalog.json` deklariert Content-Wurzeln. Der Compiler entdeckt nur darunter, sortiert deterministisch und lehnt verwaiste Dateien ab. Membership steht im LearningModule, nicht in zentralen Dateilisten.
- Kompetenzen, Tracks und Milestones liegen unter `content/competencies/`, `content/tracks/` und `content/milestones/`. Ihre Objektformen stehen unter `schemas/`.
- `requires` bildet ausschließlich echte Voraussetzungen und muss azyklisch sein. `supports`, `related` und `usedBy` stehen getrennt unter `relations`.
- Neue Inhalte referenzieren maschinenlesbare Rechte aus `content/source-rights.json`. Ein Public-Recht benötigt Redistribution, kommerzielle Nutzung und Bearbeitung. Reine Links dürfen zusätzlich im Legacy-Quellenregister stehen.
- `node tools/compile_content.mjs` muss vor einem Release-Build bestehen. Der Build entfernt private Quellenobjekte und prüft öffentliche Quellenlinien. Jede private oder lokale Marker-Referenz lässt den Build scheitern.
- Kanonische Lektionen bestehen aus einer JSON-Datei unter `content/lessons/` und referenziertem Markdown. Der Compiler schaltet Raw-HTML aus. Der Browser rendert nur eine feste Element- und Attribut-Allowlist.
- Kanonische Aktivitäten liegen als Familienfälle unter `content/families/` und werden über Placements in LearningModules entdeckt. `solver-verified` ist erst nach einem Test mit Sollantwort und mindestens einem Gegenbeispiel zulässig.
- Ein Teil älterer Familien liegt noch JS-first unter `assets/js/core/*_families.mjs` und ist nur über das JS-Registry erreichbar. Diese Familien gelten als Migrationskandidaten; neue Familien werden ausschließlich public-first als JSON angelegt.
- `content/competency-family-coverage.json` ist generiert (`node tools/build_coverage_matrix.mjs`, Check: `npm run coverage:check`) und wird nicht von Hand gepflegt. Es bildet Familien-`competencyIds` auf Modul-Placements ab; die deklarierte Familienmenge einer Kompetenz darf die geplacede übersteigen, weil Cross-Kompetenz-Tagging als Evidenz mitzählt.
- `diagnosticCodes` in Explanations verwenden das Fehlertyp-Vokabular der Grader (`wrong-value`, `wrong-choice`, `wrong-order`, `wrong-output`, `swapped`, `unparsed`, `not-equivalent`, `off-by-one`, `invalid-input`, `grader-error`, dynamisch `trace-row-N`). Domänenspezifische Codes sind erlaubt, müssen aber im jeweiligen Explanation-Dokument begründet sein; wo ein Grader-Fehlertyp existiert, gewinnt er.
- Der Foundations-Vertragstest verlangt für jede Kompetenz ausreichend mastery-fähige Familienfälle gemäß `minimumDistinctDefinitions`.
- Lokale Projekte deklarieren Starterdateien und das exakte erlaubte Kommando. Der Compiler prüft Projektidentität, Pfade und Testdatei-Hashes. Projekt-Reports bleiben Selbstberichte ohne Mastery-Evidence.
