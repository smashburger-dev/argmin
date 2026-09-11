// Procedural-Familien-Registry: sammelt die einzelnen Familien-Module aus
// assets/js/core/procedural/. Jede Familie lebt in einer eigenen Datei
// (<familyId>.mjs) und exportiert FAMILY_SPEC = { ...CONTRACT, generate, solve }.
// Registrierung zentral beim Parent.

import { FAMILY_SPEC as AGGREGATE_DETECTOR_EVAL_COMPARE } from '../core/procedural/aggregate-detector-eval-compare.mjs';
import { FAMILY_SPEC as AGGREGATE_GROUPED_METRICS_REPORT } from '../core/procedural/aggregate-grouped-metrics-report.mjs';
import { FAMILY_SPEC as AGGREGATE_PARITY_THRESHOLD_SELECTION } from '../core/procedural/aggregate-parity-threshold-selection.mjs';
import { FAMILY_SPEC as AGGREGATE_RETRIEVAL_RANKING_METRIC } from '../core/procedural/aggregate-retrieval-ranking-metric.mjs';
import { FAMILY_SPEC as CLASSIFY_ATTACK_SURFACE } from '../core/procedural/classify-attack-surface.mjs';
import { FAMILY_SPEC as CLASSIFY_ATTENTION_ROLES } from '../core/procedural/classify-attention-roles.mjs';
import { FAMILY_SPEC as CLASSIFY_BACKPROP_PATH_RULE } from '../core/procedural/classify-backprop-path-rule.mjs';
import { FAMILY_SPEC as CLASSIFY_DECODING_STRATEGY } from '../core/procedural/classify-decoding-strategy.mjs';
import { FAMILY_SPEC as CLASSIFY_DROPOUT_REGIME } from '../core/procedural/classify-dropout-regime.mjs';
import { FAMILY_SPEC as CLASSIFY_EVAL_HAZARD } from '../core/procedural/classify-eval-hazard.mjs';
import { FAMILY_SPEC as CLASSIFY_EVIDENCE_VS_DEMO } from '../core/procedural/classify-evidence-vs-demo.mjs';
import { FAMILY_SPEC as CLASSIFY_FAIRNESS_AGGREGATION } from '../core/procedural/classify-fairness-aggregation.mjs';
import { FAMILY_SPEC as CLASSIFY_FREEZE_PURPOSE } from '../core/procedural/classify-freeze-purpose.mjs';
import { FAMILY_SPEC as CLASSIFY_FREEZE_SCOPE } from '../core/procedural/classify-freeze-scope.mjs';
import { FAMILY_SPEC as CLASSIFY_HASH_SEMANTICS } from '../core/procedural/classify-hash-semantics.mjs';
import { FAMILY_SPEC as CLASSIFY_PROVENANCE_DUTY } from '../core/procedural/classify-provenance-duty.mjs';
import { FAMILY_SPEC as CLASSIFY_RULE_CASCADE_PRIORITY } from '../core/procedural/classify-rule-cascade-priority.mjs';
import { FAMILY_SPEC as CLASSIFY_SILENT_FALLBACK_HAZARD } from '../core/procedural/classify-silent-fallback-hazard.mjs';
import { FAMILY_SPEC as CLASSIFY_SUBWORD_PRINCIPLE } from '../core/procedural/classify-subword-principle.mjs';
import { FAMILY_SPEC as CLASSIFY_TOOL_POLICY } from '../core/procedural/classify-tool-policy.mjs';
import { FAMILY_SPEC as CLASSIFY_TRAINING_CURVE } from '../core/procedural/classify-training-curve.mjs';
import { FAMILY_SPEC as CLASSIFY_QUESTION_QUALITY } from '../core/procedural/classify-question-quality.mjs';
import { FAMILY_SPEC as CLASSIFY_RAG_STAGE } from '../core/procedural/classify-rag-stage.mjs';
import { FAMILY_SPEC as COMPOSE_TOY_INFERENCE_PIPELINE } from '../core/procedural/compose-toy-inference-pipeline.mjs';
import { FAMILY_SPEC as CONSTRUCT_ATTENTION_MASK } from '../core/procedural/construct-attention-mask.mjs';
import { FAMILY_SPEC as CONSTRUCT_ENSEMBLE_PREDICTOR_COMPARISON } from '../core/procedural/construct-ensemble-predictor-comparison.mjs';
import { FAMILY_SPEC as CONSTRUCT_FREEZE_ASSERT_GUARD } from '../core/procedural/construct-freeze-assert-guard.mjs';
import { FAMILY_SPEC as CONSTRUCT_LINALG_CONTRACT_SYNTHESIS } from '../core/procedural/construct-linalg-contract-synthesis.mjs';
import { FAMILY_SPEC as CONSTRUCT_MATVEC_SHAPE_CONTRACT } from '../core/procedural/construct-matvec-shape-contract.mjs';
import { FAMILY_SPEC as CONSTRUCT_NORMALIZE_CHUNK_CONTRACT } from '../core/procedural/construct-normalize-chunk-contract.mjs';
import { FAMILY_SPEC as CONSTRUCT_SECURE_PROTOTYPE_CONTRACT } from '../core/procedural/construct-secure-prototype-contract.mjs';
import { FAMILY_SPEC as CONSTRUCT_STUB_PROTOTYPE_CONTRACT } from '../core/procedural/construct-stub-prototype-contract.mjs';
import { FAMILY_SPEC as FIT_EARLY_STOPPING_ROUNDTRIP } from '../core/procedural/fit-early-stopping-roundtrip.mjs';
import { FAMILY_SPEC as FIT_FORWARD_LAYER_CHAIN_CONTRACT } from '../core/procedural/fit-forward-layer-chain-contract.mjs';
import { FAMILY_SPEC as FIT_MLP_VAL_CURVE_ARGMIN } from '../core/procedural/fit-mlp-val-curve-argmin.mjs';
import { FAMILY_SPEC as FIT_PCA_KMEANS_PIPELINE } from '../core/procedural/fit-pca-kmeans-pipeline.mjs';
import { FAMILY_SPEC as FIT_PREDICT_METRICS } from '../core/procedural/fit-predict-metrics.mjs';
import { FAMILY_SPEC as FIT_SEEDED_SPLIT_SGD_LINEAR } from '../core/procedural/fit-seeded-split-sgd-linear.mjs';
import { FAMILY_SPEC as FIT_WEIGHT_DECAY_ABLATION } from '../core/procedural/fit-weight-decay-ablation.mjs';
import { FAMILY_SPEC as FORMULA_DESCRIPTIVE_STATS_NUMPY } from '../core/procedural/formula-descriptive-stats-numpy.mjs';
import { FAMILY_SPEC as FORMULA_LORA_DELTA_APPLY } from '../core/procedural/formula-lora-delta-apply.mjs';
import { FAMILY_SPEC as FORMULA_RIDGE_LASSO_CLOSED_FORM } from '../core/procedural/formula-ridge-lasso-closed-form.mjs';
import { FAMILY_SPEC as OPTIMIZE_BACKPROP_GRADIENT_CHECK } from '../core/procedural/optimize-backprop-gradient-check.mjs';
import { FAMILY_SPEC as OPTIMIZE_BPE_MERGE_LEARN } from '../core/procedural/optimize-bpe-merge-learn.mjs';
import { FAMILY_SPEC as OPTIMIZE_DECODE_GREEDY_LOOP } from '../core/procedural/optimize-decode-greedy-loop.mjs';
import { FAMILY_SPEC as OPTIMIZE_GRADIENT_UPDATE_RULE } from '../core/procedural/optimize-gradient-update-rule.mjs';
import { FAMILY_SPEC as OPTIMIZE_MULTI_HEAD_ATTENTION } from '../core/procedural/optimize-multi-head-attention.mjs';
import { FAMILY_SPEC as OPTIMIZE_SGD_STEP_PURE_UPDATE } from '../core/procedural/optimize-sgd-step-pure-update.mjs';
import { FAMILY_SPEC as OPTIMIZE_SOFTMAX_ATTENTION_MASK } from '../core/procedural/optimize-softmax-attention-mask.mjs';
import { FAMILY_SPEC as OPTIMIZE_TRAINING_PRIMITIVE_CONTRACT } from '../core/procedural/optimize-training-primitive-contract.mjs';
import { FAMILY_SPEC as OPTIMIZE_TREE_BEST_SPLIT } from '../core/procedural/optimize-tree-best-split.mjs';
import { FAMILY_SPEC as RANK_EVIDENCE_TABLE } from '../core/procedural/rank-evidence-table.mjs';
import { FAMILY_SPEC as REPRODUCE_CANONICAL_HASH_VERIFY } from '../core/procedural/reproduce-canonical-hash-verify.mjs';
import { FAMILY_SPEC as REPRODUCE_PIPELINE_STATUS_REPORT } from '../core/procedural/reproduce-pipeline-status-report.mjs';
import { FAMILY_SPEC as REPRODUCE_RUN_DIGEST_ASSERT } from '../core/procedural/reproduce-run-digest-assert.mjs';
import { FAMILY_SPEC as REPRODUCE_SEEDED_EXPERIMENT_REPORT } from '../core/procedural/reproduce-seeded-experiment-report.mjs';
import { FAMILY_SPEC as REPRODUCE_SEEDED_SPLIT } from '../core/procedural/reproduce-seeded-split.mjs';
import { FAMILY_SPEC as TRACE_CHUNK_WINDOW_LOOP } from '../core/procedural/trace-chunk-window-loop.mjs';
import { FAMILY_SPEC as TRACE_LIBRARY_API_OUTPUT } from '../core/procedural/trace-library-api-output.mjs';
import { FAMILY_SPEC as TRACE_STUB_DOC_SENTENCE_SELECT } from '../core/procedural/trace-stub-doc-sentence-select.mjs';
import { FAMILY_SPEC as TRACE_SUBSTRING_FLAG_SUM } from '../core/procedural/trace-substring-flag-sum.mjs';
import { FAMILY_SPEC as TRACE_TOPOSORT_DEPENDENCY_ORDER } from '../core/procedural/trace-toposort-dependency-order.mjs';
import { FAMILY_SPEC as TRACE_TRAINING_LOOP_COUNT } from '../core/procedural/trace-training-loop-count.mjs';
import { FAMILY_SPEC as TRANSFORM_BPE_MERGE_APPLY } from '../core/procedural/transform-bpe-merge-apply.mjs';
import { FAMILY_SPEC as TRANSFORM_TOKENIZE_ROUNDTRIP } from '../core/procedural/transform-tokenize-roundtrip.mjs';
import { FAMILY_SPEC as VALIDATE_DATA_QUALITY_CONTRACT } from '../core/procedural/validate-data-quality-contract.mjs';
import { FAMILY_SPEC as VALIDATE_LEAKAGE_RULE_AUDIT } from '../core/procedural/validate-leakage-rule-audit.mjs';
import { FAMILY_SPEC as VALIDATE_REPORT_GUARD_COMPOSE } from '../core/procedural/validate-report-guard-compose.mjs';
import { FAMILY_SPEC as VALIDATE_RULE_CATALOG_SCAN } from '../core/procedural/validate-rule-catalog-scan.mjs';
import { FAMILY_SPEC as VALIDATE_TEXT_NORMALIZE_MATCH } from '../core/procedural/validate-text-normalize-match.mjs';

