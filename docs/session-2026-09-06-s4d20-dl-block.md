# Session 2026-09-06 — S4D20: Deep-Learning-Block W18–W21 → 4 Module

## Outcome

W18–W21 (`content/exercises/w18.json` … `w21.json`, 24 Aufgaben) sind in einem Branch überführt: Module `lm-dl-tensors`, `lm-dl-autograd`, `lm-dl-training`, `lm-dl-regularization` (Lektionen `l-dl-*`, Tracks `applied-ai`, `mathematical-foundations`). Erster gebündelter Domänen-Block (Noa: Gates einmal pro Block statt pro Woche); ein Commit pro Woche, Wochenquellen bleiben bis S4E unverändert.

## Zuordnung

| Quelle | Familie | Fall | Profil | Mastery |
| --- | --- | --- | --- | --- |
| w18-e1 | `classify-shape-contract` (neu, JSON; Abweichung, s. u.) | `shape-bias-broadcast-mc` | intro | nein |
| w18-e2 | `formula-count-from-construction` (neu, seeded) | `linear-param-count`, `genLinearParamCount` | intro/core/stretch | ja |
| w18-e3 | `validate-shape-contract` (bestand seit S4D6) | `shapes-w18-broadcast-axes` | core | ja |
| w18-e4/e5/e6 | `fit-forward-layer-chain-contract` (neu, JSON, Pyodide) | `linear-forward-contract` / `mlp-forward-relu` / `deep-forward-chain` | core / stretch / challenge | ja |
| w19-e1 | `classify-backprop-path-rule` (neu, JSON) | `backprop-path-rule` | intro | nein |
| w19-e2 | `optimize-backprop-path-sum` (neu, seeded) | `chain-rule-path-sum`, `genBackpropChain` | intro/core/stretch | ja |
| w19-e3 | `trace-assignment-state` (bestehend) | `manual-backward-step-trace` (variable-values 1:1) | core | ja |
| w19-e4/e5 | `optimize-backprop-gradient-check` (neu, JSON, Pyodide) | `linear-mse-gradients` / `mlp-backprop-relu-mse` | core / stretch | ja |
| w19-e6 | `optimize-sgd-step-pure-update` (neu, JSON, Pyodide) | `pure-train-step` | challenge | ja |
| w20-e1 | `classify-training-curve` (neu, JSON) | `training-curve-diagnosis` | intro | nein |
| w20-e2 | `formula-count-from-construction` | `sgd-update-count`, `genSgdSteps` | intro/core/stretch | ja |
| w20-e3 | `trace-training-loop-count` (neu, JSON, statisch) | `training-loop-count` | core | ja |
| w20-e4 | `optimize-training-primitive-contract` (neu, JSON, Pyodide) | `loss-and-batch-primitives` | core | ja |
| w20-e5 | `fit-seeded-split-sgd-linear` (neu, JSON, Pyodide) | `seeded-split-sgd-linear` | stretch | ja |
| w20-e6 | `fit-mlp-val-curve-argmin` (neu, JSON, Pyodide) | `mlp-val-curve-argmin` | challenge | ja |
| w21-e1 | `classify-dropout-regime` (neu, JSON) | `dropout-regime` | intro | nein |
| w21-e2 | `formula-count-from-construction` | `dropout-mask-kept-count`, `genDropoutCount` (Abweichung, s. u.) | intro/core/stretch | ja |
| w21-e3 | `trace-assignment-state` | `fixed-dropout-mask-trace` (output 1:1) | core | ja |
| w21-e4 | `optimize-training-primitive-contract` | `dropout-weight-decay-primitives` | core | ja |
| w21-e5 | `fit-early-stopping-roundtrip` (neu, JSON, Pyodide) | `early-stopping-roundtrip` | stretch | ja |
| w21-e6 | `fit-weight-decay-ablation` (neu, JSON, Pyodide) | `weight-decay-ablation` | challenge | ja |

Alle Python-Fälle: Startcode, Tests, Referenzsolver, Pakete bytegleich zur Legacy (geprüft). Kompetenzen pro Fall = Legacy-`skillIds`.

## Runtime

Zwei neue seeded Familien in `data_ml_families.mjs` (Generatoren aus `w18_w21_generators.mjs` importiert, keine neuen Generatoren → Registry-Zähler 52 unverändert). Profile über den natürlichen `variant`-Parameter der Generatoren, unabhängige Solver pro Variante. Kanonische Seeds: 1802 → 77, 1902 → −3, 2002 → 15, 2102 → 8. Rohakzeptanz (10.000 Seeds, intro / stretch): linear-param-count 33,7 / 33,2 %; chain-rule-path-sum 34,7 / 28,8 %; sgd-update-count 25,1 / 49,6 %; dropout-mask-kept-count 33,8 / 32,9 %.

## Taxonomie-Abweichungen (E10, E11 — zur Bestätigung)

- **E10** w21-e2 (`genDropoutCount`) steht in `canonical-families.json` bei `aggregate-accumulator-count`. Diese Runtime-Familie ist `predict-output` (Ausgabezeilen); ein Zahlenfall passt nicht in ihren Grader-Pfad. Statt Familien-Umbau: Fall `dropout-mask-kept-count` in `formula-count-from-construction` („Anzahl aus der Konstruktion“ — hier: aus der gegebenen Maske). Null zusätzlicher Runtime-Code.
- **E11** w18-e1 (Single-Choice) steht bei `validate-shape-contract`, ebenfalls `predict-output`. Neue statische JSON-Familie `classify-shape-contract` (kein Runtime-Code) statt Mixed-Activity-Umbau der Familie.

Beide Punkte gehören in `noa-decisions.md`, sobald bestätigt; `canonical-families.json` wird nicht still geändert (Assembler).

## Gates (einmal am Blockende)

- compile_content public, typecheck, build:release (91,0 KiB JS gzip) grün.
- Full Suite 1069: 1066 bestanden, 1 Fehler (Host-`sympy`, Baseline), 2 übersprungen.
- validate_content: bekannte Baseline (14 `library/`-Pfade, 2 Hinweise).
- Chromium 6/7 (bekannte `59 Min.`-Baseline).
- Routen: 4 Module, 4 seeded Familien, 1 Trace-Route — HTTP 200, keine Console-/Page-Errors.

## Offen

- Nächster Block S4D21: Transformer/LLM W22–W26 (gebündelt; `formula-count-from-construction` nimmt w22-e2/w23-e2/w25-e2 auf, `trace-assignment-state` w22/w23/w25/w26-e3).
