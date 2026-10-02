# Block B2: Lineare Algebra + Daten — Content-Review

Dieses Review deckt die sieben Kompetenzen des Blocks B2 ab: `c-linalg-matrices`, `c-linalg-systems`, `c-linalg-gauss`, `c-linalg-independence`, `c-numpy-basics`, `c-pandas-cleaning`, `c-eda-viz`. Bewertet werden die Rubrik-Kriterien R1–R15. Sachliche und mathematische Fehler werden als P0 klassifiziert.

---

## c-linalg-matrices

**Deckung**: 10 Placements (9 curated + 1 practice-space), 4 Familien (`classify-matrix-shape`, `formula-scalar-product`, `classify-column-combination`, `trace-assignment-state`), 1 Lektion `l-linalg-matrices`.  
**Copy**: Deutsch, Fachbegriffe konsistent, Prompts verständlich.  
**Evidenz**: Mix aus Single-Choice, Numeric, Trace, Parsons, Short-Rationale, Code; intro/core/stretch vorhanden, kein challenge.  
**Interaktiv**: `content/lessons/linear-algebra/column-picture.viz.json` korrekt, aber passiv ohne Transferfrage.

**Befunde**

- [P0] `content/modules/lm-linalg-matrices.json:85-96` markiert `product-definition-rationale` als `masteryEligible: true`; der Fall selbst in `content/families/formula-scalar-product.json:160-197` ist aber `masteryEligible: false` und nutzt `graderId: manual-rubric` (`:196-197`). Eine manual-rubric-Aufgabe wird dadurch fälschlich als Mastery-Nachweis verkauft — Verstoß gegen R14 und den Authoring-Guide.
- [P1] Mehrere mastery-fähige Numeric-Fälle in `content/families/formula-scalar-product.json` (z.B. `matmul-entry-w05-e1`, `dot-product-w05-e3`, `dot-product-w05-e13`) haben weder `hints` noch `feedbackRules` noch `typicalErrors`.
- [P1] Keine challenge-Placement; `shape-debug-authored` ist stretch, danach fehlt eine Herausforderung (R6).
- [P1] `content/lessons/linear-algebra/column-picture.viz.json` zeigt, aber fragt nichts — R12 unbefriedigt.
- [P2] Die Placement-IDs `p-linalg-matrices-10-column-picture-trace` und `p-linalg-matrices-10-shape-debug-authored` teilen den Zähler `10` (R15).

**Nachgerechnet**

- `matmul-entry-w05-e1`: $A=\begin{pmatrix}2&1\\1&3\end{pmatrix}$, $B=\begin{pmatrix}0&1\\2&-1\end{pmatrix}$ ergibt $c_{12}=2\cdot1+1\cdot(-1)=1$ — erwartet `1`, korrekt.
- `dot-product-w05-e3`: $(-3,-4,2)^\top(2,-5,4)=-6+20+8=22$ — erwartet `22`, korrekt.
- `shape-debug-authored`: $A\in\mathbb{R}^{3\times2}$, $B\in\mathbb{R}^{2\times4}$ ergibt $AB\in\mathbb{R}^{3\times4}$ und $BA$ undefiniert — erwartete Choice korrekt.

**Vorschläge**

- [P0] `content/modules/lm-linalg-matrices.json:85-96` `masteryEligible` für `product-definition-rationale` auf `false` setzen oder den Fall in einen deterministischen Grader migrieren.
- [P1] `content/families/formula-scalar-product.json` bei allen mastery-fähigen Numeric-Fällen mindestens 2 gestufte Hinweise und Diagnose-Feedback ergänzen (R3/R4).
- [P1] Einen challenge-Case hinzufügen, z.B. `shape-debug-authored` hochstufen oder einen neuen generierten Seed als `challenge` platzieren.

---

## c-linalg-systems

**Deckung**: 6 Placements (5 curated + 1 practice-space), 4 Familien (`formula-scalar-product`, `transform-system-2x2-elimination`, `classify-column-combination`, `classify-rank-solution-case`), 1 Lektion `l-linalg-systems`.  
**Copy**: Lektion verknüpft Zeilen- und Spaltenbild gut.  
**Evidenz**: Numeric, Trace, Single-Choice, Code-Trace; core dominiert, stretch als Einzelcase.  
**Interaktiv**: `content/lessons/linear-algebra/two-lines.viz.json` enthält einen mathematischen Fehler.

**Befunde**

