# Aufgaben-Autoring-Guide (KI-Lernplattform)

Stand: 2026-08-25 (erweitert um LM-R2/LM-R4/LM-R5-Felder). Gilt für alle Aufgaben, die in die Plattform aufgenommen werden.

## 1. Pflichtfelder je Aufgabe

`exerciseId`, `schemaVersion`, `skillIds`, `type`, `prompt`, `locale` (immer `de`), `grader`, `parameters`, `deterministicSeed`, `expectedAnswer` ODER `referenceSolver`, `hints`, `feedbackRules`, `fullSolution`, `difficulty` (1-5: 1 Basic, 2 Core, 3 Advanced, 4-5 Final Boss; die Coverage-Matrix mappt entsprechend), `estimatedMinutes`, `sourceLineage`, `license`, `validationStatus`, `testedSeedCount`. Der Validator (`tools/validate_content.mjs`) erzwingt sie und prüft den Typ gegen eine Whititelist: `numeric`, `single-choice`, `vector`, `algebraic-expression`, `python-code`, `short-rationale`, `parsons`, `code-trace`, `predict-output`.

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
Public-Build entfernt. Kuratierte Placements tragen ein `lessonId`, das zu
einer Lektion desselben Moduls gehören muss: Die Lektionsseite zeigt unter
„Passende Aufgaben" genau die kuratierten Placements ihrer Lektion in
Modulreihenfolge (erstes Placement = „Jetzt prüfen"-Button, bis zu vier
weitere als Karten) — es gibt keinen Kompetenz-Fallback. Der Validator
schlägt fehl, wenn eine Modullektion kein kuratiertes Placement hat.
Übungsraum-Placements (`role: "practice-space"`, ohne `caseId`) ziehen im
Modul nur aus den Fällen, die dasselbe Modul in dieser Familie kuratiert;
ohne solche Fälle bleibt der Zug über die ganze Familie.

Dazu in `content/sources.json` je Quelle eine öffentliche `canonicalUrl`. Die UI verlinkt diese Originalquelle in einem neuen Tab; lokale Lesepfade und private Volltextkopien gehören nicht zum Public-Profil.

### Seed-Generatoren für Familienfälle

- Prozedurale Familien (Registry, `authorityMode: 'seeded'`) generieren die Instanz zur Laufzeit aus `familyId` + `caseId` + Route-Seed + Schwierigkeit; der Grader wertet die Instanz, nicht den Seed.
- „Neue Zahlen“/Review-Instanzen kommen über den Route-Seed (`#/family/<familyId>/<caseId>/<seed>/<difficulty>`) — ein neuer Seed zieht eine neue Instanz, kein Runtime-Reseed.
- Die im JSON dokumentierten Exemplar-Cases sind Generator-Ausgaben zum Autor-Seed (Golden-Corpus pinnt Instanz-Digests über 64 Seeds — kein Seed-Drift).
- Historische Metadaten-Reste (`parameters.seedGenerator`, `expected.{generator,defaultSeed,defaultExpected,defaultChoice}`, `tolerancePolicy`) wurden entfernt — inerte Provenienz ohne Runtime-Funktion. `feedbackRules[].if` muss einen Schlüssel tragen, den der Grader des Falls auswertet (`value === N`, `choice ===/!== 'id'`, `order-length-mismatch`, `value:<var>(+value:<var>)*`, `element-count-mismatch`, `[!]selected.includes('id')`, `missing-diagnosis`/`invalid-input`, `gap-<i>(-<aspekt>)`) — unerreichbare Schlüssel scheitern an `assertFamilyActivityContracts`.
- Hinweise/Lösung beschreiben den Lösungsweg generisch (zahlenunabhängig), nie die konkrete Instanz.

### Auswahlfamilie aus einer Szenario-Bank

Single-Choice-Familien, deren Fälle aus einer Szenario-Bank gezogen werden, brauchen kein eigenes JS-Modul:

