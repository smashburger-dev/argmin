# Challenge-Pilot-Audit

Stand: 2026-09-13. Inventar aller Challenge-Kandidaten und Prüfung gegen den
Challenge-Vertrag (siehe `docs/challenge-rubric.md`). Quellen:

- `content/families/*.json`: alle Fälle mit `"difficultyProfile": "challenge"` → **32 Fälle in 25 Familien**.
- `assets/js/core/procedural/*.mjs`: alle Falldefinitionen mit `difficulty: 'challenge'` → **26 Fälle in 19 Dateien**.

Die beiden Mengen beschreiben denselben Bestand: alle 26 prozeduralen Fälle
haben einen JSON-Exemplar-Körper gleicher `caseId`; 6 JSON-Fälle haben kein
prozedurales Modul (sie werden von JS-Familien außerhalb von `procedural/`
oder als statische Familie bedient). Die Tabelle listet daher **32
eindeutige Fälle**; die Spalte „mjs“ markiert, ob zusätzlich eine
Falldefinition in `procedural/` existiert.

## 1. Geprüfter Vertrag

Pro Fall wird geprüft:

| Bedingung | Schwelle |
|---|---|
| `difficultyProfile` | `challenge` |
| `masteryEligible` | `true` |
| `hints` | ≥ 2 (autoriierte Einträge am Fallkörper) |
| `fullSolution` | ≥ 2 Blöcke (leerzeilengetrennte Abschnitte) |
| `sourceLineage` | nicht leer |
| Typ-Minimum `python-code` | `expected.requiredFunctions` ≥ 2 **oder** `__check(` ≥ 8 im generierten Testblock |
| Typ-Minimum `worked-example-fading` | `expected.gaps` ≥ 4 |
| Typ-Minimum `multiple-choice` | `expected.correctIds` ≥ 2 |
| Typ-Minimum sonstige | `competencyIds` ≥ 2 **und** `hints` ≥ 2 |

Kontrollgrößen: `__check(` wurde doppelt gemessen — einmal im dokumentierten
`parameters.tests` des JSON-Exemplars (Basisblock) und einmal im zur
Laufzeit erzeugten Testblock (`generate()` mit Probe-Seed; Basis +
Seed-Ziehungen). Der Laufzeitwert ist die belastbare Zahl, er geht in das
Verdict ein. `competencyIds` wird effektiv gezählt (Fall-Ebene, sonst
Familienvertrag JSON, sonst JS-Vertrag). `challengeEligible` ist im Schema
vorhanden (`schemas/exercise-family-cases.schema.json`), aber an **keinem**
Fall gesetzt.

**Umsetzungsstand im Worktree** (uncommitted, Plan
`.agents/plans/2026-09-09-challenge.md`): `tools/compile_content.mjs`
`validateChallengeContracts` erzwingt bereits den Vertrag weitgehend —
Pflichtfelder, instantiate-Smoke-Check auf dem challenge-Profil, hints ≥ 2,
fullSolution „≥ 2 Absätze ODER ≥ 80 Zeichen" (Zeichen-Floor statt reiner
Block-Regel), python-code `requiredFunctions` ≥ 2 ODER `__check` ≥ 8 im
**generierten** Testblock, fading gaps ≥ 4, multiple-choice correctIds ≥ 2,
sonst competencyIds ≥ 2. Bei `contract: null`-Docs wird die **instanziierte**
Fallstruktur bemessen (instance.parameters/expectedAnswer/hints/
competencyIds), nicht das Exemplar — deckt sich mit der Messmethode hier.
Dazu kommen `assets/js/domain/challenge_picker.mjs` (Tages-Pool aus
challengeEligible-Flaggen) und `src/adapters/challenge.ts`. Die Tabelle
unten bewertet gegen die **strengere** Rubrik-Fassung (fullSolution ≥ 2
Blöcke); wo die Compiler-Fassung laxer ist, steht es im Verdict.

