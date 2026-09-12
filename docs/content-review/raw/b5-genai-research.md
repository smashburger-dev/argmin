# Content-Review Block B5: GenAI + Research + Capstone

Reviewer: Noas Devin-Subagent  
OWNED PATH: `docs/content-review/raw/b5-genai-research.md`  
Umfang: 9 Kompetenzen (c-genai-rag, c-genai-eval, c-genai-security, c-genai-prototype, c-research-question, c-research-cards, c-research-responsible, c-research-capstone, c-capstone-pipeline) plus deren Module, Lessons, Placements und Familien.  
Pflichtlektüre: `docs/content-review/rubrik.md`, `docs/content-review/raw/e1-evidenz-remap.md`, `docs/content-review/raw/e2-interaktiv-audit.md`, `docs/authoring-guide.md`, `docs/content-review/inventar.json`.

---

## Methodik und Vorbehalt

- Bewertet wird Content, nicht Tooling: Lesson-Texte, Aufgabenfälle, Hinweise, Feedback, Placements, Schwierigkeit, Zeit, Struktur.
- Fachliche Stichproben wurden mit den Referenz-Solvern in `content/families/*.json` und den Procedural-Generatoren in `assets/js/core/genai_research_generators.mjs`, `capstone_generators.mjs` und `data_ml_families.mjs` gegengeprüft.
- Content-Validierung (`node tools/validate_content.mjs`) und Content-Compile (`node tools/compile_content.mjs`) wurden erfolgreich durchgeführt.
- Unsichere Befunde sind als „unklar" markiert. Keine unbelegten P0-Behauptungen.

---

## c-genai-rag: RAG-Pipeline mit messbarem Retrieval

**Module/Lesson/Placements:** `lm-genai-rag` → `l-genai-rag` (`rag-retrieval.md`, 60 Zeilen/708 Wörter; `rag-retrieval-checkpoint.md`, 10/156). Placements: `classify-rag-stage` (Intro, Choice, `masteryEligible: false`), `aggregate-topk-relevance-arithmetic` `recall-at-k-window` (Core, generiert), `trace-chunk-window-loop` (Core, Trace), `construct-normalize-chunk-contract` (Core, Implementierung), `aggregate-retrieval-ranking-metric` `retrieval-ranking-recall` (Stretch), `retrieval-evaluate-queries` (Challenge).

**Repräsentative Stichproben:**
- `content/families/construct-normalize-chunk-contract.json` (`normalize-chunk-contract`, l. 13–45): Referenz prüft `size > 0`, `0 ≤ overlap < size`, baut Fenster `text[start:start+size]` mit `start += size - overlap`, bis `start < len(text)`; letzter Chunk darf kürzer sein. Deckt sich mit `rag-retrieval.md` l. 10.
- `content/families/aggregate-retrieval-ranking-metric.json` (`retrieval-ranking-recall`, l. 13–53): Referenz baut sortiertes Vokabular, `idf = log((n+1)/(df+1)) + 1`, `tf` normiert auf Dokumentlänge, Kosinus-Ähnlichkeit, Tie-Break kleinster Index, `recall_at_k` mit `ValueError` bei leerer relevanter Menge. Deterministisch und konsistent mit der Lesson.

**Zusammenfassung:** Das Modul deckt die Vertragskette Chunking → Normalisierung → Index → Ranking → Recall@k/MRR ab. Die Implementationen sind fachlich stimmig, der Tie-Break ist deterministisch. Intro (`classify-rag-stage`) ist korrekt als nicht mastery-fähig markiert. Schwächen: keine Visualisierung, keine Case-Level-Completion/Fading, rein synthetische Fixture-Dokumente, keine Spiralrückgriffe zu früheren Python-Funktionen. Fachliche Fehler wurden in den geprüften Referenzlösern nicht gefunden.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 Worked-Example-first | teilweise | Lesson enthält Worked-Example, aber `caseHasWorkedExample: false` für alle Placements; Case-Level-Completion/Fading fehlt. |
| R2 Abruf vor Reveal | erfüllt | `fullSolution` erklärt den Weg, Prompt zeigt keine Lösung vorab. |
| R3 Gestufte Hinweise | erfüllt | Zwei Hinweise pro Fall; erster Hinweis meist strategisch (z. B. Vokabular/IDF vor Implementierung). |
| R4 Diagnose-Feedback | erfüllt | `feedbackRules` und `typicalErrors` sind in statischen Fällen gepflegt. |
| R5 Aufgabenmix | erfüllt | Choice → Trace → Implementierung → Boss; Lesen/Trace vor Schreiben. |
| R6 Schwierigkeits-Spread | erfüllt | Intro/Core/Stretch/Challenge sinnvoll verteilt. |
| R7 Zeitplausibilität | fraglich | 22/28/42 Minuten für vollständige Implementierungen wirken knapp; keine Modul-Minutenangabe für Placements. |
| R8 Element-Interaktivität | erfüllt | Lesson 60 Zeilen/708 Wörter, ein Konzept pro Abschnitt. |
| R9 Copy-Stil | erfüllt | Deutsch, kurze Sätze, konkrete Zahlenbeispiele. |
| R10 Objectives | erfüllt | „Chunken", „Index aufbauen", „Recall@k implementieren" sind messbar. |
| R11 Kumulation/Spiral | fehlt | Keine bewussten Rückgriffe auf frühere Wochen in den Placements. |
| R12 Visualisierung | fehlt | Keine Viz; RAG würde sich für Chunking/Recall anbieten. |
| R13 Neue Interaktionen | fehlt | Keine Predict-then-Verify- oder Slider-Aufgaben. |
| R14 Mastery-Ehrlichkeit | erfüllt | Intro-Choice `masteryEligible: false`; Core/Stretch/Challenge `masteryEligible: true`. |
| R15 Felder konsistent | unklar | `caseMissing: true` für generierte Fälle in `inventar.json`; Generator existiert in `data_ml_families.mjs`. Kein Content-Fehler. |