- [P0] `content/lessons/linear-algebra/two-lines.viz.json:14` berechnet den Schnittpunkt $S$ als $\bigl((2c_1-c_2)/3,\,(c_1+c_2)/3\bigr)$. Für die tatsächlichen Geraden $y=c_1-2x$ und $y=(c_2+x)/2$ ergibt sich der Schnittpunkt aber bei $\bigl((2c_1-c_2)/5,\,(c_1+2c_2)/5\bigr)$. Beispiel $c_1=1$, $c_2=-1$: Datei zeigt $(1,0)$, korrekt wäre $(0.6,-0.2)$. $(1,0)$ liegt nicht auf $L_1$ und nicht auf $L_2$ — fachlicher Fehler (R1/R12/P0).
- [P1] `content/lessons/linear-algebra/two-lines.viz.json` ist passiv und hat keine Vorhersage-/Transferfrage (R12).
- [P1] `classify-rank-solution-case`/`rank-system-authored` ist ein Single-Choice-Mastery-Case ohne weitere Herausforderung; challenge-Lücke (R6).
- [P1] `echelon-read-rank-case` und `rank-system-authored` haben keine `hints`/`feedbackRules`.

**Nachgerechnet**

- `column-vector-authored`: $A=\begin{pmatrix}1&-1\\3&-4\end{pmatrix}$, $b=(6,17)$, $x=(7,1)$ liefert $Ax=(6,17)$ — korrekt.
- `system-w05-e11`: $-x-3y=-20$, $2x+3y=28$ → $x=8$, $y=4$ — erwartet `(8,4)`, korrekt.
- `rank-system-authored`: Rang 2, 3 Variablen, $0=0$ → eine freie Variable, unendlich viele Lösungen — erwartete Klassifikation korrekt.

**Vorschläge**

- [P0] `content/lessons/linear-algebra/two-lines.viz.json:14` auf $\bigl((2c_1-c_2)/5,\,(c_1+2c_2)/5\bigr)$ korrigieren.
- [P1] `content/lessons/linear-algebra/two-lines.viz.json` um eine Vorhersageaufgabe ergänzen: „Für $c_1=\ldots$, $c_2=\ldots$ liegt $S$ bei …?“
- [P1] Einen generierten `transform-system-2x2-elimination`-Challenge-Seed in `content/modules/lm-linalg-systems.json` ergänzen.

---

## c-linalg-gauss

**Deckung**: 6 Placements (5 curated + 1 practice-space), 3 Familien (`classify-row-operation-validity`, `transform-rank-dependence-rowops`, `classify-rank-solution-case`), 1 Lektion `l-linalg-gauss`.  
**Copy**: Zeilenoperationen und Rang werden klar unterschieden.  
**Evidenz**: Single-Choice, Numeric, Konzept.  
**Interaktiv**: `content/lessons/linear-algebra/row-operation.viz.json` ist mathematisch falsch.

**Befunde**

- [P0] `content/lessons/linear-algebra/row-operation.viz.json:10` zeigt Zeile 2' durch $y=((2-\lambda)x+3-\lambda)/(1-\lambda)$ und behauptet, der Schnittpunkt $S=(2,3)$ bleibe erhalten. $S=(2,3)$ liegt auf Zeile 1 ($y=x+1$), aber für $\lambda=0.5$ liefert Zeile 2' $y=3x+5$ und damit $y(2)=11\neq3$. Der tatsächliche invariante Schnittpunkt von $y=x+1$ und der ursprünglichen Zeile 2 ($2x-y=-3$) ist $(-2,-1)$. Die Visualisierung zeigt einen Punkt, der keine Bedeutung hat — fachlicher Fehler (R1/R12/P0).
- [P1] `content/families/transform-rank-dependence-rowops.json:644-700` (`rank-3x4-line`) ist ein challenge-mastery-fähiger Fall, wird aber in keinem Modul platziert (R6).
- [P1] `content/families/classify-row-operation-validity.json:31-50` (`valid-operation-rhs`) ist mastery-fähiges Single-Choice, hat aber weder `hints`, `feedbackRules` noch `typicalErrors`.
- [P1] `content/lessons/linear-algebra/row-operation.viz.json` passiv ohne Transferaufgabe.

**Nachgerechnet**