Verdicts: **FLAG-READY** = Vertrag erfüllt, nur `challengeEligible: true`
setzen; **NEEDS-WORK** = benannte Lücke(n) schließen; **NOT-SUITABLE** =
Fall trägt sein Challenge-Label nicht strukturell (Neudesign statt
Metadaten nötig).

## 2. Falltabelle (32 Fälle)

Spalten: H = hints, FS = fullSolution Zeichen/Blöcke, chk = `__check` im
JSON-Basisblock/zur Laufzeit, rF = requiredFunctions, comp = effektive
competencyIds, lin = sourceLineage, mjs = Falldefinition in `procedural/`,
Platz = Module mit kuratiertem Placement dieses caseId auf `challenge`.

| Familie | Fall | Typ | H | FS | chk | rF | comp | lin | mjs | Platz | Verdict |
|---|---|---|---|---|---|---|---|---|---|---|---|
| aggregate-detector-eval-compare | run-eval-compare-rulesets | python-code | 2 | 2165/9 | 8/26 | 0 | 2 | ja | ja | lm-genai-eval | FLAG-READY |
| aggregate-detector-eval-compare | detector-table-best-f1 | python-code | 2 | 1837/7 | 6/18 | 0 | 2 | ja | ja | lm-genai-security | FLAG-READY |
| aggregate-retrieval-ranking-metric | retrieval-evaluate-queries | python-code | 2 | 2063/7 | 7/22 | 0 | 2 | ja | ja | lm-genai-rag | FLAG-READY |
| classify-error-drift | error-stable-subgroup | single-choice | 2 | 170/1 | — | 0 | 1 | ja | nein | — | NEEDS-WORK: comp 1→2, FS erklärt nur die richtige Option (R14: Distraktoren begründen); kein Placement |
| classify-supervision-scaling | scaling-svm-standardization | single-choice | 2 | 184/1 | — | 0 | 1 | ja | nein | — | NEEDS-WORK: comp 1→2, FS 1 Block, alle 9 Varianten haben eigene 64–125-Zeichen-FS ohne Hints; kein Placement |
| compose-toy-inference-pipeline | toy-inference-pipeline | python-code | 2 | 1705/5 | 7/16 | 0 | 3 | ja | ja | lm-tf-inference | FLAG-READY |
| construct-ensemble-predictor-comparison | voting-tie-and-tree | python-code | 2 | 944/4 | 4/16 | 0 | 2 | ja | ja | — | FLAG-READY, aber kein Placement (nur Direkt-Route) |
| construct-linalg-contract-synthesis | synthesis-three-contracts | single-choice | 0 | 193/1 | — | 0 | 2 | NEIN | nein | lm-linalg-numpy-shape-contracts | NEEDS-WORK: sourceLineage fehlt, hints fehlen, FS 1 Block; Bank hat 13 Szenarien mit Fehlkonzept-Distraktoren — guter Rohling |
| construct-matvec-shape-contract | final-boss-authored | python-code | 3 | 978/3 | 10/28 | 3 | 5 | ja | ja | lm-linalg-numpy-shape-contracts | FLAG-READY — Referenzfall (einziger mit requiredFunctions) |
| fit-forward-layer-chain-contract | deep-forward-chain | python-code | 2 | 1513/3 | 6/21 | 0 | 2 | ja | ja | lm-dl-tensors | FLAG-READY |
| fit-mlp-val-curve-argmin | mlp-val-curve-argmin | python-code | 2 | 1412/2 | 12/30 | 0 | 2 | ja | ja | lm-dl-training | FLAG-READY |
| fit-weight-decay-ablation | weight-decay-ablation | python-code | 2 | 918/3 | 12/32 | 0 | 2 | ja | ja | lm-dl-regularization | FLAG-READY |
| formula-descriptive-stats-numpy | describe-outlier-bins | python-code | 2 | 315/2 | 6/21 | 0 | 2 | ja | ja | — | FLAG-READY, aber kein Placement (Geschwister @core in lm-eda-distributions) |
| optimize-bpe-merge-learn | bpe-merge-learn | python-code | 2 | 1362/1 | 8/17 | 0 | 2 | ja | ja | lm-tf-tokenizer | NEEDS-WORK (streng): FS 1 Block — Compiler-Floor ≥80 Zeichen würde passieren; Rubrik verlangt Stufen-Abschnitte |
| optimize-gradient-update-rule | lora-fit-toy | python-code | 2 | 1057/5 | 12/18 | 0 | 2 | ja | ja | lm-tf-finetuning | FLAG-READY |
| optimize-multi-head-attention | multi-head-attention | python-code | 2 | 1252/2 | 9/13 | 0 | 2 | ja | ja | lm-tf-attention | FLAG-READY |
| optimize-sgd-step-pure-update | pure-train-step | python-code | 2 | 910/3 | 7/13 | 0 | 2 | ja | ja | lm-dl-autograd | FLAG-READY |
| optimize-sgd-step-pure-update | sgd-momentum-step | python-code | 2 | 221/1 | 4/10 | 0 | 2 | ja | ja | — | NEEDS-WORK (streng): FS 1 Block/221 Zeichen — Compiler-Floor ok; kein Placement |
| rank-evidence-table | evidence-table-ranking | python-code | 2 | 1052/1 | 13/19 | 0 | 2 | ja | ja | lm-tf-papers | NEEDS-WORK (streng): FS nur Code-Block ohne Weg-Erklärung — Compiler-Floor ok |
| reproduce-pipeline-status-report | pipeline-status-report | python-code | 2 | 4229/16 | 8/12 | 0 | 2 | ja | ja | lm-genai-prototype | FLAG-READY |
| reproduce-pipeline-status-report | start-pipeline-integration | python-code | 2 | 970/2 | 10/14 | 0 | 2 | ja | ja | lm-capstone-runner | FLAG-READY |
| reproduce-pipeline-status-report | verdict-rules | python-code | 2 | 945/2 | 7/13 | 0 | 2 | ja | ja | lm-capstone-regression | FLAG-READY |
| reproduce-pipeline-status-report | acceptance-all-contracts | python-code | 2 | 581/2 | 8/14 | 0 | 2 | ja | ja | lm-capstone-acceptance | FLAG-READY |
| reproduce-run-digest-assert | pipeline-freeze-report | python-code | 2 | 904/4 | 7/13 | 0 | 2 | ja | ja | lm-capstone-freeze | FLAG-READY |
| reproduce-run-digest-assert | reproduction-verdict-rules | python-code | 2 | 682/4 | 8/11 | 0 | 2 | ja | ja | lm-capstone-repro | FLAG-READY |
| transform-expression-simplify-canonical | combine-like-terms | algebraic-expression | 0 | 135/1 | — | 0 | 2 | ja | nein | lm-foundations-algebra | NOT-SUITABLE: Schwierigkeit nur über Tier-Eskalation (vars 2→4, coef 5→12) — eine Reasoning-Stufe, „größere Zahlen"-Muster; eher stretch |
| transform-rank-dependence-rowops | rank-3x4-line | numeric | 2 | 145/1 | — | 0 | 2 | ja | nein | lm-linalg-independence, lm-linalg-gauss | NEEDS-WORK (streng): FS 1 Block — Compiler-Floor ok; Elimination und Pivotzählung als zwei Blöcke trennen |
| validate-goalshift-flag-rules | detect-goal-shift | python-code | 2 | 584/2 | 7/2 | 0 | 2 | ja | nein | lm-research-question | NEEDS-WORK: Laufzeit-Testblock hat nur 2 `__check` (Drift zum JSON-Exemplar mit 7) — Seed-Abdeckung erhöhen |
| validate-leakage-rule-audit | pipeline-clean-split | python-code | 2 | 264/1 | 3/6 | 0 | 1 | ja | ja | — | NEEDS-WORK: chk 6 < 8, comp 1→2, FS 1 Block, kein Placement |
| validate-report-guard-compose | report-guard-compose | python-code | 2 | 1015/2 | 4/16 | 0 | 2 | ja | ja | lm-research-responsible | FLAG-READY |
| validate-report-guard-compose | baseline-report | python-code | 3 | 1333/3 | 11/17 | 0 | 2 | ja | ja | lm-capstone-baseline | FLAG-READY |
| validate-rule-catalog-scan | cross-card-consistency | python-code | 2 | 1502/3 | 5/8 | 0 | 2 | ja | ja | lm-research-cards | FLAG-READY (Laufzeit-chk exakt 8 — an der Schwelle) |