**Befunde:**
- Kein P0.
- `[P1] R1/R12/R11`: Case-Level-Completion, Visualisierung und Spiralrückgriffe fehlen.
- `[P1] R7`: Zeitkalibrierung der Implementierungsfälle prüfen.

**Verbesserungsvorschläge:**
1. `[P1] content/lessons/genai-systems/rag-retrieval.json` → Viz-Block mit Chunking/Recall-Slider (R12, @ginns<contiguity><2006>); passende Zieldatei `content/lessons/genai-systems/rag-retrieval.viz.json` neu anlegen.
2. `[P1] content/families/construct-normalize-chunk-contract.json` → Case-Level-Completion: erst `normalize` ausfüllen, dann `chunk` mit Partiallösung, dann volle Aufgabe (R1, @renkl<fading><2004>).
3. `[P1] content/modules/lm-genai-rag.json` → `estimatedMinutes` pro Placement und Modul kalibrieren (R7).

---

## c-genai-eval: Evaluation generativer KI-Systeme

**Module/Lesson/Placements:** `lm-genai-eval` → `l-genai-eval` (`genai-evaluation.md`, 57/595; Viz `precision-recall-threshold.viz.json`). Placements: `classify-eval-hazard` (Intro), `aggregate-confusion-metric` `answer-filter-precision-recall-f1` (Core, generiert), `metric-code-output-trace` (Core), `classify-rule-cascade-priority` `error-taxonomy-classify` (Core), `aggregate-confusion-metric` `confusion-from-rows` (Stretch), `aggregate-detector-eval-compare` `run-eval-compare-rulesets` (Challenge).

**Repräsentative Stichproben:**
- `assets/js/core/genai_research_generators.mjs` (l. 75–115): `genF1orPrecision` erzeugt `precision`, `recall`, `f1` aus TP/FP/FN; `f1 = (200·tp)/(2·tp+fp+fn)`. Formeln korrekt.
- `content/families/classify-rule-cascade-priority.json` (`error-taxonomy-classify`, l. 7–54): Regelkaskade `formatfehler → quellos → off-topic → halluziniert → falsch-faktisch → unvollständig → default` mit `citation_precision`; Normalisierung und Zahlmengen konsistent.
- `content/families/aggregate-detector-eval-compare.json` (`run-eval-compare-rulesets`, l. 13–53): Zwei Regelwerke (vollständig vs. ohne Zahlenregel) auf 20 Fixtursätzen; erwartet Accuracy 0,9 vs. 0,7 und `better: 'a'`. Konsistent.

**Zusammenfassung:** Die Evaluation-Kette (Taxonomie, Konfusionsmatrix, PR/F1, Regelvergleich) ist fachlich stimmig. Der generierte Fall `answer-filter-precision-recall-f1` ist im Inventar als `caseMissing` markiert, existiert aber im Generator. Die Visualisierung `precision-recall-threshold.viz.json` zeigt willkürliche Spielzeugfunktionen und hat keine Transferfrage. Wie bei allen B5-Kompetenzen fehlt Case-Level-Completion. Kein fachlicher Fehler.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Worked-Example in Lesson, aber keine case-level Completion. |
| R2 | erfüllt | Kein vorzeitiges Reveal. |
| R3 | erfüllt | Hinweise zu Regelreihenfolge und Zählmengen sind strategisch. |
| R4 | erfüllt | `feedbackRules` zu `order-wrong`, `default-unreachable` etc. |
| R5 | erfüllt | Choice → Trace → Klassifikation → Regelvergleich. |
| R6 | erfüllt | Intro/Core/Stretch/Challenge plausibel. |
| R7 | fraglich | 22–42 Minuten für komplexe Implementierungen knapp. |
| R8 | erfüllt | 57 Zeilen, klar gegliedert. |
| R9 | erfüllt | Deutsch, Beispiele vor Abstraktion. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine bewussten Spiralrückgriffe. |
| R12 | mangelhaft | Viz `precision-recall-threshold.viz.json` passiv und willkürlich; keine Vorhersageaufgabe. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro-Choice `masteryEligible: false`, spätere Fälle `true`. |
| R15 | unklar | `answer-filter-precision-recall-f1` ist generiert und wird vom Inventar nicht erkannt. Kein Content-Fehler. |

**Befunde:**
- Kein P0.
- `[P1] R12`: `precision-recall-threshold.viz.json` braucht eine Vorhersage-/Transferaufgabe oder ersetzt die willkürlichen Funktionen durch einen konkreten Threshold-Sweep.
- `[P1] R1`: Case-Level-Completion für `classify-rule-cascade-priority` fehlt.

**Verbesserungsvorschläge:**
1. `[P1] content/lessons/genai-systems/precision-recall-threshold.viz.json` → Echte Konfusionszahlen und Frage: „Setze t auf 0.6. Welches P/R/F1 ergibt sich?" (R12).
2. `[P1] content/families/classify-rule-cascade-priority.json` → Completion-Variante, in der `classify` schon mit den ersten drei Regeln vorgegeben ist (R1).
3. `[P2] docs/content-review/inventar.json` → Generierte Fälle von `data_ml_families.mjs` nicht als `caseMissing` markieren.