- `rank-3x3-staircase`: $\begin{pmatrix}2&1&1\\1&2&0\\3&3&1\end{pmatrix}$ — Zeile 3 = Zeile 1 + Zeile 2, also Rang 2. Erwartet `2`, korrekt.
- `rank-3x3-full`: Stufenform mit Pivot 13 liefert Rang 3 — erwartet `3`, korrekt.
- `valid-operation-rhs`: $II\leftarrow II-2I$ bei $2x+y=5$, $x-3y=-8$ ergibt $-3x-5y=-18$ — erwartete Antwort korrekt.

**Vorschläge**

- [P0] `content/lessons/linear-algebra/row-operation.viz.json:11` Punkt $S$ auf den tatsächlich invarianten Schnittpunkt $(-2,-1)$ setzen und ggf. die Ausgangslinien ebenfalls darstellen.
- [P1] `content/families/transform-rank-dependence-rowops.json:644` (`rank-3x4-line`) in `content/modules/lm-linalg-gauss.json` als challenge-Placement hinzufügen.
- [P1] `content/families/classify-row-operation-validity.json:31-50` um gestufte Hinweise und typische Fehlerregeln ergänzen.

---

## c-linalg-independence

**Deckung**: 3 Placements (2 curated + 1 practice-space), 2 statische Familien (`classify-independence-multiple`, `transform-rank-dependence-rowops`) plus generierte Familie `formula-det2-independence` nur im Practice-Space.  
**Copy**: Lektion verbindet Determinante, Rang und Unabhängigkeit sauber.  
**Evidenz**: Nur ein curated mastery-fähiger Fall; `minimumDistinctDefinitions: 2` ist verletzt.  
**Interaktiv**: `content/lessons/linear-algebra/span-2d.viz.json` korrekt, aber passiv.

**Befunde**

- [P0] `c-linalg-independence` hat nur eine mastery-fähige curated Definition: `content/modules/lm-linalg-independence.json:33-41` (`p-linalg-independence-02-rank-3x3-staircase`). Die `evidencePolicy` in `content/competencies/core.json:300` verlangt `minimumDistinctDefinitions: 2`. Der `practice-space`-Eintrag `formula-det2-independence` (`content/modules/lm-linalg-independence.json:44-49`) zählt nicht als zweite distincte Definition. Mastery-Ehrlichkeit verletzt (R14/P0).
- [P1] `formula-det2-independence` existiert nur als Generator (`assets/js/core/foundations_linalg_families.mjs:131-143`, `assets/js/core/linalg_numpy_fresh_generators.mjs:62-85`), nicht als statische `content/families/`-JSON. Das bricht den public-first-Katalog-Vertrag und erklärt `caseMissing: true` im Inventar.
- [P1] Keine stretch/challenge-Placements; `content/families/transform-rank-dependence-rowops.json:644` (`rank-3x4-line`) und `content/families/classify-independence-multiple.json:456`/`900` (`independent-pair-negative`, `dependent-triple-span`) werden nicht genutzt.
- [P1] `content/lessons/linear-algebra/span-2d.viz.json` passiv (R12).

**Nachgerechnet**

- `dependent-pair-double`: $b_1=(1,2)$, $b_2=(2,4)$, wegen $b_2=2b_1$ abhängig — erwartete Choice `a` korrekt.
- `rank-3x3-staircase`: Rang 2, weil Zeile 3 Summe aus Zeile 1 und 2 — erwartet `2`, korrekt.
- `span-2d.viz.json`: $u=(2,1)$, $v=(2k,k+s)$, $\det(u,v)=2(k+s)-(2k)=2s$ — Text `det(u,v)={2*s}` korrekt.

**Vorschläge**

- [P0] In `content/modules/lm-linalg-independence.json` einen neuen curated core-Placement für `formula-det2-independence`/`det2-seeded-columns` einfügen, um die zweite distincte Mastery-Definition zu schließen:
  ```json
  {
    "placementId": "p-linalg-independence-03-formula-det2-independence",
    "role": "curated",
    "familyId": "formula-det2-independence",
    "caseId": "det2-seeded-columns",
    "seed": 1,
    "difficulty": "core",
    "estimatedMinutes": 8,
    "lessonId": "l-linalg-independence",
    "masteryEligible": true
  }
  ```
  Die bisherige practice-space-Platzierung (`:44-49`) sollte entfallen oder als Practice markiert bleiben.
- [P1] `formula-det2-independence` als statische `content/families/formula-det2-independence.json` persistieren oder den Generator-Vertrag im Katalog sichtbar machen.
- [P1] `content/lessons/linear-algebra/span-2d.viz.json` um eine Vorhersageaufgabe ergänzen, z.B. „Bei welchem $s$ wird die Determinante null?“

