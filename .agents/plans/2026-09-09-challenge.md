## Status (09.09.2026, Branch ui/redesign-neo-minimal)

Fassung v2 nach Review. Fassung v1 war nicht umsetzbar: drei tragende Löcher
(No-Repeat gegen Poolgröße, erfundene Schema-Felder, unterbestimmter Seed/Count/Verlauf).
Alle drei sind unten im Review-Protokoll belegt und in dieser Fassung repariert.

Erledigt in dieser Session: Research (10 freie Pools, 8 Wettbewerbs-Lizenzen),
Generator-Stufenplan, Foundation (Schema-Feld `challengeEligible`, Validator-Regel
`E_CHALLENGE_CONTRACT`, Bundle-Übernahme, Tests). Offen für die Umsetzungs-Session:
Rest von Phase 1 (Coverage-Check), Phase 2 bis 5. Handoff steht am Ende dieser Datei.

## Goal

Neue Sektion „Challenge": Täglich 3 bis 5 schwere, teils langkettige Probleme
(Mathematik zuerst, Coding später), lokal per Tages-Seed zugeteilt, gefiltert nach
angefangenen und abgeschlossenen Modulen, mit unendlichen Varianten je Problem.
Die Sektion hebt sich von normalen Übungen durch klar höhere Anforderungen ab.

## Success Criteria

- Route `#/challenge` mit Tages-Set (3 bis 5 Probleme), deterministisch pro
  Kalendertag (UTC, Namespace `challenge/v1`), ohne Account und ohne Netz.
- Nur Module im Pool, die der Nutzer angefangen oder abgeschlossen hat; leere
  Zustände erklärt, kein stilles Auffüllen mit Wiederholungen.
- Jedes Challenge-Problem hat unendliche geseedete Varianten, deterministisches
  Grading, Hinweise und Musterlösung.