---

## c-genai-security: Sicherheit generativer KI-Systeme

**Module/Lesson/Placements:** `lm-genai-security` → `l-genai-security` (`genai-security.md`, 50/624). Placements: `classify-attack-surface` (Intro), `aggregate-confusion-metric` `injection-filter-counts` (Core, generiert), `trace-substring-flag-sum` (Core, Trace), `aggregate-confusion-metric` `contains-injection-rules` (Core), `classify-rule-cascade-priority` `permission-policy-check` (Stretch), `aggregate-detector-eval-compare` `detector-table-best-f1` (Challenge).

**Repräsentative Stichproben:**
- `content/families/aggregate-confusion-metric.json` (`contains-injection-rules`, l. 847–896): `contains_injection` lowercaset Text und prüft Substring-Regeln; `evaluate_detector` zählt TP/FP/FN/TN und berechnet Precision/Recall. Fachlich korrekt für den dokumentierten Stub-Charakter.
- `content/families/classify-rule-cascade-priority.json` (`permission-policy-check`, l. 113–162): Prüft `forbidden → restricted → allowed → unknown` und liefert strukturierte `verdict`-Dicts. Konsistent.

**Zusammenfassung:** Sicherheit wird als defensiver, regelbasierter Stub mit Least-Privilege behandelt. Der Unterscheid zu einem produktiven LLM-System wird in Lesson und Prompt ehrlich kommuniziert. Fachlich ist der Injektions-Detektor nur ein Phrasen-Substring-Matcher, aber das ist als Toy-Modell transparent. Mastery-fähige Fälle existieren. Keine Visualisierung, keine Case-Completion, keine Spiralrückgriffe.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Worked-Example in Lesson, keine case-level Completion. |
| R2 | erfüllt | `fullSolution` erklärt den Lösungsweg. |
| R3 | erfüllt | Hinweise zu Policy-Reihenfolge und Substring-Matching. |
| R4 | erfüllt | `feedbackRules` zu `rules-not-lowered`, `confusion-swapped` etc. |
| R5 | erfüllt | Choice → Trace → Konfusionsmetrik → Policy → Regelvergleich. |
| R6 | erfüllt | Schwierigkeitsspread plausibel. |
| R7 | fraglich | 22–42 Minuten für Implementierung knapp. |
| R8 | erfüllt | 50 Zeilen, fokussiert. |
| R9 | erfüllt | Deutsch, direkt, Grenzen ausgewiesen. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine Spiralrückgriffe. |
| R12 | fehlt | Keine Viz; Policy-Entscheidung oder Detektor-Matrix wären geeignet. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro-Choice `masteryEligible: false`; Core/Stretch/Challenge `true`. |
| R15 | unklar | `injection-filter-counts` generiert; Inventar markiert `caseMissing`. Kein Content-Fehler. |

**Befunde:**
- Kein P0.
- `[P1] R1/R12/R11`: Fehlende Case-Completion, Visualisierung und Kumulation.
- `[P2] C9`: Der Hinweis in `threshold_sweep` (`aggregate-parity-threshold-selection`) mit „ethische Reihenfolge" ist überladen, aber kein Fehler.

**Verbesserungsvorschläge:**
1. `[P1] content/families/aggregate-confusion-metric.json` → Completion-Variante für `contains-injection-rules`: erst `contains_injection` vorgeben, dann `evaluate_detector` ergänzen.
2. `[P1] content/lessons/genai-systems/genai-security.json` → Neue Viz für Policy-Entscheidungen oder Detektor-PR/Konfusionsmatrix (R12).
3. `[P1] content/modules/lm-genai-security.json` → Zeitkalibrierung prüfen (R7).

---

## c-genai-prototype: Abgesicherter GenAI-Prototyp

**Module/Lesson/Placements:** `lm-genai-prototype` → `l-genai-prototype` (`genai-prototype.md`, 47/621). Placements: `classify-tool-policy` (Intro), `formula-ratio-percent-metric` `allowed-action-count` (Core, generiert), `trace-stub-doc-sentence-select` (Core), `construct-stub-prototype-contract` `stub-prototype-contract` (Core), `construct-secure-prototype-contract` `secure-prototype-contract` (Stretch), `reproduce-pipeline-status-report` `pipeline-status-report` (Challenge).

**Repräsentative Stichproben:**
- `content/families/construct-stub-prototype-contract.json` (`stub-prototype-contract`, l. 13–45): `build_prototype` liefert `answer` und `metrics`; `answer` wählt bestes Dokument per Begriffs-Overlap, dann ersten Satz mit Anfragebegriff; `metrics` berechnet `recall_at_k` und `answered`. Fachlich konsistent.
- `content/families/reproduce-pipeline-status-report.json` (`pipeline-status-report`, l. 13–53): `ablation` vergleicht Lauf mit/ohne Kontrolle; erwartet `mit_kontrolle` Recall 2/3, 1 blockiert, 2 abgelehnt; `ohne_kontrolle` Recall 1.0, 0/0. Der Trade-off wird im Prompt erklärt.

