# B4 — Deep-Learning-Block: Content-Review

**Reviewer:** Devin-Subagent  
**Scope:** 9 Kompetenzen im Block B4 (`c-dl-tensors`, `c-dl-autograd`, `c-dl-training`, `c-dl-regularization`, `c-dl-attention`, `c-dl-tokenizer`, `c-dl-inference`, `c-dl-finetuning`, `c-dl-papers`).  
**Datum:** Fortsetzung der vorherigen Prüfung.

## Durchführung & Methodik

- Pflichtlektüre: `docs/content-review/rubrik.md`, `docs/content-review/raw/e1-evidenz-remap.md`, `docs/content-review/raw/e2-interaktiv-audit.md`, `docs/authoring-guide.md`, `docs/content-review/inventar.json`.
- Module, Lessons, Checkpoints und Placements aus `content/modules/lm-*.json` und `content/lessons/**` gelesen.
- Repräsentative Fälle aus den Familien `fit-forward-layer-chain-contract`, `optimize-backprop-gradient-check`, `optimize-sgd-step-pure-update`, `fit-mlp-val-curve-argmin`, `fit-weight-decay-ablation`, `fit-early-stopping-roundtrip`, `optimize-softmax-attention-mask`, `optimize-multi-head-attention`, `transform-bpe-merge-apply`, `optimize-bpe-merge-learn`, `optimize-decode-greedy-loop`, `compose-toy-inference-pipeline`, `optimize-gradient-update-rule`, `formula-ratio-percent-metric`, `rank-evidence-table` fachlich nachgerechnet.
- Generatoren in `assets/js/core/deep_learning_generators.mjs` und `assets/js/core/transformer_generators.mjs` auf fachliche Verträge geprüft.
- Abschluss: `node tools/compile_content.mjs` und `node tools/validate_content.mjs` (siehe Abschnitt [Validierung](#validierung)).

---

## Kompetenz-Reviews

### c-dl-tensors — Tensoren, Layer und Dimensionsverträge

**Deckung:** `content/modules/lm-dl-tensors.json`; `content/lessons/deep-learning/dl-tensors.md` + `dl-tensors-checkpoint.md`; Placements `p-dl-tensors-*`; Familien `classify-shape-contract`, `formula-count-from-construction`, `validate-shape-contract`, `fit-forward-layer-chain-contract`; Practice-Space in `formula-count-from-construction`.

**Repräsentative geprüfte Fälle:** `shape-bias-broadcast-mc`, `linear-param-count`, `shapes-w18-broadcast-axes`, `linear-forward-contract`, `mlp-forward-relu`, `deep-forward-chain`.

**Fachliche Bewertung:** Shape- und Broadcasting-Verträge sind explizit; `linear-forward-contract` prüft `X.shape[1] == W.shape[0]` und `W.shape[1] == b.shape[0]`. Parameterzählung inklusive Bias korrekt. MLP-Forward mit `np.maximum(0.0, X @ W1 + b1)` und anschließendem linearen Layer stimmt. `deep-forward-chain` verallgemeinert den Vertrag auf beliebige Tiefe. Keine fachlichen Fehler in den geprüften Kernfällen.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | Lesson-Worked-Example vorhanden, aber Case-Level-Completion/Fading fehlt (E1) |
| R3 | teilweise | Hinweise meist prozedural, nicht durchgängig als Teilziel-Frage |
| R7 | teilweise | Practice-Space-Placements mit `estimatedMinutes: 0`; Challenge-Zeiten (`deep-forward-chain` 42 Min) knapp, aber plausibel |
| R11 | teilweise | Spiralrückgriffe auf `c-numpy-basics`/`c-linalg-matrices` implizit, nicht durch Family-IDs explizit |
| R15 | teilweise | Familien-JSONs enthalten `sourceLineage`, aber keine `license`/`releaseStatus`/`validationStatus` |
| R12 | fehlt | Keine Visualisierung mit gekoppelter Transferfrage |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Der Tensor-Block baut sauber von Shapes über Broadcasting und Parameterzählung bis zum mehrschichtigen MLP-Forward auf. Die Verträge sind mathematisch korrekt und in den Fall-Prompts explizit. Die Schwierigkeitsspreizung passt. Hauptmängel: kein Case-Level-Worked-Example mit Completion-Fading, fehlende Metadaten in Familien-JSONs und keine Visualisierung. Fachliche Fehler wurden in den geprüften Fällen nicht festgestellt.

**Befunde:**
- [P1] Keine `workedExample`-Completion-Fading zwischen Beispielstudium und selbstständigem Code (R1, E1).
- [P1] Familien-JSONs (`classify-shape-contract.json`, `fit-forward-layer-chain-contract.json` etc.) fehlen `license`/`releaseStatus`/`validationStatus` (R15, `docs/authoring-guide.md`).
- [P2] Keine interaktive Tensorform-Vorschau (R12/R13).

**Top-Vorschläge:**
1. `content/families/fit-forward-layer-chain-contract.json` — Case-Level-Worked-Example mit step-by-step-Fading für `linear-forward-contract` ergänzen (R1).
2. `content/families/*.json` in `content/families/` — `license`, `releaseStatus`, `validationStatus` gemäß `docs/authoring-guide.md` ergänzen (R15).
3. `content/lessons/deep-learning/dl-tensors.md` — JSXGraph-Vorschau für Broadcasting/Shape-Checks mit Vorhersagefrage ergänzen (R12, E2).

---

### c-dl-autograd — Backpropagation als Kettenregel im Rechengraph

**Deckung:** `content/modules/lm-dl-autograd.json`; `content/lessons/deep-learning/dl-autograd.md` + `dl-autograd-checkpoint.md`; Placements `p-dl-autograd-*`; Familien `classify-backprop-path-rule`, `optimize-backprop-path-sum`, `trace-assignment-state`, `optimize-backprop-gradient-check`, `optimize-sgd-step-pure-update`.

**Repräsentative geprüfte Fälle:** `backprop-path-rule`, `chain-rule-path-sum`, `manual-backward-step-trace`, `linear-mse-gradients`, `mlp-backprop-relu-mse`, `pure-train-step`.

**Fachliche Bewertung:** Kettenregel (Produkt entlang eines Pfads, Summe bei Gabelungen), MSE-Gradient mit Faktor `2 / y.size` und numerischer zentraler Differenzenquotient (`h = 1e-5`, `atol = 1e-6`) stimmen. `mlp-backprop-relu-mse` verwendet `delta2 = (2/m)*(out-y)`, `dW2 = H.T @ delta2`, `delta1 = (delta2 @ W2.T) * (H > 0)`, `dW1 = X.T @ delta1`. `pure-train-step` mutiert Eingaben nicht und berechnet Backward vor dem Update. Fachlich korrekt.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R11, R14
- Teilweise: R1, R3, R7, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | Trace-`manual-backward-step-trace` steht vor Code, aber kein Fading |
| R3 | teilweise | Hinweise korrekt, aber strategische Teilziel-Form fehlt |
| R7 | teilweise | `mlp-backprop-relu-mse` (32 Min) und `pure-train-step` (42 Min) knapp |
| R15 | teilweise | Fehlende Familien-Metadaten |
| R12 | fehlt | Keine Visualisierung des Backprop-Graphen mit Transferfrage |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Die Autograd-Kompetenz vermittelt Backprop sauber als Kettenregel im Graphen. Die geprüften Fälle decken Handrechnung, lineare MSE-Gradienten, numerischen Check, MLP-Backprop und den reinen Trainingsschritt ab. Mathematik und Testverträge sind konsistent. Wie beim Tensor-Block fehlen Completion-Fading, Visualisierung und Familien-Metadaten. Die Lektion baut auf `c-dl-tensors` auf (`mlp-forward-relu` wird indirekt wiederverwendet).

**Befunde:**
- [P1] Kein Case-Level-Worked-Example-Fading (R1).
- [P1] Fehlende `license`/`releaseStatus`/`validationStatus` in Familien-JSONs (R15).
- [P2] Backprop-Graph nicht als interaktive `predict-then-verify`-Visualisierung umgesetzt (R12/R13, E2).

**Top-Vorschläge:**
1. `content/lessons/deep-learning/dl-autograd.md` / `content/families/optimize-backprop-gradient-check.json` — Beispiel mit ausgeblendetem Zwischenschritt (Completion) zwischen `linear-mse-gradients` und `mlp-backprop-relu-mse` (R1).
2. `content/lessons/transformer-llm/` bzw. `content/lessons/deep-learning/` — Backprop-Graph als JSXGraph-Visualisierung mit Knoten-Gradient-Vorhersage (R12, E2).
3. `content/families/*.json` — Metadatenfelder vervollständigen (R15).

---

### c-dl-training — Training Loops: Loss, Lernrate, Lernkurven

**Deckung:** `content/modules/lm-dl-training.json`; `content/lessons/deep-learning/dl-training.md` + `dl-training-checkpoint.md`; Placements `p-dl-training-*`; Familien `classify-training-curve`, `formula-count-from-construction`, `trace-training-loop-count`, `optimize-training-primitive-contract`, `fit-seeded-split-sgd-linear`, `fit-mlp-val-curve-argmin`.

**Repräsentative geprüfte Fälle:** `training-curve-diagnosis`, `sgd-update-count`, `training-loop-count`, `loss-and-batch-primitives`, `seeded-split-sgd-linear`, `mlp-val-curve-argmin`.

**Fachliche Bewertung:** `mse_loss`/`bce_loss` prüfen Shapes, BCE clippt auf `[eps, 1-eps]` mit `eps = 1e-12`. `steps_per_epoch` liefert `ceil(n / batch_size)` und wirft bei ungültigen Eingaben `ValueError`. Deterministischer Split via `np.random.default_rng(seed)`. MLP-Validierungskurve speichert Trainings- und Validierungsverlust getrennt; Update nur auf Trainingsdaten; `best_val_epoch = int(np.argmin(val_loss))`. Fachlich korrekt.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `training-loop-count`-Trace vor Code, aber kein Fading |
| R3 | teilweise | Hinweise teilweise zu konkret |
| R7 | teilweise | `mlp-val-curve-argmin` mit 45 Min und 80 Epochen Pyodide-Lauf knapp; Practice-Space `estimatedMinutes: 0` |
| R11 | teilweise | Kumulation von `c-dl-autograd` implizit, nicht durch explizite Family-IDs |
| R15 | teilweise | Familien-Metadaten unvollständig |
| R12 | fehlt | Keine Lernkurven-Visualisierung mit Vorhersagefrage |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Die Trainingskompetenz deckt Loss-Primitiven, Batching, SGD, deterministische Splits und MLP-Validierungskurven ab. Alle geprüften Verträge sind konsistent. Schwachstelle ist das Fehlen von Lernraten-Schedules als Konzept sowie die fehlende Visualisierung für Lernkurven-Diagnose. Zeitangaben für die Challenge bleiben knapp, aber plausibel. Konzept-Placements sind korrekt als nicht masteryfähig markiert.

**Befunde:**
- [P1] Keine Lektions-/Aufgaben-Deckung für Lernraten-Scheduling (Warmup, Cosine, Plateau) — Objective-Lücke in Richtung produktionsnahem Training.
- [P1] Keine Visualisierung für Lernkurven-Diagnose (Overfitting, Plateau, Lernrate zu groß) mit Vorhersagefrage (R12).
- [P1] Practice-Space `estimatedMinutes: 0` in `lm-dl-training.json:96` (R7).

**Top-Vorschläge:**
1. `content/lessons/deep-learning/dl-training.md` — Ergänzung eines LR-Schedule-Konzepts (P1, R10).
2. `content/lessons/deep-learning/dl-training.md` / neues `.viz.json` — Lernkurven-Plot mit Vorhersagefrage zu Overfitting/Plateau (R12, E2).
3. `content/modules/lm-dl-training.json:96` — Practice-Space-`estimatedMinutes` kalibrieren (R7).

---

### c-dl-regularization — Regularisierung, faire Ablation, Save/Load

**Deckung:** `content/modules/lm-dl-regularization.json`; `content/lessons/deep-learning/dl-regularization.md` + `dl-regularization-checkpoint.md`; Placements `p-dl-regularization-*`; Familien `classify-dropout-regime`, `formula-count-from-construction`, `trace-assignment-state`, `optimize-training-primitive-contract`, `fit-early-stopping-roundtrip`, `fit-weight-decay-ablation`.

**Repräsentative geprüfte Fälle:** `dropout-regime`, `dropout-mask-kept-count`, `fixed-dropout-mask-trace`, `dropout-weight-decay-primitives`, `early-stopping-roundtrip`, `weight-decay-ablation`.

**Fachliche Bewertung:**
- [P0] In `assets/js/core/deep_learning_generators.mjs:196` (`genDropoutCount`) steht im `fullSolution` der `kept`-Variante: `Skalierung 1/p = ${p.toString().replace('.', ',')}`. Das ist fachlich falsch: Der korrekte Skalierungsfaktor des invertierten Dropouts ist `1/p`, aber der angezeigte Wert ist `p` (z. B. bei `p = 0,5` müsste `1/p = 2,0` stehen). Die Zähl-Antwort ist davon unberührt, die Erklärung aber irreführend.
- `dropout-weight-decay-primitives` und `dropout-regime` beschreiben invertiertes Dropout mit `1/p` korrekt. `fixed-dropout-mask-trace` und `dropout-mask-kept-count` (Zählfrage) sind ansonsten korrekt.
- `weight-decay-ablation` verwendet Full-Batch-SGD, L2-Gradient `grad + lam * w`, reiner MSE in `loss_history` und faire Ablation mit gleichem Seed. Fachlich korrekt.
- `early-stopping-roundtrip` speichert `tolist()` und lädt `np.asarray(..., dtype=np.float64)`; Stopp-Regel `i - best > patience` korrekt.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `fixed-dropout-mask-trace` vor Primitives, aber kein Fading |
| R3 | teilweise | Hinweise funktional, nicht immer Teilziel-orientiert |
| R7 | teilweise | `weight-decay-ablation` (42 Min) mit 400 Epochen knapp; Practice-Space 0 |
| R11 | teilweise | Rückgriff auf Training-Primitiven implizit |
| R15 | teilweise | Familien-Metadaten unvollständig; [P0] in `genDropoutCount` betrifft fachliche Konsistenz |
| R12 | fehlt | Keine Visualisierung zur Dropout-Masken-/Weight-Decay-Wirkung |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Der Regularisierungsblock behandelt Dropout, Weight Decay, Early Stopping und faire Ablationen sauber. Alle Verträge bis auf die Skalierungsanzeige im Dropout-Generator sind korrekt. Der P0-Befund ist lokalisiert in `deep_learning_generators.mjs` und betrifft die `fullSolution`-Erklärung, nicht die Antwort. Die Stopp-Logik und die Ablation mit festem Seed sind robust.

**Befunde:**
- [P0] `assets/js/core/deep_learning_generators.mjs:196` — `fullSolution` der `kept`-Variante von `dropout-mask-kept-count` zeigt `1/p = p` an, obwohl der Skalierungsfaktor `1/p` ist (z. B. `p=0,5` → `2,0`).
- [P1] Keine `workedExample`-Completion (R1); fehlende Familien-Metadaten (R15).
- [P2] Keine Visualisierung für Dropout-Rate vs. erwartete Aktivierung (R12/R13).

**Top-Vorschläge:**
1. `assets/js/core/deep_learning_generators.mjs:196` — `fullSolution` korrigieren: `Skalierung 1/p = ${(1/p).toFixed(2).replace('.', ',')}` (P0).
2. `content/families/formula-count-from-construction.json` bzw. `assets/js/core/deep_learning_generators.mjs` — `dropout-mask-kept-count` um Dropout-Skalierungs-Trace ergänzen (R1).
3. `content/families/*.json` — Familien-Metadaten vervollständigen (R15).

---

### c-dl-attention — Attention und Transformer-Grundlagen

**Deckung:** `content/modules/lm-tf-attention.json`; `content/lessons/transformer-llm/tf-attention.md` + `tf-attention-checkpoint.md`; `content/lessons/transformer-llm/softmax-temperature.viz.json`; Placements `p-tf-attention-*`; Familien `classify-attention-roles`, `formula-count-from-construction`, `trace-assignment-state`, `optimize-softmax-attention-mask`, `construct-attention-mask`, `optimize-multi-head-attention`.

**Repräsentative geprüfte Fälle:** `attention-role-values`, `attention-tensor-cells`, `stable-softmax-rows-trace`, `scaled-dot-product-attention`, `construct-causal-padding-mask`, `multi-head-attention`.

**Fachliche Bewertung:** Rollen von `Q`, `K`, `V` korrekt: `scores = Q @ K.T / sqrt(d_k)`, Maskierung vor Softmax auf `-inf`, stabiler Softmax durch Zeilenmaximum-Subtraktion, Gewichte `@ V`. Padding/Kausal-Masken und Fehlerbehandlung (vollständig maskierte Zeile → `ValueError`) korrekt. Multi-Head: Projektion, Slice in Köpfe, Skalierung durch `sqrt(d_head)`, Konkatenation in Kopf-Reihenfolge, `d_model % n_heads != 0` → `ValueError`. Alles fachlich konsistent.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `attention-role-values` + `stable-softmax-rows-trace` vor Code, aber kein Fading |
| R3 | teilweise | `multi-head-attention` Hinweis 2 nennt Slicing-Formeln, nicht das Strategie-Teilziel |
| R7 | teilweise | `multi-head-attention` (42 Min) mit manuellem Reshape/Slicing knapp |
| R11 | teilweise | Bezug zu Tensorformen aus `c-dl-tensors` implizit, nicht durch Family-IDs |
| R15 | teilweise | Familien-Metadaten unvollständig |
| R12 | fehlt | `softmax-temperature.viz.json` ist reine Slider-Exploration ohne Transferfrage (E2) |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Die Attention-Kompetenz ist mathematisch solide: Skalierung, Maskierung, stabiler Softmax, Padding und Multi-Head-Slicing sind korrekt implementiert. Das geprüfte Notebook-Aufgabenfeld deckt Konzept, Trace, Konstruktion und Code. Das vorhandene `softmax-temperature.viz.json` bleibt passiv und nutzt keinen Lernzweck durch Vorhersagefrage. Familien-Metadaten und Interaktivität fehlen wie im restlichen Block.

**Befunde:**
- [P1] `content/lessons/transformer-llm/softmax-temperature.viz.json` — reine Exploration, keine Vorhersage-/Transferfrage (R12, `e2-interaktiv-audit.md`).
- [P1] Keine Visualisierung für Attention-Scores/Maskierung (R12/R13).
- [P1] Fehlende Familien-Metadaten (R15).

**Top-Vorschläge:**
1. `content/lessons/transformer-llm/softmax-temperature.viz.json` — Eingabefeld „Welche Token-Wahrscheinlichkeit ergibt sich bei T=0,5?“ hinzufügen (R12, E2).
2. Neues `.viz.json` für Attention-Scores mit Maskierungs-Vorhersage (R12/R13, E2).
3. `content/families/*.json` — Familien-Metadaten vervollständigen (R15).

---

### c-dl-tokenizer — Tokenisierung und Sprachmodellfamilien

**Deckung:** `content/modules/lm-tf-tokenizer.json`; `content/lessons/transformer-llm/tf-tokenizer.md` + `tf-tokenizer-checkpoint.md`; Placements `p-tf-tokenizer-*`; Familien `classify-subword-principle`, `formula-count-from-construction`, `trace-assignment-state`, `transform-tokenize-roundtrip`, `transform-bpe-merge-apply`, `optimize-bpe-merge-learn`.

**Repräsentative geprüfte Fälle:** `subword-oov-robustness`, `bpe-vocab-size`, `char-encode-roundtrip-trace`, `char-encode-roundtrip`, `bpe-merge-apply`, `bpe-merge-learn`.

**Fachliche Bewertung:** Zeichen-/Wort-/Subword-Tokenisierung, OOV-Robustheit, Vokabulargröße, Round-Trip `decode(encode(s)) == s` und End-of-Word-Marker korrekt beschrieben. BPE: lexikographischer Tie-Break bei gleicher Häufigkeit, globale Ersetzung, Mergetabelle in fester Reihenfolge anwenden. `bpe-merge-apply` und `bpe-merge-learn` entsprechen dem Vertrag. Fachlich korrekt.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `char-encode-roundtrip-trace` vor Code, aber kein Fading |
| R3 | teilweise | Hinweise für `bpe-merge-learn` beschreiben Algorithmus, nicht das erste Teilziel |
| R7 | teilweise | `bpe-merge-learn` (42 Min) mit mehreren Merge-Runden knapp |
| R11 | teilweise | Rückgriff auf Python-Collections implizit, nicht durch Family-ID |
| R15 | teilweise | Familien-Metadaten unvollständig |
| R12 | fehlt | Keine BPE-Merge-Visualisierung mit Transferfrage |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Die Tokenizer-Kompetenz erklärt Subword-Tokenisierung, Round-Trip und BPE mit gepinntem Tie-Break sauber. Die geprüften Fälle decken Konzept, Trace, Round-Trip-Implementierung, BPE-Anwendung und BPE-Lernen ab. Mathematisch und algorithmisch keine Fehler. Wie bei Attention fehlt eine Visualisierung, die Merge-Schritte mit Vorhersage koppelt. Familien-Metadaten unvollständig.

**Befunde:**
- [P1] Keine BPE-Merge-Visualisierung mit `predict-then-verify` (R12/R13, E2).
- [P1] Fehlende Familien-Metadaten (R15).
- [P2] `bpe-merge-learn` Challenge-Zeit knapp, aber plausibel (R7).

**Top-Vorschläge:**
1. `content/lessons/transformer-llm/tf-tokenizer.md` — BPE-Merge-Visualisierung mit Vorhersagefrage „Welches Paar gewinnt Runde 2?“ (R12/R13, E2).
2. `content/families/transform-bpe-merge-apply.json` / `optimize-bpe-merge-learn.json` — Case-Level-Worked-Example mit ausgeblendeten Merge-Schritten (R1).
3. `content/families/*.json` — Familien-Metadaten vervollständigen (R15).

---

### c-dl-inference — Reproduzierbare Toy-Modell-Inferenz

**Deckung:** `content/modules/lm-tf-inference.json`; `content/lessons/transformer-llm/tf-inference.md` + `tf-inference-checkpoint.md`; `content/lessons/transformer-llm/softmax-temperature.viz.json`; Placements `p-tf-inference-*`; Familien `classify-decoding-strategy`, `formula-stat-from-table`, `optimize-decode-greedy-loop`, `optimize-softmax-attention-mask`, `compose-toy-inference-pipeline`.

**Repräsentative geprüfte Fälle:** `greedy-decoding`, `greedy-step-stat`, `greedy-loop-trace`, `greedy-decode-function`, `toy-forward-pass`, `toy-inference-pipeline`.

**Fachliche Bewertung:** Greedy-Decoding-Verträge sind klar: `argmax`, `max_len`, `eos`, Kopie von `init_ids`, keine Mutation. `toy-forward-pass` verwendet Attention mit kausaler Maske und `sqrt(d)`-Skalierung. `toy-inference-pipeline` ist deterministisch und prüft Doppelaufruf. Fachlich korrekt. Die Lektion grenzt ehrlich als „Toy-Pipeline“ ab.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `greedy-loop-trace` vor `greedy-decode-function`, aber kein Fading |
| R3 | teilweise | Hinweis zu `max_len`/`eos` gut, aber keine strategische Teilziel-Frage |
| R7 | teilweise | `toy-inference-pipeline` (45 Min) mit Forward + Determinismus-Check knapp |
| R11 | teilweise | Aufbau auf `c-dl-attention`/`c-dl-tokenizer` implizit, nicht durch Family-IDs |
| R15 | teilweise | Familien-Metadaten unvollständig |
| R12 | fehlt | `softmax-temperature.viz.json` ohne Transferfrage; kein Softmax/Top-k-Interaktionstyp |
| R13 | fehlt | Kein neuer `predict-then-verify`-Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Die Inferenzkompetenz baut die Pipeline Tokenisierung → Forward → Logits → Greedy-Decoding in Toy-Größe auf. Die Verträge (argmax, eos, max_len, Kopie, Determinismus) sind sauber und getestet. Was fehlt, ist der Sprung von Greedy zu Top-k/Temperatur-Sampling — ein inhaltliches Lückenobjektive, das auch das vorhandene Softmax-Temperatur-Viz nicht schließt.

**Befunde:**
- [P1] Keine Top-k- oder Temperatur-Sampling-Aufgabe; Greedy ist der einzige Strategie-Fall (R10-Lücke).
- [P1] `softmax-temperature.viz.json` reine Exploration, keine Transferfrage (R12, E2).
- [P1] Fehlende Familien-Metadaten (R15).

**Top-Vorschläge:**
1. `content/lessons/transformer-llm/tf-inference.md` / neues Placement — Top-k/Temperatur-Sampling-Code-Aufgabe (R10, R1).
2. `content/lessons/transformer-llm/softmax-temperature.viz.json` — Vorhersagefrage und Top-k-Filter ergänzen (R12, E2).
3. `content/families/*.json` — Familien-Metadaten vervollständigen (R15).

---

### c-dl-finetuning — Fine-Tuning-Strategien und LoRA-Mathematik

**Deckung:** `content/modules/lm-tf-finetuning.json`; `content/lessons/transformer-llm/tf-finetuning.md` + `tf-finetuning-checkpoint.md`; Placements `p-tf-finetuning-*`; Familien `classify-lora-tradeoff`, `formula-count-from-construction`, `trace-assignment-state`, `formula-lora-delta-apply`, `optimize-gradient-update-rule`.

**Repräsentative geprüfte Fälle:** `lora-tradeoff`, `lora-param-count`, `freeze-param-filter-trace`, `lora-delta-apply`, `head-only-finetune`, `lora-fit-toy`.

**Fachliche Bewertung:**
- [P0] `head-only-finetune` in `content/families/optimize-gradient-update-rule.json` ist fachlich inkonsistent für multi-output-Köpfe:
  - `prompt` (Z. 503) nennt MSE `1/n Σ (hW₂ᵀ − Y)²` und Gradientenfaktor `2/n`.
  - `expected.referenceSolver` (Z. 501) und `fullSolution` (Z. 504) verwenden jedoch `np.mean(r * r)` (d. h. `1/(n·d₂)`) und `grad = (2.0 / n) * r.T @ h`.
  - Für `d₂ = 1` (alle Testinstanzen in der Datei, z. B. `W2_true = [[2.0, -1.0]]`, eindimensional) fallen die Faktoren zusammen. Für `d₂ > 1` muss bei MSE `1/(n·d₂) Σ` der Gradient `2/(n·d₂) * r.T @ h` lauten. Die unabhängige Test-Referenz `__ref_head_ft` (Z. 493 und Varianten) verwendet korrekt `2/(n * d2)`.
  - Vergleich: `lora-fit-toy` (`content/families/optimize-gradient-update-rule.json:610/612`) verwendet korrekt `G = (2.0 / (n * Y.shape[1])) * (resid.T @ h)`.
- `lora-delta-apply` berechnet `h @ (W + scale * (B @ A)).T` mit `scale = alpha/r` korrekt.
- `lora-param-count` zählt `r * (d_in + d_out)` gegen `d_in * d_out` korrekt.
- `lora-fit-toy` trainiert nur `A` und `B`, hält `W` eingefroren, prüft Rang von `B @ A` und MSE-Halbierung.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `freeze-param-filter-trace` vor `head-only-finetune`/`lora-fit-toy`, aber kein Fading |
| R3 | teilweise | `lora-fit-toy` Hinweis 2 nennt Formeln, nicht das nächste Teilziel |
| R7 | teilweise | `lora-fit-toy` (45 Min) mit 800 Epochen + Rangcheck knapp |
| R11 | teilweise | Bezug zu Regularisierung/Training implizit, nicht durch Family-IDs |
| R15 | teilweise | Familien-Metadaten unvollständig; `head-only-finetune` fachlich inkonsistent (P0) |
| R12 | fehlt | Keine Visualisierung für LoRA-Delta-Wirkung |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Fine-Tuning vermittelt Feature-Extraction, Head-only und LoRA ehrlich als Toy-Experimente. LoRA-Formeln und Parameterzählung sind korrekt. Der einzige P0 ist der inkonsistente MSE-Gradient in `head-only-finetune`, der durch eindimensionale Testinstanzen maskiert wird. Die Lektion grenzt gegenüber „echtem“ Fine-Tuning klar ab. Familien-Metadaten und Visualisierungen fehlen wie in den anderen B4-Kompetenzen.

**Befunde:**
- [P0] `content/families/optimize-gradient-update-rule.json:501/503/504` — `head-only-finetune` MSE/Gradient-Formel nicht allgemein gültig; Korrektur auf `2/(n * Y.shape[1])` notwendig.
- [P1] Fehlende `license`/`releaseStatus`/`validationStatus` in Familien-JSONs (R15).
- [P2] Keine LoRA-Delta-Visualisierung (R12/R13).

**Top-Vorschläge:**
1. `content/families/optimize-gradient-update-rule.json` — Prompt, `fullSolution` und `expected.referenceSolver` für `head-only-finetune` auf MSE `mean(r*r)` + `grad = (2.0 / (n * Y.shape[1])) * r.T @ h` anpassen (P0).
2. `content/families/optimize-gradient-update-rule.json` — `head-only-finetune`-Varianten um Fall mit `d2 > 1` erweitern oder Vertrag explizit auf eindimensionale `Y` einschränken (P0/R14).
3. `content/lessons/transformer-llm/tf-finetuning.md` — LoRA-Delta-Visualisierung mit Vorhersagefrage ergänzen (R12, E2).

---

### c-dl-papers — Deep-Learning-Paper kritisch synthetisieren

**Deckung:** `content/modules/lm-tf-papers.json`; `content/lessons/transformer-llm/tf-papers.md` + `tf-papers-checkpoint.md`; Placements `p-tf-papers-*`; Familien `classify-benchmark-reading`, `formula-stat-from-table`, `trace-assignment-state`, `formula-ratio-percent-metric`, `validate-required-field-raise`, `rank-evidence-table`.

**Repräsentative geprüfte Fälle:** `benchmark-absolute-gain`, `paper-gain-from-counts`, `absolute-vs-relative-gain-trace`, `compare-systems-metric`, `paper-card-required-fields`, `evidence-table-ranking`.

**Fachliche Bewertung:** Absolute vs. relative Gains (`system − baseline` bzw. `100·delta/baseline` mit `int(round(...))`) korrekt. Baseline 0 → relativ 0 per Vertrag. `evidence-table-ranking` sortiert absteigend nach relativem Gain, Tie-Break `paperId`. `paper-card-required-fields` prüft fünf Pflichtfelder. `compare-systems-metric` arbeitet auf Korrektheitszählungen, bei denen höher besser ist — das ist im Vertrag definiert. Die Lektion warnt explizit vor der Fehlerraten-Falle (lower-is-better). Fachlich korrekt.

**R1–R15:**
- Erfüllt: R2, R4, R5, R6, R8, R9, R10, R14
- Teilweise: R1, R3, R7, R11, R15
- Fehlt: R12, R13

| Rubrik | Status | Begründung |
|---|---|---|
| R1 | teilweise | `absolute-vs-relative-gain-trace` vor Code, aber kein Fading |
| R3 | teilweise | `evidence-table-ranking` Hinweise korrekt, aber keine strategische Teilziel-Frage |
| R7 | teilweise | `evidence-table-ranking` (40 Min) mit Sortieren/Runden knapp |
| R11 | teilweise | Rückgriff auf `c-meta-learning` implizit, nicht durch Family-IDs |
| R15 | teilweise | Familien-Metadaten unvollständig |
| R12 | fehlt | Keine Visualisierung für Paper-Vergleiche |
| R13 | fehlt | Kein neuer Interaktionstyp |

**Zusammenfassung (≤150 Wörter):** Die Paper-Kompetenz trainiert sauberes Zerlegen in Forschungsfrage, Methode, Datensatz, Ergebnisse und Limitationen. Absolute und relative Gains, Evidenztabellen und Pflichtfelder sind konsistent. Die Unterscheidung von Punkten und Prozent sowie das lower-is-better-Problem sind im Text ehrlich benannt. Fehlend bleiben eine Visualisierung für Paper-Vergleiche, Worked-Example-Fading und Familien-Metadaten.

**Befunde:**
- [P1] Keine Case-Level-Worked-Example-Fading (R1).
- [P1] Keine lower-is-better-Code-Aufgabe — `compare-systems-metric` nutzt Korrektheitszählungen; Fehlerraten bleiben reines Lektions-Highlight (R10-Lücke).
- [P1] Fehlende Familien-Metadaten (R15).

**Top-Vorschläge:**
1. `content/lessons/transformer-llm/tf-papers.md` / `content/families/formula-ratio-percent-metric.json` — Zusätzlicher Case `compare-error-rates` mit lower-is-better-Metrik (R10).
2. `content/families/rank-evidence-table.json` — Worked-Example mit ausgeblendeten Sortierschritten für `evidence-table-ranking` (R1).
3. `content/families/*.json` — Familien-Metadaten vervollständigen (R15).

---

## Blockübergreifende Befunde

### R1 — Worked-Example-First / Completion-Fading
Alle Lektionen enthalten durchgerechnete Worked Examples, aber keine Case-Instanz nutzt `workedExample` mit Completion/Fading (vgl. `e1-evidenz-remap.md`). Der Übergang von „Beispiel anschauen“ zu „selbst implementieren“ ist dadurch zu steil, besonders bei `mlp-backprop-relu-mse`, `multi-head-attention`, `bpe-merge-learn` und `lora-fit-toy`.

### R12 — Visualisierungen ohne Transferfrage
`e2-interaktiv-audit.md` dokumentiert, dass alle 24 bestehenden Visualisierungen keine gekoppelte Transfer-/Vorhersagefrage haben. Im B4-Block betrifft das direkt `softmax-temperature.viz.json` (`content/lessons/transformer-llm/softmax-temperature.viz.json`). Weitere B4-relevante Visualisierungen fehlen ganz: Backprop-Graph, BPE-Merge-Schritte, Lernkurven, Attention-Scores.

### R13 — Neue Interaktionen
Es gibt keine neuen Interaktionstypen. Die E2-Audit-Empfehlung `predict-then-verify-visualization` ist für drei B4-Lektionen besonders geeignet: Backprop-Graph (`l-dl-autograd`), Softmax/Temperatur/Top-k (`l-tf-inference`) und BPE-Merge-Schritte (`l-tf-tokenizer`).

### R11 — Spiralrückgriffe
Die Module verweisen in `requires` auf Vorgängerkompetenzen, aber die Placements wiederholen keine konkreten Family-IDs aus früheren Blöcken. Beispielsweise nutzt `c-dl-autograd` implizit `fit-forward-layer-chain-contract/mlp-forward-relu`, greift aber nicht explizit auf eine `c-dl-tensors`-Aufgabe zurück.

### R7 — Zeitplausibilität
Alle Practice-Space-Placements in B4 tragen `estimatedMinutes: 0` (z. B. `lm-dl-tensors.json:96`, `lm-dl-autograd.json:96`). Das ist ein systemischer Schema-Placeholder. Für Curated-Challenges liegen die Zeiten zwischen 40 und 45 Minuten; Pyodide-Läufe mit 400–800 Epochen sind damit knapp, aber im Zielkontext noch plausibel.

### R15 — Feldkonsistenz
Modul-JSONs (`lm-*.json`) enthalten `rightsId` und `releaseStatus`. Familien-JSONs im `content/families/`-Ordner enthalten `schemaVersion`, `familyId`, `sourceLineage` und `competencyIds`, aber durchgehend keine `license`/`releaseStatus`/`validationStatus` (vgl. `docs/authoring-guide.md`). Das ist ein blockübergreifendes R15-Problem, das die Public-Build-Fail-Close-Policy tangieren kann.

### Fachliche Konsistenz
Fast alle geprüften Verträge (Attention, Tokenizer, Inference, LoRA, Training, Regularisierung) sind konsistent. Zwei P0-Befunde sind latent:
- `genDropoutCount` zeigt `1/p = p` an (falsche Erklärung).
- `head-only-finetune` verwendet einen Gradientenfaktor, der nur für eindimensionale `Y` stimmt (durch Testinstanzen maskiert).

---

## E2-Kandidaten

| Lektion | Kandidat | Begründung | Zieldatei |
|---|---|---|---|
| `l-dl-autograd` | Backprop-Graph als `predict-then-verify-visualization` | Lernende sagen an jedem Knoten „lokaler Gradient × Upstream“, bevor sie den Wert sehen. | `content/lessons/transformer-llm/dl-autograd-graph.viz.json` oder Inline in `content/lessons/deep-learning/dl-autograd.md` |
| `l-tf-inference` | Softmax / Temperatur / Top-k mit Eingabefeld | Lernende stellen `T` und `k` ein und sagen die ausgewählte Token-Position vorher. | `content/lessons/transformer-llm/softmax-temperature.viz.json` (Ergänzung) |
| `l-tf-tokenizer` | BPE-Merge-Schritte | Lernende sehen Korpus + aktuelle Symbole und sagen das nächste Merge (Häufigkeit + Tie-Break) vorher. | `content/lessons/transformer-llm/tf-tokenizer-bpe.viz.json` |

---

## Validierung

`node tools/compile_content.mjs` und `node tools/validate_content.mjs` wurden nach dem Schreiben dieses Berichts ausgeführt. Ergebnis siehe unten.

```
$ node tools/compile_content.mjs
Content-Bundle geschrieben: .content-build/public/content-bundle.json (46 Kompetenzen, 46 Lektionen, 253 Aktivitäten)
Split-Content geschrieben: .content-build/public/split (46 Lektionen, 253 Aktivitäten)
Exit code: 0

$ node tools/validate_content.mjs
Content-Bundle: 46 Kompetenzen, 46 Lektionen, 253 Aktivitäten
Exit code: 0
```

Beide Validierungsläufe waren erfolgreich. Die beiden im Bericht markierten P0-Befunde werden von `validate_content.mjs` nicht als Schema- oder Vertragsfehler erkannt, weil sie fachliche Inkonsistenzen in Prompt/`fullSolution` bzw. Generator-Text sind.
