# B7: Tracks, Milestones, Katalog, requires-DAG (Agent-Review)

**Reviewer-Block:** B7  
**Scope:** `content/competencies/core.json`, `content/tracks/core.json`, `content/milestones/core.json`, `content/competency-family-coverage.json`, `content/catalog.json`, `content/sources.json`, `content/source-rights.json`, `content/tools/core.json` sowie alle darin referenzierten Module/Familien.  
**Zielpfad:** `docs/content-review/raw/b7-tracks-milestones.md`  
**Geprüft mit:** statischem `jq`/`grep`, Dateilektüre; kein `node tools/validate_content.mjs` / `build_public.mjs` möglich, weil Node im Hintergrundmodus nicht genehmigt wurde.

---

## 1. Executive Summary

| Kategorie | Anzahl | Schweregrad-Schwerpunkt |
|-----------|--------|-------------------------|
| P0 (fachlicher Fehler / echte Lücke / Mastery-Ehrlichkeit) | 8+ | Fehlende Familiendateien, Mastery-Deckung < Minimum, Milestone-Artefakt-Lücken, `competency-family-coverage`-Drift |
| P1 (didaktische/evidenzbelegte Lücke) | 6+ | Track-Voraussetzungen unvollständig, relations-vs-requires-Lücken, Diagnose-Placements fehlen |
| P2 (Stil / Kosmetik) | 0 | – |

Wichtigste Befunde:

- **P0:** 24 Familien-IDs in `content/competency-family-coverage.json` und 25 Familien-IDs aus Modul-Placements sind in `content/families/*.json` nicht auffindbar. 21 Kompetenzen im Coverage-Manifest verweisen auf fehlende Familiendateien.
- **P0:** `competency-family-coverage.json` ist massiv gegen die tatsächlichen Module verzerrt: 39/41 Kompetenzen deklarieren mehr Familien, als im Modul geplaced sind (Beispiel `c-numpy-basics`: 23 deklariert, 2 geplaced, Zeilen 130–155).
- **P0:** `c-meta-learning`, `c-linalg-independence`, `c-python-basics`, `c-python-functions` und `c-ml-logistic` erreichen ihre `minimumDistinctDefinitions: 2` im geplaceden Content nicht (jeweils 1 mastery-fähige Familie).
- **P1:** `c-git-basics` erfordert `c-meta-learning` (`content/competencies/core.json` Z. 470–472); `c-linalg-independence` erfordert `c-linalg-matrices`, nicht `c-linalg-gauss`, obwohl `c-linalg-gauss` als `supports` verknüpft ist (Z. 257–259).
- **P1:** In den Tracks `common-core` und `research-evaluation` steht `c-git-basics` vor `c-meta-learning` (Reihenfolgeverletzung). Alle Tracks enthalten unvollständige Voraussetzungen (siehe Track-Details).
- **P0/P1:** `ms-foundations` fehlen `diagnostic`-Artefakte für `c-algebra-basics`, `c-python-basics`, `c-python-reading` und `guided-practice` für `c-meta-learning`; `ms-linear-algebra-numpy-pilot` fehlt `project-step` für `c-numpy-basics` und Coverage-Einträge für 3 Kompetenzen.

---

## 2. Methodik

1. **DAG:** Kahn-Topologische Sortierung über `requires`; Gültigkeitsprüfung aller `requires`/`relations`-IDs.
2. **Tracks:** Vergleich `track.competencyIds` mit den per `competency.trackIds` erwartbaren Mitgliedern; Prüfung, ob Voraussetzungen früher im Track stehen bzw. im Track enthalten sind.
3. **Milestones:** Auflösung aller `competencyIds`, `lessonIds`, `projectIds`; Prüfung ob jede Milestone-Kompetenz in `coverage` auftaucht und ob `requiredArtifacts` durch Module belegt sind.
4. **Artefakte:** Pro Kompetenz: `lesson`, `diagnostic`, `guided-practice`, `evidence-families`, `delayed-review`, `project-step` gegen Modul-Placements, Familien und Projekte.
5. **Katalog:** Versionsabgleich `catalog.json` ↔ `competency-family-coverage.json`; Quellen/Rechte/Tool-Referenzen auflösen; Familien-Resolver gegen `content/families/*.json`.