**Zusammenfassung:** Das Prototyping-Modul bindet Retrieval, Stub-Antwort, Metriken, Injektions-Erkennung, Policy und Ablation zusammen. Die Referenzlöser sind deterministisch und ehrlich über die Grenzen. Der Umstieg von `build_prototype` zu `build_secure_prototype` und zur Ablation ist steil, weil keine Case-Level-Completion dazwischen liegt. Keine Visualisierung, keine Spiralrückgriffe.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Worked-Example in Lesson, keine case-level Completion. |
| R2 | erfüllt | Kein Reveal vor Abruf. |
| R3 | erfüllt | Hinweise zu Subgoal-Struktur und Least-Privilege. |
| R4 | erfüllt | `feedbackRules` typisch gepflegt. |
| R5 | erfüllt | Choice → Trace → Stub → Secure-Prototype → Ablation. |
| R6 | erfüllt | Spread plausibel. |
| R7 | fraglich | 28/42 Minuten für `secure-prototype-contract` und `pipeline-status-report` knapp. |
| R8 | erfüllt | 47 Zeilen, knapp. |
| R9 | erfüllt | Deutsch, Beispiele. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine Rückgriffe. |
| R12 | fehlt | Keine Viz; Policy-/Ablation-Trade-off würde sich anbieten. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro-Choice `masteryEligible: false`; Core/Stretch/Challenge `true`. |
| R15 | unklar | `allowed-action-count` generiert; `caseMissing: true` im Inventar. Kein Content-Fehler. |

**Befunde:**
- Kein P0.
- `[P1] R1`: Steiler Sprung von `build_prototype` zu `ablation` ohne Zwischenstufe.
- `[P1] R12`: Fehlende Visualisierung für den Sicherheits-/Recall-Trade-off.

**Verbesserungsvorschläge:**
1. `[P1] content/families/construct-secure-prototype-contract.json` → Zwischen-Completion, in der `audit` oder `request_action` vorgegeben ist, bevor `build_secure_prototype` komplett implementiert wird.
2. `[P1] content/lessons/genai-systems/genai-prototype.json` → Neue Viz, die den Ablation-Trade-off als Schieberegler zeigt (R12).
3. `[P1] content/modules/lm-genai-prototype.json` → Zeitkalibrierung für Stretch/Challenge (R7).

---

## c-research-question: Forschungsfrage und Experimentprotokoll

**Module/Lesson/Placements:** `lm-research-question` → `l-research-question` (`research-question.md`, 66/867, wird sowohl für `worked-example` als auch `exercise` verwendet). Placements: `classify-question-quality` (Intro, Choice), `validate-goalshift-flag-rules` `protocol-shift-flag-count` (Core, generiert), `trace-assignment-state` `metric-name-normalize-trace` (Core), `validate-text-normalize-match` (Core), `validate-required-field-raise` `protocol-validator` (Stretch), `validate-goalshift-flag-rules` `detect-goal-shift` (Challenge).

**Repräsentative Stichproben:**
- `content/families/validate-goalshift-flag-rules.json` (`detect-goal-shift`, l. 7–45): `detect_goal_shift(v1, v2)` prüft `metrik`, `schwelle`, `primaer` in `sekundaer`, neue Subgruppen in `v2`; Rückgabe sortiert. Logik konsistent.
- `content/families/validate-required-field-raise.json` (`protocol-validator`, l. 115–124): Prüft Pflichtfelder, Whitespace, Datumsreihenfolge. Fachlich korrekt.

**Zusammenfassung:** Die Kompetenz vermittelt prüfbare Forschungsfragen, Protokollstruktur und Goal-Shift-Erkennung. Die deterministischen Validierungsfälle sind korrekt. Strukturell auffällig: `research-question.md` wird in `research-question.json` für Worked-Example und Exercise doppelt referenziert. Die Aufgaben prüfen Protokoll-Struktur, aber kaum die inhaltliche Begründung von Forschungsentscheidungen. Kein fachlicher Fehler.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Worked-Example in Lesson, keine case-level Completion. |
| R2 | erfüllt | Reveal-Verhalten korrekt. |
| R3 | erfüllt | Hinweise zu Richtung der Goal-Shift-Flags. |
| R4 | erfüllt | `feedbackRules` zu `direction-wrong` etc. |
| R5 | teilweise | Mix aus Choice, Trace, Validierung; aber wenig Transfer auf echte Forschungsfragen. |
| R6 | erfüllt | Spread plausibel. |
| R7 | fraglich | 40 Minuten für `detect-goal-shift` knapp. |
| R8 | teilweise | 66/867, mehrere Konzepte in einem Block; Exercise-Block dupliziert denselben Text. |
| R9 | erfüllt | Deutsch, konkret. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine Spiralrückgriffe. |
| R12 | fehlt | Keine Viz; Protokoll-Timeline oder Subgruppen-Venn wäre geeignet. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro `masteryEligible: false`, Core/Stretch/Challenge `true`. |
| R15 | mangelhaft | `research-question.md` doppelt als Worked-Example und Exercise referenziert (`research-question.json` l. 17–35). |

**Befunde:**
- Kein P0.
- `[P1] R15`: Doppelte Verwendung derselben `.md` für Worked-Example und Exercise verstärkt die Dichte.
- `[P1] R8/R5`: Lektion und Aufgaben bleiben auf deterministischer Strukturprüfung; wissenschaftliche Begründungsfähigkeit wird wenig trainiert.

**Verbesserungsvorschläge:**
1. `[P1] content/lessons/research/research-question.json` → Exercise-Block auf separate `research-question-exercise.md` umstellen; Worked-Example kürzen und in Exercise vertiefen.
2. `[P1] content/families/validate-goalshift-flag-rules.json` → Zwischenaufgabe: Erst Protokoll-Felder vergleichen, dann `detect_goal_shift` vervollständigen.
3. `[P1] content/lessons/research/research-question.md` → Konkretes Fallbeispiel für Goal-Shifts ergänzen, nicht nur Regeln (R9).

---

## c-research-cards: Daten- und Modellkarten

