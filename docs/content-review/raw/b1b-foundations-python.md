# B1b: Foundations Python — Content-Review

**Scope:** c-python-basics, c-python-reading, c-python-functions, c-python-control-flow, c-python-collections, c-python-files-errors, c-testing-debugging, c-git-basics.  
**OWNED PATH:** `docs/content-review/raw/b1b-foundations-python.md`  
**Pflichtlektüre:** `docs/content-review/rubrik.md`, `docs/content-review/raw/e1-evidenz-remap.md`, `docs/content-review/raw/e2-interaktiv-audit.md`, `docs/authoring-guide.md`, `docs/content-review/inventar.json`.

## Methodik

Geprüft pro Kompetenz:

- `content/modules/<module>.json` (Placements, Mastery-Eligibility)
- `content/lessons/foundations/<lesson>.json` + `.md` (Objectives, Worked Example, Copy)
- referenzierte `content/families/*.json`
- `content/competencies/core.json` für `evidencePolicy.minimumDistinctDefinitions`
- `content/lessons/foundations/*.viz.json`
- `docs/content-review/rubrik.md` R1–R15

Repräsentative Fälle wurden mental getraced, `expected` gegen Referenzrechnung geprüft, Distraktoren / `feedbackRules` bewertet. P0 = fachliche Fehler / echte Lücken / Mastery-Ehrlichkeit verletzt, P1 = evidenzbelegte Verbesserung, P2 = Polish.

---

## Zentrale Befunde

1. **Mastery-Pfade in 6 von 8 Kompetenzen nicht erreichbar.** Familien fehlen, oder die Curated-Placements verweisen auf nicht existierende `caseId`s. `evidencePolicy.minimumDistinctDefinitions: 2` in `content/competencies/core.json` kann derzeit für keinen der Python-Foundations-Blöcke erfüllt werden (R14/R15, P0).
2. **c-python-basics / c-python-reading / c-python-functions** teilen sich `content/families/trace-assignment-state.json`, aber die konkreten `caseId`s der Placements fehlen. Die verfügbaren Fälle mit `c-python-basics`-/`c-python-reading`-Tags sind zudem DL/NumPy-lastig (`c-dl-attention`, `c-numpy-basics`) und damit für den Lesson-Einstieg zu schwer.
3. **Keine Parson-Aufgaben** im gesamten Python-Foundations-Block, obwohl `authoring-guide.md` §4 und E1 (G-14/OF-4) diese als Code-Sequenzierungs-Fälle erwarten.
4. **Alle 3 Visualisierungen** des Blocks (`function-composition.viz.json`, `threshold-branch.viz.json`, `running-sum.viz.json`) haben keine gekoppelte Transfer-/Vorhersagefrage (E2, R12).
5. **Kein case-level Completion-Fading** (`workedExample`-Block). E1 (G-06/G-15) bleibt offen.

---

## c-python-basics — Python-Grundlagen

**Gelesen:** `content/modules/lm-foundations-python-state.json:1-54`; `content/lessons/foundations/python-state.json:1-17` + `.md:1-57`; `content/families/trace-assignment-state.json`; `docs/content-review/inventar.json:402-498`.

**Zusammenfassung.** Die Lektion erklärt Zuweisungen, Wert/Typ und Tracetabellen klar und konkret. Das Modul verweist aber in den Curated-Placements (`reassign-two-variables-print`, `accumulate-reassign-print`) auf zwei `caseId`s, die in `trace-assignment-state` nicht existieren (`inventar.json:452-478`, `caseMissing: true`). In derselben Familie existieren zwar vier Fälle mit `competencyIds: [..., c-python-basics]` (`stable-softmax-rows-trace:945`, `char-encode-roundtrip-trace:1090`, `freeze-param-filter-trace:1235`, `absolute-vs-relative-gain-trace:1380`), aber sie sind alle `difficultyProfile: core`, verwenden fortgeschrittene DL/NumPy-Themen und passen nicht zum intro-artigen Lesson. Kein Mastery-Nachweis über die vorgesehenen Placements ist erreichbar.

**Repräsentative Fälle.**

1. `trace-assignment-state.json:945` `stable-softmax-rows-trace` (predict-output): `row_softmax([2,0])` → `[0.881, 0.119]`; `row_softmax([0,1,1])` → `[0.155, 0.422, 0.422]`. Mentaler Trace: `max` abziehen, `exp(x-m)`, Summe, runden — korrekt. Distraktoren und `feedbackRules` sind brauchbar, aber der Case ist für `c-dl-attention` + `c-python-basics` zu komplex.
2. `trace-assignment-state.json:1380` `absolute-vs-relative-gain-trace` (code-trace): `a1=6, r1=8, a2=12, r2=5` — fachlich korrekt, wiederum `core` und `c-dl-papers`-lastig.
3. Fehlend: `reassign-two-variables-print` und `accumulate-reassign-print` (predict-output mit einfachen Zuweisungen).