---

## 3. Requires-/Relations-DAG

### 3.1 Verifiziert

- **Azyklisch:** Kahn-Algorithmus über `requires` ergibt keine Zyklusknoten.
- **Referenzen auflösbar:** Keine ungültigen `requires`- oder `relations`-IDs in `content/competencies/core.json`.
- **Richtung:** `requires` bildet einen gerichteten azyklischen Graphen; globale Ordnung existiert.

### 3.2 Fachliche Befunde

#### P1: Fachlich fragliche Prerequisite-Modellierung

- `c-git-basics` (`content/competencies/core.json` Z. 464–478) verlangt `c-meta-learning` (Z. 470–472). Git-Grundlagen sind fachlich nicht zwingend abhängig von Fehleranalyse/Lernplanung; die Kante wirkt eher wie eine Reihenfolgeempfehlung.
- `c-testing-debugging` verlangt `c-python-functions` und `c-python-files-errors` (Z. 442–445), nicht `c-git-basics`. `c-git-basics` ist allerdings in `relations` als `supports` für `c-testing-debugging` vermerkt (Z. 474–476); fachlich könnte Git als Voraussetzung für reproduzierbares Debuggen stehen — unklar.
- `c-linalg-independence` verlangt nur `c-linalg-matrices` (Z. 284–286), während `c-linalg-gauss` die Kompetenz in `relations.supports` trägt (Z. 257–259). Rang/Unabhängigkeit baut systematisch auf Gauß-/Systemauflösung auf; eine `requires`-Kante `c-linalg-gauss` wäre fachlich plausibel.
- `c-ml-repro` hat mehrere parallele Voraussetzungen (`c-ml-cv`, `c-ml-svm-pca`, `c-ml-ensembles`, `c-ml-regularization`); das ist fachlich nachvollziehbar, aber die Chain fordert viel Vorwissen.

#### P1: relations, die nicht in `requires` gespiegelt sind

| from | relation | to | Befund |
|------|----------|----|--------|
| `c-git-basics` | `supports` | `c-testing-debugging` | `c-testing-debugging` erfordert Git nicht; fachlich prüfenswert |
| `c-linalg-gauss` | `supports` | `c-linalg-independence` | `c-linalg-independence` erfordert `c-linalg-gauss` nicht; fachlich wahrscheinlich fehlende Kante |

Kein P0, weil `relations` per Konvention nicht implizit als Prerequisite gelten; die fachliche Stimmigkeit muss aber geprüft werden.

---

## 4. Tracks

### 4.1 Track-Mitgliedschaft (verifiziert)

Für alle vier Tracks (`common-core`, `applied-ai`, `mathematical-foundations`, `research-evaluation`) stimmen `track.competencyIds` mit den per `competency.trackIds` erwartbaren Mitgliedern überein: keine Extra- oder fehlenden Kompetenzen innerhalb des Track-Arrays.

### 4.2 Reihenfolge- und Voraussetzungsbefunde

| Track | Reihenfolgeverletzungen (Voraussetzung steht später) | Fehlende Voraussetzungen im Track |
|---|---|---|
| `common-core` | `c-git-basics` (Index 9) vor `c-meta-learning` (Index 10) — `content/tracks/core.json` Z. 20–21 | keine |
| `applied-ai` | – | `c-git-basics` → `c-meta-learning`; `c-linalg-matrices` → `c-algebra-basics`; `c-grad-regression` → `c-algebra`; `c-ml-svm-pca` → `c-linalg-independence`; `c-dl-papers` → `c-meta-learning`; `c-research-capstone` → `c-research-responsible` |
| `mathematical-foundations` | – | `c-grad-regression` → `c-numpy-basics`; `c-ml-linear` → `c-ml-baseline`; `c-ml-regularization` → `c-ml-cv`; `c-ml-svm-pca` → `c-ml-cv`; `c-dl-tensors` → `c-numpy-basics`; `c-dl-training` → `c-ml-baseline`; `c-dl-regularization` → `c-ml-cv` |
| `research-evaluation` | `c-git-basics` (Index 3) vor `c-meta-learning` (Index 4) — `content/tracks/core.json` Z. 126–127 | `c-python-reading` → `c-python-basics`; `c-python-files-errors` → `c-python-functions`, `c-python-collections`; `c-testing-debugging` → `c-python-functions`; `c-ml-baseline` → `c-pandas-cleaning`, `c-eda-viz`; `c-ml-cv` → `c-ml-logistic`; `c-ml-repro` → `c-ml-regularization`, `c-ml-ensembles`, `c-ml-svm-pca`; `c-dl-papers` → `c-dl-finetuning`; `c-genai-eval` → `c-genai-rag`; `c-genai-security` → `c-genai-rag`; `c-research-capstone` → `c-genai-prototype` |