export const PROCEDURAL_FAMILY_SPECS = [
  AGGREGATE_DETECTOR_EVAL_COMPARE,
  AGGREGATE_GROUPED_METRICS_REPORT,
  AGGREGATE_PARITY_THRESHOLD_SELECTION,
  AGGREGATE_RETRIEVAL_RANKING_METRIC,
  CLASSIFY_ATTACK_SURFACE,
  CLASSIFY_ATTENTION_ROLES,
  CLASSIFY_BACKPROP_PATH_RULE,
  CLASSIFY_DECODING_STRATEGY,
  CLASSIFY_DROPOUT_REGIME,
  CLASSIFY_EVAL_HAZARD,
  CLASSIFY_EVIDENCE_VS_DEMO,
  CLASSIFY_FAIRNESS_AGGREGATION,
  CLASSIFY_FREEZE_PURPOSE,
  CLASSIFY_FREEZE_SCOPE,
  CLASSIFY_HASH_SEMANTICS,
  CLASSIFY_PROVENANCE_DUTY,
  CLASSIFY_RULE_CASCADE_PRIORITY,
  CLASSIFY_SILENT_FALLBACK_HAZARD,
  CLASSIFY_SUBWORD_PRINCIPLE,
  CLASSIFY_TOOL_POLICY,
  CLASSIFY_TRAINING_CURVE,
  CLASSIFY_QUESTION_QUALITY,
  CLASSIFY_RAG_STAGE,
  COMPOSE_TOY_INFERENCE_PIPELINE,
  CONSTRUCT_ATTENTION_MASK,
  CONSTRUCT_ENSEMBLE_PREDICTOR_COMPARISON,
  CONSTRUCT_FREEZE_ASSERT_GUARD,
  CONSTRUCT_LINALG_CONTRACT_SYNTHESIS,
  CONSTRUCT_MATVEC_SHAPE_CONTRACT,
  CONSTRUCT_NORMALIZE_CHUNK_CONTRACT,
  CONSTRUCT_SECURE_PROTOTYPE_CONTRACT,
  CONSTRUCT_STUB_PROTOTYPE_CONTRACT,
  FIT_EARLY_STOPPING_ROUNDTRIP,
  FIT_FORWARD_LAYER_CHAIN_CONTRACT,
  FIT_MLP_VAL_CURVE_ARGMIN,
  FIT_PCA_KMEANS_PIPELINE,
  FIT_PREDICT_METRICS,
  FIT_SEEDED_SPLIT_SGD_LINEAR,
  FIT_WEIGHT_DECAY_ABLATION,
  FORMULA_DESCRIPTIVE_STATS_NUMPY,
  FORMULA_LORA_DELTA_APPLY,
  FORMULA_RIDGE_LASSO_CLOSED_FORM,
  OPTIMIZE_BACKPROP_GRADIENT_CHECK,
  OPTIMIZE_BPE_MERGE_LEARN,
  OPTIMIZE_DECODE_GREEDY_LOOP,
  OPTIMIZE_GRADIENT_UPDATE_RULE,
  OPTIMIZE_MULTI_HEAD_ATTENTION,
  OPTIMIZE_SGD_STEP_PURE_UPDATE,
  OPTIMIZE_SOFTMAX_ATTENTION_MASK,
  OPTIMIZE_TRAINING_PRIMITIVE_CONTRACT,
  OPTIMIZE_TREE_BEST_SPLIT,
  RANK_EVIDENCE_TABLE,
  REPRODUCE_CANONICAL_HASH_VERIFY,
  REPRODUCE_PIPELINE_STATUS_REPORT,
  REPRODUCE_RUN_DIGEST_ASSERT,
  REPRODUCE_SEEDED_EXPERIMENT_REPORT,
  REPRODUCE_SEEDED_SPLIT,
  TRACE_CHUNK_WINDOW_LOOP,
  TRACE_LIBRARY_API_OUTPUT,
  TRACE_STUB_DOC_SENTENCE_SELECT,
  TRACE_SUBSTRING_FLAG_SUM,
  TRACE_TOPOSORT_DEPENDENCY_ORDER,
  TRACE_TRAINING_LOOP_COUNT,
  TRANSFORM_BPE_MERGE_APPLY,
  TRANSFORM_TOKENIZE_ROUNDTRIP,
  VALIDATE_DATA_QUALITY_CONTRACT,
  VALIDATE_LEAKAGE_RULE_AUDIT,
  VALIDATE_REPORT_GUARD_COMPOSE,
  VALIDATE_RULE_CATALOG_SCAN,
  VALIDATE_TEXT_NORMALIZE_MATCH,
];
