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

1. Generator in `assets/js/core/w05_generators.mjs` / `w01_generators.mjs` (Muster; wird pro Woche erweitert) — deterministischer Seed, keine Zufallsabbrüche.
2. **Invarianten dokumentieren und im Test erzwingen**: z. B. `genLinear2` — det ≠ 0, ganzzahlige Lösung in [-9,9], keine Division durch null; `genMatmulEntry` — |c_ij| ≤ 50 für Kopfrechnen.
3. Referenzsolver separat (`solveLinear2`, `solveLinearEquation`) und im Test gegen die Generator-Erwartung kreuzprüfen.
4. Eingabevalidator (`parseIntegerAnswer`, `parseIntegerPair`) — Validierung ist Feedback-Stufe 1, keine Exception im Grader.
5. Property-Tests in `tests/`: mindestens 200 Seeds je Generator; fehlgeschlagene Seeds werden als Regressionstest fixiert.
6. Grenzfalltests: vertauschte Paare, Vorzeichenfehler, leere/unsinnige Eingaben — typische Fehlertypen in `feedbackRules` abbilden.

### Unit-Schema (Lerneinheiten, ab W1)

Jede Unit in `curriculum.json` trägt zusätzlich:

- `unitExerciseIds` (optional): Übungsaufgaben-IDs, die zu dieser Unit gehören. Der Validator prüft Referenz-Existenz; die Unit-Seite (`#/unit/<unitId>`) rendert sie als Teaser.
- `sources[].locatorPath` (optional): maschinenlesbarer Lesezugang, relativer Pfad ab Plattform-Root, muss mit `library/` oder `library-private/` beginnen. `locator` bleibt Menschtext. **Validator**: Root-Build prüft `existsSync`; Public-Build lehnt das Feld grundsätzlich ab (Bibliothek ist private-build-only, `tools/build_public.mjs` strippt es).

Dazu in `content/sources.json` je Quelle optional `localPath` (representativer Einstiegspfad, dieselben Regeln wie `locatorPath`). Auflösung in der UI (Hilfsfunktion `sourceAccessLinks`): `locatorPath` gewinnt über `localPath` → Link „Lokal lesen“ (neuer Tab); sonst `canonicalUrl` → „Online öffnen“.

### Seed-Generatoren für Abrufaufgaben (Muster W1)

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
- **Mastery ist zeitlich bedingt** (ADR-0008): gültig bis Woche+2 / +5 / +11 nach dem letzten qualifizierten Treffer (Expanding-Slots, konfigurierbar über `reviewParams` im settings-Store); nach Ablauf erscheint die Aufgabe in der Wiederholungsliste, ein qualifizierter Review-Treffer erneuert. Nach dem dritten Slot wiederholt der Default das 11-Wochen-Intervall. `postLadderPolicy: 'consolidate'` bleibt nur für Altimporte lesbar.
- Ein Woche-Gate öffnet nur, wenn alle seine Evidenzaufgaben nach genau dieser Policy **aktuell** erfüllt sind; Evidenzaufgaben mit `manual-rubric` können ein Gate nie öffnen.

Jedes Hilfeereignis (Beispiel, Hinweis, Teillösung, Lösung) wird als Versuch-Eintrag mit `event` und `hintsUsed` persistiert und in der Statuszeile der Aufgabe angezeigt.

## 6. Kumulative Gate-Anteile (LM-R2, ab Woche 9)

`gate.cumulativeExerciseRefs` = Array von `{weekId, skillId}` mit optionalem `future: true` + `note`. Regeln:

- Referenzen zeigen auf **frühere** Wochen und wählen die Belegaufgabe über `skillIds` (erste aktive Aufgabe der Zielwoche mit dem Skill).
- Noch nicht ausgearbeitete Zielwochen müssen `future: true` tragen (der Validator lehnt unmarkierte Referenzen ab).
- Bei der Realisierung: **neue Seeds** je Rückgriff (Autoringregel der W6-Pipeline; begründet in `research/lernmethodik/requirements.md` LM-R2).
- `future`-Referenzen blockieren das Gate nicht (geplante Platzhalter).

## 7. Aufnahme-Checkliste

- [ ] Validator grün (`node tools/validate_content.mjs`) — läuft über ALLE `content/exercises/wNN.json`
- [ ] Generator-Property-Tests grün (`node --test tests/…`)
- [ ] typische falsche Antworten geprüft (auch im Browser einmal wirklich falsch antworten)
- [ ] Quellenlinie + Lizenz eingetragen
- [ ] Seed dokumentiert, `testedSeedCount` wahrheitsgemäß
- [ ] öffnende Lösung nur nach Versuch sichtbar (UI-Test)
- [ ] bei neuen Typen: Pilotaufgabe als Grader-Beweis (Muster w05-e14..e16)
- [ ] bei Units mit Lesepfad: `locatorPath` zeigt auf eine existierende Seite (Validator), Public-Build bleibt frei davon

## 8. Seed-Generator-Pattern und lokale Lesezugänge (W1-Muster)

**Generatoren** (`assets/js/core/w01_generators.mjs` als Muster):