### 4.3 Bewertung

- **P1:** `common-core` und `research-evaluation` haben je eine `c-git-basics`/`c-meta-learning`-Reihenfolgeverletzung. Da `c-git-basics` `c-meta-learning` zwingend voraussetzt, darf es im Track nicht vor `c-meta-learning` stehen — **P0**, falls der Track topologisch strikt konsumiert wird. Da hier nur die fachliche Notwendigkeit fraglich ist, wird es in diesem Block als **P1** geführt (Verletzung der Track-Konsistenzregel).
- **P1:** `applied-ai` und `mathematical-foundations` sind als separate Tracks nicht eigenständig lernbar, ohne auf `common-core` zurückzugreifen. Das ist wahrscheinlich beabsichtigt (Track-Schnittmenge mit `common-core`), sollte aber in der Track-Dokumentation ausgewiesen sein — ansonsten P0 für "Track ohne Voraussetzungen".
- **P1:** `research-evaluation` fehlen fast alle Voraussetzungen; der Track fungiert vermutlich als Kappe/Spur über anderen Tracks, nicht als autonomer Pfad.

---

## 5. Milestones

### 5.1 Referenz-Auflösung (verifiziert)

- Alle `competencyIds` in allen Milestones existieren in `content/competencies/core.json`.
- Alle `lessonIds` existieren in `content/lessons/**/*.json`.
- Alle `projectIds` existieren in `content/projects/*/project.json` (`p-foundations-data-checker`, `p-ml-repro-comparison`, `p-rag-capstone`, `p-rag-secure-prototype`).

### 5.2 Per Milestone

#### `ms-foundations` (Z. 6–159)

- **Referenzen:** vollständig auflösbar.
- **Coverage-Gaps (P0/P1):**
  - `c-algebra-basics` fehlt `diagnostic` (`content/milestones/core.json` Z. 46).
  - `c-python-basics` fehlt `diagnostic` (Z. 67).
  - `c-python-reading` fehlt `diagnostic` (Z. 79).
  - `c-meta-learning` fehlt `guided-practice` (Z. 155) — das Modul `lm-foundations-learning.json` enthält kein `practice-space`-Placement.
- **Evidenz-Familien unter Minimum (P0):**
  - `c-python-basics`: 1 geplacede mastery-Familie, Minimum 2.
  - `c-python-functions`: 1 geplacede mastery-Familie (`trace-call-composition`), Minimum 2.
- **Projekt:** `p-foundations-data-checker` ist verknüpft; Deckt `c-python-basics`, `c-python-reading`, `c-python-functions` (project.json), deckt aber `c-algebra-basics` und `c-meta-learning` nicht.

#### `ms-linear-algebra-numpy-pilot` (Z. 161–240)

- **Referenzen:** vollständig auflösbar.
- **Fehlende Coverage-Einträge (P1):** `c-algebra`, `c-python-reading`, `c-meta-learning` sind in `competencyIds` (Z. 168–175), aber nicht in `coverage` aufgeführt. Sie sind zwar in `ms-foundations` abgedeckt, was für Fortschrittstracking missverständlich ist.
- **Coverage-Gaps (P0):** `c-numpy-basics` verlangt `project-step` (Z. 236), aber Milestone hat `projectIds: []` und das zugehörige Modul `lm-linalg-numpy-shape-contracts` hat ebenfalls `projectIds: []`.
- **Evidenz-Familien unter Minimum (P0):** `c-linalg-independence`: 1 geplacede mastery-Familie (`transform-rank-dependence-rowops` — `classify-independence-multiple` ist `masteryEligible: false`, `formula-det2-independence` ist eine `practice-space`-Family ohne Datei), Minimum 2.

