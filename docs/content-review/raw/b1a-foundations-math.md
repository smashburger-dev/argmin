# Block B1a — Foundations Math

**Scope:** `c-algebra-basics`, `c-algebra`, `c-meta-learning`  
**Module:** `content/modules/lm-foundations-algebra.json`, `content/modules/lm-foundations-learning.json`  
**Lessons:** `content/lessons/foundations/algebra.{json,md}`, `content/lessons/foundations/algebra-transformations.{json,md}`, `content/lessons/foundations/learning.{json,md}`  
**Viz:** `content/lessons/foundations/linear-function.viz.json`, `content/lessons/foundations/distributive-law.viz.json`  
**Reviewer:** Content-Reviewer B1a  
**Letzter Prüfstand:** `node tools/validate_content.mjs` lief erfolgreich (46 Kompetenzen, 46 Lektionen, 253 Aktivitäten). `npm test` und `npm run build:next` wurden in diesem Hintergrund-Run nicht ausgeführt.

---

## Vorgehen und fachliche Verifikation

Gelesen wurden Rubrik, E1/E2, Authoring-Guide, Inventar, die Module, die Lesson-JSONs und Markdowns, die vier referenzierten Familien/Generatoren (`transform-linear-equation-isolate`, `transform-power-log-exponent`, `transform-expression-simplify-canonical`, `classify-error-hypothesis`) sowie die Visualisierungen.

Repräsentative Fälle wurden anhand der Konstruktions-Generatoren (`assets/js/core/foundations_construct_families.mjs`) und der Choice-Bank (`assets/js/core/foundations_choice_families.mjs`) für die im Modul dokumentierten Seeds instanziiert und fachlich nachgerechnet:

- `transform-linear-equation-isolate` seed 5 (`two-step-seeded-retrieval`): `5x - 5 = 30` → `x = 7` (Probe: `5·7 - 5 = 30`).
- `transform-linear-equation-isolate` seed 7 (`collect-x-terms-both-sides`): `2x + 6 = 9x + 90` → `-7x = 84` → `x = -12` (Probe: `2·(-12)+6 = -18 = 9·(-12)+90`).
- `transform-expression-simplify-canonical` seed 13 (`distribute-sign-constant-chain`): `3(2x-1) - (x+1) + 1 = 5x - 3`.
- `transform-power-log-exponent` seed 11 (`integer-base-power`): `log₅(125) + log₅(125) = 6`.
- `classify-error-hypothesis` (`base-vs-exponent-confusion`): `2³ · 2⁴ = 2⁷`, nicht `4⁷`; korrekte Diagnose ist „Basis bleibt 2“.
- `classify-error-hypothesis` (`error-journal-next-test` seed 0): korrekte Wahl beinhaltet Beobachtung, kleinste Reproduktion, Ursachenhypothese und frischen Test.

**Fachliche Fehler in den Lösungen oder Lösungswegen wurden nicht gefunden.**

---

## c-algebra-basics — Algebra-Grundlagen

### Zusammenfassung (max. 200 Wörter)

`lm-foundations-algebra` deckt `c-algebra-basics` mit sechs kuratierten Placements aus vier Familien ab. Die Lesson `l-foundations-algebra` führt Gleichungen, Potenzen und Logarithmen an einem korrekten Worked Example ein; die `linear-function`-Viz zeigt Steigung und y-Achsenabschnitt. Die generierten Abruffälle produzieren ganzzahlige Lösungen und passen die dokumentierten Invarianten. Wesentliche Lücken: passive Visualisierung ohne Transferfrage, keine Subgoal-Labels, keine Completion-/Fading-Stufe, Schwierigkeitsprofil nur `intro`/`core`, überzogene Zeitangaben und die Tatsache, dass `build_inventar.py` die generierten Laufzeitfälle als `caseMissing` markiert.

### Bewertung R1–R15