- Keine Wiederholung derselben Problemform innerhalb des effektiven Fensters W.
  W ist das Minimum aus 30 und Poolgröße geteilt durch Tages-Count und wird in
  der UI angezeigt (zum Beispiel „Fenster 4 von 30 Tagen bei kleinem Pool").
- Pilot: 16 Challenge-Cases (2 Module mal 8) beweisen ehrlich 4 frische Tage bei
  4 pro Tag; danach Ausbauwellen.
- Validator, Content-Build, Node-Tests, Typecheck, E2E und Release-Build grün.

## Context And Current Facts

- 49 Modul-Dateien, 107 Familien-Dateien unter `content/` (gezählt 09.09.2026,
  Katalog `content/catalog.json`, gebaut per `tools/compile_content.mjs`).
  Kompiliertes Public-Bundle: 46 Kompetenzen, 46 Lektionen, 253 Aktivitäten.
- Familien liefern per `EXERCISE_FAMILIES.instantiate(familyId, seed, difficulty,
  caseId)` unendliche Varianten; Grading ist deterministisch
  (`assets/js/domain/family_registry.mjs`, `docs/authoring-guide.md` §3 bis §4).
- Cases kennen bereits ein `variants[]`-Feld für statische Instanzen; geseedete
  Generatoren brauchen zusätzlich Property-Tests mit mindestens 200 Seeds
  (`docs/authoring-guide.md` §3).
- Schwere auf Case-Ebene heißt `difficultyProfile` mit Enum `intro, core, stretch,
  challenge` (`schemas/exercise-family-cases.schema.json`). Die Stufen 1 bis 5 mit
  Final Boss aus `docs/authoring-guide.md` §1 gelten auf Exercise-Ebene, nicht am Case.
- Teilnahme am Challenge-Pool heißt `challengeEligible` (Boolean, optional,
  Default false) auf Case-Ebene, eingeführt als Foundation dieser Planung.
- Quellenregel bindend: Aufgaben eigenständig entwickeln, keine wörtlichen
  Übernahmen, Standard CC BY 4.0 (`docs/authoring-guide.md` §2).
- Mastery-Policy: höchstens 1 Hinweis, Lösung disqualifiziert die Instanz,
  Review-Slots Woche+2/+5/+11 (`docs/authoring-guide.md` §5, ADR-0008).
  Challenge verschärft das vorerst nicht.
- Fortschritt lokal: Attempts mit `definitionId` (`family:case`) und `occurredAt`,
  `openedLessons`, `evidenceStates` (`src/adapters/local-progress.ts`). Attempts
  tragen weder Seed noch Modul-ID; beides muss Phase 2 nachrüsten (Seed per
  Migration, Modul per Auflösung über `competencyIds`).
- Navigation: 5 primäre Einträge (Mobil-Balken), 2 sekundäre (nur Desktop-Sidebar)
  (`src/ui/App.tsx`).

## Constraints And Non-goals

- Lokal-first: Tages-Seed aus UTC-Datum plus Namespace, keine Telemetrie, keine
  Accounts. Tageswechsel um Mitternacht UTC, nicht lokale Mitternacht.
- Deterministische Grader bleiben maßgeblich; ein LLM ist nie Grader (Repo-Gesetz).
  Ein LLM darf nur offline als Autor-Beschleuniger Rohlinge liefern, die danach
  durch denselben deterministischen Verifier fallen oder bestehen.
- Keine wörtlichen Wettbewerbsaufgaben, auch nicht aus MIT-Quellen: Stil
  kalibrieren, Instanzen selbst schreiben. Jede Kalibrierung braucht eine
  `sourceLineage`-Konvention (`abgeleitet von` gegen `inspiriert von`), sonst
  fällt der fail-closed Public-Build.
- Nur Antworttypen mit eindeutiger Maschinenprüfung: `numeric`, `single-choice`,
  `vector`, `algebraic-expression` mit vendored SymPy-Äquivalenz. Freitext und
  `manual-rubric` sind nie Challenge-Antwort. Langkettige Aufgaben werden als
  Kette einzeln prüfbarer Teilantworten modelliert, nicht als ein Freitextbeweis.
- Coding-Challenges sind Phase 2, nicht Teil des Pilots (Pyodide-Grader mit
  Zeitlimit und Seeds existiert bereits, `docs/authoring-guide.md` §4).
- Keine sozialen Features (Bestenlisten, Vergleiche): nur lokale Streak-Anzeige.
- Mobil: Challenge startet als sekundärer Nav-Eintrag (Desktop-Sidebar), der
  5er-Balken bleibt unverändert. Streak-Logik muss ohne Mobil-Zugang konsistent
  bleiben.

## Key Decisions

1. Challenge ist ein Case-Flag, kein neues Content-System. Cases bekommen
   `challengeEligible: true` plus Teilnahme am Tages-Pool. Alles andere
   (Generator, Grader, Hints, Lösung, Validator, Kompilierung) wird
   wiederverwendet. Alternative eigenes Format verworfen: doppelte Pipeline
   ohne Mehrwert.
2. Schwere und Pool-Teilnahme sind getrennt. `difficultyProfile: challenge`
   heißt schwer, `challengeEligible: true` heißt im Tages-Pool. Validator-Regel:
   `challengeEligible` verlangt `difficultyProfile` challenge, `masteryEligible`
   true, vollständige Hints und Lösung, gesetzte `sourceLineage`.
3. Tages-Set ist eine reine, deterministische Funktion aus (Tages-Seed, Pool,
   Verlauf). Kein Server, kein Zufall pro Aufruf, testbar per gemockter Uhr.
   Seed aus UTC-Datum plus Namespace `challenge/v1`, Count deterministisch
   `3 + (seed mod 3)`, bei Pool kleiner 3 so viele wie vorhanden.
4. Pool ist aktive Module. Aktiv heißt: mindestens eine Lektion geöffnet oder
   ein Versuch im Modul; abgeschlossen heißt: alle Lektionen geöffnet. Die
   Abbildung Versuch zu Modul läuft über `competencyIds`, nicht aus Attempts.
5. No-Repeat läuft über das effektive Fenster W (Minimum aus 30 und Poolgröße
   durch Tages-Count), gemessen auf Case-Ebene per `definitionId`. Seeds
   rotieren frei. Bei Pool kleiner als Tages-Count zeigt die UI nur vorhandene
   Karten plus expliziten Leerzustand mit Aufforderung, ein weiteres Modul zu
   beginnen.
6. Schwerer heißt messbar schwerer. Challenge-Kriterien: mindestens 3
   Lösungsschritte, mindestens 2 Kompetenzen, `difficultyProfile` challenge,
   `estimatedMinutes` mindestens 15 auf Exercise-Ebene wo vorhanden, Mastery
   nach Standard-Policy (höchstens 1 Hinweis), Lösung disqualifiziert wie gehabt.
7. Versuche zählen. Challenge-Versuche landen im selben Ledger (`definitionId`,
   Seed, Zeitstempel), erscheinen in Reviews und Fortschritt. Kein
   Schatten-System. Das Seed-Feld braucht eine getestete IndexedDB-Migration.
8. Pilot klein, Wellen danach. 16 Cases in 2 Modulen beweisen Pipeline,
   Zuweisung und UI; Ausbau pro Track danach.

## Recommended Approach

Drei Schichten, alle auf Bestehendem:

- Content: Neue Challenge-Cases als normale Familien-Cases mit
  `challengeEligible`-Flag schreiben. Mathe-Archetypen mit
  Parametrisierungspotenzial: Ungleichungen mit Parametern, Zählprobleme mit `n`,
  lineare Algebra mit Dimensionen, Zahlentheorie mit Moduln, Analysis mit
  Funktionenfamilien. Jeder Case: Generator mit dokumentierten Invarianten,
  Referenzsolver, generische Hints, volle Lösung, Property-Tests.
- Engine: Reine Funktion `pickDailyChallenges({ daySeed, pool, history, count })`
  in `assets/js/domain/challenge_picker.mjs`. Pool aus aktiven Modulen bauen,
  Verlauf per `definitionId` plus Seed filtern (Fenster W), deterministisch
  mischen (geseedeter PRNG mit Tages-Seed), Count nach Regel aus Entscheidung 3.
  Beginn der Funktion steht als Skizze im Review-Protokoll.
- UI: Neue `ChallengeView` plus `challenge`-Route und sekundärer Nav-Eintrag.
  Tages-Karten öffnen den bestehenden Attempt-Flow (`FamilyExerciseView`)
  unverändert. Dazu Streak-Zähler (lokal, aus Attempt-Daten pro Tag),
  Leerzustände (kein aktives Modul, Pool kleiner als Count) und Filteranzeige
  inklusive Fenster W.

## Work Plan

### Phase 0: Research-Spike (erledigt 09.09.2026)

- MATH-Stufen 4 bis 5 und 9 weitere freie Pools gesichtet, 8
  Wettbewerbs-Lizenzen geklärt, siehe Ressourcen unten.
- Offen: Challenge-Rubrik mit 3 exemplarischen Case-Spezifikationen (Algebra,
  Kombinatorik, lineare Algebra) in `docs/` zur Review. Ohne Abnahme kein Content.

### Phase 1: Content-Vertrag (Foundation erledigt, Rest 1 bis 2 Tage)

- Erledigt: `challengeEligible` im Case-Schema, Validator-Regel
  `E_CHALLENGE_CONTRACT`, Übernahme ins Bundle, Tests
  (`tests/challenge_contract.test.mjs`).
- Offen: Coverage-Check kennt Challenge-Cases.
- Validierung: `node tools/validate_content.mjs`, `node tools/compile_content.mjs`,
  `node --test tests/`.

### Phase 2: Tages-Engine (3 bis 4 Tage)

- `assets/js/domain/challenge_picker.mjs`: `activeModuleIds(progress)`,
  `daySeedUTC(date, namespace)`, `dailyCount(daySeed, poolSize)`,
  `effectiveWindow(poolSize, count)`, `pickDailyChallenges(...)`.
- Verlauf um Seed-Feld erweitern (Adapter plus getestete Migration),
  Modulfilter über `competencyIds` auflösen, Namespace bei
  Content-Versionwechsel erhöhen (`challenge/v2`).
- Node-Tests: Determinismus (gleicher Tag, gleiches Set), Count-Regel,
  Verteilung (jedes Pool-Modul kommt vor), No-Repeat innerhalb W, Grenzfälle
  (leerer Pool, Pool kleiner als Count mit Shortfall-Meldung statt
  Auffüllung).
- Validierung: `node --test tests/` mit neuem `tests/challenge_picker.test.mjs`.

### Phase 3: UI (3 bis 5 Tage)

- `src/ui/ChallengeView.tsx`, Route in `src/ui/App.tsx`, sekundärer Nav-Eintrag
  mit Icon.
- Tages-Karten mit Schwierigkeits- und Modul-Label, Fenster-Anzeige W,
  Streak aus lokalen Attempt-Daten, Leerzustände.
- Attempt-Flow wiederverwenden, keine Duplikate von Grading- oder Review-Logik.
- Validierung: `npm run typecheck`, neue E2E-Specs (Tages-Set rendert,
  deterministisch per gemockter Uhr, Klick führt in bestehenden Flow),
  Screenshots Desktop und Mobil.

### Phase 4: Pilot-Content (1 bis 2 Wochen)

- 16 Challenge-Cases in 2 Kern-Modulen nach Rubrik, je mit Generator,
  Referenzsolver, Hints, Lösung, Property-Tests (mindestens 200 Seeds) und
  fixierten Regressions-Seeds. `expected` immer vom exportierten Referenzsolver
  berechnen, nie hardcoden.
- Review-Gate: Zwei-Augen-Prinzip (Text-Eindeutigkeit, Hand-Lösungsweg an zwei
  Seeds, generische Hints). Freigabe nur wenn Validator, Compiler,
  Property-Tests und Grader-Gegenprobe grün sind.
- Validierung: `node tools/validate_content.mjs`, `node --test tests/`,
  Grader-Gegenprobe Solver gegen Generator.

### Phase 5: Release und Wellenplan (laufend)

- `npm run build:release`, Leak-Test, E2E gegen Build (`npm run test:e2e:build`).
- Ausbauwellen pro Track; Zählung siehe Bedarfsrechnung unten.
- Danach Phase 2 (Coding): gleiche Engine und UI, neue Task-Familien für den
  vorhandenen Pyodide-Grader.

## Bedarfsrechnung

Formel: Cmin = F mal N. F ist das No-Repeat-Fenster in Tagen, N der
Tages-Count, Cmin die Mindest-Cases im persönlichen Pool. Bei M aktiven
Modulen und k Cases je Modul gilt M mal k größer gleich Cmin, also k größer
gleich Cmin geteilt durch M.

Bei F gleich 30: 3 pro Tag braucht 90 Cases, 4 pro Tag 120, 5 pro Tag 150.

| Module aktiv | Cases bei 8/Modul | Tage frisch bei 4/Tag | Effektives W |
|---|---|---|---|
| 2 | 16 | 4 | 4 |
| 4 | 32 | 8 | 8 |
| 8 | 64 | 16 | 16 |
| alle 49 | ~400 | ~100 | 30 |

Der Pilot mit 16 Cases beweist ehrlich 4 Tage, kein 30-Tage-Fenster. Für echte
30 Tage bei 2 aktiven Modulen wären 45 bis 75 Cases je Modul nötig, nicht 8
bis 12. Vollausbau (~400 Cases) trägt rund 100 Tage, aber nur für Nutzer mit
allen 49 Modulen aktiv. Empfehlung: Pilot mit 16 Cases starten, dann
wellenweise auf 8 je Kern-Modul, Rest nach Nutzung. Autorenaufwand pro Case
grob 0,5 bis 1 Tag (Generator, Solver, Hints, Lösung, Tests).

## Ressourcen: frei nutzbare Aufgabenpools

Hausregel für alle Quellen: keine wörtlichen Übernahmen, eigene deutsche
Formulierungen, Content unter CC BY 4.0. Stand September 2026, alle Lizenzen
mit Beleg geprüft.

- MATH: 12.500 englische Wettbewerbsaufgaben in 7 Gebieten, Stufen 1 bis 5,
  mit schrittweisen Lösungen, JSON. MIT, Beleg
  https://raw.githubusercontent.com/hendrycks/math/main/LICENSE.
  Repos: https://github.com/hendrycks/math und
  https://huggingface.co/datasets/hendrycks/competition_math.
  Erste Wahl zur Stil- und Schwierigkeitskalibrierung des Pilots (Stufen 4
  bis 5 sind Challenge-Niveau), Instanzen neu schreiben.
- GSM8K: 8.500 englische Grundschul-Textaufgaben (7.473 Train, 1.319 Test),
  JSONL mit Lösungsweg. MIT, Beleg LICENSE im Repo und Lizenzfeld auf
  Hugging Face. https://github.com/openai/grade-school-math und
  https://huggingface.co/datasets/openai/gsm8k. Stilvorbild für Textaufgaben
  und Lösungsweg-Format, für Challenge-Niveau zu leicht.
- SVAMP: 1.000 englische Textaufgaben als systematische Variationen bekannter
  Typen, JSON. MIT, Beleg
  https://raw.githubusercontent.com/arkilpatel/SVAMP/main/LICENSE.
  https://github.com/arkilpatel/SVAMP. Methodisch wertvoll: das
  Variationsprinzip entspricht dem geseedeten Generatorprinzip.
- MathQA: 37.200 englische Multiple-Choice-Aufgaben auf GRE- und GMAT-Niveau
  mit annotierten Operationsprogrammen, JSON. Apache-2.0, Beleg Lizenzfeld
  auf Hugging Face. https://github.com/math-qa/math-QA und
  https://huggingface.co/datasets/allenai/math_qa. Interessant als Vorlage,
  weil Operationsprogramme dem Referenzsolver-Konzept entsprechen.
- miniF2F: 488 englische Olympiade-Probleme aus IMO, AIME und AMC, formal in
  Lean, Metamath und Isabelle plus informelle Fassungen. MIT für Metamath,
  Apache für Lean, Beleg README und Paper arXiv 2109.00110.
  https://github.com/openai/miniF2F. Beste Kalibrierung für die oberste
  Stufe, erfordert Übersetzung vom formalen ins schulnahe Format.
- Orca-Math: circa 200.000 synthetische englische Grundschul-Textaufgaben,
  Parquet. MIT, Beleg Lizenzfeld auf Hugging Face.
  https://huggingface.co/datasets/microsoft/orca-math-word-problems-200k.
  Volumenquelle für leichte Varianten, für schwere ungeeignet.
- MetaMathQA: 395.000 englische Aufgaben (240.000 aus GSM8K plus 155.000 aus
  MATH augmentiert), JSON. MIT, Beleg Lizenzfeld auf Hugging Face.
  https://github.com/meta-math/MetaMath und
  https://huggingface.co/datasets/meta-math/MetaMathQA. Methodenvorbild, wie
  man aus wenigen Stammaufgaben viele Varianten erzeugt.
- OpenMathInstruct-2: 14 Millionen Paare bei circa 600.000 eindeutigen Fragen
  aus GSM8K- und MATH-Trainingsdaten, Parquet. CC-BY-4.0, Beleg Lizenzfeld
  und Paper arXiv 2410.01560.
  https://huggingface.co/datasets/nvidia/OpenMathInstruct-2. Größte
  CC-BY-kompatible Quelle, direkt passend zur Hausregel, idealer
  Ideensteinbruch für Ausbauwellen. (Version 1 steht unter eigener
  NVIDIA-Lizenz, nur Version 2 nutzen.)
- DeepMind Mathematics: Generator-Code für Schulmathematik plus 2 Millionen
  Frage-Antwort-Paare pro Modul in leicht, mittel und schwer, generativ per
  Python. Apache-2.0, Beleg LICENSE im Repo.
  https://github.com/google-deepmind/mathematics_dataset. Bestes
  Architekturvorbild für unendliche geseedete Varianten mit dokumentierten
  Invarianten.
- Lila: über 100.000 Aufgaben aus 20 Quelldatensätzen in 23 Tasks, jede mit
  Programm, Lösungsweg, Antwort und Kategorie-Tags, JSON. CC-BY-4.0, Beleg
  LICENSE.txt im Repo und Lizenzfeld.
  https://github.com/allenai/Lila und
  https://huggingface.co/datasets/allenai/lila. Ausgezeichnetes
  Formatvorbild: Aufgabe plus Programm plus Lösungsweg entspricht dem
  Challenge-Case-Vertrag.

Ausgeschlossen: ASDiv (CC BY-NC 4.0, Klausel verletzt die Vorgabe,
https://github.com/chaochun/nlu-asdiv-dataset) und NumGLUE (ODC-By 1.0,
https://github.com/allenai/numglue). Beide höchstens als Stilreferenz lesen,
nie als Materialbasis.

Empfehlung für den Piloten: MATH Stufen 4 bis 5 zur Kalibrierung, DeepMind
Mathematics als Generator-Vorbild, OpenMathInstruct-2 als CC-BY-Volumenquelle,
Lila als Formatvorbild, miniF2F als Referenz für die oberste Stufe.

## Ressourcen: Lizenzlage Wettbewerbsaufgaben

Keine Rechtsberatung. Repo-Regel bleibt maßgeblich: eigenständig entwickeln,
keine wörtlichen Übernahmen, Content CC BY 4.0.

- Mathematik-Olympiade Deutschland: VERBOTEN für Fork, GRAUZONE für
  Varianten. Jedes Blatt © Aufgabenausschuss, keine offene Lizenz,
  Veranstalter müssen Aufgaben nach Runde 1 löschen. Nur freie
  Nachschöpfung: Idee aufgreifen, Text, Zahlen, Figuren und Lösungsweg
  vollständig neu. Keine enge Anlehnung an aktuelle Jahrgänge.
- Bundeswettbewerb Mathematik: VERBOTEN für Fork, GRAUZONE für Varianten.
  Keine offene Lizenz, kommerzielle Verwertung (Springer-Buch mit allen 404
  Aufgaben seit 1970), implizit alle Rechte vorbehalten. Besonders riskant
  wegen Verlag, nur Stil und Niveau zur Kalibrierung.
- Känguru (DE und international): VERBOTEN für Fork, ERLAUBT für eigene
  Multiple-Choice-Formen im eigenen Wortlaut. Keine offene Lizenz, aber das
  Format (5 Optionen, Punkte-Staffel) ist nicht schutzfähig. Für Challenge
  ohnehin zu leicht.
- IMO und IMO Shortlist: VERBOTEN für wörtliche Übernahme, GRAUZONE für
  Varianten. Copyright IMO, Shortlist bis nach der folgenden IMO vertraulich,
  keine offene Lizenz. Neue Shortlists gar nicht anfassen, alte nur als
  Niveau-Vorbild, Idee abstrahieren, keine Jahrgangsangabe als Quelle.
- UKMT (britisch): EINZELDISKUSSION ERLAUBT, SYSTEMATISCHER NACHBAU
  VERBOTEN. Offizielles Dokument Use of UKMT Material (April 2024): Diskussion
  einer einzelnen Frage samt Lösung nach Fair-use-Grundsätzen erlaubt,
  systematische Analyse mehrerer Fragen ohne Erlaubnis verboten. Klarste und
  großzügigste Regelung im Feld.
- AMC und AIME (MAA): VERBOTEN ohne Erlaubnis, eng begrenzte
  Bildungsausnahme (nur Papierkopien einzelner Aufgaben nach der
  Wettbewerbsperiode). Keine tragfähige Ausnahme für eine öffentliche
  Lernplattform. Nur eigene Varianten im AMC-Stil.
- AoPS-Community: VERBOTEN für Fork. Inhalte nur zu Informationszwecken,
  Nutzerinhalte bleiben Autor-Eigentum, nachgewiesene DMCA-Praxis (Fall
  hendrycks/competition_math). Nur Recherche-Ort für Themen.
- Project Euler: ERLAUBT unter CC BY-NC-SA 4.0, aber NICHT kompatibel mit
  CC BY 4.0 (NonCommercial und ShareAlike). Einzige Quelle mit echter
  offener Lizenz und ausdrücklicher Adaptions-Erlaubnis für
  nicht-kommerzielle Zwecke. Wegen Inkompatibilität nur Stilvorbild und
  Ideengeber, nichts wörtlich übernehmen. Wertvollster Referenzstil für
  spätere Coding-Challenges.

Empfehlung als Vorbild für eigene Varianten: erstens Project Euler (einzige
Adaptions-Erlaubnis, parametrisierbare Probleme), zweitens UKMT (klarste
Regel, gut neu fassbar), drittens alte IMO Shortlists (Niveau-Anker 4 bis
5). Größtes Risiko: Bundeswettbewerb (Verlag), MAA (aggressive
Rechtewahrung), AoPS (DMCA-Praxis).

## Generator-Stufenplan (minimal)

Template-plus-Parameter ist der einzige produktive Pfad: Autor schreibt einen
parametrisierten Generator `genX(seed)` für Parameters, Expected und Prompt,
plus getrennten Referenzsolver `solveX(parameters)`. Aufwand circa 0,5 bis 1
Tag pro Case. LLM-Entwurf nur als offline Einmalhilfe vor dem Review, nie zur
Laufzeit, nie als Grader.

Korrektheitsschließung mit wenig Code:

1. Falsche Musterlösung (hardcodetes Expected, gemeinsamer Fehler
   Solver-plus-Generator): Expected immer vom exportierten Referenzsolver
   berechnen, nie hardcoden. Kreuzprobe Generator gegen unabhängig
   implementierten Solver über mindestens 200 Seeds. Fixierte
   Regressions-Seeds für jeden gefundenen Fehler.
2. Mehrdeutige oder unlösbare Aufgabe (entartete Parameter, mehrere gültige
   Antworten): jeder Generator dokumentiert Invarianten im Docstring,
   Property-Test erzwingt sie über alle Seeds (zum Beispiel Determinante
   ungleich 0, Lösung ganzzahlig in [-9,9], Log-Argument echte Potenz der
   Basis). Nur Antworttypen aus der Whitelist in den Constraints.
3. Grader-Lücken (Stringvergleich statt Äquivalenz, falsche Toleranz,
   Seed-Drift): Typ-Whitelist im Validator, Algebra nur über exakte
   Äquivalenz, Numerik ganzzahlig oder mit dokumentierter `tolerancePolicy`
   und gerundetem Solver-Wert, Eingabeparser als Feedback-Stufe 1 ohne
   Exceptions im Grader. Seed-Drift-Test: JSON-Prompt muss identisch zur
   Generator-Ausgabe beim Default-Seed sein. Negativtests mit vertauschten
   Paaren, Vorzeichenfehlern, leeren und unsinnigen Eingaben.

Review-Gate: Zwei Augen vor Aufnahme (Text-Eindeutigkeit, Hand-Lösungsweg an
zwei Seeds, generische Hints). Freigabe nur wenn Validator, Compiler,
Property-Tests und Grader-Gegenprobe grün sind. Danach einzelne fehlerhafte
Cases per `releaseStatus` aus dem Pool nehmen, ohne Rollback des Systems.

## Review-Protokoll (Fassung v1, 09.09.2026)

Der Reviewer prüfte gegen AGENTS.md, beide Family-Schemas,
`family_registry.mjs` und `local-progress.ts`. Ergebnis: v1 nicht umsetzbar.
Alle Fakten wurden in dieser Session am Code verifiziert (Schema-Zeilen,
Registry, Bundle-Pfad, Attempt-Felder).

Loch 1, No-Repeat gegen Poolgröße: Kriterium 30 Tage No-Repeat auf Case-Ebene
ist mit 16 Pilot-Cases und Modulfilter mathematisch unerfüllbar. Die
Auffüllregel (älteste Wiederholung zuerst) wäre ab Tag 5 Normalfall und bricht
Kriterium 4 direkt. v1 listet das als Risiko und erklärt das Kriterium zugleich
für erfüllt. Das war ein Widerspruch, kein Risiko.
Repariert in v2: effektives Fenster W, ehrlicher Pilot mit 4 Tagen,
Shortfall statt stiller Auffüllung. Skizze:

```js
export function effectiveWindow(poolSize, count, maxWindow = 30) {
  if (poolSize <= 0 || count <= 0) return 0;
  return Math.min(maxWindow, Math.floor(poolSize / count));
}
```

Loch 2, erfundene Schema-Felder: v1 spricht von `difficulty` 1 bis 5,
`estimatedMinutes` mindestens 15, `challenge`-Boolean am Case und
`content-bundle.json` mit 49 Modulen und 107 Familien. Real: Case-Schema
verlangt `caseId`, `difficultyProfile` (Enum), `masteryEligible`,
`sourceLineage`; `difficultyProfile: challenge` existiert bereits als
Schweregrad; `content/bundle.json` gibt es nicht; `estimatedMinutes` und
die 0-Hinweis-Mastery haben keine Entsprechung im Schema und in ADR-0008.
Repariert in v2: `challengeEligible` statt `challenge`-Boolean, Trennung von
Schwere und Pool-Teilnahme, Mastery bleibt Standard, Zahlen aus
`content/catalog.json` plus Verzeichniszählung. Schema-Ausschnitt:

```json
"challengeEligible": { "type": "boolean", "default": false }
```

Loch 3, Seed, Count und Verlauf unterbestimmt: v1 leitet den Seed aus lokalem
Datum ohne Zeitzonen-Regel ab, lässt Count 3 bis 5 ungeregelt, behauptet einen
Ledger aus `definitionId` plus Seed (Attempts haben kein Seed-Feld) und einen
Modulfilter aus Attempts (Attempts tragen keine Modul-ID). Versionierung fehlt.
Repariert in v2: UTC-Seed mit Namespace, deterministischer Count, Seed-Feld
per Migration, Modulauflösung über `competencyIds`, Namespace-Erhöhung bei
Content-Wechsel. Skizze:

```js
export function daySeedUTC(date = new Date(), namespace = 'challenge/v1') {
  const day = date.toISOString().slice(0, 10);
  let h = 2166136261;
  const s = `${namespace}:${day}`;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export function dailyCount(daySeed, poolSize) {
  if (poolSize < 3) return poolSize;
  return 3 + (daySeed % 3);
}
```

Zusatzbefunde, in v2 eingearbeitet: `sourceLineage`-Konvention
(abgeleitet/inspiriert) für den fail-closed Public-Build, Mobil-Nutzer ohne
Challenge-Zugang brauchen konsistente Streak-Logik, `docs/`-Exemplare in den
Leak-Test einplanen.

## Validation Plan

- Pro Phase die oben genannten Kommandos; zusätzlich immer `npm run typecheck`.
- E2E: Tages-Determinismus (Playwright-Clock auf zwei Daten setzen, Sets
  vergleichen), No-Repeat über gemockte Historie, Modulfilter (nur aktive
  Module), Fenster-Anzeige W bei kleinem Pool.
- Manuell: Tageswechsel um Mitternacht UTC (Set wechselt, Streak zählt),
  Leerzustände, Mobil-Layout.
- Höchstrisiko-Check: Grader-Gegenprobe bei Pilot-Cases (Solver gegen
  Generator über 200+ Seeds). Falsche Erwartungswerte würden echte Nutzer
  blockieren.

## Risks / Rollback

- Autoren-Tempo bei harten Problemen: Gegenmaßnahme Pilot klein,
  Archetyp-Schablonen, Wellenplan.
- Falsche Grader-Erwartung bei komplexen Cases: Gegenmaßnahme Kreuzprobe
  Solver/Generator plus fixierte Regressions-Seeds; Rollback einzelne Cases
  per `releaseStatus` aus dem Pool nehmen.
- Pool zu klein bei wenigen aktiven Modulen: Gegenmaßnahme expliziter
  Leerzustand plus Aufforderung, weiteres Modul zu beginnen. Keine stille
  Auffüllung.
- Scope-Kriech in Richtung Coding: Phasentor, erst nach Pilot-Release.
- Kompatibilität: additives Schema (`challengeEligible` optional, Default
  false), alte Snapshots lesbar. Einzige Migration: Seed-Feld in Attempts
  (Phase 2, getestet).
- Lizenz-Drift bei Kalibrierung: `sourceLineage`-Konvention plus
  Quellen-Check im Content-Build lassen private Marker scheitern.

## Open Questions

Keine offenen Fragen, die den Start blockieren. Annahmen (alle reversibel):
Mathe-Pilot zuerst, Coding danach; Fenster-Maximum 30; Mastery nach
Standard-Policy; sekundärer Nav-Eintrag (Mobil vorerst ohne Challenge);
UTC-Mitternacht als Tagesgrenze.

## Handoff an die Umsetzungs-Session

Stand: Planung v2 fertig und reviewt, Foundation liegt (Schema,
Validator-Regel, Bundle-Feld, Tests). Die UI-Session (Noa, selber Branch)
macht parallel UI-Work; Abstimmung bei `src/ui/App.tsx` (Nav-Eintrag) und
`content/` nötig, um Konflikte zu vermeiden.

Kopierbarer Prompt für die andere Session:

```text
Du übernimmst die Challenge-Sektion im Repo argmin, Branch
ui/redesign-neo-minimal. Lies zuerst AGENTS.md und den Plan
.agents/plans/2026-09-09-challenge.md (Fassung v2, inklusive
Review-Protokoll und Handoff).

Stand: Phase 0 Research ist erledigt (Ressourcen im Plan), die Foundation
aus Phase 1 liegt: `challengeEligible` im Case-Schema
(schemas/exercise-family-cases.schema.json), Validator-Regel
E_CHALLENGE_CONTRACT in tools/compile_content.mjs, Feld-Übernahme ins
Bundle (buildSplitArtifacts), Tests in tests/challenge_contract.test.mjs.

Dein Auftrag in dieser Reihenfolge:
1. Phase 0 Rest: Challenge-Rubrik mit 3 exemplarischen Case-Spezifikationen
   (Algebra, Kombinatorik, lineare Algebra) in docs/ schreiben und von Noa
   abnehmen lassen. Ohne Abnahme kein Content.
2. Phase 1 Rest: Coverage-Check kennt Challenge-Cases. Validierung:
   node tools/validate_content.mjs, node tools/compile_content.mjs,
   node --test tests/, npm run typecheck.
3. Phase 2: Tages-Engine nach Plan (challenge_picker.mjs, Seed-Migration mit
   Test, Modulauflösung über competencyIds). Erst danach Phase 3 und 4.
   Halte dich an die Code-Skizzen im Review-Protokoll und an
   shrink-complexity: kein neues Content-System, kein neuer Grader, kein
   Laufzeit-LLM.

Original-Anweisung von Noa als Kontext: „arbeite den plan weiter aus,
sammel mehr ressourcen, auch mit oder cc die man nutzen kann und daraus
forken kann und mehr material generieren kann. Einen Plan ausdenken wie du
die Wettbewerbsaufgaben generieren kannst, natürlich alles richtig ist, wie
man die risiken umgehen kann, vielleicht einen reviewer der den jetzigen
plan kritisch entgegengeht und dir vorschläge gibt, versuche diesen plan
komplett auseinanderzunehmen. geh davon aus, dass zum beispiel du das alles
in so wenig code wie möglich generieren musst. shrink complexity verstehst
du sowieso."

Bei jeder Abweichung vom Plan: erst Noa fragen. Commits nur auf
ausdrückliche Anweisung.
```

## Sources

- https://raw.githubusercontent.com/hendrycks/math/main/LICENSE
- https://arxiv.org/abs/2103.03874
- https://raw.githubusercontent.com/hendrycks/math/main/README.md
- https://github.com/openai/grade-school-math
- https://github.com/arkilpatel/SVAMP
- https://github.com/math-qa/math-QA
- https://github.com/openai/miniF2F
- https://huggingface.co/datasets/microsoft/orca-math-word-problems-200k
- https://huggingface.co/datasets/meta-math/MetaMathQA
- https://huggingface.co/datasets/nvidia/OpenMathInstruct-2
- https://github.com/google-deepmind/mathematics_dataset
- https://github.com/allenai/Lila
- https://www.mathematikolympiaden.de
- https://projecteuler.net/copyright
