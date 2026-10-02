# Content-Review Block B6: Projekte + Explanation-Cards

Reviewer: Noas Devin-Subagent (Content-Reviewer Block B6)  
OWNED PATH: `docs/content-review/raw/b6-projekte-explanations.md`  
Umfang: 4 Projekte unter `content/projects/` + 5 Explanation-Cards unter `content/explanations/foundations/`  
Pflichtlektüre: `docs/content-review/rubrik.md`, `docs/content-review/raw/e1-evidenz-remap.md`, `docs/authoring-guide.md`, `docs/content-review/inventar.json`, `schemas/project.schema.json`, `schemas/explanation-card.schema.json`.

---

## Pflichtlektüre — Kurzvermerk

- **Rubrik v0.6** legt P0 = fachliche Fehler / Mastery-Lücken, P1 = evidenzbelegte Lernerlebnis-Verbesserung, P2 = Polish fest.
- **E1-Evidenz-Remap** markiert für diesen Block besonders relevant: G-05/G-31 (Spiralrückgriffe), G-14 (Sequenz Lesen→Schreiben), G-15 (Completion-Fading), G-25 (Subgoal-Hinweise), OF-7 (Difficulty-Kalibrierung), OF-8 (Fehlerjournal / `c-meta-learning`).
- **Authoring-Guide §5/§6** betont: Projekte sind lokale Selbstlern-Nachweise (keine Mastery-Evidence), `masteryEligible: false` auf Projekt-Ebene, `allowedCommands` exakt ein Kommando, `check-manifest` mit Test-Hashes, öffentliche Inhalte ohne absolute Pfade.
- **Inventar** zeigt: keine der 4 Projekte taucht in `module.projectIds` auf; die 5 Explanation-Cards sind bis auf `x-git-workflow` (in `content/modules/lm-git-basics.json`) nirgends in Modulen verlinkt.

---

## A) Projekte

### p-foundations-data-checker — CLI-Datenprüfer

**Zusammenfassung**: Vierstufiger CSV-Prüfer (`schema → types → missing → duplicates`). `src/checker.py` ist ein halb implementierter Starter (`inspect_rows` bricht bei fehlenden Spalten ab, Stufen 2–4 sind TODO; `solution/checker.py` vollständig). Tests (`tests/test_checker.py`, 5 Fälle) prüfen die vier Stufen plus das Abbruchverhalten. Runner-Kommando `python -m pytest -q --disable-warnings --maxfail=1 tests` (project.json:36-46). Kompetenzen decken Python-Grundlagen, Reading, Functions, Control-Flow, Collections, Files-Errors, Testing, Git und Meta-Learning ab; `requires` fordert nur die fünf Python-Kerne. `releaseStatus`: `solver-verified`, `estimatedMinutes`: 300.

- **[P0] Auftrag / Mastery-Ehrlichkeit** — Kein P0. README.md:29 und README.md:18-27 bezeichnen den Report korrekt als „lokalen Selbstlern-Nachweis“ und „kein Zertifikat“.
- **[P1] Tests** — Test `test_duplicate_ids_are_reported_once` erwartet `row: 3` für das zweite Auftreten (`tests/test_checker.py:29-32`). Die Lösung nutzt `enumerate(rows, start=2)` und fügt das Duplikat beim zweiten Vorkommen ein (`solution/checker.py:34-39`) — das passt. Die Testabdeckung der vier Stufen deckt den Vertrag vollständig ab.
- **[P1] Voraussetzungen** — `competencyIds` (project.json:9-19) enthalten `c-git-basics` und `c-meta-learning`, die nicht in `requires` (project.json:20-26) stehen. Das ist nicht falsch, aber es entkoppelt die formale Gate-Voraussetzung vom eigentlichen Übungsstoff. Bei der aktuellen `requires`-Menge kann ein Lernender das Projekt theoretisch öffnen, bevor Git oder Meta-Learning gelernt wurden.
- **[P1] Schwierigkeit / Zeit** — `estimatedMinutes: 300` ist für einen Vier-Stufen-CSV-Prüfer mit 28 Zeilen Starter-Code sehr hoch (R7, OF-7). Als erster Projekt-Einstieg in W04 (s. ADR-0014, `legacyWeekId: w04`) ist 300 Minuten (5 Stunden) wahrscheinlich unkaliibriert; 90–120 Minuten passen besser zu Auftrag und Code-Umfang.
- **[P2] Formalia** — `project.json` version 2 (`project.json:4`) vs. `check-manifest.json:4` `"projectVersion": "2"` (String statt Integer). Schema `project.schema.json` fordert `version` als `integer` (project.schema.json:33-36); die Manifest-Konvention ist hier inkonsistent. Kein Blocker, aber ein Validator könnte das bemängeln.
- **[P2] Copy** — README.md:1-9 wiederholt die vier Stufen knapp; das ist solide. Ein Worked-Example (R1, LM-R5) fehlt im README, obwohl `inspect_rows` eine typische Completion-Aufgabe wäre.