| Regel | Status | Begründung |
|---|---|---|
| R1 Worked-Example-first | ⚠️ | `algebra.md` Z. 7–12 hat ein Worked Example, aber keinen sichtbaren Completion-/Fading-Schritt. Der `Kurzer Abruf` (Z. 30–32) ist ein sofortiges vollständiges Problem. |
| R2 Abruf vor Reveal | ✅ | Lösungen werden nicht ungefragt angezeigt. |
| R3 Subgoal-Hinweise | ❌ | Weder Worked Example noch generierte Fälle führen Subgoal-Labels (`x-Terme sammeln`, `Konstanten isolieren`, `Probe`). |
| R4 Diagnose-Feedback | ❌ | `generateLinearIsolateFamily` (Z. 167–180) und `generatePowerLogFamily` (Z. 340–356) tragen weder `feedbackRules` noch `typicalErrors`. |
| R5 Aufgabenmix | ⚠️ | Numeric, expression, single-choice vorhanden, aber fast ausschließlich Regelanwendung, kaum Transfer in neuem Kontext. |
| R6 Schwierigkeits-Spread | ❌ | `lm-foundations-algebra.json` Z. 23–117: nur `intro` und `core`, kein `stretch`/`challenge`. |
| R7 Zeitplausibilität | ❌ | `algebra.json` Z. 10 `estimatedMinutes: 45` bei 319 Wörtern/33 Zeilen und einem Worked Example. |
| R8 Element-Interaktivität dosieren | ✅ | Kurze Abschnitte, ein Konzept pro Abschnitt. |
| R9 Copy-Stil | ⚠️ | `du`-Form, aktiv, kurz; `algebra.md` Z. 12, 18, 20, 22 verwendet Unicode `·` innerhalb `$...$` statt `\cdot`. |
| R10 Objectives | ✅ | `algebra.json` Z. 7: Gleichungen umformen, Potenzen prüfen, Fehler lokalisieren — messbar. |
| R11 Kumulation/Spiralrückgriff | ❌ | Spätere Module ziehen die Algebra-Familien nicht bewusst wieder hoch. |
| R12 Viz gekoppelt | ❌ | `linear-function.viz.json` Z. 1–17 rein explorativ, keine Vorhersage-/Transferfrage. |
| R13 Neue Interaktionen | ⚠️ | Slider-Viz ist vorhanden, Predict-then-verify wäre ein Kandidat. |
| R14 Mastery-Ehrlichkeit | ⚠️ / P1 | `classify-error-hypothesis`-Placements `base-vs-exponent-confusion`/`seeded-error-pattern-cases` in `lm-foundations-algebra.json` Z. 89–109 sind `masteryEligible: true`, obwohl es Choice-Diagnosefälle sind. Für `c-algebra-basics` bleibt genug alternativer Mastery-Nachweis, daher P1. |
| R15 Konsistenz | ❌ | `docs/content-review/inventar.json` Z. 96, 110 `caseMissing: true` für die `transform-linear-equation-isolate`-Placements; `content/families/transform-linear-equation-isolate.json` Z. 4 `contract: null`, die seeded Fälle leben nur in `assets/js/core/foundations_construct_families.mjs`. |

### Befunde (konkret)

- `[P1] content/lessons/foundations/algebra.md` Z. 7–12 Worked-Example ohne Subgoal-Labels und ohne Completion-/Fading-Schritt (R1/R3).
- `[P1] content/lessons/foundations/linear-function.viz.json` Z. 5, 7–14 passive Exploration, keine gekoppelte Transfer-/Vorhersagefrage (R12, E2 systemischer Befund).
- `[P1] content/modules/lm-foundations-algebra.json` Z. 30, 41, 59, 77, 95, 106 Schwierigkeitsprofile nur `intro`/`core`, kein `stretch`/`challenge` (R6).
- `[P1] content/lessons/foundations/algebra.json` Z. 10 `estimatedMinutes: 45` für ~319 Wörter + Worked Example deutlich zu hoch (R7).
- `[P1] assets/js/core/foundations_construct_families.mjs` Z. 167–180 (`generateLinearIsolateFamily`) und Z. 340–356 (`powerLogPrompt`/`powerLogSolution`) haben keine `hints`/`feedbackRules`/`typicalErrors` (R3/R4).
- `[P1] assets/js/core/foundations_choice_families.mjs` Z. 12–14 und `lm-foundations-algebra.json` Z. 89–109: Choice-Diagnosefälle sind `masteryEligible: true` platziert, obwohl R14 sie als Bearbeitungsnachweis sehen möchte (R14).
- `[P2] content/lessons/foundations/algebra.md` Z. 12, 18, 20, 22 verwendet in `$...$` Unicode `·` anstelle von `\cdot` (R9).