- Die Bank lebt in `content/banks/<familyId>.json` (Schema `schemas/capsule-bank.schema.json`) und trägt neben `capsules` die Top-Level-Felder `contract` (der volle Familienvertrag) und `shapeError` (Fehlertext bei ungültigen Generator-Parametern); `keyBy` ist nur nötig, wenn die Kapsel über `caseId` statt `difficulty` aufgelöst wird.
- Jede Kapsel hält `caseId`, das Profil (`difficulty` oder `keyBy: 'caseId'`) und `bank`: 12–16 Einträge mit `key`, `prompt`, `correct`, `wrong[]` (drei verschiedene Distraktoren) und `solution`; genau ein Eintrag trägt den Schlüssel aus dem Base-Case (`key: 'base'`).
- Der Base-Eintrag in `content/families/<familyId>.json` bleibt der wörtliche Anker: Prompt, Optionen und Lösung dort sind die Bank-Zeile `base` — die Tests vergleichen beide wörtlich.
- Registrierung ist ein JSON-Import plus Listeneintrag in `assets/js/core/choice_bank_families.mjs`; `makeChoiceFamily` baut daraus den Familien-Spec (Bank-Modus, ein `pick` pro Seed).
- Automatisch abgedeckt: `tests/kit_choice_families.test.mjs` (Bank-Orakel, Kapselform, Statistik, Registry-Grade) und der Golden-Korpus; familienspezifische Extras bleiben als eigene Testdatei möglich.

### Aussagen, Feedback und Fehlkonzepte

Distraktoren und Optionen können ihr Feedback als **Aussage-Objekt** mittragen statt als Regel im Anker:

- **Szenario-Banken**: `wrong[]` eines Bankeintrags darf `{text, feedback, misconception?}`-Objekte enthalten (Schema `$defs.statement`). Trägt ein gezogener Eintrag mindestens einen Distraktor mit `feedback`, emittiert der Generator `feedbackRules` — je Distraktor eine `choice === '<id>'`-Regel, auf die rotierte ID gebunden. Regel: **das Feedback des Base-Eintrags lebt im Anker** (`content/families/<id>.json`), nicht doppelt in der Bank.
- **`misconception`**: optionales Fehlkonzept-Label (kebab-case, z. B. `robustheit-mittelwert`) an Regeln und Bank-Aussagen. Jede `misconception`-Angabe muss eine `id` aus `typicalErrors` desselben Falls referenzieren — `typicalErrors`-Einträge tragen dafür `{id, text}`-Objekte. Der Grader reicht das Label im Ergebnis weiter (`misconception` bzw. `misconceptions`), wertet es aber nicht aus. **Ids sind eingefroren, sobald sie vergeben sind: den `text` frei korrigieren, die `id` nie umbenennen.** Ein Label darf über Distraktoren und Szenarien hinweg wiederverwendet werden.
- **Varianten mit eigenen Optionen**: überschreibt eine Variante `choices`, aber nicht `feedbackRules`, erbt sie **keine** Basisregeln (die zeigten auf die falschen Optionstexte). Eigene Regeln trägt die Variante unter `variants[].feedbackRules`; die Bindung läuft über den Optionstext, Paraphrasen ohne Textmatch verlieren die Regel ehrlich.
- **`statementPool`** für `multiple-choice`-Fälle: statt neuer Varianten ein Pool von Aussagen, aus dem jeder Seed ≠ 0 neu zieht —

  ```json
  "statementPool": {
    "count": 4,
    "correctRange": [2, 3],
    "hints": ["Jede Aussage einzeln prüfen."],
    "statements": [
      { "text": "…", "correct": true, "feedback": "Warum das stimmt." },
      { "text": "…", "correct": false, "feedback": "Warum nicht.", "misconception": "kebab-label" }
    ]
  }
  ```

  Seed 0 bleibt der authored Ankerfall; gezogene Instanzen tragen `parameters.statements` (Pool-Indizes in Anzeige-Reihenfolge) und `feedbackRules` in beiden Polarisierungen (`selected.includes` für falsche, `!selected.includes` für übersehene zutreffende Aussagen). `feedback` ist Pflicht — es begründet zugleich die Lösungszeile. Ein Fall trägt nie `variants` und `statementPool` zugleich; der Vertrag prüft Zählbarkeit, Eindeutigkeit der Texte und nicht-leeres Feedback.

## 4. Graderwahl