### p-ml-repro-comparison — Reproduzierbarer Modellvergleich

**Zusammenfassung**: Vergleicht Mittelwert-Baseline gegen Ridge-Regression (`λ=1`) auf einem seeded synthetischen Datensatz (60 Zeilen, 2 Features). `src/compare.py` enthält fertige Hilfsfunktionen (`load_dataset`, `split_indices`, `mean_baseline`, `rmse`) und TODOs für `ridge_fit`, `compare`, `repro_check`. `solution/compare.py` implementiert geschlossene Formel `(XᵀX + λI)⁻¹Xᵀy` via `np.linalg.solve`. Tests (`tests/test_compare.py`) prüfen Seed-Identität, Split-Variation, Ridge-Baseline-Überlegenheit, Split-Größe und `repro_check`. `releaseStatus`: `solver-verified`, `estimatedMinutes`: 120.

- **[P0] Auftrag** — Kein P0. Die mathematische Vertragsbeschreibung ist korrekt: `X` enthält Eins-Spalte, `split_indices` ist deterministisch, `repro_check` vergleicht zwei Dictionaries. Lösung verwendet korrekterweise `np.linalg.solve` statt expliziter Inverser (`solution/compare.py:49`).
- **[P1] Voraussetzungen** — `requires` listet `c-ml-regularization`, `c-ml-ensembles`, `c-ml-svm-pca`, `c-ml-erroranalysis` (project.json:12-17), während `competencyIds` nur `c-ml-repro` enthält. Das Projekt sollte auch `c-ml-linear` oder `c-ml-baseline` im `competencyIds` tragen, da es lineare Regression und Baselines behandelt. Die `requires` wirken für ein 120-Minuten-Projekt sehr breit (Ensembles, SVM/PCA, Error-Analysis); dies ist eher eine Capstone-Voraussetzungsmenge als ein Einzelprojekt.
- **[P1] Schwierigkeit / Zeit** — 120 Minuten ist plausibel für das Implementieren der drei Funktionen plus Repro-Dokumentation. Die `requires` suggerieren aber deutlich mehr Vorwissen, als 120 Minuten erlauben (R6/R7).
- **[P1] Completion-Fading (R1 / G-06 / G-15)** — Der Starter gibt bereits `load_dataset`, `split_indices`, `mean_baseline`, `rmse` vor, aber der Kern (`ridge_fit`, `compare`, `repro_check`) ist komplett offen. Es gibt keine Zwischenstufe (z. B. teilweise ausgefüllte `compare`-Funktion), was den Einstieg für Lernende erschweren kann, die Ridge noch nicht selbst implementiert haben. Vorschlag: `ridge_fit` als gestufte Hinweise (R3) oder ein Worked-Example im README ergänzen.
- **[P2] Copy** — README.md:1-34 ist klar und ehrlich. README.md:8-11 wiederholt den „Reproduzierbarkeits-Vertrag“ gut; es fehlt ein konkretes Zahlenbeispiel (R9) für die RMSE-Werte bei `seed=7`.

### p-rag-secure-prototype — Abgesicherter RAG-Prototyp mit Stub-Generator

**Zusammenfassung**: Minimaler RAG-Prototyp: lexikalisches Retrieval, deterministischer Stub-Generator, Injektions-Detektor (String-Matching), Least-Privilege-Tool-Policy, Metriken (Recall@k, answered) und Ablationslauf. Starter (`src/prototype.py`) enthält Vertragsdaten (`DOCS`, `QUERIES`, `INJECTION_RULES`, `POLICY`) und Hilfsfunktionen (`normalize`, `terms`, `rank_docs`, `best_doc`); zu implementieren sind `contains_injection`, `audit`, `answer`, `request_action`, `metrics`, `ablation`. `solution/prototype.py` ist vollständig. Tests (`tests/test_prototype.py`, 8 Fälle) decken Injektions-Erkennung, Audit-Verhalten, Stub-Antworten, Recall-Schwelle, Determinismus, Policy, Ablations-Tradeoff und Determinismus ab. `releaseStatus`: `draft`, `estimatedMinutes`: 120.