### Top-Vorschläge

1. **Worked Example mit Subgoal-Labels und Completion ausbauen** (`content/lessons/foundations/algebra.md` Z. 7–12 und `algebra.json` Z. 11):

   ```markdown
   1. **x-Terme sammeln:** Subtrahiere `2x` auf beiden Seiten: `3x - 7 = 8`.
   2. **Konstanten isolieren:** Addiere `7` auf beiden Seiten: `3x = ___`.
   3. **Koeffizienten eliminieren:** Teile durch `3`: `x = 5`.
   4. **Probe:** Links `5·5 - 7 = 18`, rechts `2·5 + 8 = 18`.
   ```

   Optional einen `checkpoint`-Block mit einem ausgelassenen Zwischenschritt zwischen `worked-example` und `visualization` einfügen.

2. **Viz mit Transferfrage koppeln** (`content/lessons/foundations/linear-function.viz.json` oder ein `checkpoint`-Block in `algebra.json`):

   > *„Ziehe `m` auf `2` und `b` auf `-4`. Berechne vor dem Ziehen die Nullstelle `x₀ = -b/m` und prüfe sie im Diagramm.“*

3. **Schwierigkeits-Spread ergänzen** (`content/modules/lm-foundations-algebra.json`):

   ```json
   {
     "placementId": "p-foundations-algebra-product-and-power-of-power-stretch",
     "role": "curated",
     "familyId": "transform-power-log-exponent",
     "caseId": "product-and-power-of-power",
     "seed": 19,
     "difficulty": "stretch",
     "estimatedMinutes": 8,
     "lessonId": "l-foundations-algebra",
     "masteryEligible": true
   }
   ```

---

## c-algebra — Algebraische Termumformung

### Zusammenfassung (max. 200 Wörter)

`c-algebra` teilt sich `lm-foundations-algebra` mit `c-algebra-basics` und wird in `l-foundations-algebra-transformations` durch Klammern, Distributivgesetz und Gleichartigkeit behandelt. Der Prompt für `distribute-sign-constant-chain` ist fachlich korrekt und der SymPy-Grader valide. Die `distributive-law`-Viz ist nett anzusehen, aber passiv. Wie bei `c-algebra-basics` fehlen Subgoal-Labels, Completion, Schwierigkeitsspread und gekoppelte Viz-Aufgaben. Hinzu kommt ein Prompt-Formatierungsproblem: der expression-Generator verpackt einen String mit `*` in `$...$`, was gegen den Authoring-Guide verstößt.

### Bewertung R1–R15