### Prozedurale Falldefinitionen (26 Fälle in 19 Dateien)

Alle 26 sind über `makeCaseFamily` (`case_family_kit.mjs`) gebaut:
`graderId: pyodide`, `activityType: python-code`, `masteryEligible: true`
am Vertrag. Keine Falldefinition trägt `hints` oder `sourceLineage` — beides
kommt zur Laufzeit aus dem registrierten JSON-Fallkörper
(`instantiate` mergt `authored.hints/feedbackRules/typicalErrors`,
`family_registry.mjs`). Spalten: Basis = `__check` in `baseTests`,
+Seed = `__check` aus `emitChecks` × `extraCount`, Laufzeit = tatsächlich
generiert (Probe-Seed 42) — der Seed-Block mancher Familien emittiert über
andere Helfer weitere Checks, daher Laufzeit > Basis + Seed.

| Datei | Fall | Basis | +Seed | Laufzeit | FS-Blöcke | comp (Vertrag) |
|---|---|---|---|---|---|---|
| aggregate-detector-eval-compare.mjs | run-eval-compare-rulesets | 8 | 0×3 | 26 | 9 | 4 |
| aggregate-detector-eval-compare.mjs | detector-table-best-f1 | 6 | 0×3 | 18 | 7 | 4 |
| aggregate-retrieval-ranking-metric.mjs | retrieval-evaluate-queries | 7 | 0×3 | 22 | 7 | 2 |
| compose-toy-inference-pipeline.mjs | toy-inference-pipeline | 7 | 0×3 | 16 | 5 | 3 |
| construct-ensemble-predictor-comparison.mjs | voting-tie-and-tree | 4 | 0×2 | 16 | 4 | 2 |
| construct-matvec-shape-contract.mjs | final-boss-authored | 10 | 0×3 | 28 | 3 | 2 |
| fit-forward-layer-chain-contract.mjs | deep-forward-chain | 6 | 0×3 | 21 | 3 | 3 |
| fit-mlp-val-curve-argmin.mjs | mlp-val-curve-argmin | 12 | 0×2 | 30 | 2 | 2 |
| fit-weight-decay-ablation.mjs | weight-decay-ablation | 12 | 0×2 | 32 | 3 | 2 |
| formula-descriptive-stats-numpy.mjs | describe-outlier-bins | 6 | 0×3 | 21 | 3 | 2 |
| optimize-bpe-merge-learn.mjs | bpe-merge-learn | 8 | 0×3 | 17 | 1 | 2 |
| optimize-gradient-update-rule.mjs | lora-fit-toy | 12 | 0×2 | 18 | 5 | 2 |
| optimize-multi-head-attention.mjs | multi-head-attention | 9 | 0×2 | 13 | 2 | 2 |
| optimize-sgd-step-pure-update.mjs | pure-train-step | 7 | 3×2 | 13 | 3 | 2 |
| optimize-sgd-step-pure-update.mjs | sgd-momentum-step | 4 | 3×2 | 10 | 1 | 2 |
| rank-evidence-table.mjs | evidence-table-ranking | 13 | 0×3 | 19 | 1 | 2 |
| reproduce-pipeline-status-report.mjs | pipeline-status-report | 8 | 0×2 | 12 | 16 | 5 |
| reproduce-pipeline-status-report.mjs | start-pipeline-integration | 10 | 0×2 | 14 | 2 | 5 |
| reproduce-pipeline-status-report.mjs | verdict-rules | 7 | 0×3 | 13 | 2 | 5 |
| reproduce-pipeline-status-report.mjs | acceptance-all-contracts | 8 | 0×3 | 14 | 2 | 5 |
| reproduce-run-digest-assert.mjs | pipeline-freeze-report | 7 | 0×3 | 13 | 4 | 2 |
| reproduce-run-digest-assert.mjs | reproduction-verdict-rules | 8 | 0×3 | 11 | 4 | 2 |
| validate-leakage-rule-audit.mjs | pipeline-clean-split | 3 | 0×3 | 6 | 1 | 1 |
| validate-report-guard-compose.mjs | report-guard-compose | 4 | 0×3 | 16 | 2 | 2 |
| validate-report-guard-compose.mjs | baseline-report | 11 | 0×3 | 17 | 3 | 2 |
| validate-rule-catalog-scan.mjs | cross-card-consistency | 5 | 0×3 | 8 | 3 | 2 |