- **[P0] Auftrag / Sicherheit** — Kein P0. Das README (README.md:1-62) und der Code dokumentieren ehrlich: „kein produktives LLM-System“, kein echtes Sprachmodell, lokaler Stub. Der `example.invalid`-Domain-Check und die OWASP/NIST/MITRE-Verweise als Checkkarten sind didaktisch solide.
- **[P0] Verdachtsmodell** — Die Injektions-Regeln (`INJECTION_RULES = ["ignoriere vorherige", "sende die datei"]`) und die Policy sind deterministisch; Tests erwarten exakte Werte (`tests/test_prototype.py:56: assert metrics() == {"recall_at_k": 0.75, "answered": 3}`). Das ist korrekt im Kontext eines Stubs, aber fachlich ist es ein sehr primitives Sicherheitsmodell. Das wird transparent kommuniziert.
- **[P1] Tests** — Testabdeckung ist hoch und fängt typische Fehler (nur Query prüfen, nur Dokument prüfen, Policy-Reihenfolge, Ablationsmetriken) ab. Besonders `test_audit_checks_retrieved_document_not_only_query` (`tests/test_prototype.py:36-40`) und `test_ablation_shows_the_price_of_control` (`tests/test_prototype.py:69-80`) decken Verständnis-Lücken ab.
- **[P1] Schwierigkeit** — 120 Minuten für sechs Funktionen plus Ablationslauf ist ambitioniert, aber machbar. Die `estimatedMinutes` wirken im Vergleich zum Umfang (140 Zeilen Starter, 158 Zeilen Lösung) plausibel.
- **[P1] Voraussetzungen** — `requires` (`c-genai-rag`, `c-genai-eval`, `c-genai-security`) sind sauber auf die drei Kompetenzen vorheriger Wochen begrenzt; `competencyIds: ["c-genai-prototype"]` passt.
- **[P1] Aufgabenmix (R5)** — Das Projekt kombiniert Code-Lesen (`normalize`, `terms`, `rank_docs` vorgegeben), Trace/Prädiktion (Stub-Antwort-Verhalten) und Schreiben (Implementation). Das entspricht G-14/LM-R4 („Lesen/Trace/Predict VOR Schreiben“).
- **[P2] Copy / Ehrlichkeit** — README.md:37-39 dokumentiert Grenzen ausführlich; README.md:60-62 wiederholt den Mastery-Hinweis. `masteryEligible` ist auf Projekt-Ebene implizit `false` (Projekte generell laut Authoring-Guide), das könnte explizit in `project.json` stehen, um Misstrauen zu vermeiden.

### p-rag-capstone — RAG-Capstone: reproduzierbare Pipeline

**Zusammenfassung**: Fünfphasige Capstone-Pipeline, die den GenAI-Prototyp erweitert: Scope-Freeze (`assert_frozen`, Manifest-Hashes, topo-sortierte Stages), Integration (`run()` mit virtueller Uhr und Sentinels), Evaluation/Red-Team (Subgruppenmetriken, Injektions-Fixtures, Aktionen), Reproduktion (Doppellauf-Digest, README-Checks, Overclaim-Scan) und Abschluss-Artefakte (`demo_metrics`, `final_diagnosis`, `acceptance_report`). Enthält `w30_core.py` (byte-identisch mit `p-rag-secure-prototype/src/prototype.py` Starter), `src/pipeline.py`, `src/metrics.py`, `src/cost.py`, `src/cards.py` (Starter mit TODOs), Lösungen, `golden/` und `config/experiment.json`, fünf Testdateien (`test_w35_scope.py` bis `test_w39_artifacts.py`). `releaseStatus`: `draft`, `estimatedMinutes`: 240.