| Regel | Status | Begründung |
|---|---|---|
| R1 | ⚠️ | `algebra-transformations.md` Z. 7–14 Worked Example, aber ohne Completion/Subgoals. |
| R2 | ✅ | Kein ungefragtes Reveal. |
| R3 | ❌ | Keine Subgoal-Labels, `generateExpressionCanonicalFamily` (Z. 488–513) ohne `hints`. |
| R4 | ❌ | Keine `feedbackRules`/`typicalErrors` für SymPy-Terme; typische Fehler (Vorzeichen, Gleichartigkeit) müssten modelliert werden. |
| R5 | ⚠️ | Nur Termumformung; kein Transfer, der beides kombiniert. |
| R6 | ❌ | `lm-foundations-algebra.json` Z. 23–117: nur `intro`/`core` für beide Kompetenzen. |
| R7 | ❌ | `algebra-transformations.json` Z. 10 `estimatedMinutes: 35` für 245 Wörter. |
| R8 | ✅ | Kurze Abschnitte. |
| R9 | ⚠️ | `algebra-transformations.md` korrekt; `generateExpressionCanonicalFamily` Z. 511 verwendet `$...$` mit `*` in generiertem Prompt. |
| R10 | ✅ | Objectives messbar (`algebra-transformations.json` Z. 7). |
| R11 | ❌ | Keine Spiral-Rückgriffe. |
| R12 | ❌ | `distributive-law.viz.json` Z. 5, 7–14 passiv. |
| R13 | ⚠️ | Predict-then-verify-Viz möglich. |
| R14 | ⚠️ / P1 | Choice-Fälle `classify-error-hypothesis` als Mastery, aber genug andere Mastery-Fälle vorhanden. |
| R15 | ❌ | Generierte Fälle (`transform-expression-simplify-canonical`) fehlen im `content/families`-Verzeichnis; `build_inventar.py` meldet `caseMissing: true` für die linearen Fälle. |

### Befunde (konkret)

- `[P1] content/lessons/foundations/algebra-transformations.md` Z. 7–14 Worked-Example ohne Subgoal-Labels (R3). Schritte wie „Verteile“, „Gleichartige sammeln“, „Probe“ sollten als Subgoals beschriftet werden.
- `[P1] assets/js/core/foundations_construct_families.mjs` Z. 511 (`generateExpressionCanonicalFamily`): Prompt `Vereinfache $3(2*x-1)-1(1*x+1)+1$ ...` widerspricht dem Authoring-Guide (generierte Prompts sollen Unicode-Mathematik ohne KaTeX sein) und `*` innerhalb `$...$` ist kein Standard-KaTeX-Multiplikator (R9/R15).
- `[P1] content/lessons/foundations/distributive-law.viz.json` Z. 5, 7–14 keine gekoppelte Transfer-/Vorhersagefrage (R12).
- `[P1] transform-expression-simplify-canonical` (`EXPRESSION_CANONICAL_CONTRACT` Z. 386–401) bietet keine `feedbackRules`/`typicalErrors` für SymPy-Äquivalenzfehler (R4).
- `[P1] content/modules/lm-foundations-algebra.json` Z. 23–117 kein `stretch`/`challenge` für `c-algebra` (R6).
- `[P1] content/lessons/foundations/algebra-transformations.json` Z. 10 `estimatedMinutes: 35` zu hoch für den Umfang (R7).

### Top-Vorschläge

1. **Prompt-Formatierung korrigieren** (`assets/js/core/foundations_construct_families.mjs` Z. 511–512):

   ```js
   const sourcePlain = source.replace(/\*/g, '·');
   const answerPlain = solved.canonicalExpression.replace(/\*/g, '·');
   const prompt = `Vereinfache ${sourcePlain} so weit wie möglich ... Schreibe Multiplikation mit * ...`;
   const fullSolution = `${sourcePlain} = ${answerPlain}. ${hint} Kanonische Zielform: ${answerPlain}.`;
   ```

2. **Worked Example mit Subgoal-Labels** (`content/lessons/foundations/algebra-transformations.md` Z. 7–14):

   ```markdown
   1. **Erste Klammer verteilen:** `3(x + 2) = 3x + 6`.
   2. **Zweite Klammer verteilen (Vorzeichen beachten):** `-2(x - 1) = -2x + 2`.
   3. **Gleichartige Terme sammeln:** `3x - 2x = x` und `6 + 2 = 8`.
   4. **Probe mit `x = 2`:** Ausgangsterm `10`, Ergebnis `10`.
   ```

3. **Stretch-Placement hinzufügen** (`content/modules/lm-foundations-algebra.json`):

   ```json
   {
     "placementId": "p-foundations-algebra-distribute-sign-constant-chain-stretch",
     "role": "curated",
     "familyId": "transform-expression-simplify-canonical",
     "caseId": "distribute-sign-constant-chain",
     "seed": 17,
     "difficulty": "stretch",
     "estimatedMinutes": 10,
     "lessonId": "l-foundations-algebra-transformations",
     "masteryEligible": true
   }
   ```