- Eine Datei pro Woche; identisches `rng()` (mulberry32) wie `w05_generators.mjs` exportieren — Browser und Node ziehen dieselben Instanzen.
- Signatur `genX(seed) -> { parameters, expected, prompt }`: `prompt` ist der **komplette deutsche Aufgabentext** als Plain Text mit Unicode-Mathematik (z. B. `log₂(64)`, `3^4`, `·`) — bewusst **ohne** `$...$`-KaTeX, damit der Prompt nach „Neue Zahlen“ ohne Math-Neurendering austauschbar ist.
- `expected` wird IMMER von einem exportierten Referenzsolver berechnet (`solveLinearEquation`, `logInt`, …), nie hardcodet; die Invarianten (ganzzahlig, handrechenbare Bereiche, kein Divisions-Normalfall, Log-Argument > 0 und echte Potenz der Basis) stehen als Docstring am Generator UND werden im Property-Test über ≥ 200 Seeds erzwungen.
- Antworten bleiben standardmäßig ganzzahlig; für Deep-Learning-/Metrik-Aufgaben sind toleranzbasierte Dezimalantworten erlaubt (Rundung auf 3 Stellen, dokumentierte `tolerancePolicy`, Referenzsolver rechnet den Sollwert) (`parseIntegerAnswer`), damit Eingabe-UI und Grader einheitlich bleiben; „kurze Dezimalbrüche“ sind als Bereich erlaubt, aber nicht nötig.
- Grader-Anbindung: `parameters.seedGenerator` in der Aufgabe; `expectedNumeric` nutzt Generator + aktuellen Seed (Fix-Instanzen mit `expectedAnswer.value` bleiben vorrangig). Tests: gleicher Seed = identischer Prompt, 20 Seeds je Generator gegen den echten Grader, plus Negativtest Seed-Drift zwischen JSON und Generator.

**Lokale Lesezugänge** (Konvention, private-build-only):

- Die Plattform spiegelt die Staging-Bibliothek über zwei Symlinks: `ki-lernplattform/library -> ../research/ki-lernroadmap/library-staging/sources` und `ki-lernplattform/library-private -> ../research/ki-lernroadmap/library-staging/private-extracts`. **Symlinks nie verändern; Pfade nie im Public-Build** (`tools/build_public.mjs` strippt `localPath`/`locatorPath`, der Validator lehnt sie im Public-Modus ab, PRIVATE_MARKERS-Zeile nicht entfernen).
- `sources.json`: `localPath` = representativer Einstieg (z. B. Tutorial-Index). `curriculum.json`: `sources[].locatorPath` = konkrete Zielseite der Unit (Menschtext bleibt im `locator`).
- UI: „Lokal lesen“ öffnet die gespiegelte Seite in einem NEUEN TAB (`target="_blank" rel="noopener"`) — volle Lesewerkzeuge (Suchen, Zoom, eigene Styles der gespiegelten Seite); kein iframe, weil die gespiegelten Seiten eigene relative Assets mitbringen und im iframe brechen würden. Fallback „Online öffnen“ über `canonicalUrl`.
- In Code/Content niemals wörtliche `/library/`-Pfade notieren — URLs werden aus `localPath` konkateniert, sonst schlägt der Canary-Scan des Builds an.

## 9. Neuer public-first Content-Vertrag

- `content/catalog.json` deklariert Content-Wurzeln. Der Compiler entdeckt nur darunter, sortiert deterministisch und lehnt verwaiste Dateien ab. Membership steht im LearningModule, nicht in zentralen Dateilisten.
- Kompetenzen, Tracks und Milestones liegen unter `content/competencies/`, `content/tracks/` und `content/milestones/`. Ihre Objektformen stehen unter `schemas/`.
- `requires` bildet ausschließlich echte Voraussetzungen und muss azyklisch sein. `supports`, `related` und `usedBy` stehen getrennt unter `relations`.
- Neue Inhalte referenzieren maschinenlesbare Rechte aus `content/source-rights.json`. Ein Public-Recht benötigt Redistribution, kommerzielle Nutzung und Bearbeitung. Reine Links dürfen zusätzlich im Legacy-Quellenregister stehen.
- `content/curriculum.json` sowie `content/exercises/w01.json` und `w05.json` sind Legacy-Quellen. `tools/migrate_legacy_content.mjs` erzeugt ihr versioniertes Kompetenzmapping.
- Bei Legacy-W1 ist `expectedAnswer.generator` ein Seed-Generator. Bei Legacy-W5 bezeichnet dasselbe Feld einen Referenzsolver für eine feste Instanz. `legacy_exercise_adapter.mjs` hält diese Rollen als `generatorId` und `referenceSolverId` getrennt.
- `node tools/compile_content.mjs --profile public` muss vor einem Public-Build bestehen. Lokale Overlays sind nur mit `--profile local-private --overlay <datei>` zulässig und dürfen keine Basis-ID überschreiben.
- Der Public-Build entfernt private Quellenobjekte und Unit-Referenzen, neutralisiert nur intern nutzbare Quellenlinien und baut den Suchindex neu. Jede `*.local.json`-Datei lässt den Build scheitern.
- Kanonische Lektionen bestehen aus einer JSON-Datei unter `content/lessons/` und referenziertem Markdown. Der Compiler schaltet Raw-HTML aus. Der Browser rendert nur eine feste Element- und Attribut-Allowlist.
- Kanonische Aufgaben liegen einzeln unter `content/exercise-definitions/` und werden über die deklarierte Wurzel entdeckt. `solver-verified` ist erst nach einem Test mit Sollantwort und mindestens einem Gegenbeispiel zulässig. Neue Varianten gehören als Placement (Falltyp, Seed, Profil) in ein LearningModule, nicht als JSON-Kopie.
- Der Foundations-Vertragstest verlangt für jede Kompetenz mindestens so viele mastery-fähige Definitionen, wie `minimumDistinctDefinitions` vorgibt. Weitere Milestones übernehmen dieses Gate erst nach vollständigem Authoring.
- Lokale Projekte deklarieren Starterdateien und das exakte erlaubte Kommando. Der Compiler prüft Projektidentität, Pfade und Testdatei-Hashes. Projekt-Reports bleiben Selbstberichte ohne Mastery-Evidence.