- **[P0] Auftrag / Determinismus** — Kein P0. `solution/pipeline.py` ist vollständig und deterministisch: `itertools.count()` als virtuelle Uhr (`solution/pipeline.py:308-309`), `kanonisches_json` mit sortierten Schlüsseln (`solution/pipeline.py:74-76`), `run_digest` via `sha256(kanonisches_json(results))` (`solution/pipeline.py:412-414`). `expected_results.json` (`golden/expected_results.json:5`) hält `run_digest` fest und `demo_metrics()` prüft ihn (`solution/pipeline.py:559-574`).
- **[P0] Verdrahtung mit W30** — `tests/test_rag_capstone_project_solution.py:117-123` fordert, dass `src/w30_core.py` byte-identisch mit `content/projects/rag-secure-prototype/src/prototype.py` ist. Das ist problematisch: `rag-secure-prototype/src/prototype.py` ist der **Starter** mit TODOs, nicht die Lösung. Wenn der Capstone auf dem W30-Prototyp aufbaut, sollte `w30_core.py` die **Lösung** des W30-Projekts referenzieren (d. h. `solution/prototype.py`), sonst fehlen `contains_injection`, `audit`, `answer`, `request_action`, `metrics`, `ablation` in `w30_core` und müssen im Capstone nochmals implementiert werden. Im Lösungs-`pipeline.py` sind diese Funktionen tatsächlich neu implementiert (`solution/pipeline.py:177-224`), was redundante Doppelimplementierung bedeutet und das Modell verwässert.
- **[P1] Stages und Fehlerzustände (R4 / R5)** — `STAGE_CONTRACTS` (`src/pipeline.py:49-57`) modelliert den Datenfluss sauber; Tests (`tests/test_w36_pipeline.py:78-85`) prüfen sichtbaren Abbruch ohne stille Fallbacks. Sentinels (`ok | fehler | timeout`) sind in `run_stage`/`call_with_timeout` korrekt umgesetzt.
- **[P1] Tests** — Fünf Phasen-Testdateien mit 6+ Tests pro Phase sind solide. `tests/test_w37_eval_redteam.py:63-87` prüft das defensives Red-Team nur gegen eigene Fixtures (keine echten Adressen, nur `example.invalid`). `tests/test_w39_artifacts.py:117-131` prüft Karten-Validierung.
- **[P1] Schwierigkeit / Zeit** — 240 Minuten für fünf Phasen mit je 30+ Tests ist eher unter- als überschätzt; der tatsächliche Aufwand liegt eher bei 300–360 Minuten. `estimatedMinutes` sollte kalibriert werden (R7).
- **[P1] Karten / Work Evidence** — Die `cards/*.json` enthalten `TODO(Lernende:r)`-Platzhalter (`cards/data-card.json:3,5,8`; `cards/model-card.json:7-8`; `cards/system-card.json:11-12`). Das ist beabsichtigt (Lernende füllen aus), aber der Karten-Validator (`src/cards.py`/`solution/cards.py`) prüft nur Struktur, nicht Inhalt. README.md:48-49 besagt: „Karteninhalte sind Work Evidence, kein Mastery-Beweis“ — das ist konsistent mit R14.
- **[P1] Overclaim-Detektor** — `config/experiment.json:51-56` listet verbotene Phrasen (`produktionsreif`, `sicher gegen`, `halluziniert nie`, `getestet gegen alle`). `scan_overclaims` prüft README und Karten (`solution/pipeline.py:522-526`); das fördert Mastery-Ehrlichkeit (R14).
- **[P2] Copy** — README.md:1-83 ist gut strukturiert mit Pflichtüberschriften, Limitations und bekannten Fehlern. Die Phasentabelle (README.md:52-58) ist nützlich. Einige Überschriften in `config/experiment.json:43-50` sind im README als `## Setup`, `## Abhängigkeiten` etc. vorhanden; das stimmt.
- **[P2] releaseStatus** — `draft` ist angemessen, da TODOs in den Karten und Starter-Dateien enthalten sind.

---

## B) Explanation-Cards

### x-collection-state — „Collection nach jedem Lauf aktualisieren"

**Zusammenfassung**: Card für `c-python-collections` und `c-python-reading`. Erklärt das schrittweise Aktualisieren von Dictionary/Set (`body`: „Schreibe den vollständigen Dictionary- oder Set-Inhalt nach jedem verarbeiteten Element auf“). Vier Schritte: leere Struktur → einen Wert lesen → Mitgliedschaft/get mit aktuellem Zustand → neuen Zustand notieren. Beispiel `counts = {rot: 2, blau: 1}`; Gegenbeispiel `len(counts)` zählt nicht Eingabewörter. `diagnosticCodes`: `["wrong-output", "wrong-value"]`, `helpLevel: 2`, `followUpActivityIds`: `["f-collections-output-01"]`, `revealsSolution: false`.

- **Konsistenz mit Fehlertypen**: `wrong-output` und `wrong-value` sind gültige Grader-`errorType`s (`assets/js/core/graders.js:44, 86, 355, 397`). Sie decken das Szenario ab (falsches Endergebnis vs. falscher Zwischenwert). Der Fokus auf „sichtbaren Zustand nach jedem Schritt“ passt gut zu Code-Trace-Aufgaben (`c-python-reading`).
- **[P0] Fachliche Konsistenz** — Kein P0. Das Zustandskonzept ist korrekt; das Gegenbeispiel adressiert einen typischen Fehler.
- **[P1] Verknüpfung mit Content** — `followUpActivityIds` verweist auf `f-collections-output-01`. Diese Aktivität existiert in `tests/fixtures/canonical-families.json:1303-1306` und `assets/js/core/foundations_construct_families.mjs:1104` als Quell-ID, aber es gibt keine entsprechende Datei unter `content/families/`. Das ist eine Dangling-Referenz, die bei der Validator-Ausführung möglicherweise fehlschlägt. Geprüft werden müsste, ob `compile_content.mjs` `followUpActivityIds` als `sourceId` oder `caseId` auflöst.
- **[P1] Fehlende Verdrahtung** — `x-collection-state` ist im Inventar bei `c-python-collections` und `c-python-reading` vermerkt, aber kein Modul (`lm-foundations-collections.json`, `lm-foundations-code-reading.json`) listet sie in `explanationIds`. Die Card ist für Lernende nicht auffindbar.
- **[P2] Copy** — Titel und Body sind knapp; die Schritte sind operationalisierbar. Ein konkretes Python-Code-Beispiel (statt nur `counts = {rot: 2, blau: 1}`) würde R9 („konkretes Zahlenbeispiel vor Abstraktion“) besser erfüllen.

### x-control-order — „Kontrollfluss zuerst als Ablauf ordnen"