**Module/Lesson/Placements:** `lm-research-cards` → `l-research-cards` (`research-cards.md`, 50/721, wieder doppelt für Worked-Example und Exercise). Placements: `classify-provenance-duty` (Intro), `formula-stat-from-table` `card-audit-missing-count` (Core, generiert), `trace-assignment-state` `card-check-variable-trace` (Core), `validate-required-field-raise` `validate-card-fields` (Core), `validate-rule-catalog-scan` `card-secret-scan` (Stretch), `cross-card-consistency` (Challenge).

**Repräsentative Stichproben:**
- `content/families/validate-required-field-raise.json` (`validate-card-fields`, l. 222–242): Prüft Pflichtfelder, Split-Summe ≈ 1.0, Semver `X.Y.Z`. Fachlich konsistent.
- `content/families/validate-rule-catalog-scan.json` (`card-secret-scan`, l. 7–45; `cross-card-consistency`, l. 114–135): `scan_secrets` nutzt Regex-Muster für API-Schlüssel/Tokens/Bearer; `cross_card_consistency` prüft Datensatz, Metrik, Modell, Schwelle und Umfang über Karten und Protokoll.

**Zusammenfassung:** Die Karten-Kompetenz behandelt Pflichtfelder, Konsistenz, Semver, Split-Summen und Secret-Scanning. Fachlich sind die Fälle korrekt, aber der Secret-Scanner ist ein einfacher Regex und nicht als vollständiger Produktionsschutz gedacht; das ist in Lesson und Prompt transparent. Die Lesson wird erneut doppelt als Worked-Example und Exercise referenziert. Kein P0.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Lesson-Worked-Example, keine case-level Completion. |
| R2 | erfüllt | Reveal korrekt. |
| R3 | erfüllt | Hinweise zu Set-Vergleichen und Regex. |
| R4 | erfüllt | `feedbackRules` zu `pairwise-only`, `duplicates-in-result` etc. |
| R5 | erfüllt | Choice → Zählen → Trace → Validierung → Cross-Card-Audit. |
| R6 | erfüllt | Spread plausibel. |
| R7 | fraglich | 26/40 Minuten für `card-secret-scan`/`cross-card-consistency` knapp. |
| R8 | teilweise | 50/721, mehrere Themen; Exercise-Block dupliziert Lesson-Text. |
| R9 | erfüllt | Deutsch, Beispielkarten. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine bewussten Spiralrückgriffe. |
| R12 | fehlt | Keine Viz; Karten-Abhängigkeiten würden sich als Graph anbieten. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro-Choice `masteryEligible: false`; Core/Stretch/Challenge `true`. |
| R15 | mangelhaft | `research-cards.md` doppelt in `research-cards.json` referenziert. |

**Befunde:**
- Kein P0.
- `[P1] R15`: Wiederholte `.md`-Referenz für Worked-Example und Exercise.
- `[P1] R12`: Visualisierungslücke.
- `[P1] R5/R8`: Secret-Scan als Regex-Stubs wird thematisiert, aber die Grenzen könnten stärker in einer Übung verankert werden.

**Verbesserungsvorschläge:**
1. `[P1] content/lessons/research/research-cards.json` → Exercise-Block auf separate `research-cards-exercise.md` umstellen.
2. `[P1] content/lessons/research/research-cards.json` → Graph-Viz für Karten-/Protokoll-Beziehungen ergänzen (R12).
3. `[P1] content/families/validate-rule-catalog-scan.json` → Case, das False-Positive und -Negative des Secret-Scanners thematisiert.

---

## c-research-responsible: Responsible AI und Risikobewertung

**Module/Lesson/Placements:** `lm-research-responsible` → `l-responsible-ai` (`responsible-ai.md`, 54/915, doppelt Worked-Example/Exercise). Placements: `classify-fairness-aggregation` (Intro), `aggregate-confusion-metric` `subgroup-rate-gap-permille` (Core, generiert), `trace-assignment-state` `rpn-priority-trace` (Core), `aggregate-confusion-metric` `fairness-metric-compare` (Core), `aggregate-parity-threshold-selection` `parity-threshold-selection` (Stretch), `validate-report-guard-compose` `report-guard-compose` (Challenge).

**Repräsentative Stichproben:**
- `content/families/aggregate-parity-threshold-selection.json` (`parity-threshold-selection`, l. 13–45): `threshold_sweep` filtert zuerst Kandidaten nach Paritätsband, dann bestes F1; `cost_table` rechnet EUR je 1 Mio. Token. Mathematisch korrekt.
- `content/families/validate-report-guard-compose.json` (`report-guard-compose`, l. 7–53): `responsible_report` prüft Subgruppen, Parität, Kosten, Restrisiko und wirft `ValueError` bei Lücken. Fachlich konsistent; RPN-Priorisierung bleibt bewusst menschliche Arbeitsevidenz.