---

## c-numpy-basics

**Deckung**: 7 Placements (4 curated + 3 practice-space), 2 statische Familien (`construct-matvec-shape-contract`, `construct-linalg-contract-synthesis`), 1 Lektion `l-numpy-shape-contracts`.  
**Copy**: Shape-Verträge und Broadcasting sind klar gegliedert.  
**Evidenz**: Parsons, Code, Single-Choice; mastery aus 2 Familien.  
**Interaktiv**: `content/lessons/linear-algebra/matrix-transform.viz.json` korrekt, aber passiv.

**Befunde**

- [P1] Die practice-space-Placements in `content/modules/lm-linalg-numpy-shape-contracts.json:65-84` referenzieren `formula-scalar-product`, `formula-det2-independence` und `transform-system-2x2-elimination`. Diese Familien sind `c-linalg-matrices`, `c-linalg-independence` bzw. `c-linalg-gauss` zugeordnet, nicht `c-numpy-basics` (R15 Metadaten-Konsistenz).
- [P1] `content/families/construct-matvec-shape-contract.json:123-170` (`final-boss-authored`) hat `feedbackRules: []` (`:165`), `estimatedMinutes: 45` im Modul und einen großen Schwierigkeitssprung; fehlende gestufte Hinweise und Diagnosefeedback.
- [P1] Kein stretch-Placement; der Übergang von `matvec-code-reference` (core) zu `final-boss-authored` (challenge) ist zu steil (R6).
- [P1] `content/lessons/linear-algebra/matrix-transform.viz.json` passiv ohne Transferfrage (R12).
- [P1] `content/families/construct-linalg-contract-synthesis.json:73-132` (`synthesis-singular-guard`) ist ein core mastery-fähiger Fall, wird aber nicht platziert.

**Nachgerechnet**

- `matvec-code-reference`: `matvec([[1,2],[3,4]], [1,1])` → `[3, 7]` bei korrekter Shape-Prüfung — erwartet, korrekt.
- `matvec-contract-order`: Lösungsfolge p1→p2→p3→p4→p5, Distraktoren d1, d2 — korrekt.
- `synthesis-three-contracts`: `assert` vor der Operation, Rang mit Zeilentausch, `solve` nach Shape-Prüfung — korrekte Konzeptauswahl.

**Vorschläge**

- [P1] `content/modules/lm-linalg-numpy-shape-contracts.json:65-84` auf `c-numpy-basics`-passende Practice-Familien umstellen (z.B. `classify-matrix-shape` oder `construct-matvec-shape-contract`-Seeds).
- [P1] `content/families/construct-matvec-shape-contract.json:123-170` um `feedbackRules` und gestufte Hinweise erweitern; `estimatedMinutes` kalibrieren.
- [P1] `content/families/construct-linalg-contract-synthesis.json:73-132` (`synthesis-singular-guard`) als stretch/core-Placement hinzufügen, um den Sprung zum Final Boss abzufedern.

---

## c-pandas-cleaning

**Deckung**: 6 Placements (5 curated + 1 practice-space), 4 Familien (`classify-missingness`, `count-remaining-rows-cleaning-rule`, `trace-library-api-output`, `validate-data-quality-contract`), 1 Lektion `l-data-cleaning`.  
**Copy**: Verträge und pandas-API-Lesekompetenz sind gut erklärt.  
**Evidenz**: Konzept, Trace, generierte Counting, Code-Implementation.  
**Interaktiv**: Keine Visualisierung.

**Befunde**

- [P1] `count-remaining-rows-cleaning-rule` ist eine generierte Familie (`assets/js/core/data_ml_families.mjs:294-312`, `assets/js/core/data_ml_generators.mjs:33-81`) und hat keine statische `content/families/`-JSON. Das Modul `content/modules/lm-data-cleaning.json:35-55` platziert `missing-target-rows` und `duplicate-rows` direkt. `docs/content-review/inventar.json` markiert dafür `caseMissing: true` (R15). Falls der Validator diesen Zustand als Fehler wertet, wäre es ein P0; derzeit nur als P1/unklar.
- [P1] `content/families/classify-missingness.json:403-760` (`missingness-device-censoring`, core) und `:768-1000` (`missingness-income-survey`, stretch) sind nicht im Modul platziert (R5/R6).
- [P1] `content/modules/lm-data-cleaning.json:79-87` (`p-data-cleaning-validate-rows-contract-errors`) ist mit `estimatedMinutes: 42` sehr hoch angesetzt; die Summe der Placements übersteigt die Lektionszeit deutlich (R7).
- [P1] `content/families/validate-data-quality-contract.json` ist qualitativ stark, aber `profile-table-schema-counts` und `validate-rows-contract-errors` sind recht lang; Zeitplausibilität unklar.