**Zusammenfassung**: Card für `c-python-control-flow`. Body: Initialisierung, Wiederholung, Bedingung, Rückgabe als vier getrennte Rollen markieren. Schritte: (1) was vor der Schleife existieren muss, (2) nur die Zeile einrücken, die bei wahrer Bedingung läuft, (3) `return` nach die Schleife setzen, wenn alle Werte verarbeitet werden müssen. Beispiel: `result = []` vor `for`, `return result` danach. Gegenbeispiel: `return` im Schleifenkörper. `diagnosticCodes`: `["wrong-order"]`, `followUpActivityIds`: `["f-control-parsons-01"]`, `helpLevel: 2`.

- **Konsistenz mit Fehlertypen**: `wrong-order` ist ein gültiger Grader-`errorType` (`assets/js/core/graders.js:259` für Parsons) und wird in `feedbackRules` vieler Familien verwendet. Die Card deckt aber eigentlich einen **Kontrollfluss-Fehler** (frühes `return`), nicht unbedingt eine „falsche Zeilenreihenfolge“ im Parsons-Sinne. Eine Ergänzung durch `early-return` oder `control-flow` als eigener `diagnosticCode` wäre präziser; `wrong-order` ist akzeptabel, aber semantisch etwas dünn.
- **[P0] Fachliche Konsistenz** — Kein P0. Der Hinweis auf frühes `return` ist korrekt.
- **[P1] Verknüpfung mit Content** — `f-control-parsons-01` existiert in `tests/fixtures/canonical-families.json:1597-1600` und `assets/js/core/foundations_construct_families.mjs:1199`, aber nicht als eigenständige Familiendatei. Dangling-Referenz.
- **[P1] Fehlende Verdrahtung** — Nicht in `content/modules/lm-foundations-control-flow.json` gelistet. Lernende erreichen die Card nicht über den Modulfluss.
- **[P2] Copy** — Die vier Rollen (Initialisierung, Wiederholung, Bedingung, Rückgabe) sind eine gute Subgoal-Struktur (R3/G-25). Der Body könnte noch kürzer sein (R8), aber 11 Wörter sind akzeptabel.

### x-error-boundary — „Erwarteten Fehler an der Entscheidungsgrenze behandeln"

**Zusammenfassung**: Card für `c-python-files-errors`. Body: nur den Fehlertyp fangen, den ungültige Eingaben erwartbar auslösen. Vier Schritte: riskanten Parsing-Aufruf benennen → erwarteten Fehlertyp benennen → Ebene mit Zeilen-/Spaltenkontext suchen → präzisen Issue-Eintrag erzeugen. Beispiel: `ValueError` aus `parse_age` wird beim Zeilen-Issue behandelt. Gegenbeispiel: `except Exception: pass` verschluckt Tipp- und Programmierfehler. `diagnosticCodes`: `["exception-boundary", "wrong-order"]`, `followUpActivityIds`: `["f-files-parsons-01"]`, `helpLevel: 2`.

- **Konsistenz mit Fehlertypen**: `exception-boundary` ist **kein** in `graders.js` oder `feedbackRules` vorkommender `errorType` / Schlüssel. Die Familien verwenden stattdessen spezifische Codes wie `valueerror-missing`, `bool-accepted`, `columns-error-missing` etc. `exception-boundary` taucht nur als `sourceId`/`definitionId` in Test-Fixtures auf (`tests/fixtures/canonical-families.json:2779`, `tests/fixtures/foundations-shard.json:2834-2837`). Wenn `diagnosticCodes` als Grader-`errorType`-Referenz gedacht sind, ist `exception-boundary` nicht konsistent. Wenn sie als eigener didaktischer Taxonomie-Code gedacht sind, sollte das dokumentiert oder ein Mapping in `graders.js` ergänzt werden.
- `wrong-order` ist passend, wenn Lernende die Fehlerbehandlung an der falschen Stelle (z. B. vor dem Parsing) einbauen.
- **[P0] Fachliche Konsistenz** — Kein P0. Der Rat, nur erwartete Exceptions zu fangen, ist Python-korrekt und didaktisch wertvoll.
- **[P1] Verknüpfung mit Content** — `f-files-parsons-01` existiert in `tests/fixtures/canonical-families.json:1476` und `assets/js/core/foundations_construct_families.mjs:1309`, aber nicht als `content/families/*.json` Datei. Dangling-Referenz.
- **[P1] Fehlende Verdrahtung** — Nicht in `content/modules/lm-foundations-files-errors.json` gelistet. Die Card ist im Katalog isoliert.
- **[P1] DiagnosticCode-Präzision** — `[P1] content/explanations/foundations/error-boundary.json:8` → `diagnosticCodes` sollte `valueerror-missing` oder `exception-boundary` konsistent zur Familien-Sprache wählen. Aktuell ist der Code ein Fremdkörper im Fehlertyp-System.
- **[P2] Copy** — Beispiel und Gegenbeispiel sind konkret (R9). Die vier Schritte folgen einem guten Subgoal-Label-Muster (R3).