| Typ | Grader | Warum |
|---|---|---|
| Numerik ganzzahlig, Auswahl, Vektor/Matrix (int) | `deterministic` | exakt, schnell, offline sofort |
| `parsons` (Zeilen ordnen + Distraktoren) | `deterministic` | reine Reihenfolgeprüfung; Adaptivität ist Content-Sache (Muster: w05-e14) |
| `code-trace` (Variablenwerte nach n Schritten) | `deterministic` | ganzzahliger Vergleich je Variable; Tracing vor Schreiben (Muster: w05-e15) |
| `predict-output` (Ausgabe vorhersagen) | `deterministic` | whitespace-normalisierte Ausgabenormalisierung, exakte Werte (Muster: w05-e16) |
| Term-Vereinfachung, exakte Algebra | `deterministic` | Probe-Äquivalenz an 13 deterministischen Stützstellen (implizite Multiplikation und `**` werden normalisiert); niemals Stringgleichheit |
| Python/NumPy | `pyodide` | getrennte Tests, Zeitlimit, deterministischer Seed |
| Begründung, Kritik | `manual-rubric` | Rubric mit Pflichtbestandteilen; zählt nie als Mastery |

Schema der neuen Antwortformate (LM-R4):

- `parsons`: `parameters.fragments` = `[{id, text}]` (Lösungszeilen **und** Distraktoren), `parameters.initialOrder` = Permutation aller IDs (Startanzeige); `expectedAnswer` = `{kind: 'ordered-lines', solutionOrder: [id…], distractors: [id…]}`. UI: Auf/Ab-/Aussortieren-Knöpfe (Tastatur-bedienbar, kein DnD nötig).
- `code-trace`: `parameters.snippet` (Python-Code als String), `parameters.variables` = `[{name, value}]` (ganzzahlige Endwerte); `expectedAnswer` = `{kind: 'variable-values'}`.
- `predict-output`: `parameters.snippet`; `expectedAnswer` = `{kind: 'output-lines', output: '<print-Ausgabe>'}` (Python-Listennotation).

Schema der Aufgabentypen aus `plan-neue-aufgabentypen.md` (alle `deterministic`):

