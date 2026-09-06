# Session-Digest S4D21 — Transformer/LLM-Block W22–W26

Zweiter gebündelter Domänen-Block (Regel aus S4D20: Gates einmal am Blockende). Quellen `content/exercises/w22–w26.json` unverändert; Löschung in S4E.

## Ergebnis

| Quelle | Modul | Lektion | requires |
| --- | --- | --- | --- |
| W22 | `lm-tf-attention` | `l-tf-attention` | c-dl-tensors, c-linalg-matrices |
| W23 | `lm-tf-tokenizer` | `l-tf-tokenizer` | c-python-collections |
| W24 | `lm-tf-inference` | `l-tf-inference` | c-dl-attention, c-dl-tokenizer |
| W25 | `lm-tf-finetuning` | `l-tf-finetuning` | c-dl-inference, c-dl-regularization |
| W26 | `lm-tf-papers` | `l-tf-papers` | c-dl-finetuning, c-meta-learning |

30 Aufgaben, alle mit Zielaktion; jedes Modul: 6 kuratierte Plätze + Übungsraum auf dem seeded Fall.

### Runtime (`data_ml_families.mjs`, keine neuen Generatoren, Registry 52)

- `formula-count-from-construction` +3 Fälle: `attention-tensor-cells` (w22-e2, intro `score-cells`, stretch `mask-cells|scale-divisor`), `bpe-vocab-size` (w23-e2, intro `total`, stretch `merges-needed`), `lora-param-count` (w25-e2, intro `lora`, stretch `saved`).
- neu `formula-stat-from-table` (formula-apply, numeric): `greedy-step-stat` (w24-e2, intro `argmax-position`, stretch `decode-length`), `paper-gain-from-counts` (w26-e2, intro `count-gain`, stretch `relative-percent|error-reduction`; Prozentwerte per `Math.round`, da der Generator ganzzahlige Antworten konstruiert).
- Kanonische Seeds: 2211→45, 2311→97, 2411→23, 2511→1184, 2611→52 (= Legacy `defaultExpected`).
- Rohakzeptanz intro/stretch (10k Seeds): attention 25,5/48,9 %, vocab 33,8/32,7 %, greedy 33,6/33,3 %, lora 33,6/33,3 %, gain 24,1/50,6 %.
- `formula-ratio-percent-metric` +statischer Python-Fall `compare-systems-metric` (w26-e4); `optimize-gradient-update-rule` +`head-only-finetune`/`lora-fit-toy` (w25-e5/e6); `validate-required-field-raise` (Parsons-Familie) +statischer Python-Fall `paper-card-required-fields` (w26-e5) über `staticCaseBody`.
- `trace-assignment-state` +4 Fälle (w22/w23/w25-e3 output, w26-e3 variable-values).

### Statisch (JSON)

5 Klassifikations-MCs (intro, keine Mastery); Pyodide-Familien `optimize-softmax-attention-mask` (w22-e4, w24-e5), `construct-attention-mask`, `optimize-multi-head-attention`, `transform-tokenize-roundtrip`, `transform-bpe-merge-apply`, `optimize-bpe-merge-learn`, `optimize-decode-greedy-loop` (gemischt: w24-e3 predict-output + w24-e4 python-code), `compose-toy-inference-pipeline`, `formula-lora-delta-apply`, `rank-evidence-table`. Startcode/Tests/Referenz/Pakete bytegleich zur Legacy.

## Gates (einmal am Blockende)

compile public, typecheck, build:release (891 Dateien, JS 94,8 KiB gzip) grün; Full Suite 1070/1073 (nur Host-`sympy`); validate_content Baseline 14/2; Chromium: `59 Min.`-Baseline; der S4D7-Pyodide-Test schlug einmal direkt nach Serverneustart mit „Unbekannte Familie“ fehl und lief isoliert grün (Warmstart-Artefakt, nicht reproduziert); Routen 5 Module + 5 seeded Familien + Trace ohne Console-/Page-Errors.

## Review-Befunde

- w24-e3 lag zunächst doppelt (trace-assignment-state und optimize-decode-greedy-loop); auf die Taxonomie-Heimat reduziert.
- BigInt-Prozentsolver durch `Math.round` ersetzt (−79 Zeilen).

## Offen / nächster Block

- Keine Taxonomie-Abweichung in diesem Block (E10/E11 aus S4D20 von Noa bestätigt).
- S4D22: Anwendungs-/Evaluationsblock W27–W33 (Konfusionsmetrik-Familie nimmt w28/w29/w33 auf); danach W34–W39.
- Weiterhin offen: Button-Spacing (UI-Rework S6), sympy-Host-Baseline, `59 Min.`-e2e, Library-Baseline (S5B).