#### `ms-data-ml-classic-ml` (ab Z. 242)

- **Referenzen:** vollständig auflösbar.
- **Coverage-Gaps:** keine.
- **Evidenz-Familien unter Minimum (P0):** `c-ml-logistic`: nur `aggregate-confusion-metric` ist mastery-fähig geplaced (`classify-sigmoid-regime` hat `masteryEligible: false` im Modul `lm-ml-logistic.json` Z. 31), Minimum 2.

#### `ms-dl-genai`

- **Referenzen:** vollständig auflösbar.
- **Coverage-Gaps:** keine.
- **Evidenz-Familien unter Minimum:** keine innerhalb der Milestone-Coverage (Module decken mindestens 2 mastery-Familien).

#### `ms-research-capstone`

- **Referenzen:** vollständig auflösbar.
- **Coverage-Gaps:** keine.
- **Evidenz-Familien unter Minimum:** keine innerhalb der Milestone-Coverage.

---

## 6. Artefaktprüfung pro Kompetenz

### 6.1 Module ohne Diagnostic-Placement (P1)

Folgende Kompetenzen haben kein Placement mit `masteryEligible: false` (Diagnoseartefakt), obwohl sie in der Milestone-Coverage teils `diagnostic` verlangen:

- `c-algebra-basics` (`lm-foundations-algebra`)
- `c-algebra` (`lm-foundations-algebra`)
- `c-python-basics` (`lm-foundations-python-state`)
- `c-python-reading` (`lm-foundations-code-reading`)
- `c-python-functions` (`lm-foundations-functions`)
- `c-meta-learning` (`lm-foundations-learning`)
- `c-python-control-flow`, `c-python-collections`, `c-python-files-errors`, `c-testing-debugging`, `c-git-basics`

### 6.2 Mastery-Definitionen unter Minimum (P0)

| Kompetenz | Modul(e) | geplacede mastery-Familien | Minimum (`minimumDistinctDefinitions`) |
|---|---|---|---|
| `c-python-basics` | `lm-foundations-python-state` | 1 (`trace-assignment-state`) | 2 |
| `c-python-functions` | `lm-foundations-functions` | 1 (`trace-call-composition`) | 2 |
| `c-meta-learning` | `lm-foundations-learning` | 0/1 (nur `classify-error-hypothesis`, Datei fehlt) | 2 |
| `c-linalg-independence` | `lm-linalg-independence` | 1 (`transform-rank-dependence-rowops`) | 2 |
| `c-ml-logistic` | `lm-ml-logistic` | 1 (`aggregate-confusion-metric`) | 2 |

Dies verstößt gegen R14 (Mastery-Ehrlichkeit) und G-20 (Evidenzgrundlage).

---

## 7. Katalog, Quellen, Rechte, Tools

### 7.1 Verifiziert

- `catalog.json` `version` (`2026.08.31`) stimmt mit `competency-family-coverage.json` `catalogVersion` überein.
- `catalog.json` `sourcesFile: "sources.json"` und `sourceRightsFile: "source-rights.json"` existieren.
- `content/tools/core.json`: Alle `competencyIds` sind gültige Kompetenzen; alle `sourceRefs` sind in `sources.json` auflösbar; alle `rightsId` sind in `source-rights.json` `sources[].sourceId` auflösbar (einziger Public-Eintrag: `ki-lernplattform-original`).
- `content/sources.json` enthält sowohl `generated` als auch alle von Tools referenzierten externen Quellen (`numpy-docs`, `py-tutorial-official-3.14`, `mit-ocw-18-06sc`, `wikibooks-mfnf`, `dlwp-notebooks`).

### 7.2 P0: Fehlende Familien-Dateien