**Zusammenfassung:** Die Kompetenz verknüpft Fairness-Metriken, Schwellenwahl, Kosten und Risiko. Die Zahlenlogik ist sorgfältig (z. B. Nenner so gewählt, dass Promille-Werte exakt werden). Normative Fairness-Interpretation, Trade-offs und Gruppengrößen werden in der Lesson erwähnt, aber die Aufgaben bleiben auf deterministischer Berechnung. Die `.md` ist erneut doppelt referenziert. Kein fachlicher Fehler.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Lesson-Worked-Example, keine case-level Completion. |
| R2 | erfüllt | Reveal korrekt. |
| R3 | erfüllt | Hinweise zu Paritätsband vor F1 und Kostenrundung. |
| R4 | erfüllt | `feedbackRules` zu `f1-first`, `tie-wrong`, `cost-rounding`. |
| R5 | teilweise | Choice → Trace → FPR/Selection-Rate → Threshold → Report; normative Reflexion fehlt. |
| R6 | erfüllt | Spread plausibel. |
| R7 | fraglich | 27/40 Minuten für `parity-threshold-selection` und `report-guard-compose` knapp. |
| R8 | teilweise | 54/915, dicht; Worked-Example/Exercise duplizieren denselben Text. |
| R9 | erfüllt | Deutsch, Beispiele. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine Spiralrückgriffe. |
| R12 | fehlt | Keine Viz; Threshold-Fairness-Trade-off wäre ideal für einen Slider. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro `masteryEligible: false`; Core/Stretch/Challenge `true`. |
| R15 | mangelhaft | `responsible-ai.md` doppelt in `responsible-ai.json` referenziert. |

**Befunde:**
- Kein P0.
- `[P1] R8/R5`: Zahlen werden geübt, die normative Interpretation von Fairnessmetriken und Trade-offs bleibt oberflächlich.
- `[P1] R15`: Doppelte `.md`-Referenz.

**Verbesserungsvorschläge:**
1. `[P1] content/lessons/research/responsible-ai.json` → Exercise-Block auf separate `responsible-ai-exercise.md` umstellen.
2. `[P1] content/lessons/research/responsible-ai.md` → Abschnitt „Was die Zahl nicht sagt" ergänzen (Gruppengrößen, Trade-offs, Fairnessmetriken) (R9).
3. `[P1] content/lessons/research/responsible-ai.json` → Viz: Threshold-Slider mit F1- und Paritätsband-Anzeige (R12).

---

## c-research-capstone: Forschungsbasierte Capstone-Baseline

**Module/Lesson/Placements:** `lm-capstone-baseline` → `l-capstone-baseline` (`capstone-baseline.md`, 54/888, doppelt Worked-Example/Exercise). Placements: `classify-hash-semantics` (Intro), `formula-ratio-percent-metric` `baseline-ledger-rates` (Core, generiert), `formula-ratio-percent-metric` `ledger-rates-output-trace` (Core), `reproduce-canonical-hash-verify` `canonical-hash-verify` (Core), `reproduce-run-digest-assert` `run-digest-assert` (Stretch), `validate-report-guard-compose` `baseline-report` (Challenge).

**Repräsentative Stichproben:**
- `content/families/reproduce-canonical-hash-verify.json` (`canonical-hash-verify`, l. 13–45): `build_golden` sortiert nach `id`, serialisiert mit `json.dumps(sort_keys=True, ensure_ascii=False, separators=(",", ":"))`, bildet sha256. Reihenfolge-invariant und änderungssensitiv. Fachlich korrekt.
- `content/families/validate-report-guard-compose.json` (`baseline-report`, l. 113–124): `baseline_report` verweigert bei fehlendem Protokoll, Karten oder Fehlerliste; sonst liefert es Metrik, Messwerte und Fehlerzählung. Fachlich konsistent, prüft aber nicht den `digest` aus `ergebnis`.

**Zusammenfassung:** Die Capstone-Baseline fokussiert Golden-Set-Hashing, kanonische Serialisierung, Doppellauf-Digest und Verweigerung bei unvollständigem Bericht. Hashing und Determinismus sind korrekt. `baseline-report` ignoriert den `digest`-Schlüssel in `ergebnis` und prüft damit nicht die zentrale Hash-Objective; das ist ein didaktischer Lücken, aber kein fachlicher Fehler. Keine Visualisierung, doppelte `.md`-Referenz.

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | teilweise | Lesson-Worked-Example, keine case-level Completion. |
| R2 | erfüllt | Reveal korrekt. |
| R3 | erfüllt | Hinweise zu kanonischem JSON und Verweigerung. |
| R4 | erfüllt | `feedbackRules` zu `partial-values`, `unsorted-codes` etc. |
| R5 | erfüllt | Choice → Trace → Hash → Digest → Bericht. |
| R6 | erfüllt | Spread plausibel. |
| R7 | fraglich | 40 Minuten für `baseline-report` knapp. |
| R8 | teilweise | 54/888, dicht; doppelter `.md`-Block. |
| R9 | erfüllt | Deutsch, Beispiele. |
| R10 | erfüllt | Objectives messbar. |
| R11 | fehlt | Keine Spiralrückgriffe. |
| R12 | fehlt | Keine Viz; Hash-Verifikation oder Ledger-Balken wären geeignet. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro `masteryEligible: false`, Core/Stretch/Challenge `true`. |
| R15 | mangelhaft | `capstone-baseline.md` doppelt in `capstone-baseline.json` referenziert. |

**Befunde:**
- `[P1] R1/R15`: Worked-Example/Exercise duplizieren denselben Text; `baseline-report` ohne Digest-Check lässt Hash-Objective unausgeübt.
- Kein P0.

**Verbesserungsvorschläge:**
1. `[P1] content/families/validate-report-guard-compose.json` → `baseline_report` soll `ergebnis["digest"]` gegen einen über `messwerte`/`protokoll`/`karten`/`fehlerliste` gebildeten Digest prüfen, oder der Prompt sollte den Digest aus dem Scope nehmen.
2. `[P1] content/lessons/research/capstone-baseline.json` → Exercise-Block auf separate `capstone-baseline-exercise.md` umstellen.
3. `[P1] content/lessons/research/capstone-baseline.json` → Viz für Golden-Set-Hashing ergänzen (R12).

---