- `multiple-choice`: `choices` = `[{id, text}]` wie `single-choice`, aber `expectedAnswer` = `{kind: 'choice-indices', correctIds: [id…], scoring?}` — **kein** `correct`-Flag an den Choices, kein `correctChoice`. `scoring`: `'all-or-nothing'` (Default) oder `'per-correct'` (Treffer +1/n, Fehlgriff −1/n, Floor 0). Unbekannte IDs zählen als Fehlgriff. Mindestens zwei **verschiedene** `correctIds` — bei einer korrekten Option ist es `single-choice`. Optionale `feedbackRules` mit `if: "selected.includes('id')"` bzw. `"!selected.includes('id')"` liefern distraktorbezogenes Feedback.
- `diagnostic-rationale`: `parameters.snippet` (fehlerhafter Code/Daten), `expectedAnswer` = `{kind: 'diagnosis', diagnosisCode, mustContain: [kw…], mustNotContain?: [kw…], minWords}`. Keyword-Match ist umlaut-/case-robust mit **Wortgrenzen** („int" matcht nicht „print", „train" nicht „train_test_split"); `|` trennt Alternativen („except|ausnahmeblock"); `mustNotContain` vetoes Fehlkonzept-Formulierungen; eine Distinct-Word-Schwelle fängt Keyword-Salat ab. Feedback benennt nur die fehlende **Dimension**, nie die Schlüsselwörter — optionale `feedbackRules` mit `if: '<errorType>'` (z. B. `missing-diagnosis`, `invalid-input`) liefern fallbezogenes Feedback. `diagnosisCode` aus der Taxonomie (§8) — Metadaten für Erklär-Karten, kein Grading-Input.
- `worked-example-fading`: `prompt` mit `[[gap]]`-Markern (LaTeX-Kontext erlaubt), `expectedAnswer` = `{kind: 'gaps', gaps: [{answer, input: 'numeric'|'expression'}]}` — Markerzahl = `gaps.length` (Validator). `numeric` akzeptiert Dezimalkomma und Brüche; `expression` prüft Äquivalenz über Probe-Scopes (feste Tabelle + aus dem Aufgabenpaar abgeleitete Werte; implizite Multiplikation wie `2x` wird abgelehnt — Rechenzeichen explizit; im Gegensatz dazu normalisiert `algebraic-expression` sie vor dem Probe-Check; Target muss auf allen Scopes endlich sein). Falsche Lücken werden mit 1-basiertem Index im Feedback benannt — optionale `feedbackRules` mit `if: 'gap-<0-basierter Index>'` bzw. `'gap-<i>-<aspekt>'` liefern lückenbezogenes Feedback.

## 5. Feedback-Stufen und Mastery-Policy

Worked-Example-Stufe (neu, LM-R5) → Eingabevalidierung → richtig/falsch → diagnosebezogenes Feedback (`feedbackRules`) → Hinweis 1 → Hinweis 2 → Teillösung → volle Lösung **nach** eigenem Versuch (reveal markiert den Versuch als nicht-mastery-fähig). Nie die volle Lösung ungefragt im selben Blickfang wie die Aufgabe zeigen.

**Worked-Example mit Fading** (optionales Feld `workedExample`, Muster w05-e14): `title`, `steps[]` mit je `subgoalLabel` (Teilziel-Label) und `text`, optional `completion: {prompt, answer}` pro Step. Sequenz: Beispiel studieren → Completion-Ausschnitte selbst füllen (lokal geprüft) → volles Problem. Das Studium wird als Ereignis `event: 'studied'` persistiert: **sperrt nicht, qualifiziert nicht** — kein Mastery-Versuch.

Verbindliche, in der Aufgabenansicht sichtbare Policy (`exercise_runtime.js` + `review_scheduler.js`, abgeleitet aus ADR-0005/ADR-0008 und diesem Guide — keine stillen Schwellen):

- Korrekt **ohne** zuvor angezeigte Lösung und mit **höchstens einem Hinweis** → Mastery-Nachweis erfüllt.
- **Teillösung** zeigt den letzten Hinweis und zählt daher so, als wären alle Hinweise verbraucht (mindestens 2 Hinweise). Die aktuelle Instanz liefert keine Evidence.
- Eine **angezeigte Lösung** disqualifiziert nur dieselbe `instanceId`. Eine neue Seed-Instanz oder ein ausdrücklich gestarteter Zyklus kann frische Evidence liefern. „Aufgabe zurücksetzen“ bleibt die getrennte Aktion zum Löschen der Historie.
- Grader-Ausgänge mit `masteryEligible: false` (z. B. `manual-rubric`) erzeugen **nie** Mastery — sie bleiben Bearbeitungsnachweise. Gleiches gilt für das Worked-Example-Studium.
- **Aufgaben-Level `masteryEligible: false`** (Diagnose-Muster, W1): Diagnoseaufgaben tragen das Feld direkt am Aufgabenobjekt; jeder Versuch wird mit `masteryEligible: false` persistiert, kann nie Mastery erzeugen, nie das Gate öffnen und erscheint nie in der Wiederholungsliste. Die Statuszeile zeigt ausdrücklich „zählt als Bearbeitungsnachweis, nicht als Mastery-Nachweis“. Gate-Evidenzaufgaben dürfen das Feld nicht tragen (Validator-/Testregel).
- **`single-choice`/`multiple-choice` als Mastery-Nachweis** (R14, präzisiert): Choice-Fälle dürfen Mastery-Evidence liefern, wenn sie Diagnose oder Transfer verlangen statt bloßer Wiedererkennung — konkret: mindestens zwei plausible Distraktoren, die typische Fehlkonzepte adressieren, und `fullSolution`/`feedbackRules`, die erklären, warum jede Alternative falsch ist. Reine Auffrischungs- oder Wiedererkennungsfragen bleiben `masteryEligible: false` und tragen eine `fullSolution`-Notiz als Bearbeitungsnachweis. `manual-rubric`, `short-rationale` und `diagnostic-rationale` sind nie mastery-fähig (`diagnostic-rationale` erzwingt `masteryEligible: false` fail-closed auf Familien-, Case- und Placement-Ebene).
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
- Antworten bleiben standardmäßig ganzzahlig; für Deep-Learning-/Metrik-Aufgaben sind toleranzbasierte Dezimalantworten erlaubt (Rundung auf 3 Stellen, Referenzsolver rechnet den Sollwert) (`parseIntegerAnswer`), damit Eingabe-UI und Grader einheitlich bleiben; „kurze Dezimalbrüche“ sind als Bereich erlaubt, aber nicht nötig.
- Grader-Anbindung: die Registry instanziiert `generate({seed, caseId, difficulty})` und reicht `generated.expected` als `expectedAnswer` an den Grader; der Seed liegt am Placement/der Route. Tests: gleicher Seed = identischer Prompt, ≥200 Seeds je Generator gegen den echten Grader, plus Negativtest Seed-Drift zwischen JSON und Generator.

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
- `diagnosticCodes` in Explanations verwenden die kanonische Taxonomie unten. Domänenspezifische Codes sind erlaubt, müssen aber im jeweiligen Explanation-Dokument begründet sein; wo ein Grader-Fehlertyp existiert, gewinnt er.

#### `diagnosticCodes`-Taxonomie

Kanonisches Vokabular für `diagnosticCodes` in `content/explanations/`. Die
erste Gruppe sind `errorType`-Werte, die `assets/js/core/graders.js` real
emittiert; die zweite Gruppe sind Laufzeit-/UI-Codes; die dritte benannte
Fehlkonzept-Codes aus `feedbackRules`, die kein Grader-errorType abbildet.

| Code | Bedeutung | Wo verwendet |
|------|-----------|--------------|
| `invalid-input` | Eingabe leer, nicht parsebar oder formatwidrig | alle deterministischen Grader, `manual-rubric` |
| `wrong-value` | numerischer Wert falsch | `numeric`, `vector`, `code-trace` |
| `wrong-choice` | falsche Option gewählt | `single-choice` |
| `swapped` | Wertepaar in vertauschter Reihenfolge | `vector` (Paar-Grader) |
| `wrong-order` | Zeilenreihenfolge falsch (inkl. Distraktor/fehlende Zeile) | `parsons` |
| `wrong-output` | vorhergesagte Ausgabe falsch | `predict-output` |
| `unparsed` | algebraischer Term nicht parsebar | `algebraic-expression` (deterministic) |
| `not-equivalent` | Term parsebar, aber nicht äquivalent an den 13 Stützstellen | `algebraic-expression` (deterministic) |
| `grader-error` | Fehlkonfiguration/interner Fehler — nie ein Lernendenfehler | alle Grader |
| `missing-choice` | korrekte Option in Mehrfachauswahl nicht gewählt | `multiple-choice` |
| `extra-choice` | falsche Option in Mehrfachauswahl gewählt | `multiple-choice` |
| `missing-diagnosis` | Freitext-Diagnose zu knapp oder ohne die geforderte Ursache | `diagnostic-rationale` |
| `wrong-gap` | Lücke im Worked-Example-Fading falsch ausgefüllt (Gap-Index im Feedback) | `worked-example-fading` |
| `trace-row-N` | erste falsche Zeile der interaktiven Trace-Tabelle (dynamisch, N 1-basiert) | `src/ui/TraceTableView.tsx` |
| `runtime-unavailable` | Python-Laufzeit nicht ladbar (stalled init, Timeout, Paket-Fehler) — Infrastrukturproblem, nie ein Lernendenfehler | `python-code` via `gradePython` |
| Python-Laufzeit | `SyntaxError`, beliebige `<ExceptionName>` (z. B. `ValueError`), Fallback `PythonError`, `Timeout`, `WorkerRestarted`, `WorkerError`, `WorkerInitTimeout`, `WorkerInitFailed`, `ModuleLoadError`, `WorkdirError`, `WorkspaceError`, `PackageError` | `pyodide_worker.mjs`/`pyodide_runner.js` via `gradePython` |
| `off-by-one` | Index-/Grenzverschiebung um eins (Fehlkonzept) | feedbackRules in `optimize-decode-greedy-loop`, `reproduce-pipeline-status-report` (Varianten `*-off-by-one` in weiteren Familien); `x-off-by-one` |
| `except-pass` | `except: pass` verschluckt den Fehler statt ihn präzise zu behandeln | feedbackRule in `reproduce-pipeline-status-report`; `x-error-boundary` |
| `missing-before-hash` | Hash-/Commit-Artefakt ohne vorherigen Testbeleg | feedbackRule in `validate-rule-catalog-scan`; `x-git-workflow` |
- Der Foundations-Vertragstest verlangt für jede Kompetenz ausreichend mastery-fähige Familienfälle gemäß `minimumDistinctDefinitions`.
- Lokale Projekte deklarieren Starterdateien und das exakte erlaubte Kommando. Der Compiler prüft Projektidentität, Pfade und Testdatei-Hashes. Projekt-Reports bleiben Selbstberichte ohne Mastery-Evidence.

## 9. Lektionstexte: verständlich, anschaulich, ehrlich

Gilt für jedes Lektions-Markdown unter `content/lessons/`. Referenzlektion: `content/lessons/linear-algebra/matrices.md`. Zielgruppe: motivierte Erwachsene mit Schulmathematik bis etwa Klasse 10, ohne Studium. Alles darüber hinaus wird in der Lektion selbst erklärt.

### Aufbau einer Konzeptlektion

1. **Einstieg** (Text vor der ersten `##`-Überschrift, die UI zeigt ihn als hervorgehobenen Lead): zwei bis vier Sätze. Wo begegnet dir das Thema, besonders in KI, und welche Frage beantwortet die Lektion? Keine Definition, keine Display-Formel, keine Liste.
2. **Das Bild dahinter** (`## Das Bild dahinter: …`): genau eine tragende Analogie, früh eingeführt und im Beispiel wieder aufgegriffen. Die Zuordnung steht explizit da (Element der Analogie ↔ mathematisches Objekt). Ein Satz „Wo der Vergleich hinkt: …“ benennt die Grenze. Darf mit dem ersten Konzeptabschnitt verschmelzen, wenn die Analogie die Definition selbst trägt (Referenzlektion).
3. **Konzeptabschnitte**: ein neues Konzept pro Abschnitt, höchstens etwa 15 Zeilen. Konkretes Zahlenbeispiel vor der allgemeinen Formel.
4. **Durchgerechnetes Beispiel** mit fett gesetzten Teilziel-Labels pro Schritt.
5. **`## Wo dir das in der KI begegnet`**: konkreter Bezug zu ML oder LLMs, nachdem das Konzept steht. Nur belegbare Aussagen (siehe unten).
6. **`## Typische Fehler`**: jeder Fehler mit halbem Satz, warum er falsch ist oder woran du ihn erkennst.
7. Bestehende Abschluss-Abschnitte (`## Direkter Check`, `## Kurzer Abruf`, `## Projektstufe`) bleiben erhalten.
8. **`## Begriffe auf einen Blick`** ist der letzte Abschnitt des Lektions-Markdowns. Format je Zeile: `- **Begriff** (englisch *term*): Definition.` Die Klammer entfällt, wenn der Begriff keinen gebräuchlichen englischen Namen hat oder gleich lautet. Derselbe Begriff trägt in allen Lektionen dieselbe Definition (Test erzwingt das). Diese Einträge sind die Vorstufe eines späteren Lexikons.

Projekt- und Reflexionslektionen (`project-step`, `reflection`) folgen denselben Sprachregeln und tragen Einstieg, Analogie und Begriffsliste; Abschnitte 4 und 5 sind dort optional.

### Begriffe und Symbole

- Jeder Fachbegriff wird definiert, **bevor** er benutzt wird, und beim ersten Auftreten fett gesetzt. Keine Vorwärtsverweise wie „notiere die Shape“ vor der Erklärung von Shape.
- Deutsch zuerst, wenn ein gängiger deutscher Fachbegriff existiert; den englischen Namen einmal in Klammern nennen, danach nur noch eine Variante verwenden. Wo das Feld auch auf Deutsch den englischen Begriff nutzt, bleibt er englisch und wird auf Deutsch erklärt.
- Kanonische Wahl: Form (shape), Achse (axis), Eintrag (entry), Zeile/Spalte, Skalarprodukt (dot product), Matrixprodukt, elementweise Multiplikation, Dimensionsvertrag, Verlust (loss), Lernrate (learning rate), Merkmal (feature), Gewicht (weight), Ableitung (derivative), Gradient, Residuum, Überanpassung (overfitting), Zustand (state), Rückgabewert (return value). Englisch bleiben: Batch, Epoche, Broadcasting, Bias, Softmax, Attention, Query/Key/Value, Token, Embedding, Dropout, Commit, Branch, Diff, Merge.
- „Dimension“ ist doppeldeutig (Anzahl der Achsen oder Länge einer Achse). Die Lektion sagt jedes Mal, welche Bedeutung gemeint ist.
- Jedes Symbol über Klasse-10-Niveau wird beim ersten Auftreten in der Lektion in Worten vorgelesen und mit einem Mini-Beispiel ausgeschrieben, auch wenn eine frühere Lektion es schon erklärt hat. Betroffen sind unter anderem $\sum$, $\prod$, $\in$, $\mathbb{R}^{m\times n}$, $^\top$, $\partial$, $\nabla$, $\|w\|$, $\lceil\cdot\rceil$, $\lfloor\cdot\rfloor$, $\leftarrow$, $\hat{y}$, $\bar{y}$, $\log$, $e^x$, griechische Buchstaben und Doppelindizes wie $a_{ij}$.

### Analogien

- Die Analogie muss die Struktur erhalten: Was in ihr passiert, passiert auch mathematisch (Bestellmenge mal Preis summiert über Produkte = Skalarprodukt). Rein atmosphärische Vergleiche sind verboten.
- Alltagsnah und kurz: höchstens etwa acht Sätze, keine Geschichte mit Namen und Nebenhandlung, die vom Konzept ablenkt.
- Keine Analogie, die eine falsche Vorstellung erzeugt (Python-Variable als Kiste statt als Namensschild).
- Zahlen in der Analogie sind nachrechenbar und stimmen.

### Mathe-Satz und Typografie

- Display-Formeln (`$$…$$`) stehen als eigener Absatz nach einem vollständigen Satz, meist mit Doppelpunkt oder als Satzende. Ein Satz läuft nie über eine Display-Formel hinweg weiter; der Text danach beginnt einen neuen Satz (Test erzwingt das).
- Kurze Ausdrücke inline mit `$…$`. Funktionsnamen als Operator: `\log`, `\max`, `\operatorname{sign}`. Wörter in Formeln mit `\text{…}`.
- Dezimalkomma als `{,}`.
- Keine Gedankenstriche (— oder –) im Fließtext: Satz teilen oder Doppelpunkt/Komma verwenden. Bereiche als „0 bis 130“.
- Keine Kommaspleiße: Zwei vollständige Hauptsätze trennt ein Punkt, ein Doppelpunkt oder ein Semikolon, kein Komma („Die Gradienten schrumpfen. Dort sind beide null.“ statt „…, dort sind beide null.“).
- Fett nur für Begriffe an ihrer Definitionsstelle und für Teilziel-Labels.
- du-Form, aktiv, kurze Sätze, freundlich ohne Floskeln, kein Hype.

### Lexikon

- Das Lexikon (`#/glossary`) wird beim Content-Compile aus den Abschnitten „Begriffe auf einen Blick“ aller Lektionen erzeugt. Es gibt keine zweite Quelle: Wer einen Begriff ändert, ändert ihn in der Lektion, und gleichnamige Einträge müssen wortgleich sein.
- Die Begriffs-ID ist der Begriff in Kleinbuchstaben, Umlaute als ae/oe/ue/ss, alles andere als `-` (z. B. `Bias (Schicht)` → `bias-schicht`). IDs sind Linkziele; einen Begriff umzubenennen bricht Links.
- Verlinke in einer Lektion das erste Vorkommen eines Begriffs, den eine **andere** Lektion definiert und den diese Lektion nicht selbst in ihrer Begriffsliste führt: `[Skalarprodukte](#/glossary/skalarprodukt)`. Der Linktext darf gebeugt sein. Höchstens etwa acht solcher Links pro Lektion; nicht im Einstieg, nicht in Überschriften, Code, Formeln oder der Begriffsliste. In der Lektion öffnet der Link eine Kurzdefinition, ohne die Seite zu verlassen.

### Ehrlichkeit und Konsistenz

- „Wo dir das in der KI begegnet“ nennt nur nachprüfbare Fakten. Konkrete Modellzahlen nur, wenn sie öffentlich dokumentiert sind (z. B. GPT-2 small: 768 Zahlen pro Token, 12 Schichten, rund 124 Millionen Parameter). Im Zweifel qualitativ formulieren.
- Jede Fertigkeit, die eine kuratierte Aufgabe der Lektion verlangt, wird in der Lektion erklärt.
- Das durchgerechnete Beispiel löst nie eine verlinkte oder kuratierte Aufgabeninstanz vorweg.
- Links unter „Direkter Check“ behalten ihr Ziel; nur der Linktext darf sich ändern.