**R1–R15.** R1 Lesson-Worked-Example ok, aber kein case-level Completion-Fading. R2 predict-output erzwingt Abruf. R3/R4 für die 4 getaggten Fälle brauchbar, für fehlende Fälle nicht vorhanden. R5 nur predict-output/code-trace, kein Code-Schreiben, kein Parson. R6 intro-Placement zeigt auf `core`-Fälle. R8/R9/R10 Lektion gut. R11 keine Spiralrückgriffe. R12 keine Visualisierung. R14 Mastery über Curated-Placements nicht erreichbar. R15 `caseId`s der Placements existieren nicht.

**Befunde.**

- [P0] `content/modules/lm-foundations-python-state.json:22-42` → Curated-Placements verweisen auf nicht existierende `caseId`s in `content/families/trace-assignment-state.json`; Mastery-Definitionen nicht erreichbar (R14/R15, echte Lücke).
- [P1] `content/families/trace-assignment-state.json:945-1665` → Die vier `c-python-basics`-getaggten Fälle sind DL/NumPy-lastig und `core`; sie decken die Lektionsziele „Werte, Typen, Zuweisungen" nicht ab (R5/R6/R8).
- [P1] `content/modules/lm-foundations-python-state.json:1-54` → Keine Parson-/Code-Trace-Fälle für reine Zuweisungsreihenfolge (R5, G-14/OF-4).
- [P2] `content/lessons/foundations/python-state.md:50-55` → Kurzer Abruf korrekt, aber ohne verknüpftes Mastery-Case.

**Top 3 Vorschläge.**