JSON-only-Fälle ohne `procedural/`-Definition (werden über andere
JS-Familien bedient): `error-stable-subgroup` (data_ml_families.mjs),
`scaling-svm-standardization` (statischer JSON-Vertrag),
`synthesis-three-contracts` (procedural, aber Choice-Kapsel-Bank statt
`difficulty:`-Fallmap), `combine-like-terms`
(foundations_construct_families.mjs), `rank-3x4-line`
(foundations_linalg_families.mjs), `detect-goal-shift`
(data_ml_families.mjs). Hinweis: `synthesis-three-contracts` liegt in
`procedural/construct-linalg-contract-synthesis.mjs` als
`makeChoiceFamily`-Kapsel `challenge` — kein `difficulty:`-Schlüssel,
taucht daher nicht in der 26er-Grep-Menge auf, ist aber gezählt.

## 3. Befunde

1. **Hint-Pfad deckelt effektiv auf 2 Stufen und nutzt nur `hints[0]`.**
   `familyHint` (family_registry.mjs) liefert Stufe 1 = `summary` des
   Familienvertrags, Stufe 2 = Aktivitäts-Hinweis oder `hints[0]`; Stufe
   ≥ 3 existiert nicht. Autorisierte `hints[1..n]` erreichen Lernende
   aktuell nicht. Bei `single-choice`/`numeric`/`parsons` verdeckt der
   Aktivitäts-Hinweis (Distraktor-Ausschluss, Größenrichtung,
   Erstzeile) den autorisierten Hinweis ganz — die autorisierten hints
   der drei Choice-Challenges sind inert. Für den Piloten: entweder
   `familyHint` auf die autorisierte Leiter erweitern (Stufe 2 = hints[0],
   Stufe 3 = hints[1]) oder das Minimum auf „hints ≥ 1 plus nicht-leere
   summary" absenken.