### x-git-workflow — „Testbeleg und Git-Artefakt getrennt prüfen"

**Zusammenfassung**: Card für `c-git-basics` und `c-testing-debugging`. Body: Arbeitsfluss nach Wissensgewinn ordnen — erst reproduzieren, dann ändern, prüfen, zuletzt speichern. Fünf Schritte: roten Test zeigen → kleinsten Fix schreiben → Einzeltest + Suite ausführen → `status` und `diff` lesen → Commit erzeugen. Beispiel: grüner Test und gelesener Diff beantworten verschiedene Fragen. Gegenbeispiel: erfolgreicher Commit beweist keine Codekorrektheit. `diagnosticCodes`: `["wrong-order", "unsafe-workflow"]`, `followUpActivityIds`: `["f-git-parsons-01"]`, `helpLevel: 2`.

- **Konsistenz mit Fehlertypen**: `wrong-order` passt (falsche Reihenfolge der Arbeitsschritte). `unsafe-workflow` ist **kein** in `graders.js` oder `feedbackRules` verwendeter `errorType`; es ist ein didaktischer Begriff. In den Familien finden sich Codes wie `missing-before-hash`, `hash-in-middle`, `order-wrong`, `order-ignored` — aber kein `unsafe-workflow`. Hier besteht dasselbe Konsistenzproblem wie bei `exception-boundary`.
- **[P0] Fachliche Konsistenz** — Kein P0. Der Workflow (Test-First, Commit erst nach Diff/Status) ist Git-korrekt.
- **[P1] Verknüpfung mit Content** — `x-git-workflow` ist das einzige Card, das in einem Modul referenziert wird: `content/modules/lm-git-basics.json:12`. Das ist vorbildlich.
- **[P1] Verknüpfung mit Content** — `f-git-parsons-01` existiert in `tests/fixtures/canonical-families.json:2753-2757` und `tests/fixtures/foundations-shard.json:2721-2724`, aber nicht als eigenständige Familiendatei. Dangling-Referenz.
- **[P1] DiagnosticCode-Präzision** — `[P1] content/explanations/foundations/git-workflow.json:8` → `unsafe-workflow` sollte entweder in Grader/Familien eingeführt oder durch `order-ignored`, `missing-before-hash` oder ähnliche konkrete Codes ersetzt werden.
- **[P2] Copy** — Fünf Schritte sind klar und operationalisierbar; der Titel trifft den Unterschied zwischen Test- und Git-Evidence.

### x-off-by-one — „Index und sichtbare Zeilennummer trennen"

**Zusammenfassung**: Card für `c-testing-debugging`. Body: Umrechnung vom nullbasierten Listenindex zur sichtbaren CSV-Zeilennummer tracen. Drei Schritte: Datei mit Header + zwei Datenzeilen bauen → Listenindex und sichtbare Zeilennummer notieren → prüfen, wo der Headeraufschlag fehlt. Beispiel: Datenindex 1 entspricht sichtbarer CSV-Zeile 3. Gegenbeispiel: Testerwartung nur auf 2 ändern untersucht die Ursache nicht. `diagnosticCodes`: `["off-by-one", "wrong-value"]`, `followUpActivityIds`: `["f-testing-choice-01"]`, `helpLevel: 2`.

- **Konsistenz mit Fehlertypen**: `off-by-one` ist kein Grader-`errorType`, aber ein etabliertes `feedbackRule`-Schlüsselwort in vielen Familien (z. B. `content/families/reproduce-pipeline-status-report.json:149`, `content/families/optimize-decode-greedy-loop.json:185`, `content/families/fit-mlp-val-curve-argmin.json:44`, `content/families/fit-early-stopping-roundtrip.json:40`, `content/families/construct-normalize-chunk-contract.json:42`, `content/families/compose-toy-inference-pipeline.json:45`). Auch `assets/js/core/foundations_fresh_generators.mjs:411` und `tests/fixtures/foundations-shard.json:1656` verwenden `off-by-one`. `wrong-value` ist ein gültiger Grader-`errorType`. Die Konsistenz ist daher die beste unter den fünf Cards.
- **[P0] Fachliche Konsistenz** — Kein P0. Der Übergang Listenindex → CSV-Zeile ist korrekt (Header + Start bei 2).
- **[P1] Verknüpfung mit Content** — `f-testing-choice-01` existiert in `tests/fixtures/canonical-families.json:3217`, `tests/fixtures/foundations-shard.json:2387,2455,2458` und `assets/js/core/foundations_choice_families.mjs:185-190`. Es ist eine tatsächliche Choice-Frage (`csv-off-by-one-reproduce-smallest`), die im Modul `lm-foundations-testing-debugging.json:22-31` platziert ist. Die Verknüpfung ist also real und konsistent.
- **[P1] Fehlende Verdrahtung** — Obwohl `f-testing-choice-01` im Modul `lm-foundations-testing-debugging` platziert ist, ist `x-off-by-one` selbst nicht in diesem Modul als `explanationId` eingetragen. Die Card kann nur über den Choice-Fall als Follow-up erreicht werden, nicht proaktiv im Lernmodul.
- **[P2] Copy** — Beispiel ist gut; das Gegenbeispiel adressiert einen typischen Trial-and-Error-Fehler. Eine visuelle Skizze (Header, Zeile 1, Zeile 2 mit Index 0/1/2) würde die Karte noch stärker machen (R12).