1. Erstelle in `content/families/trace-assignment-state.json` (oder einer neuen Familie `trace-python-state`) die Fälle `reassign-two-variables-print` (intro) und `accumulate-reassign-print` (core) als predict-output/code-trace mit einfachen `int`/`str`-Zuweisungen, `competencyIds: [c-python-basics]`, `difficultyProfile: intro/core`, `expected.kind`, `graderId: deterministic`, Hinweisen und `feedbackRules` (R14/R15, R5, R6).
2. Neue Parson-Familie `parsons-assignment-order` mit 4–5 Code-Zeilen (inkl. Distraktor „`a = a + 1` vor `a = 0`") (R5, G-14, @ericsonparsons2017).
3. Passe `content/modules/lm-foundations-python-state.json` an, sodass die neuen intro-Fälle verknüpft sind (R15, R11).

---

## c-python-reading — Python-Code lesen und tracen

**Gelesen:** `content/modules/lm-foundations-code-reading.json:1-72`; `content/lessons/foundations/code-reading.json:1-17` + `.md:1-49`; `content/families/trace-assignment-state.json`, `trace-call-composition.json`; `docs/content-review/inventar.json:500-628`.

**Zusammenfassung.** Das Modul will „Slices, Comprehensions und zusammengesetzte Aufrufe" lesen (`code-reading.json:7`), die Lektion behandelt aber nur `for`-Schleifen und `range` (`code-reading.md:5-49`). Alle vier Curated-Placements (`slice-predict-output`, `comprehension-predict`, `both-orders-linear-functions`) verweisen auf nicht existierende `caseId`s (`inventar.json:552-607`, `caseMissing: true`). In `trace-assignment-state` gibt es viele `c-python-reading`-getaggte Fälle, darunter ein `intro`-Case (`column-picture-trace:2711`), doch keiner ist durch das Modul verlinkt. Lesefertigkeit wird inhaltlich angesprochen, aber als operabler Mastery-Pfad und Pfad-Gate nicht umgesetzt.

**Repräsentative Fälle.**

1. `trace-assignment-state.json:2711` `column-picture-trace` (code-trace, intro): `b0 = 1·2 + 2·1 = 4`, `b1 = 1·1 + 2·3 = 7` — fachlich korrekt, klare Hinweise. Wäre ein gutes intro-Case, ist aber nicht im Modul platziert.
2. `trace-assignment-state.json:152` `tree-majority-vote-trace` (code-trace, core): `predict((4,3))=0`, `predict((6,3))=0`, `predict((6,5))=1` → `votes=1`, `pred=0` — korrekt.
3. `trace-assignment-state.json:361` `rng-stream-reseed-trace` (predict-output): Erwartet `26`. Fachlich nicht unabhängig verifizierbar, da der Wert von der konkreten NumPy-PCG64-Implementierung abhängt (Risiko).

**R1–R15.** R1 Worked Example ok, kein case-level Fading. R2 predict-output erzwingt Abruf. R3/R4 bei `trace-assignment-state`-Fällen brauchbar, fehlende Fälle haben keine. R5 Lektion deckt Slices/Comprehensions nicht ab. R6 intro-Placement `slice-predict-output` fehlt. R8/R9/R10 Lektion gut, aber `code-reading.md:34` „Predict, dann Run" ohne konkrete Slice-/Comprehension-Beispiele. R11 keine Spiralrückgriffe. R12 keine Visualisierung. R14 Mastery nicht erreichbar. R15 `caseId`s der Placements existieren nicht.

**Befunde.**

- [P0] `content/modules/lm-foundations-code-reading.json:21-67` → Alle Curated-Placements referenzieren nicht existierende `caseId`s; `minimumDistinctDefinitions: 2` für `c-python-reading` nicht erreichbar (R14/R15).
- [P1] `content/lessons/foundations/code-reading.md:1-49` → Modulbeschreibung nennt Slices und Comprehensions, Lektion behandelt diese nicht. Es fehlen Worked-Examples für String-Slicing und Listen-Comprehension (R8/R10, R5).
- [P1] `content/competencies/core.json:104-122` → `c-python-functions` fordert nur `c-python-basics`, nicht `c-python-reading`, obwohl `trace-call-composition` in beiden Modulen verwendet wird (R11, G-14).
- [P2] `content/families/trace-assignment-state.json:361` → `rng-stream-reseed-trace` ohne `tolerancePolicy` und ohne Hinweis auf Versionsabhängigkeit (R4/R7, fachliches Risiko).

**Top 3 Vorschläge.**

1. Neue Fälle `slice-predict-output` (intro) und `comprehension-predict` (core) in `content/families/trace-assignment-state.json` oder eigene Familie `trace-python-reading`, beide ohne NumPy, mit `competencyIds: [c-python-reading]` und `expected.kind: output-lines` (R14/R15, R5).
2. Lektionserweiterung `content/lessons/foundations/code-reading.md`: Worked-Examples für String-Slicing (`s[1:4]`) und einfache Comprehension (`[x*2 for x in [1,2,3]]`) mit Trace-Tabelle (R8/R10).
3. Mache `c-python-reading` zu einem `requires` von `c-python-functions` in `content/competencies/core.json` (oder zumindest verknüpfe `l-foundations-code-reading` vor `l-foundations-functions`) (R11, G-14).

---

## c-python-functions — Python-Funktionen

**Gelesen:** `content/modules/lm-foundations-functions.json:1-54`; `content/lessons/foundations/functions.json:1-20` + `.md:1-52`; `content/families/trace-call-composition.json`; `content/lessons/foundations/function-composition.viz.json`; `docs/content-review/inventar.json:630-734`.

**Zusammenfassung.** Die Lektion arbeitet den Vertrag `clamp(value, lower, upper)` heraus, unterscheidet `return`/`print` und formuliert Beispiele vor der Implementierung. Das Modul hat zwei Curated-Placements: `p-foundations-functions-two-functions-one-print` referenziert den existierenden Fall `two-functions-one-print` (`inventar.json:685-700`); `p-foundations-functions-both-orders-linear-functions` ist `caseMissing: true` (`inventar.json:702-715`). Damit ist die zweite Mastery-Definition nicht verfügbar. Der eine vorhandene Fall ist formal unvollständig und deckt nur predict-output ab; das Lernziel „Funktionen schreiben und testen" bleibt ohne Code-Schreibaufgabe unerledigt.

**Repräsentative Fälle.**

1. `trace-call-composition.json:7` `two-functions-one-print`: `flaeche(3,4)=12`, `umfang(3,4)=14`, Ausgabe `12 14` — korrekt. Der Fall hat aber keine Hinweise, Feedback, Distraktoren und keine `expected.kind`/`activityType`/`graderId` — nicht Mastery-tauglich.
2. Fehlend: `both-orders-linear-functions` würde `f(g(x))` vs. `g(f(x))` testen.
3. Lektions-Worked-Example `clamp` in `functions.md:16-31`: fachlich korrekt, aber kein Code-Schreib-Placement.

**R1–R15.** R1 Lektion ok, kein case-level Fading. R2 predict-output erzwingt Abruf. R3/R4 Fall `two-functions-one-print` ohne Hinweise/Feedback. R5 nur predict-output; kein Code-Schreiben, kein Parson, keine Testaufgabe. R6 intro (`two-functions-one-print`) und core (`both-orders-linear-functions`) geplant, core fehlt. R8/R9/R10 Lektion sehr gut. R11 keine Spiralrückgriffe. R12 `function-composition.viz.json` ohne Transferfrage. R14 nur eine von zwei Mastery-Definitionen erreichbar. R15 Fall `two-functions-one-print` formal unvollständig.

**Befunde.**

- [P0] `content/modules/lm-foundations-functions.json:33-42` → `both-orders-linear-functions` fehlt. `minimumDistinctDefinitions: 2` kann nicht erfüllt werden (R14/R15).
- [P1] `content/families/trace-call-composition.json:7-43` → `two-functions-one-print` fehlt `competencyIds`, `activityType`, `graderId`, `tolerancePolicy`, `hints`, `feedbackRules`, `typicalErrors` (R15, R3/R4).
- [P1] `content/modules/lm-foundations-functions.json:1-54` → Keine Code-Schreib-Placements; Lernziele „schreiben und testen" werden nicht durch Aufgaben abgedeckt (R5/R10).
- [P1] `content/lessons/foundations/function-composition.viz.json:1-15` → Nur passive Caption, keine Aufgabe (R12/E2).
- [P2] `content/lessons/foundations/functions.md:50-52` → Kurzer Abruf `is_valid_age(text)` bleibt ohne Übungs-Fall.

**Top 3 Vorschläge.**

1. Ergänze `content/families/trace-call-composition.json` um `both-orders-linear-functions` als predict-output (`f(x)=2*x+1`, `g(x)=x**2`; `f(g(3))` vs. `g(f(3))`) mit `difficultyProfile: core`, `competencyIds: [c-python-functions]`, `expected.kind: output-lines`, Hinweisen und `feedbackRules` (R14/R15, R3/R4).
2. Vervollständige `two-functions-one-print`: `activityType: predict-output`, `graderId: deterministic`, `expected.kind: output-lines`, zwei Subgoal-Hinweise und `feedbackRules` für „nur ein Ergebnis"/„Parameter verwechseln" (R3/R4/R15).
3. Neue Code-Schreib-Familie `construct-function-clamp` mit `python-code`/pyodide, Tests für `clamp(5,0,10)`, `clamp(-2,0,10)`, `clamp(13,0,10)` und Assertion-Fall (R5, R1-Fading).

---

## c-python-control-flow — Bedingungen und Schleifen

**Gelesen:** `content/modules/lm-foundations-control-flow.json:1-108`; `content/lessons/foundations/control-flow.json:1-20` + `.md:1-46`; `content/lessons/foundations/threshold-branch.viz.json`; `docs/content-review/inventar.json:1656-1808`.

**Zusammenfassung.** Die Lektion ist didaktisch gut aufgebaut: Bedingungen als Wahrheitsfragen, `for` für Folgen, `while` mit Fortschritt/Ende. Das Modul listet 8 Placements (4 Curated, 4 Practice), aber alle Familien fehlen im Dateisystem. Es gibt also keinen einzigen auflösbaren Fall. Die Visualisierung `threshold-branch.viz.json` zeigt eine verschiebbare ReLU-Funktion, aber keine Aufgabe. Weder Parson- noch code-trace/predict-output-Fälle üben das Lesen von Kontrollfluss vor dem Schreiben.

**Repräsentative Fälle.**

Keine Cases vorhanden. Lektions-Beispiele:
1. `control-flow.md:7-23` `for number in [2,5,1]` mit `else: total = total - 1`: Trace korrekt, Ausgabe `3`.
2. `control-flow.md:27-42` `while remaining > 0`: 10→7→4→1→-2, 4 Durchläufe — korrekt.
3. `control-flow.md:44-46` Gerade-Werte summieren: korrekte Trace-Anleitung, aber kein dazugehöriges Case.

**R1–R15.** R1 Worked Example ok, kein case-level Fading. R2–R4 keine Cases. R5 kein Mix. R6 Placements intro/core, Fälle fehlen. R8/R9/R10 Lektion gut. R11 keine Spiralrückgriffe. R12 `threshold-branch.viz.json` ohne Transferfrage. R14 keine Mastery-Fälle. R15 Familien/Case-Referenzen verweisen ins Leere.

**Befunde.**

- [P0] `content/modules/lm-foundations-control-flow.json:22-103` → Alle 4 referenzierten Familien (`classify-control-construct`, `classify-string-immutability`, `construct-guarded-loop`, `aggregate-accumulator-count`) fehlen in `content/families/` (R15/R14, echte Lücke).
- [P0] `content/competencies/core.json:341-368` → `c-python-control-flow` benötigt 2 distinct Mastery-Definitionen; beide fehlen (R14).
- [P1] `content/lessons/foundations/threshold-branch.viz.json:1-13` → ReLU-Verschiebung ohne Vorhersageaufgabe (R12/E2).
- [P1] `content/modules/lm-foundations-control-flow.json:1-108` → Keine Parson- oder Code-Trace-Fälle, die Mutations-Traces üben (R5, G-14/OF-4).
- [P2] `content/lessons/foundations/control-flow.md:44-46` → Kurzer Abruf gut, aber kein verknüpftes Case.

**Top 3 Vorschläge.**

1. Familien neu anlegen: `classify-control-construct` (choice for vs. while vs. if), `construct-guarded-loop` (python-code oder parsons), `aggregate-accumulator-count` (predict-output/code-trace). Jede mit intro + core + `competencyIds: [c-python-control-flow]` (R14/R15, R5).
2. Parson-Einstieg `parsons-if-elif-else` mit 4–6 Zeilen, die eine einfache Notenfunktion in die richtige Reihenfolge bringen (R5, G-14, @listertracing2004).
3. Viz-Frage in `threshold-branch.viz.json`: „Setze t=1. Für welches x ist `if x > t` wahr? Sage y vorher." (R12/E2).

---

## c-python-collections — Listen, Dictionaries und Sets

**Gelesen:** `content/modules/lm-foundations-collections.json:1-108`; `content/lessons/foundations/collections.json:1-20` + `.md:1-54`; `content/lessons/foundations/running-sum.viz.json`; `docs/content-review/inventar.json:1810-1962`.

**Zusammenfassung.** Die Lektion ist sauber: Liste/Dict/Set über Zugriff und Invarianten unterscheiden, Häufigkeiten zählen, Duplikate erkennen. Das Kurze-Abruf-Szenario (CSV-Prüfung) ist praxisnah. Das Modul listet 9 Placements, aber alle referenzierten Familien fehlen. Es gibt keine code-trace-Fälle für `append`/`add`/Dict-Zuweisung, keine choice-Fälle für passende Collection-Wahl und keine Set-Operations-Aufgabe. Die Visualisierung `running-sum.viz.json` zeigt nur eine Kurve, ohne Frage. Mastery ist unmöglich.

**Repräsentative Fälle.**

Keine Cases vorhanden. Lektions-Beispiele:
1. `collections.md:11-26` Häufigkeiten zählen: `counts`-Entwicklung korrekt.
2. `collections.md:28-39` Duplikate erkennen: `seen`-Set und `duplicates`-Liste korrekt.
3. `collections.md:48-53` CSV-Prüfung: Strukturwahl plausibel, aber ohne zugehöriges Case.

**R1–R15.** R1 Worked Example ok, kein case-level Fading. R2–R4 keine Cases. R5 kein Mix. R6 Placements intro/core, Fälle fehlen. R8/R9/R10 Lektion gut. R11 keine Spiralrückgriffe. R12 `running-sum.viz.json` ohne Transferfrage. R14 keine Mastery-Fälle. R15 Familien fehlen.

**Befunde.**

- [P0] `content/modules/lm-foundations-collections.json:22-103` → Alle 4 Familien (`classify-set-operation-semantics`, `classify-python-collection-choice`, `trace-collection-state`, `trace-dict-state-update`) fehlen in `content/families/` (R15/R14, echte Lücke).
- [P1] `content/lessons/foundations/running-sum.viz.json:1-13` → Laufsumme-Slider ohne Aufgabe, nur passive Exploration (R12/E2).
- [P1] `content/modules/lm-foundations-collections.json:1-108` → Keine Parson- oder Code-Trace-Fälle, die Mutations-Traces üben (R5, G-14).
- [P2] `content/lessons/foundations/collections.md:48-53` → Strukturwahl-Übung ohne verknüpftes Mastery-Case.

**Top 3 Vorschläge.**

1. Familien anlegen: `trace-collection-state` (`list-copy-steps`, `list-alias-steps` als code-trace/predict-output), `trace-dict-state-update` (`dict-start-key-steps` als code-trace), `classify-python-collection-choice` (single-choice „welche Collection für ID-Dedup?") (R14/R15, R5).
2. Parson-Fall `parsons-dict-count`: Ordne Zeilen für Häufigkeitszählung (`counts = {}`, `for word in words:`, `counts[word] = counts.get(word,0)+1`) mit 1–2 Distraktoren (R5, G-14).
3. Viz-Frage `running-sum.viz.json`: „Ziehe k auf 3. Wie hoch ist die kumulative Summe?" Erwarteter Wert `8` (R12).

---

## c-python-files-errors — Dateien, Eingaben und Fehler

**Gelesen:** `content/modules/lm-foundations-files-errors.json:1-79`; `content/lessons/foundations/files-errors.json:1-17` + `.md:1-48`; `content/families/aggregate-validate-and-count-records.json`, `validate-required-field-raise.json`; `docs/content-review/inventar.json:1964-2099`.

**Zusammenfassung.** Die Lektion ist solide: Kontextmanager, Parsing/Validierung trennen, gezieltes Error-Handling. Das Modul hat 6 Placements, aber die referenzierten `caseId`s (`translate-error-to-issue`, `parse-validate-summarize`, `required-key-with-issue`) existieren nicht in den Familien. Die existierenden Familien `aggregate-validate-and-count-records` und `validate-required-field-raise` enthalten Fälle, aber deren `competencyIds` zeigen auf `c-capstone-pipeline`/`c-genai-security` bzw. `c-dl-papers`/`c-research-*`/`c-capstone-pipeline` — nicht `c-python-files-errors`. Damit erreicht die Kompetenz keine Mastery-Definition.

**Repräsentative Fälle.**

1. `aggregate-validate-and-count-records.json:7` `separate-error-kinds` (python-code): Implementation `trenne_fehler(D)` korrekt — `retrieval == leer` dominiert, sonst `antwort != ok` → `antwort_fehler`, sonst `sauber`. Tests decken Kantenfälle ab. Fachlich korrekt, aber `competencyIds` nicht `c-python-files-errors`.
2. `validate-required-field-raise.json:7` `paper-card-required-fields` (python-code): `review_paper_card` prüft Pflichtfelder, `claims`-Typ, `bool`-Exklusion und `system > baseline`. Referenzlösung und Tests konsistent. Fachlich korrekt, aber `c-dl-papers`.
3. Fehlend: `parse-validate-summarize` (sollte CSV-Records einlesen, validieren und zählen) und `required-key-with-issue`.

**R1–R15.** R1 Worked Example ok, kein case-level Fading. R2–R4 Familien-Cases `separate-error-kinds`/`paper-card-required-fields` haben Hinweise/Feedback; Modul-Fälle fehlen. R5 Es gibt Code-Schreib-Fälle, aber keine für `c-python-files-errors` und keine Datei-Trace-Fälle. R6 Placements intro/core, Fälle fehlen. R8/R9/R10 Lektion gut. R11 keine Spiralrückgriffe. R12 keine Visualisierung. R14 keine Mastery-Definition erreichbar. R15 `caseId`s der Placements existieren nicht; `competencyIds` der existierenden Fälle passen nicht.

**Befunde.**

- [P0] `content/modules/lm-foundations-files-errors.json:22-74` → `caseId`s `translate-error-to-issue`, `parse-validate-summarize`, `required-key-with-issue` nicht in `content/families/classify-exception-placement.json` (fehlt), `aggregate-validate-and-count-records.json:7` oder `validate-required-field-raise.json:7` (R15/R14, echte Lücke).
- [P0] `content/families/classify-exception-placement.json` fehlt komplett (R15/R14).
- [P1] `content/families/aggregate-validate-and-count-records.json:7` und `validate-required-field-raise.json:7` haben `competencyIds`, die `c-python-files-errors` nicht enthalten, obwohl das Modul sie referenziert (R15, R5).
- [P1] `content/modules/lm-foundations-files-errors.json:1-79` → Keine Trace/Predict-Fälle, die das Lesen von Datei-/Fehler-Code vor dem Schreiben üben (R5, G-14).
- [P2] `content/lessons/foundations/files-errors.md:42-48` → Kurzer Abruf gut, aber kein verknüpftes Case.

**Top 3 Vorschläge.**

1. Neue Familie `content/families/classify-exception-placement.json`: Single-Choice „Wo behandelst du diesen Fehler?" für `FileNotFoundError`, `ValueError`, `KeyError` in einem CSV-Pipeline-Beispiel (R14/R15, R5).
2. Erweitere `aggregate-validate-and-count-records.json` / `validate-required-field-raise.json` um `c-python-files-errors` in `competencyIds` passender Fälle oder erstelle `parse-validate-summarize` und `required-key-with-issue` mit CSV/Dict-Kontext und `raise ValueError` (R15, R5).
3. Predict-Output-Einstieg: Neue Familie `predict-file-error-output` mit Snippet `try: ... except ValueError: ...` — Lernender sagt Ausgabe vor dem Öffnen voraus (R5, G-14).

---

## c-testing-debugging — Testen und systematisch debuggen

**Gelesen:** `content/modules/lm-foundations-testing-debugging.json:1-126`; `content/lessons/foundations/testing-debugging.json:1-17` + `.md:1-44`; `content/families/validate-test-design-coverage.json`; `docs/content-review/inventar.json:2101-2275`.

**Zusammenfassung.** Die Lektion ist stark: Arrange-Act-Assert, Diagnosefolge, Regression-Test. Das Modul listet 10 Placements, aber 4 der 5 Familien fehlen komplett. Die einzige existierende Familie `validate-test-design-coverage` enthält `elif-chain-five-outcomes`, nicht das im Modul verlangte `nested-if-decision-tree`. Der existierende Fall ist fachlich korrekt (5 Testfälle für 5 Rückgabewerte), aber unvollständig: keine `competencyIds`, `activityType`, `graderId`, `hints`, `feedbackRules`, `typicalErrors`. Keine Mastery-Definition erreichbar.

**Repräsentative Fälle.**

1. `validate-test-design-coverage.json:7` `elif-chain-five-outcomes`: 5 Rückgabewerte (`a,b,c,d,f`), mindestens 5 Testfälle nötig. `expected.kind: integer`, `value: 5` korrekt. Keine Distraktoren/Hinweise; falsch wären z. B. `4` oder `1`.
2. Fehlende Familien: `classify-test-attitude`, `construct-regression-test-suite`, `construct-test-structure-aaa`, `trace-exception-path`.
3. Lektions-Beispiel `testing-debugging.md:10-19`: Test `test_duplicate_ids_are_reported` erwartet `row: 3` für die zweite Datenzeile — korrekt, wenn die Kopfzeile als Zeile 1 zählt.

**R1–R15.** R1 Worked Example/Projektstufe ok, kein case-level Fading. R2–R4 Fall `elif-chain-five-outcomes` ohne Hinweise/Feedback. R5 Nur ein choice-Case; keine Code-Trace/Exception-Fälle, keine Test-Schreib-Aufgaben. R6 intro/core/stretch geplant, Fälle fehlen. R8/R9/R10 Lektion sehr gut. R11 keine Spiralrückgriffe. R12 keine Visualisierung. R14 Mastery nicht erreichbar. R15 `caseId`s/Familien fehlen; existierender Case formal unvollständig.

**Befunde.**

- [P0] `content/modules/lm-foundations-testing-debugging.json:21-121` → `classify-test-attitude`, `construct-regression-test-suite`, `construct-test-structure-aaa`, `trace-exception-path` fehlen in `content/families/`; `nested-if-decision-tree` fehlt in `validate-test-design-coverage.json` (R15/R14).
- [P1] `content/families/validate-test-design-coverage.json:7-25` → `elif-chain-five-outcomes` fehlt `competencyIds`, `activityType`, `graderId`, `hints`, `feedbackRules`, `typicalErrors` (R15, R3/R4).
- [P1] `content/modules/lm-foundations-testing-debugging.json:1-126` → Kein Trace/Predict/Exception-Path-Case vor `construct-regression-test-suite` (R5, G-14).
- [P2] `content/lessons/foundations/testing-debugging.md:42-44` → Kurzer Abruf gut; kein verknüpftes Case.

**Top 3 Vorschläge.**

1. Familien anlegen: `construct-test-structure-aaa` (Parson: sortiere Arrange/Act/Assert-Zeilen), `trace-exception-path` (code-trace: `ValueError`/`KeyError` auslösen), `classify-test-attitude` (choice „Was ist der kleinste reproduzierbare Fall?") (R14/R15, R5).
2. `validate-test-design-coverage.json` vervollständigen: Füge `nested-if-decision-tree` mit Entscheidungsbaum und Branch-Coverage-Frage hinzu; ergänze `elif-chain-five-outcomes` mit Hinweisen und Distraktoren (R3/R4/R15).
3. Neuer Parson-Fall `parsons-aaa-steps`: Ordne `setup rows`, `call inspect_rows`, `assert ... in issues`, `run pytest` in die richtige Teststruktur (R5, G-14).

---

## c-git-basics — Git-Grundlagen für Lernprojekte

**Gelesen:** `content/modules/git-basics.json:1-76`; `content/lessons/foundations/git.json:1-17` + `.md:1-51`; `docs/content-review/inventar.json:2277-2399`.

**Zusammenfassung.** Die Lektion ist gut: `status`/`diff`, geschlossener Commit, Branch/Merge-Verständnis. Sie betont zu Recht, dass Git kein Leistungsbeweis ist. Das Modul hat 6 Placements (3 Curated + 3 Practice), aber beide Familien existieren nicht. Es gibt keinen einzigen Case, der `diff unstaged`, `diff staged` oder einen Bugfix-Workflow abfragt. Mastery unmöglich.

**Repräsentative Fälle.**

Keine Cases vorhanden. Lektions-Inhalte:
1. `git.md:17-25` `git status --short` / `git diff --stat`: Ablauf korrekt, Tests vor Commit.
2. `git.md:32-39` Arbeitsfolge: fehlschlagender Test → Fix → Test → diff → stage → Commit-Nachricht. Gut als Worked Example.
3. `git.md:41-43` Branch/Merge: korrekte Warnung, dass Merge nur Text-Ebene ist.

**R1–R15.** R1 Worked Example/Projektstufe ok, kein case-level Fading. R2–R4 Keine Cases. R5 Kein Aufgabenmix. R6 Placements intro/core/stretch, Fälle fehlen. R8/R9/R10 Lektion gut. R11 Keine Spiralrückgriffe. R12 Keine Visualisierung. R14 Mastery nicht erreichbar. R15 Familien fehlen.

**Befunde.**

- [P0] `content/modules/git-basics.json:13-71` → Referenzierte Familien `classify-git-operation` und `construct-safe-bugfix-workflow` fehlen komplett in `content/families/` (R15/R14, echte Lücke).
- [P0] `content/competencies/core.json:464-473` → `c-git-basics` benötigt 2 distinct Mastery-Definitionen; beide fehlen (R14).
- [P2] `content/lessons/foundations/git.md:49-51` → Projektstufe beschreibt drei Commits; kein verknüpftes Case.

**Top 3 Vorschläge.**

1. Neue Familie `content/families/classify-git-operation.json`: Single-Choice „Was zeigt `git diff` vs. `git diff --cached`?" und ein Merge-Conflict-Case (R14/R15, R5).
2. Neue Familie `content/families/construct-safe-bugfix-workflow.json`: Parson/Choice mit Schritten „Test schreiben, reproduzieren, Fix, Test, diff, commit" (R5, R1).
3. Modul-Prerequisite prüfen: `git-basics.json:9` verlangt `c-meta-learning`; prüfe, ob das für Git-Workflow sinnvoll ist (R11).

---

## Sequenz-Check (G-14 / LM-R4 / OF-4)

**Fragestellung:** Kommen Trace-/Predict-Placements vor `python-code`-Placements? Fehlen Parson/Code-Trace in den frühen Python-Modulen? Deckt `c-python-reading` Lesefertigkeit als Prerequisite ab?

**Befund.**

1. **Intendierte Sequenz ist korrekt:** c-python-basics (trace/predict) → c-python-reading (trace/predict) → c-python-functions (trace/predict) → c-python-control-flow (construct) → c-python-collections (construct/trace) → c-python-files-errors (code-writing). Das entspricht `authoring-guide.md` §4 „Trace/Predict vor Schreiben" (R5, G-14).
2. **Aber:** Die Inhalte fehlen oder sind falsch verlinkt:
   - `c-python-basics` und `c-python-reading` haben `trace-assignment-state`, aber die Curated-Placements verweisen auf nicht existierende intro-Cases. Die verfügbaren Fälle sind DL/NumPy-Transfer und somit für den Anfang zu schwer (R6, R8).
   - `c-python-control-flow` und `c-python-collections` haben **gar keine** Trace-/Predict-/Parson-Fälle, obwohl diese vor dem Schreiben von Loops/Collections nötig wären (G-14, OF-4).
   - `c-python-functions` hat nur einen predict-output-Case, kein Code-Schreiben.
3. **Parson-Aufgaben fehlen vollständig** im Block (R5, G-14, OF-4).
4. **`c-python-reading` als Prerequisite:** Das Kompetenz-Objekt definiert `c-python-reading` korrekt und `c-python-basics` unterstützt es. Aber `c-python-functions` erfordert nur `c-python-basics` (`core.json:134`) und nicht `c-python-reading`, obwohl `trace-call-composition` in beiden Modulen verwendet wird. Die Lesefertigkeit ist konzeptuell vorhanden, aber operabel und als Pfad-Gate nicht durchgesetzt (R11, G-14).

**Empfehlung.**

- Füge in jedem frühen Modul (basics, reading, functions, control-flow, collections) mindestens 1–2 `code-trace`/`predict-output`-Fälle hinzu.
- Füge mindestens 2–3 Parson-Fälle im Block ein (Zuweisungsreihenfolge, if-elif-else, AAA-Teststruktur).
- Mache `c-python-reading` zu einem `requires` von `c-python-functions` in `content/competencies/core.json` (R11).

---

## Blockübergreifende Befunde

1. **Mastery-Notstand:** 6 von 8 Kompetenzen haben **0** auflösbare Curated-Mastery-Cases; `c-python-functions` hat 1; `c-python-basics`/`c-python-reading` haben zwar Familien, aber die konkreten `caseId`s der Placements fehlen. Keine Kompetenz kann aktuell ihre `minimumDistinctDefinitions: 2` erfüllen (P0, R14/R15).
2. **Familien-Module-Mismatch:** `trace-assignment-state` ist eine Sammel-Familie für viele fortgeschrittene Kompetenzen; die `c-python-basics`/`c-python-reading`-Tags sind inhaltlich nicht zum Lesson-Level passend. Die Module müssen entweder eigene Familien bekommen oder die existierenden Fälle neu zuordnen (P1, R5/R6).
3. **Viz-Systemverstoß:** Alle 3 Visualisierungen (`function-composition.viz.json`, `threshold-branch.viz.json`, `running-sum.viz.json`) folgen dem in `e2-interaktiv-audit.md` beschriebenen Muster: nur passive Exploration, keine gekoppelte Frage (P1, R12/E2).
4. **Fehlende Completion-Fading-Sequenz:** Weder Lektionen noch Cases nutzen das `workedExample`-Feld mit Completion-Schritten. E1 (G-06/G-15) bleibt offen (P1, R1).
5. **Keine Parson-Fälle:** Trotz Validator-Whitelist (`authoring-guide.md` §4) und Lernmethodik-Empfehlung (E1 G-14/OF-4) gibt es im Python-Block keine `parsons`-Fälle (P1, R5).
6. **Formalien in alten Familien:** `trace-call-composition.json` und `validate-test-design-coverage.json` fehlen `activityType`, `graderId`, `competencyIds`, `hints`, `feedbackRules` etc. Das deutet auf ein Format-Update hin, das nicht vollständig durchgeführt wurde (P1, R15).
7. **Copy und Lessons sind der stärkste Teil:** Lektionen sind kurz, aktiv, konkret, mit messbaren Objectives. Die grundlegende Didaktik ist solide, sie wird durch fehlende/verwaiste Aufgabenfälle nicht abgerufen.

---

## Unsicherheiten / nicht verifiziert

- `rng-stream-reseed-trace` (`trace-assignment-state.json:361`): Der erwartete Wert `26` hängt von der konkreten NumPy-PCG64-Implementierung ab. Ohne laufende Pyodide-Instanz konnte ich den Seed-Output nicht unabhängig verifizieren. Empfehlung: Property-Tests mit dem im Repo gebündelten NumPy laufen lassen.
- `pyodide`-Cases (`aggregate-validate-and-count-records`, `validate-required-field-raise`): Fachlich korrekt nach mentaler Trace-Logik; echte Ausführung gegen Pyodide war wegen fehlender `node_modules`/`ajv` nicht möglich.