2. **JSON-Exemplar ↔ Laufzeit-Drift.** `detect-goal-shift`: der
   Exemplar-Testblock dokumentiert 7 `__check`, `makeSolvedFamily`
   generiert real nur 2 (mit eingebetteter `__want`-Referenz — gute
   Solver-Disziplin, dünne Abdeckung). Der Vertrag muss festlegen, dass
   der **generierte** Block zählt, nicht der dokumentierte.
3. **6 Challenge-Fälle sind nicht als challenge geplaced.** Alle
   betroffenen `caseTypes` tragen `propertyTest: false` — Practice-Space
   zieht sie nie; ohne kuratiertes Placement mit `difficulty: challenge`
   sind sie nur über die Direkt-Route erreichbar: `error-stable-subgroup`,
   `scaling-svm-standardization`, `voting-tie-and-tree`,
   `describe-outlier-bins`, `sgd-momentum-step`, `pipeline-clean-split`.
4. **fullSolution-Blöcke sind der häufigste Bruch der strengen
   Rubrik-Fassung** (10/32 unter 2 Blöcken) — alle trivial behebbar
   (Absatzstruktur), kein inhaltliches Problem; die Lösungen sind bis
   4229 Zeichen lang. Unter dem Compiler-Floor („≥ 2 Absätze ODER
   ≥ 80 Zeichen") verletzt kein Fall die fullSolution-Regel — die
   Block-Regel ist reine Rubrik-Schärfe, keine Verbots-Hürde.
5. **`requiredFunctions` ist fast tot**: nur `final-boss-authored` nutzt
   es (3 Funktionen). Die ODER-Alternative `__check ≥ 8` trägt die
   Code-Bedingung faktisch allein — zur Laufzeit erfüllen 24/26
   Code-Fälle ≥ 8 Checks (`pipeline-clean-split` 6, `detect-goal-shift` 2).
6. **Choice-Challenges sind mastery-tauglich, aber dünn**:
   `synthesis-three-contracts` (13er-Bank, Fehlkonzept-Distraktoren) ist
   der beste Rohling; `error-stable-subgroup` und
   `scaling-svm-standardization` erklären in der FS nur die richtige
   Option — R14 verlangt Begründung je Distraktor.
7. **`combine-like-terms` ist das dokumentierte Anti-Pattern**: das
   Challenge-Profil entsteht nur durch Tier-Eskalation der Termgrößen —
   eine Reasoning-Stufe, kein echtes Zwischenergebnis.

## 4. Zusammenfassung

### 4.1 Verdict-Zählung

| Verdict | Anzahl (streng) | Anzahl (Compiler-Fassung) | Fälle |
|---|---|---|---|
| FLAG-READY | 22 | 26 | fast ausschließlich python-code, davon 2 ohne Placement |
| NEEDS-WORK | 9 | 5 | streng: 4× FS-Struktur zusätzlich; gemeinsam: synthesis-three-contracts (hints+lineage), error-stable-subgroup + scaling-svm-standardization (comp), pipeline-clean-split (chk+comp), detect-goal-shift (chk), combine-like-terms (hints) |
| NOT-SUITABLE | 1 | 1 | combine-like-terms (eine Reasoning-Stufe — auch mit hints kein Challenge-Charakter) |

Die Differenz 22↔26 kommt allein aus der fullSolution-Regel: `bpe-merge-learn`,
`sgd-momentum-step`, `evidence-table-ranking`, `rank-3x4-line` scheitern nur
an „≥ 2 Blöcke" und passieren den Compiler-Floor (≥ 80 Zeichen) bereits.

### 4.2 Beste Pilot-Abdeckung

| Modul-Cluster | FLAG-READY-Fälle | Bemerkung |
|---|---|---|
| lm-capstone-* (runner/regression/acceptance/freeze/repro/baseline) | 6 | dichtester Block, alle placed@challenge |
| lm-dl-* (autograd/tensors/training/regularization) | 4 | alle placed, saubere Hints |
| lm-tf-* (attention/finetuning/inference/papers/tokenizer) | 3 + 2 knapp | bpe-merge-learn, evidence-table-ranking nur FS-Struktur |
| lm-genai-* (eval/security/rag/prototype) | 4 | alle placed |
| lm-linalg-* (numpy-shape-contracts, independence, gauss) | 1 + 2 knapp | einzige echte Math/Linalg-Lane |
| lm-research-* (responsible/question/cards) | 2 + 1 knapp | detect-goal-shift braucht Checks |
| lm-foundations-algebra | 0 | einziger Fall NOT-SUITABLE |
| lm-ml-* (error-analysis/svm-pca/cv/ensembles) | 0 | alle NEEDS-WORK, kein Challenge-Placement |

### 4.3 Empfohlenes Pilot-Set (20 Fälle, 20 Module)

Linalg/Math-Lane zuerst, dann Code-Familien; alle FLAG-READY bzw. nach
benannter Kleinigkeit:

- **lm-linalg-numpy-shape-contracts**: `final-boss-authored` (Referenzfall),
  `synthesis-three-contracts` (nach hints+sourceLineage)
- **lm-linalg-independence / lm-linalg-gauss**: `rank-3x4-line` (nach
  FS-Aufteilung)
- **lm-dl-autograd**: `pure-train-step`
- **lm-dl-tensors**: `deep-forward-chain`
- **lm-dl-training**: `mlp-val-curve-argmin`
- **lm-dl-regularization**: `weight-decay-ablation`
- **lm-tf-attention**: `multi-head-attention`
- **lm-tf-finetuning**: `lora-fit-toy`
- **lm-tf-inference**: `toy-inference-pipeline`
- **lm-tf-papers**: `evidence-table-ranking` (nach FS-Aufteilung)
- **lm-genai-eval**: `run-eval-compare-rulesets`
- **lm-genai-security**: `detector-table-best-f1`
- **lm-genai-rag**: `retrieval-evaluate-queries`
- **lm-research-responsible**: `report-guard-compose`
- **lm-research-cards**: `cross-card-consistency`
- **lm-capstone-runner**: `start-pipeline-integration`
- **lm-capstone-acceptance**: `acceptance-all-contracts`
- **lm-capstone-freeze**: `pipeline-freeze-report`
- **lm-capstone-baseline**: `baseline-report`

Reserve: `pipeline-status-report` (lm-genai-prototype), `verdict-rules`
(lm-capstone-regression), `reproduction-verdict-rules` (lm-capstone-repro),
`bpe-merge-learn` (lm-tf-tokenizer, nach FS-Aufteilung),
`describe-outlier-bins` + `voting-tie-and-tree` (beide FLAG-READY, aber
Placement nachrüsten), `sgd-momentum-step` (nach FS-Aufteilung +
Placement).

Ehrlichkeitsnotiz: Der Bestand ist zu 26/32 python-code. Die
Math/Linalg-Lane trägt aktuell nur 3–4 Fälle; die drei Archetypen in
`docs/challenge-rubric.md` §6 zielen genau auf diese Lücke.

### 4.4 Schwellen-Empfehlungen

| Schwelle | Datenlage | Empfehlung |
|---|---|---|
| hints ≥ 2 | 29/32 erfüllen es autorisiert; Laufzeit nutzt nur hints[0] | Behalten (≥ 2 autorisiert), **aber** `familyHint` auf die Leiter erweitern oder Minimum „hints ≥ 1 + summary" dokumentieren — sonst ist das Kriterium halb inert |
| fullSolution ≥ 2 Blöcke | 10/32 verletzen es streng, keiner den Compiler-Floor (≥ 80 Zeichen) | Rubrik behält ≥ 2 Blöcke als Struktur-Regel (Blöcke = Reasoning-Stufen); der Zeichen-Floor als Validator-Minimum ist realistisch — nicht verschärfen |
| code: reqFn ≥ 2 ODER __check ≥ 8 | reqFn nur 1/32; chk ≥ 8 erfüllen 24/26 zur Laufzeit | Behalten; Messgröße ist der **generierte** Testblock (im Compiler bereits so umgesetzt), nicht das JSON-Exemplar |
| fading: gaps ≥ 4 | kein Challenge-Fading existiert | Ungetestet; als Spec-Minimum stehen lassen |
| multiple-choice: correctIds ≥ 2 | kein Challenge-MC existiert | Ungetestet; stehen lassen |
| sonstige: comp ≥ 2 + hints ≥ 2 | scheitert an comp = 1 bei 3 Familien (alles single-choice) | Behalten für Challenge-Charakter; single-choice zusätzlich R14-Klausel (≥ 2 plausible Distraktoren + FS begründet jede Option) statt nur comp |
| sourceLineage | 31/32 gesetzt | Behalten, nicht leer |
| masteryEligible | 32/32 true | Behalten |

Zusätzlich empfohlen: Paritätscheck JSON-Exemplar ↔ Generator (Fall
`detect-goal-shift` zeigt Drift 7→2 Checks) und eine Placement-Regel —
`challengeEligible`-Fälle mit `propertyTest: false` brauchen ein
kuratiertes Placement auf `challenge`, sonst ist die Flagge wirkungslos.

## 5. Tiefen-Audit (2026-09-13, zweiter Durchgang)

Nach dem Vertrags-Audit ein zweiter Lauf auf Denktiefe statt Struktur:
wie viele getrennte Reasoning-Stufen verlangt der Fall, testet er
Working-Memory oder nur Mechanik, und ist er schwächer als eigene
Geschwister.

### 5.1 Entscheidungen

| Fall | Urteil | Folge |
|---|---|---|
| `construct-ensemble-predictor-comparison:voting-tie-and-tree` | war zu schwach (Tiefe-1-Baum, Tie-Regel im Starter-Kommentar, `linear` im Prompt unterbestimmt) | **Upgraded**: Trio-Substanz (Tiefe-2-Baum, drei RMSEs, 2D-OLS) + erzwungene Gleichstands-Spalte; Tie-Regel steht nur noch im Prompt |
| `construct-linalg-contract-synthesis:synthesis-three-contracts` | single-choice, 25 %-Ratequote, Wiedererkennung | **Unflagged** |
| `construct-matvec-shape-contract:final-boss-authored` | `gauss_rank` per `np.linalg.matrix_rank` umgehbar; Seeded-Draws immer Rang 2 | **Upgraded**: `rank_with_pivots` gibt `(rang, pivot_spalten)` zurück (erzwingt echte Elimination), `co_names`-Bann-Check, Draws ziehen Rang ∈ {1,2,3} + Nullzeilen |
| `formula-descriptive-stats-numpy:describe-outlier-bins` | zwei Bibliotheksaufrufe, ≈ Core-Fall | **Unflagged** |
| `optimize-sgd-step-pure-update:sgd-momentum-step` | 2-Zeilen-Dict-Comprehension, Formeln wörtlich im Prompt | **Unflagged** |
| `rank-evidence-table:evidence-table-ranking` | alle Regeln im Prompt, verdict richtungsblind | **Upgraded**: Papers tragen `direction` (higher/lower), verdict folgt der Metrikrichtung; Sortierung bleibt numerisch |
| `reproduce-pipeline-status-report:acceptance-all-contracts` | kleine Entscheidungstabelle | **Unflagged** |
| `transform-rank-dependence-rowops:rank-3x4-line` | invertierte Schwierigkeit: Challenge zog `targetRank 1` (sichtbar abhängig), Core zieht Rang 2 | **Upgraded**: Bank-Kapsel auf `targetRank 2` |
| `validate-report-guard-compose:report-guard-compose` | strikte Teilmenge von `baseline-report` | **Unflagged** |
| `worked-example-fading-distributive:distribute-double-gap` | Vorzeichen vor jeder Lücke vorgedruckt → nur Beträge rechnen | **Upgraded**: `in1`/`in2`/`constSum` tragen das Vorzeichen selbst |

### 5.2 Erkenntnisse

- Das Flag folgte teils der `w*-e6`-„Final-Boss"-Konvention statt gemessener
  Denktiefe — drei geflaggte Fälle waren schwächer als eigene Stretch-
  Geschwister. Regel: Flag nur bei ≥ 3 echten Reasoning-Stufen oder einer
  Stufe ohne Standardrezept.
- Contract-Minima (≥2 requiredFunctions ODER ≥8 `__check`) messen
  Oberfläche — erfüllbar durch Seeded-Inflation bei einer 2-Zeilen-
  Funktion. Die Rubrik-Stufenregel bleibt das eigentliche Kriterium.
- Prompts, die Ergebnisse nennen (F1-Werte, Gewinner), nehmen die
  Interpretationsstufe weg — für KEEP-Fälle akzeptabel, weil die
  Implementation die Tiefe trägt; für zukünftige Fälle: Ergebnisse nicht
  im Prompt nennen.