---

## Blockübergreifende Befunde

1. **Projekte sind in Modulen nicht verlinkt** — In `content/modules/*.json` steht überall `"projectIds": []`. Die 4 Projekte erscheinen zwar in `content/milestones/core.json` (laut `grep`), aber nicht im Wochen-/Modulfluss. Das ist ein **P1**-Befund hinsichtlich R11 (Kumulation/Spiralrückgriffe) und der allgemeinen Auffindbarkeit: Lernende können Projekte nur über das Track-/Milestone-Menü finden, nicht als natürlichen Abschluss eines Moduls.

2. **Explanation-Cards sind größtenteils verwaist** — Nur `x-git-workflow` ist in `lm-git-basics.json` als `explanationId` verlinkt; `x-collection-state`, `x-control-order`, `x-error-boundary`, `x-off-by-one` sind nur im `inventar.json` vermerkt. Das verhindert, dass die Cards in der UI als Hilfe angeboten werden.

3. **`diagnosticCodes` sind teilweise nicht grader-konsistent** — `wrong-output`, `wrong-value`, `wrong-order`, `off-by-one` haben klare Bezüge zu `graders.js` oder `feedbackRules`. `exception-boundary` und `unsafe-workflow` hingegen sind weder `errorType` noch `feedbackRule`-Schlüssel; sie erscheinen nur als `sourceId`/`definitionId` in Test-Fixtures. Ohne zentrale Taxonomie/Registry ist die Diagnosekette unterbrochen (R4/R15).

4. **`followUpActivityIds` zeigen auf Test-Fixtures, nicht auf eigene Familien** — Alle 5 Cards verweisen auf `f-…-01`-IDs, die in `tests/fixtures/canonical-families.json` und Generator-Dateien existieren, aber nicht als separate Dateien unter `content/families/`. Das ist kein P0 (die IDs könnten kanonische Definitionen sein), aber es erschwert die Pflege und sollte geprüft werden.

5. **Capstone-Verdrahtung mit W30 ist redundant** — `p-rag-capstone/src/w30_core.py` ist byte-identisch mit `p-rag-secure-prototype/src/prototype.py` (Starter, nicht Lösung). Die Capstone-Lösung implementiert `audit`, `answer`, `request_action` usw. erneut in `solution/pipeline.py`. Eine klare Trennung wäre: `w30_core.py` = Lösung des W30-Projekts (enthält alle funktionierenden Funktionen), `pipeline.py` fokussiert auf die fünf Phasen. Aktuell lernt der Lernende im Capstone denselben Sicherheitskern ein zweites Mal.

6. **Zeitschätzungen sind unkalibriert** — `p-foundations-data-checker` (300 Min) und `p-rag-capstone` (240 Min) weichen vom Aufwand ab (R7, OF-7). Gerade das Data-Checker-Projekt ist für einen Vier-Stufen-CSV-Parser überschätzt.

7. **Mastery-Ehrlichkeit der Projekte ist gut** — Alle 4 READMEs betonen, dass Projekt-Reports lokale Selbstlern-Nachweise sind, kein Mastery-Beweis. Das erfüllt R14.

8. **Projekt-Tests sind qualitativ hochwertig, aber Lösungstests fehlen für 3 von 4** — `tests/test_rag_capstone_project_solution.py` beweist die Referenzlösung; äquivalente `test_*_project_solution.py` für `p-foundations-data-checker`, `p-ml-repro-comparison` und `p-rag-secure-prototype` fehlen.

---

## Vorschläge für fehlende Cards

Basierend auf den Projekten, den im Inventar vorhandenen Kompetenzen und den Lücken im aktuellen Explanation-Card-Bestand:

1. **`x-csv-stage-contract` (für `c-python-files-errors`, `c-python-collections`)** — Verweist auf `p-foundations-data-checker` und erklärt das Vier-Stufen-Schema `schema → types → missing → duplicates`. Reason: Im Projekt ist die Reihenfolge Teil des Vertrags, aber es gibt keine Card, die das Stage-Muster erklärt.

2. **`x-ridge-closed-form` (für `c-ml-repro`, `c-ml-regularization`)** — Erklärt `(XᵀX + λI)⁻¹Xᵀy` und warum `np.linalg.solve` der expliziten Inversen vorzuziehen ist. Reason: `p-ml-repro-comparison` fordert Ridge-Implementierung, aber die Lektionen geben nur einen Verweis auf „geschlossene Formel".