24 der in `competency-family-coverage.json` verzeichneten `familyIds` und 25 der in Modul-Placements verwendeten `familyIds` haben kein Pendant in `content/families/*.json`:

```
aggregate-accumulator-count
aggregate-majority-rule-count
aggregate-topk-relevance-arithmetic
classify-control-construct
classify-error-hypothesis
classify-exception-placement
classify-git-operation
classify-python-collection-choice
classify-set-operation-semantics
classify-string-immutability
classify-test-attitude
construct-guarded-loop
construct-regression-test-suite
construct-safe-bugfix-workflow
construct-test-structure-aaa
count-remaining-rows-cleaning-rule
formula-count-from-construction
formula-metric-spread-range
optimize-backprop-path-sum
trace-collection-state
trace-dict-state-update
trace-exception-path
transform-expression-simplify-canonical
transform-power-log-exponent
```

Zusätzlich (nur Modul, nicht Coverage): `formula-det2-independence`.

Beispiel-Referenzen in Modulen:
- `content/modules/lm-foundations-algebra.json` Z. 56, 67, 74, 85, 92, 103, 114 referenziert `transform-power-log-exponent`, `transform-expression-simplify-canonical`, `classify-error-hypothesis`.
- `content/modules/lm-foundations-learning.json` Z. 24 referenziert `classify-error-hypothesis`.
- `content/modules/lm-linalg-independence.json` Z. 46 referenziert `formula-det2-independence`.

**Folge:** `compile_content` / `build_public` können diese Fälle nicht in den Public-Tree auflösen. Laut Produktvertrag muss der Public-Build *fail-closed* sein; daher **P0**.

### 7.3 P1: `competency-family-coverage.json` ist gegen Module verzerrt

39 von 41 Einträgen in `competency-family-coverage.json` deklarieren mehr Familien, als im Modul tatsächlich als mastery-Placement vorhanden sind. Beispiele:

| Kompetenz | Deklarierte Familien (`competency-family-coverage.json`) | Geplacede mastery-Familien (Module) | Defizit | Zeilen |
|---|---|---|---|---|
| `c-numpy-basics` | 23 | 2 | 21 | 130–155 |
| `c-python-functions` | 15 | 1 | 14 | 55–75 |
| `c-python-reading` | 12 | 2 | 10 | 36–53 |
| `c-genai-security` | 11 | 4 | 7 | (im File) |
| `c-ml-cv` | 9 | 4 | 5 | (im File) |
| `c-ml-repro` | 8 | 3 | 5 | (im File) |
| `c-grad-regression` | 7 | 3 | 4 | (im File) |
| `c-linalg-gauss` | 5 | 3 | 2 | 109–118 |

Auch `c-python-basics` (Z. 27–34), `c-meta-learning` (Z. 77–84) und `c-linalg-independence` (Z. 120–128) deklarieren Familien, die entweder nicht geplaced sind oder nicht existieren.

**Bewertung:** Das Manifest ist offenbar eine Planungs- oder Stub-Version und nicht gegen die tatsächlichen Module/Placements abgeglichen. Für Mastery-Ehrlichkeit und Build-Determinismus muss `competency-family-coverage.json` entweder aus den Modulen neu generiert oder redaktionell korrigiert werden — **P1**, wird aber zu **P0**, sobald der Build darauf basiert.

### 7.4 P1: Einige `competency-family-coverage`-Familien gehören offenbar anderen Kompetenzen

Beispiel `c-python-functions` (Z. 55–75): es deklariert `aggregate-confusion-metric`, `construct-secure-prototype-contract`, `reproduce-pipeline-status-report`, `validate-rule-catalog-scan` etc. Diese Familien gehören inhaltlich offensichtlich zu ML/Repro/GenAI-Topics, nicht zu Python-Funktionen. Ähnlich `c-numpy-basics` (Z. 130–155). Das deutet auf einen fehlerhaften Merge/Import oder eine unvollständige Neuzuordnung hin.

---

## 8. Blockübergreifende Befunde