---

## c-meta-learning — Fehler analysieren und Lernen planen

### Zusammenfassung (max. 200 Wörter)

`lm-foundations-learning` enthält eine reflektierende Lesson und ein einziges kuratiertes Placement (`classify-error-hypothesis:error-journal-next-test`). Die Lesson beschreibt ein nützliches Vier-Felder-Modell für Fehlerjournale, aber die Lernziele werden nicht in einer eigenen Übung geübt. Die Evidence-Policy von `c-meta-learning` verlangt `minimumDistinctDefinitions: 2` plus `delayedHitRequired`, und `inventar.json` listet nur 1 mastery-fähige Definition. Zudem ist der einzige Case ein Single-Choice-Case, was R14 nur als Bearbeitungsnachweis zulässt. Das macht die Mastery-Policy für diese Kompetenz faktisch unerfüllbar.

### Bewertung R1–R15

| Regel | Status | Begründung |
|---|---|---|
| R1 | ❌ | `learning.md` Z. 1–33 ist ein `reflection`-Block (`learning.json` Z. 11), kein Worked Example, keine Completion. |
| R2 | ⚠️ | Kein Reveal-Problem, aber auch kein strukturierter Abruf vor dem Lösungsschritt. |
| R3 | ❌ | Keine Subgoal-Hinweise; `error-journal-next-test` hat zwei Hinweise, aber keinen als Teilziel-Frage formuliert. |
| R4 | ⚠️ | `feedbackRules[0].if` in `foundations_choice_families.mjs` Z. 168 `choice !== 'observable-test'` ist keine gültige Choice-ID; liefert allen falschen Antworten dieselbe generische Rückmeldung. |
| R5 | ❌ | Nur ein einziger Case, kein Mix. |
| R6 | ❌ | `lm-foundations-learning.json` Z. 27 `difficulty: "stretch"` für den Einstieg. |
| R7 | ❌ | `learning.json` Z. 10 `estimatedMinutes: 25` für 256 Wörter/33 Zeilen reine Reflexion. |
| R8 | ✅ | Kurze Abschnitte. |
| R9 | ✅ | Du-Form, aktiv, kurz. |
| R10 | ⚠️ | Objectives konkret, aber Lesson-Aufbau (Einstieg → Worked Example → Übung) fehlt. |
| R11 | ❌ | Keine Kumulation. |
| R12 | n/a | Keine Viz. |
| R13 | ⚠️ | Ein Mini-Notebook/Reflexions-Check wäre möglich. |
| R14 | ❌ / P0 | Nur 1 Definition, und diese ist ein Choice-Case; `c-meta-learning` `evidencePolicy` (`core.json` Z. 171–177) verlangt `minimumDistinctDefinitions: 2`. R14 verbietet Choice als Mastery. |
| R15 | ⚠️ | `lm-foundations-learning.json` Z. 7 beschreibt das Modul als „Meta-Lektion ohne Aufgaben“, obwohl Z. 20–31 eine Aufgabe platziert. |

### Befunde (konkret)

- `[P0] content/competencies/core.json` Z. 171–177 und `docs/content-review/inventar.json` Z. 780–790: `c-meta-learning` hat `minimumDistinctDefinitions: 2`, aber nur 1 platzierte Definition, und diese ist ein Single-Choice-Case.
- `[P0] content/modules/lm-foundations-learning.json` Z. 30 und `assets/js/core/foundations_choice_families.mjs` Z. 153: Der einzige Case ist `masteryEligible: true`. R14 und der Authoring-Guide sehen Choice-/Konzept-Fälle als `masteryEligible: false` + fullSolution-Notiz vor; damit bleibt `c-meta-learning` ohne ehrlichen Mastery-Nachweis.
- `[P1] content/lessons/foundations/learning.md` Z. 1–33 reflektiert über das Fehlerjournal, bietet aber kein Worked Example und keinen eingebetteten Übungsschritt; die Ziele „Fehler dokumentieren“ und „Review planen“ werden nicht aktiv geübt (R1/R10).
- `[P1] content/lessons/foundations/learning.json` Z. 10 `estimatedMinutes: 25` ist für 256 Wörter und reine Reflexion zu hoch (R7).
- `[P1] content/modules/lm-foundations-learning.json` Z. 27 `difficulty: "stretch"` für einen Einstieg ohne Vorlauf (R6).
- `[P1] assets/js/core/foundations_choice_families.mjs` Z. 166–171 `feedbackRules[0].if: "choice !== 'observable-test'"` trifft auf keine reale `choiceId` zu und liefert allen falschen Antworten dieselbe generische Rückmeldung (R4/R15; vgl. `graders.js` Z. 62–65, die Regel nur bei `!correct` anwenden).