3. **`x-seed-determinism` (für `c-ml-repro`, `c-python-reading`)** — Erklärt `np.random.default_rng(seed)` vs. globalen Zustand und warum derselbe Seed identische Ergebnisse liefern muss. Reason: Zentrales Thema von `p-ml-repro-comparison` und Capstone (`fresh_double_run`).

4. **`x-rag-stub-vs-llm` (für `c-genai-prototype`, `c-genai-rag`)** — Erklärt den Unterschied zwischen einem term-basierten Stub-Generator und einem echten Sprachmodell sowie ehrliche Limitationen. Reason: `p-rag-secure-prototype` und `p-rag-capstone` betonen dies stark, aber keine Card fasst das Konzept zusammen.

5. **`x-least-privilege-policy` (für `c-genai-security`)** — Erklärt Policy-Evaluation in der Reihenfolge `forbidden → restricted → allowed → unknown`. Reason: Wiederkehrendes Muster in `p-rag-secure-prototype` und Capstone.

6. **`x-pipeline-sentinels` (für `c-capstone-pipeline`)** — Erklärt, warum Stage-Ergebnisse immer `ok | fehler | timeout` tragen und keine stillen Fallbacks erlaubt sind. Reason: Kernthema des Capstones (`run_stage`, `_StageAbbruch`, `fresh_double_run`).

7. **`x-manifest-freeze` (für `c-capstone-pipeline`, `c-git-basics`)** — Erklärt Scope-Freeze, sha256-Pinning und `assert_frozen`. Reason: Wird in Capstone (`w35-scope`) und im Repro-Projekt (`check-manifest.json`) vorausgesetzt, aber nirgends als Explanation-Card aufbereitet.

8. **`x-meta-error-classify` (für `c-meta-learning`)** — Erklärt, wie ein Fehler anhand von Symptom und Ursache klassifiziert wird (Verknüpfung zu `FROZEN_META_ERROR_SEED` / `off-by-one`-Fällen). Reason: E1 markiert `c-meta-learning` als P0-Lücke (nur 1 mastery-fähige Definition); eine Card könnte die Conceptualisierung unterstützen.

---

## Priorisierte Umsetzungsvorschläge (konkrete Dateien)

| Priorität | Datei(en) | Änderung | Begründung |
|---|---|---|---|
| P1 | `content/modules/lm-foundations-*.json` | `explanationIds` ergänzen für `x-collection-state`, `x-control-order`, `x-error-boundary`, `x-off-by-one` | Cards sind sonst in der UI nicht auffindbar |
| P1 | `content/modules/lm-ml-repro.json`, `lm-genai-*.json`, `lm-foundations-testing-debugging.json`, `lm-foundations-files-errors.json` | `projectIds` ergänzen für passende Projekte | Projekte sind sonst nur über Milestones erreichbar |
| P1 | `schemas/explanation-card.schema.json` (oder separates Taxonomie-Dokument) | `diagnosticCodes` auf erlaubte `errorType`/`feedbackRule`-Schlüssel einschränken oder Mapping dokumentieren | `exception-boundary`, `unsafe-workflow` sind aktuell nicht in Grader/Familien verankert |
| P1 | `content/projects/foundations-data-checker/project.json` | `estimatedMinutes` auf 90–120 Minuten senken | Umfang (28 Zeilen Starter + 5 Tests) rechtfertigt 300 Minuten nicht |
| P1 | `content/projects/rag-capstone/src/w30_core.py` | Auf `rag-secure-prototype/solution/prototype.py` umstellen oder Funktionen in `w30_core.py` vervollständigen | Vermeidet Doppelimplementierung in Capstone-Lösung |
| P2 | `content/projects/foundations-data-checker/check-manifest.json` | `projectVersion` von `"2"` auf `2` (Integer) setzen | Konsistenz mit `project.schema.json` |
| P2 | `content/explanations/foundations/collection-state.json` etc. | `followUpActivityIds` auf existierende `content/families/`-Dateien verifizieren oder Fallback definieren | Aktuell Dangling-Referenzen auf kanonische Test-Fixtures |
| P2 | Neue Cards `x-csv-stage-contract`, `x-ridge-closed-form`, `x-seed-determinism`, `x-rag-stub-vs-llm`, `x-least-privilege-policy`, `x-pipeline-sentinels`, `x-manifest-freeze`, `x-meta-error-classify` | Siehe Abschnitt „Vorschläge für fehlende Cards" | Schließt didaktische Lücken zwischen Projekten und Katalog |

---

*Report-Status: fertig zum redaktionellen Durchstich. Sachliche Unsicherheiten (insb. die genaue Auflösung von `followUpActivityIds` durch `compile_content.mjs`) sind als „unklar" markiert.*