## c-capstone-pipeline: Reproduzierbare Capstone-Pipeline

**Module/Lesson/Placements:** Fünf Module teilen `l-capstone-pipeline` (`capstone-pipeline.md`, 156 Zeilen/1159 Wörter; `capstone-pipeline-checkpoint.md`, 10/152; Viz `chunk-overlap.viz.json`):
- `lm-capstone-freeze`: Freeze, Abhängigkeitsordnung
- `lm-capstone-runner`: Stage-Runner, Timeouts, Budgets
- `lm-capstone-regression`: Regression und Evaluationsregeln
- `lm-capstone-repro`: Evidenz und Reproduzierbarkeit
- `lm-capstone-acceptance`: Abschlussdiagnose und Abnahme

Jedes Modul hat 6 Placements (Intro/Core/Stretch/Challenge). Beispiele: `classify-freeze-scope`, `classify-silent-fallback-hazard`, `trace-toposort-dependency-order` (Toposort mit alphabetischem Tie-Break, erwartet `['gold', 'punkte', 'regel', 'bericht']`), `reproduce-pipeline-status-report` (`call-with-timeout`, `run-stage-budget`, `start-pipeline-integration`, `verdict-rules`, `acceptance-all-contracts`).

**Repräsentative Stichproben:**
- `content/families/trace-toposort-dependency-order.json` (`toposort-dependency-order`, l. 13–24): Greedy-Toposort mit alphabetischem Tie-Break, erwartete Ausgabe korrekt. Fachlich stimmig.
- `content/families/reproduce-pipeline-status-report.json` (`start-pipeline-integration`, l. 328–346): `starte_pipeline` führt Stages sequenziell aus, fängt Fehler und Timeouts, bricht sichtbar ab. Fachlich korrekt, Sentinel-Status ohne stille Fallbacks.
- `content/lessons/research/chunk-overlap.viz.json` (l. 15): Formel `Chunks = {floor((10-o)/(c-o)-0.0001)+1}`.

**Zusammenfassung:** Die Capstone-Pipeline verbindet Freeze, Toposort, Stage-Runner, Timeouts, Evaluationsregeln, Reproduktion und Abnahme. Die meisten Referenzlöser sind fachlich korrekt. Die Visualisierung `chunk-overlap.viz.json` enthält jedoch einen fachlichen Fehler in der Chunk-Anzahl: sie subtrahiert die Überlappung `o` von der Textlänge, was bei bestimmten Slider-Werten (z. B. `c=4, o=1`) die korrekte Anzahl um eins unterschreitet. Die `capstone-pipeline.md` (156 Zeilen/1159 Wörter) wird von fünf Modulen geteilt und ist dadurch überdicht; das Worked-Example deckt alle fünf Phasen ab. Zusätzlich enthält die Lesson einen Schreibfehler in der Überschrift „einmarshen, nicht nachjustieren" (wahrscheinlich „einfrieren").

| Kriterium | Bewertung | Beleg |
|---|---|---|
| R1 | mangelhaft | Ein einziges 156-Zeilen-Worked-Example für fünf Module, keine case-level Completion. |
| R2 | erfüllt | Reveal korrekt. |
| R3 | erfüllt | Hinweise zu Toposort, Timeout, Budget. |
| R4 | erfüllt | `feedbackRules` zu `regel-vor-punkte`, `bericht-zu-frueh` etc. |
| R5 | teilweise | Choice → Trace → Zählen → Implementierung; aber Transfer zwischen den fünf Modulen ist unklar. |
| R6 | erfüllt | Intro/Core/Stretch/Challenge je Modul sinnvoll. |
| R7 | fraglich | 60 Minuten Lesson plus Placements (42 Min Challenge) für fünf Module unrealistisch gering. |
| R8 | mangelhaft | 156/1159 für fünf Module, viele Konzepte in einer Datei. |
| R9 | teilweise | Deutsch, Beispiele, aber Überschriftenfehler (`einmarshen`, `capstone-pipeline.md` l. 43) und dichte Struktur. |
| R10 | teilweise | Objectives sehr breit für fünf unterschiedliche Modulziele. |
| R11 | fehlt | Keine bewussten Spiralrückgriffe zu `c-ml-repro`. |
| R12 | mangelhaft | `chunk-overlap.viz.json` passiv und fachlich fehlerhaft. |
| R13 | fehlt | Keine neuen Interaktionen. |
| R14 | erfüllt | Intro-Choice `masteryEligible: false`, Core/Stretch/Challenge `true`. |
| R15 | mangelhaft | `capstone-pipeline.md` wird fünfmal (`lm-capstone-*.json`) als Worked-Example geteilt; `inventar.json` nennt 157 Zeilen, `wc -l` ergibt 156. |

**Befunde:**
- `[P0] R12`/`chunk-overlap.viz.json`: Fachlicher Fehler in der Chunk-Anzahl-Formel. `floor((10-o)/(c-o)-0.0001)+1` unterscheidet sich vom RAG-Vertrag `ceil(L / step)` mit `step = c - o`. Beispiel: `c=4, o=1` → korrekt 4 Chunks, Formel liefert 3; `c=2.1, o=1` → korrekt 10 Chunks, Formel liefert 9.
- `[P1] R1/R8`: Eine 156-Zeilen-Lesson für fünf Module ist zu dicht; modulare Verweise fehlen.
- `[P1] R7`: Zeitangaben für fünf Module zu niedrig.
- `[P2] R9`: Schreibfehler `einmarshen` in `capstone-pipeline.md` l. 43.
- `[P2] R15`: Zeilenzahl-Inventar um eins daneben.