### Top-Vorschläge

1. **Zweite `c-meta-learning`-Definition einführen und platzieren**:

   Neuer Case in `assets/js/core/foundations_choice_families.mjs` unter `ERROR_HYPOTHESIS_CASES` (nach Z. 174):

   ```js
   {
     caseId: 'review-expanding-slot',
     sourceId: 'f-meta-review-plan-01',
     sourceLineage: ['f-meta-review-plan-01'],
     competencyIds: ['c-meta-learning'],
     masteryEligible: false,
     prompt: 'Du hast eine Kompetenz vor 6 Wochen zum zweiten Mal nachgewiesen. Der Abrufplan sieht Treffer nach 2, 5 und 11 Wochen vor. Was ist der beste nächste Schritt?',
     correct: 'Einen fälligen Review jetzt starten, weil der 5-Wochen-Slot überschritten ist und der 11-Wochen-Slot noch fehlt.',
     distractors: [
       'Jeden Tag dieselbe Aufgabe wiederholen, bis die Streak wieder steigt.',
       'Erst nach 11 Wochen erneut prüfen, weil der 5-Wochen-Slot ohnehin verpasst ist.',
       'Die Kompetenz als verlernt markieren und die Lektion komplett neu lesen.',
     ],
     solution: 'Expanding Retrieval arbeitet mit [2, 5, 11] Wochen. Nach dem zweiten Treffer ist der nächste fällige Slot 5 Wochen später. Ein 6-Wochen-Abstand überschreitet diesen Slot, also startet man jetzt den Review.',
     hints: [
       'Expanding Retrieval bedeutet 2, 5, 11 Wochen nach dem letzten Treffer.',
       'Prüfe, welcher Slot bereits überschritten und welcher noch nicht erreicht ist.',
     ],
     feedbackRules: [
       { if: "choice === 'b'", then: 'Der Plan orientiert sich an Fälligkeit, nicht an Streak oder am 11-Wochen-Slot.' },
       { if: "choice === 'c'", then: 'Verlernen ist erst eine Arbeitshypothese, wenn ein frischer Test sie stützt.' },
     ],
     typicalErrors: ['Streak statt Fälligkeit', 'starrer 11-Wochen-Zyklus', 'verlernen annehmen'],
   },
   ```

   Zugehöriges Placement in `content/modules/lm-foundations-learning.json` (nach Z. 31):

   ```json
   {
     "placementId": "p-foundations-learning-review-expanding-slot",
     "role": "curated",
     "familyId": "classify-error-hypothesis",
     "caseId": "review-expanding-slot",
     "seed": 3,
     "difficulty": "core",
     "estimatedMinutes": 6,
     "lessonId": "l-foundations-learning",
     "masteryEligible": false
   }
   ```

2. **Lesson um ein Worked Example und einen Reflexions-Check ergänzen** (`content/lessons/foundations/learning.md` und `learning.json` Z. 11):

   Füge nach dem Prosa-Block einen `worked-example`-Block mit einem ausgefüllten Fehlerjournal-Eintrag hinzu und einen `checkpoint`-Block, in dem der Lerner die vier Felder für einen gegebenen Fehler (z. B. falsches Vorzeichen bei `5x - 5 = 30`) ausfüllt. Der `checkpoint` sollte als Bearbeitungsnachweis (`masteryEligible: false`) gewertet werden.