**Nachgerechnet**

- `pandas-dedup-isna-lines`: `df = pd.DataFrame({"id":[1,2,2,3],"ziel":[10,20,20,None]})` → `len(df.drop_duplicates())=3`, `isna().sum()=1` — erwartet `3\n1`, korrekt.
- `profile-table-schema-counts`: 6 Zeilen, 1 `None`, 2 Sentinel `-1`, 2 duplizierte `id` → `total:6, missing:1, sentinel:2, duplicate_ids:2`, korrekt.
- `missing-target-rows`/`genCompleteRows`: Rate 15 %, `rows=60`, `missing=9`, Antwort `51` — Generator-Logik korrekt.
- `duplicate-rows`/`genDedupRows`: `rows=120`, `exactDups=5`, `dropKey=true`, `keyConflicts=3` → Antwort `112` — Generator-Logik korrekt.

**Vorschläge**

- [P1] `count-remaining-rows-cleaning-rule` entweder als statische `content/families/count-remaining-rows-cleaning-rule.json` persistieren oder den Generator-Vertrag im Katalog sichtbar machen.
- [P1] `content/families/classify-missingness.json:403` (`missingness-device-censoring`) und `:768` (`missingness-income-survey`) in `content/modules/lm-data-cleaning.json` als core/stretch-Placements ergänzen.
- [P1] `estimatedMinutes` des Moduls und der einzelnen Placements neu kalibrieren.

---

## c-eda-viz

**Deckung**: 5 Placements (4 curated + 1 practice-space), 4 Familien (`classify-confounding`, `formula-ratio-percent-metric`, `trace-library-api-output`, `formula-descriptive-stats-numpy`, `aggregate-grouped-metrics-report`), 1 Lektion `l-eda-distributions`.  
**Copy**: EDA-Workflow (Histogramm, Median, Korrelation, Confounder, bedingte Anteile) ist klar gegliedert.  
**Evidenz**: Konzept, Trace, generierte Prozentaufgabe, Code, Stretch-Report.  
**Interaktiv**: `content/lessons/data-ml/normal-density.viz.json` passiv.

**Befunde**

- [P1] `formula-ratio-percent-metric`/`conditional-count-percent` ist generiert (`assets/js/core/data_ml_families.mjs:313-318`, `assets/js/core/data_ml_generators.mjs:84-116`) und nicht als statische `content/families/`-JSON vorhanden. `docs/content-review/inventar.json` zeigt `caseMissing: true` (R15).
- [P1] `content/families/formula-descriptive-stats-numpy.json:81-150` (`describe-outlier-bins`) ist ein challenge-mastery-fähiger Fall, wird aber nicht platziert (R6).
- [P1] `content/lessons/data-ml/normal-density.viz.json` und andere Visualisierungen im Block sind passiv und ohne Transfer-/Vorhersagefrage (R12).
- [P1] `content/modules/lm-eda-distributions.json` hat kein challenge-Placement.
- [P2] `content/families/classify-confounding.json:402` (`confounder-exercise-sleep`, core) und `:766` (`confounder-ad-spend-season`, stretch) sind nicht im Modul platziert.

**Nachgerechnet**

- `numpy-median-histogram-corrcoef`: Median von `[2,4,4,4,5,5,7,9]` ist `4.5`; Histogramm `[0,4,9]` liefert `[1,7]`; Korrelation mit `[1,2,3,3,4,5,6,8]` ≈ `0.9726` → gerundet `0.97` — alles korrekt.
- `describe-and-bins`: `mean=5.0`, `median=4.5`, `std=2.0`, `bin_counts([...], [0,4,9])=[1,7]` — korrekt.
- `conditional-count-percent`/`genConditionalCount`: $n_A=q\cdot t$, Antwort $p\cdot t$ bzw. $100c/n$ — Generator-Logik korrekt.
- `hypothesis-report-groups`: Für `a=[1,2,3,4]`, `b=[2,4,6,9]`, `labels=[ctrl,ctrl,test,test]` ergibt `r≈0.994`, `medians={ctrl:1.5,test:3.5}`, `share=0`, Verdict korrekt.