- **G-20 / R14:** Mindestens 5 Kompetenzen haben nicht genügend mastery-fähige Familien-Definitionen (siehe 6.2). Das ist ein wiederkehrendes P0 aus dem E1-Report (`c-meta-learning`, `c-linalg-independence`) und hat sich in B7 als breiteres Problem bestätigt (`c-python-basics`, `c-python-functions`, `c-ml-logistic` neu dazu).
- **R11 (Kumulation/Spirale):** Track-Abhängigkeiten sind überwiegend plausibel, aber viele Tracks enthalten Lücken, die durchaus beabsichtigt sein können (Spiralrückgriff auf `common-core`). Unklar bleibt, ob die Lernplattform Track-übergreifende Voraussetzungen automatisch spiralisiert zurückspielt.
- **R15 (Referenzen/Lizenzen/Status):** Tool-Referenzen und Quellen sind konsistent; `source-rights.json` benutzt den Schlüssel `sources` (nicht `rights`), was lesbar ist, aber bei der Schema-Namenskonvention ggf. P2.

---

## 9. Nicht durchgeführte Checks

- `node tools/validate_content.mjs` und `node tools/build_public.mjs` konnten im Hintergrundmodus nicht ausgeführt werden (Abhängigkeitenverweigerung). Die Befunde basieren auf statischer JSON-Analyse; ein vollständiger Validator- bzw. Build-Lauf könnte weitere Fehler (z. B. Schema-Verletzungen, fehlende Familien bei Compile) sichtbar machen.

---

## 10. Priorisierung

### P0 (vor nächstem Build/Release)

1. Fehlende `content/families/*.json` für 24+ `familyIds` anlegen oder Referenzen bereinigen.
2. `c-meta-learning`, `c-linalg-independence`, `c-python-basics`, `c-python-functions`, `c-ml-logistic` auf mindestens 2 mastery-fähige Familien-Definitionen ergänzen.
3. Milestone-Coverage-Lücken schließen: `ms-foundations` Diagnostic/Guided-Practice, `ms-linear-algebra-numpy-pilot` `project-step` für `c-numpy-basics`.
4. `competency-family-coverage.json` gegen reale Modul-Placements konsistent machen; momentan ist es 39/41-mal überdeklariert.
5. `c-git-basics`/`c-meta-learning` Reihenfolge in `common-core` und `research-evaluation` korrigieren, falls der Track konsumiert wird.

### P1

1. `c-git-basics` → `c-meta-learning` fachlich prüfen; ggf. in `supports`/verwandte Beziehung umwandeln.
2. `c-linalg-gauss` in `requires` von `c-linalg-independence` ergänzen.
3. Track-Voraussetzungen dokumentieren oder ergänzen, damit Tracks nicht autonom erscheinen.
4. `ms-linear-algebra-numpy-pilot` Coverage für `c-algebra`, `c-python-reading`, `c-meta-learning` ergänzen oder Kompetenzen aus dem Milestone entfernen.
5. Diagnose-Placements für `c-algebra-basics`, `c-algebra`, `c-python-*`, `c-meta-learning`, `c-git-basics` ergänzen.

### P2

- Kosmetische Bereinigung `source-rights.json` Schlüsselbezeichnung `sources` → `rights` (nur falls Schema-Convention das vorsieht).

---

## 11. Anhang: Betroffene Kompetenzen pro fehlender Familiendatei (Coverage)

Die folgenden 21 Kompetenzen verweisen in `competency-family-coverage.json` auf mindestens eine nicht existierende Familiendatei:

`c-python-control-flow` (5), `c-python-collections` (5), `c-testing-debugging` (4), `c-algebra-basics` (2), `c-algebra` (2), `c-meta-learning` (2), `c-git-basics` (2), `c-python-files-errors` (1), `c-pandas-cleaning` (1), `c-ml-baseline` (1), `c-ml-cv` (1), `c-ml-ensembles` (1), `c-ml-repro` (1), `c-dl-tensors` (1), `c-dl-autograd` (1), `c-dl-training` (1), `c-dl-regularization` (1), `c-dl-attention` (1), `c-dl-tokenizer` (1), `c-dl-finetuning` (1), `c-genai-rag` (1).

(Angabe in Klammern = Anzahl fehlender `familyIds` in diesem Coverage-Eintrag.)