3. **Mastery-Status klären** (`content/modules/lm-foundations-learning.json` Z. 30 / `content/competencies/core.json` Z. 171–177):

   Falls R14 für Meta-Kompetenzen streng gilt, müssen alle `classify-error-hypothesis`-Choice-Cases in `lm-foundations-learning` auf `masteryEligible: false` gesetzt und eine neue, nicht-Choice-Mastery-Familie (z. B. ein `short-code`- oder `predict-output`-Fall zum Erstellen eines Review-Plans) eingeführt werden — oder die Evidence-Policy von `c-meta-learning` reduziert `minimumDistinctDefinitions` auf `1` mit reinem `retained`-Zustand.

---

## Blockübergreifende Befunde

1. **R12 — Visualisierungen ohne Transferaufgabe (systemisch):** Alle Viz in diesem Block (`linear-function.viz.json` Z. 1–17, `distributive-law.viz.json` Z. 1–17) und nach E2 alle 24 Plattform-Viz haben keine gekoppelte Vorhersage-/Transferfrage. Sie erfüllen den Test „Viz folgt auf Worked Example“, aber nicht die Lernaufgaben-Kopplung. Kandidat: `predict-then-verify-visualization` mit `predictionPrompt` + `predictionInput` (siehe `docs/content-review/raw/e2-interaktiv-audit.md`).

2. **R14 — Choice-Fälle als Mastery-Ehrlichkeit:** Der `classify-error-hypothesis`-Vertrag (`assets/js/core/foundations_choice_families.mjs` Z. 319–334) und die Placements in `lm-foundations-algebra.json` Z. 89–109/`lm-foundations-learning.json` Z. 20–31 markieren Choice-Diagnose-Fälle mit `masteryEligible: true`. Der Kommentar Z. 12–14 dokumentiert den Widerspruch ausdrücklich. R14 und der Authoring-Guide sehen Choice-/Konzept-Fälle als `masteryEligible: false` + fullSolution-Notiz vor. Für `c-meta-learning` ist das ein P0, für `c-algebra-basics`/`c-algebra` ein P1, weil genug alternative Mastery-Fälle existieren.

3. **R1/R3 — Worked-Example-Sequenz unvollständig:** Weder `algebra.md` Z. 7–12 noch `algebra-transformations.md` Z. 7–14 noch `learning.md` Z. 1–33 verwenden Subgoal-Labels oder Completion-/Fading-Schritte. Der Case-Level-`workedExample`-Block (Authoring-Guide §5) ist in keinem der generierten Algebra-Fälle genutzt, obwohl E1 das als offene Frage markiert.

4. **R15 — Generierte Familien fehlen im `content/families`-Verzeichnis:** `transform-power-log-exponent`, `transform-expression-simplify-canonical` und `classify-error-hypothesis` existieren nur in `assets/js/core/`. `docs/content-review/inventar.json` Z. 96, 110 meldet `caseMissing: true` und `build_inventar.py` zählt `c-meta-learning` nur mit einer mastery-fähigen Definition. `content/families/transform-linear-equation-isolate.json` Z. 4 `contract: null` dient nur als statische Case-Bank für den Konstrukt-Family. Eine konsistente Manifestierung (oder ein angepasstes Inventar-Skript) würde das Review-Inventar stabilisieren.

5. **R7/R11 — Zeit und Kumulation:** Die Lesson-`estimatedMinutes` (`algebra.json` Z. 10: 45, `algebra-transformations.json` Z. 10: 35, `learning.json` Z. 10: 25) liegen deutlich über dem Lesevolumen; Placements stoppen bei `core`; es gibt keine `stretch`/`challenge`-Fälle, die Algebra mit ML-Kontext verbinden (z. B. lineare Funktion als Modell für `y = mx + b`); und spätere Module ziehen die frühen Algebra-Familien nicht in neue Kontexte.