**Vorschläge**

- [P1] `conditional-count-percent` statisch persistieren oder Generator-Vertrag im Katalog sichtbar machen.
- [P1] `content/families/formula-descriptive-stats-numpy.json:81-150` (`describe-outlier-bins`) in `content/modules/lm-eda-distributions.json` als challenge-Placement ergänzen.
- [P1] `content/lessons/data-ml/normal-density.viz.json` um eine Vorhersageaufgabe ergänzen, z.B. „Setze μ und s so, dass ca. 95 % der Fläche zwischen … liegen.“

---

## Blockübergreifende Befunde

- **P0 — Fachliche Fehler in Visualisierungen**: `content/lessons/linear-algebra/two-lines.viz.json:14` und `content/lessons/linear-algebra/row-operation.viz.json:10-11` zeigen mathematisch falsche Schnittpunkte. Lernende würden falsche Formeln bzw. Vorstellungen zur Lösungsmenge-Erhaltung bei Zeilenoperationen internalisieren.
- **P0 — Mastery-Definitionen unvollständig**: `c-linalg-independence` hat nur eine curated mastery-fähige Definition, obwohl `content/competencies/core.json:300` `minimumDistinctDefinitions: 2` verlangt. Als konkrete Schließung bietet sich ein curated Placement von `formula-det2-independence`/`det2-seeded-columns` an.
- **P0 — Mastery-Ehrlichkeit**: `product-definition-rationale` (`content/modules/lm-linalg-matrices.json:85-96`) ist als mastery markiert, obwohl der Fall `content/families/formula-scalar-product.json:160-197` `masteryEligible: false` und `graderId: manual-rubric` nutzt.
- **P1 — Generated families fehlen im public catalog**: `formula-det2-independence`, `count-remaining-rows-cleaning-rule` und `formula-ratio-percent-metric` existieren nur als Code-Generatoren. `docs/content-review/inventar.json` markiert diese Fälle mit `caseMissing: true`. Das ist ein systemisches Muster, das den public-first-Katalog-Vertrag schwächt.
- **P1 — Schwierigkeits-Spread**: Challenge fehlt in `c-linalg-matrices`, `c-linalg-systems`, `c-linalg-independence`, `c-pandas-cleaning` und `c-eda-viz`; `c-numpy-basics` hat keinen Stretch zwischen core und challenge.
- **P1 — Hinweise und Feedback**: Mehrere mastery-fähige Fälle haben keine `hints`, `feedbackRules` oder `typicalErrors` (z.B. `matmul-entry-w05-e1`, `dot-product-w05-e13`, `valid-operation-rhs`, `echelon-read-rank-case`), was R3/R4 schwächt.
- **P1 — Visualisierungen passiv**: Alle Visualisierungen im Block (Spaltenbild, Linien, Zeilenoperation, Spann/Determinante, Matrix-Transformation, Normalverteilung) zeigen, ohne eine Vorhersage-/Transferfrage zu stellen. Das bestätigt das systemische R12-Defizit aus `docs/content-review/raw/e2-interaktiv-audit.md`.
- **P1 — Zeitplausibilität**: Einzelne Placements (`final-boss-authored` 45 min, `validate-rows-contract-errors` 42 min) und Modulsummen scheinen gegenüber den Lektionszeiten (50–70 min) unkalibriert.
- **P1 — Spiralrückgriff (R11)**: Lektionen verlinken andere Familien (z.B. `content/lessons/linear-algebra/independence.md` verweist auf `dot-product`), aber gezielte, wiederkehrende Retrieval-Aufgaben über Module hinweg sind nicht sichtbar.

## Content-Validation

`node tools/validate_content.mjs` und `node tools/compile_content.mjs` konnten in dieser Session nicht ausgeführt werden, weil das Tool `node` im laufenden Hintergrund mit automatischer Ablehnung quittiert. Der Review ist daher auf direkte Dateiinspektion und Nachrechnung gestützt; formale Inhaltsvalidierung ist *unverifiziert*. Vor inhaltlichen Änderungen an den markierten P0/P1-Punkten sollte die Validierung im zugänglichen Kontext nachgeholt werden.

---

*Bericht erstellt auf Basis von `content/`, `assets/js/core/`, `docs/content-review/rubrik.md`, `docs/content-review/raw/e1-evidenz-remap.md` und `docs/content-review/raw/e2-interaktiv-audit.md` im aktuellen Repository-Stand.*