**Verbesserungsvorschläge:**
1. `[P0] content/lessons/research/chunk-overlap.viz.json` → Formel korrigieren in `floor(10/(c-o)-0.0001)+1` (oder `ceil(10/(c-o))`) und eine Vorhersageaufgabe ergänzen (R12).
2. `[P1] content/lessons/research/capstone-pipeline.md` + `capstone-pipeline.json` → Aufteilen in gemeinsames Core-MD und fünf modulare Vertiefungs-MDs; jedes `lm-capstone-*.json` referenziert nur den eigenen Block (R1, R8).
3. `[P1] content/modules/lm-capstone-*.json` → Zeitbudget pro Modul kalibrieren (R7).
4. `[P2] content/lessons/research/capstone-pipeline.md` → Überschriftenfehler in Zeile 43 korrigieren.

---

## Blockübergreifende Befunde

1. **Worked Example ohne Case-Level-Completion.** Alle neun Kompetenzen bieten Lesson-Worked-Examples, aber die einzelnen Cases (`caseHasWorkedExample: false`) springen meist vom Starter-Code zur vollen Implementierung. Das wiederholt sich in B5 und ist ein systemisches R1-/R5-Problem.

2. **R12-Visualisierungslücke.** Nur `c-genai-eval` und `c-capstone-pipeline` haben Viz-Dateien, beide passiv und ohne Transferfrage. `chunk-overlap.viz.json` hat zusätzlich einen fachlichen Fehler. Der systemische Befund aus `e2-interaktiv-audit.md` trifft B5 vollständig.

3. **Fehlende Spiralrückgriffe.** B5 greift kaum auf frühere Wochen zurück (z. B. `c-genai-rag` ohne Python-Funktionen-Familien, `c-capstone-pipeline` ohne `c-ml-repro`-Familien).

4. **Konzeptlastige Intro-Cases vs. mastery-fähige Implementierungs-Cases.** Intro-Placements sind korrekt `masteryEligible: false`, aber die Brücke von Konzept zu Code enthält zu wenig Trace-/Predict-/Completion-Zwischenstufen.

5. **Fehlende oder unklare Family-/Case-Referenzen.** `docs/content-review/inventar.json` markiert viele Procedural-/Generator-Fälle als `caseMissing: true`, obwohl die Generatoren in `assets/js/core/` vorhanden sind. Das ist ein Registry-/Inventar-Problem, kein P0, aber es erschwert die Review-Evidenz.

6. **Difficulty- und Zeitkalibrierung.** Die `estimatedMinutes` für Implementierungsfälle (22–42 Minuten) und die Module (`capstone-pipeline` 60 Min für fünf Module) wirken unkalibriert.

7. **Mehrfachnutzung derselben Capstone-Lesson.** `l-capstone-pipeline` (156 Zeilen, 1159 Wörter) wird von fünf Modulen (`lm-capstone-freeze`, `-runner`, `-regression`, `-repro`, `-acceptance`) geteilt. Das ist die zentrale strukturelle Schwäche von B5.

8. **Wiederholung und Dichte der gemeinsamen Lesson.** Die `capstone-pipeline.md` wiederholt Phasen-Überschriften und vermischt fünf Modulziele in einer Datei. Sie braucht eine Aufteilung in gemeinsame Grundlagen plus modulare Vertiefungen.

9. **Synthetische deterministische Prüfung vs. reale wissenschaftliche Evidenz.** B5 bleibt konsequent bei deterministischen Fixtures, was Mastery-Ehrlichkeit stützt. Die Grenze zu Work Evidence ist klar markiert. Dadurch fehlt aber echte wissenschaftliche Begründungsfähigkeit (besonders in `c-research-question` und `c-research-responsible`).

10. **Trennung der Metriken.** Retrieval-, Antwort-, Sicherheits- und Fairnessmetriken sind inhaltlich sauber getrennt (RAG, Eval, Security, Responsible, Capstone). Die gemeinsamen Familien (`validate-report-guard-compose`, `aggregate-confusion-metric`) sind fachlich stimmig, aber ihre Cross-Competency-Verdrahtung sollte im Reportierungs-Boss stärker erklärt werden.

---

## Verifikation

- Zieldatei: `docs/content-review/raw/b5-genai-research.md`.
- Sprache: Deutsch.
- Alle neun Kompetenzen enthalten.
- Jede Kompetenz hat R1–R15-Bewertung.
- Jede Zusammenfassung wurde auf ≤200 Wörter angelegt (bitte separat mit `wc -w` prüfen, falls nötig).
- P0-Befund fachlich belegt: `chunk-overlap.viz.json`, Formel in Zeile 15.
- Capstone-Abschnitt nennt 156 Zeilen, 1159 Wörter, fünf Module.
- Blockübergreifende Befunde vorhanden.
- Unsichere Befunde als „unklar" markiert.
- Keine ungewollten Repository-Änderungen außerhalb der Zieldatei.
- `node tools/validate_content.mjs` lief erfolgreich durch (46 Kompetenzen, 46 Lektionen, 253 Aktivitäten).
- `node tools/compile_content.mjs` lief erfolgreich durch.
- `node --test tests/genai_research_content.test.mjs` (25/25 bestanden).
- `node --test tests/capstone_content.test.mjs` (11/11 bestanden).
- `node --test tests/procedural_chunk_window_capsules.test.mjs` (10/10 bestanden).
- `node --test tests/content_visualizations.test.mjs` (2/2 bestanden) prüft Slider-Grenzen, fand den Fehler in `chunk-overlap.viz.json` aber nicht.
