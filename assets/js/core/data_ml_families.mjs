// S4D8 data-cleaning family contracts. The seeded cases reuse the canonical
// W06 generators; this module only supplies profile filtering and family
// instance shape.

import { drawFamilyInstance } from './generator_draw_kit.mjs';
import { staticCaseBody } from '../domain/family_registry.mjs';
import {
  genCompleteRows,
  genConditionalCount,
  genDedupRows,
  genBaselineCorrect,
  genEnsembleAccuracy,
  genConfusionCount,
  genCvSpread,
  genSeedSpread,
  genSubgroupGapPp,
  genShrinkagePercent,
  genMseFromResiduals,
  genMseGradient,
  genR2Share,
  genPcaVariancePercent,
} from './data_ml_generators.mjs';
import {
  genBackpropChain,
  genDropoutCount,
  genLinearParamCount,
  genSgdSteps,
} from './w18_w21_generators.mjs';
import {
  genAttentionShape,
  genGreedyToken,
  genLoraParamCount,
  genRelativeGain,
  genVocabAfterMerges,
} from './w22_w26_generators.mjs';
import {
  genRecallAtK,
  genF1orPrecision,
  genInjectionFlagCount,
  genAllowedActionCount,
} from './w27_w30_generators.mjs';
import {
  genProtocolShifts,
  genCardAudit,
  genSubgroupCost,
  genBaselineLedger,
  genPipelineStages,
  genEvalRates,
  protocolShiftFlags,
  countCardDefects,
  subgroupRatePerMille,
} from './w31_w39_generators.mjs';

export const DATA_ML_DIFFICULTY_PROFILES = ['intro', 'core', 'stretch'];

const acceptsMissingTargetRowsIntro = (parameters) => parameters.framing === 'drop';
const acceptsMissingTargetRowsStretch = (parameters) => parameters.framing === 'rate';
const acceptsDuplicateRowsIntro = (parameters) => !parameters.dropKey && parameters.keyConflicts === 0;
const acceptsDuplicateRowsStretch = (parameters) => parameters.dropKey;
const acceptsConditionalCountIntro = (parameters) => parameters.direction === 'count';
const acceptsConditionalCountStretch = (parameters) => parameters.direction === 'percent';
const acceptsSubgroupErrorGapIntro = (parameters) => parameters.n === 100;
const acceptsSubgroupErrorGapStretch = (parameters) => parameters.n === 20 || parameters.n === 25;
const acceptsRidgeShrinkageIntro = (parameters) => parameters.phrasing === 'share';
const acceptsRidgeShrinkageStretch = (parameters) => parameters.phrasing === 'shrink';
const acceptsMseGradientIntro = (parameters) => parameters.n === 2;
const acceptsMseGradientStretch = (parameters) => parameters.n === 4;
const acceptsMajorityBaselineIntro = (parameters) => {
  const counts = [...parameters.counts].sort((a, b) => b - a);
  return counts[0] >= 2 * counts[1];
};
const acceptsMajorityBaselineStretch = (parameters) => {
  const counts = [...parameters.counts].sort((a, b) => b - a);
  return counts[0] - counts[1] <= 10;
};
const acceptsEnsembleMajorityIntro = (parameters) => parameters.direction === 'count';
const acceptsEnsembleMajorityStretch = (parameters) => parameters.direction === 'percent';
const acceptsMseResidualsIntro = (parameters) => parameters.n <= 3;
const acceptsMseResidualsStretch = (parameters) => parameters.n >= 5;
const acceptsR2Intro = (parameters) => parameters.phrasing === 'r2';
const acceptsR2Stretch = (parameters) => parameters.phrasing === 'context';
const acceptsConfusionMarginalIntro = (parameters) => parameters.metric === 'predicted-pos';
const acceptsConfusionMarginalStretch = (parameters) => parameters.metric === 'actual-neg';
const acceptsCvSpreadIntro = (parameters) => parameters.k === 4;
const acceptsCvSpreadStretch = (parameters) => parameters.k === 10;
const acceptsSeedSpreadIntro = (parameters) => parameters.unit === 'percent' && parameters.runs === 3;
const acceptsSeedSpreadStretch = (parameters) => parameters.unit === 'fraction';
const acceptsPcaVarianceIntro = (parameters) => parameters.total === 50;
const acceptsPcaVarianceStretch = (parameters) => parameters.total === 25;
const acceptsLinearParamIntro = (parameters) => parameters.variant === 'single';
const acceptsLinearParamStretch = (parameters) => parameters.variant === 'compare';
const acceptsSgdIntro = (parameters) => parameters.variant === 'epochs';
const acceptsSgdStretch = (parameters) => parameters.variant === 'until' || parameters.variant === 'momentum';
const acceptsDropoutIntro = (parameters) => parameters.variant === 'kept';
const acceptsDropoutStretch = (parameters) => parameters.variant === 'both';
const acceptsChainRuleIntro = (parameters) => parameters.variant === 'path';
const acceptsChainRuleStretch = (parameters) => parameters.variant === 'fork';
const acceptsAttentionIntro = (parameters) => parameters.variant === 'score-cells';
const acceptsAttentionStretch = (parameters) => parameters.variant === 'mask-cells' || parameters.variant === 'scale-divisor';
const acceptsBpeIntro = (parameters) => parameters.variant === 'total';
const acceptsBpeStretch = (parameters) => parameters.variant === 'merges-needed';
const acceptsLoraIntro = (parameters) => parameters.variant === 'lora';
const acceptsLoraStretch = (parameters) => parameters.variant === 'saved';
const acceptsGreedyIntro = (parameters) => parameters.variant === 'argmax-position';
const acceptsGreedyStretch = (parameters) => parameters.variant === 'decode-length';
const acceptsPaperGainIntro = (parameters) => parameters.variant === 'count-gain';
const acceptsPaperGainStretch = (parameters) => parameters.variant === 'relative-percent' || parameters.variant === 'error-reduction';
const acceptsPrecisionIntro = (parameters) => parameters.shape === 'precision';
const acceptsPrecisionStretch = (parameters) => parameters.shape === 'f1';
const acceptsInjectionIntro = (parameters) => parameters.shape === 'missed' || parameters.shape === 'false-alarms';
const acceptsInjectionStretch = (parameters) => parameters.shape === 'caught-percent';
const acceptsSubgroupRateIntro = (parameters) => parameters.shape === 'fpr-diff';
const acceptsSubgroupRateStretch = (parameters) => parameters.shape === 'selrate-diff';
const acceptsAllowedActionIntro = (parameters) => parameters.shape === 'allowed';
const acceptsAllowedActionStretch = (parameters) => parameters.shape === 'percent';
const acceptsRecallIntro = (parameters) => parameters.shape === 'hits';
const acceptsRecallStretch = (parameters) => parameters.shape === 'percent' || parameters.shape === 'irrelevant';
const acceptsProtocolShiftIntro = (parameters) => parameters.flags?.length === 1;
const acceptsProtocolShiftStretch = (parameters) => parameters.flags?.length >= 3;
const acceptsCardAuditIntro = (parameters) => parameters.karten?.length === 1;
const acceptsCardAuditStretch = (parameters) => parameters.karten?.length === 2;
const acceptsBaselineLedgerIntro = (parameters) => parameters.shape === 'naive-percent';
const acceptsBaselineLedgerStretch = (parameters) => parameters.shape === 'gap-promille';
const acceptsPipelineIntro = (parameters) => parameters.shape === 'valid-count';
const acceptsPipelineStretch = (parameters) => parameters.shape === 'missing-hashes';
const acceptsEvalBatchIntro = (parameters) => parameters.shape === 'retrieval-error-count'
  || parameters.shape === 'answer-error-count';
const acceptsEvalBatchStretch = (parameters) => parameters.shape === 'answer-rate-percent'
  || parameters.shape === 'retrieval-hit-percent';

const PROFILE_PREDICATES = {
  'missing-target-rows': { intro: acceptsMissingTargetRowsIntro, stretch: acceptsMissingTargetRowsStretch },
  'duplicate-rows': { intro: acceptsDuplicateRowsIntro, stretch: acceptsDuplicateRowsStretch },
  'conditional-count-percent': { intro: acceptsConditionalCountIntro, stretch: acceptsConditionalCountStretch },
  'subgroup-error-gap-pp': { intro: acceptsSubgroupErrorGapIntro, stretch: acceptsSubgroupErrorGapStretch },
  'ridge-shrinkage-percent': { intro: acceptsRidgeShrinkageIntro, stretch: acceptsRidgeShrinkageStretch },
  'mse-gradient-wrt-w': { intro: acceptsMseGradientIntro, stretch: acceptsMseGradientStretch },
  'majority-baseline-errors': { intro: acceptsMajorityBaselineIntro, stretch: acceptsMajorityBaselineStretch },
  'ensemble-majority-output-count': { intro: acceptsEnsembleMajorityIntro, stretch: acceptsEnsembleMajorityStretch },
  'mse-from-residuals': { intro: acceptsMseResidualsIntro, stretch: acceptsMseResidualsStretch },
  'r2-explained-share': { intro: acceptsR2Intro, stretch: acceptsR2Stretch },
  'confusion-marginal-count': { intro: acceptsConfusionMarginalIntro, stretch: acceptsConfusionMarginalStretch },
  'cv-fold-accuracy-spread': { intro: acceptsCvSpreadIntro, stretch: acceptsCvSpreadStretch },
  'seed-rerun-accuracy-spread': { intro: acceptsSeedSpreadIntro, stretch: acceptsSeedSpreadStretch },
  'pca-explained-variance-percent': { intro: acceptsPcaVarianceIntro, stretch: acceptsPcaVarianceStretch },
  'linear-param-count': { intro: acceptsLinearParamIntro, stretch: acceptsLinearParamStretch },
  'sgd-update-count': { intro: acceptsSgdIntro, stretch: acceptsSgdStretch },
  'dropout-mask-kept-count': { intro: acceptsDropoutIntro, stretch: acceptsDropoutStretch },
  'chain-rule-path-sum': { intro: acceptsChainRuleIntro, stretch: acceptsChainRuleStretch },
  'attention-tensor-cells': { intro: acceptsAttentionIntro, stretch: acceptsAttentionStretch },
  'bpe-vocab-size': { intro: acceptsBpeIntro, stretch: acceptsBpeStretch },
  'lora-param-count': { intro: acceptsLoraIntro, stretch: acceptsLoraStretch },
  'greedy-step-stat': { intro: acceptsGreedyIntro, stretch: acceptsGreedyStretch },
  'paper-gain-from-counts': { intro: acceptsPaperGainIntro, stretch: acceptsPaperGainStretch },
  'answer-filter-precision-recall-f1': { intro: acceptsPrecisionIntro, stretch: acceptsPrecisionStretch },
  'injection-filter-counts': { intro: acceptsInjectionIntro, stretch: acceptsInjectionStretch },
  'subgroup-rate-gap-permille': { intro: acceptsSubgroupRateIntro, stretch: acceptsSubgroupRateStretch },
  'allowed-action-count': { intro: acceptsAllowedActionIntro, stretch: acceptsAllowedActionStretch },
  'recall-at-k-window': { intro: acceptsRecallIntro, stretch: acceptsRecallStretch },
  'protocol-shift-flag-count': { intro: acceptsProtocolShiftIntro, stretch: acceptsProtocolShiftStretch },
  'card-audit-missing-count': { intro: acceptsCardAuditIntro, stretch: acceptsCardAuditStretch },
  'baseline-ledger-rates': { intro: acceptsBaselineLedgerIntro, stretch: acceptsBaselineLedgerStretch },
  'pipeline-stage-audit': { intro: acceptsPipelineIntro, stretch: acceptsPipelineStretch },
  'eval-batch-rates': { intro: acceptsEvalBatchIntro, stretch: acceptsEvalBatchStretch },
};

function profileAccepts(caseId, difficulty) {
  if (difficulty === 'core') return null;
  const predicate = PROFILE_PREDICATES[caseId]?.[difficulty];
  if (!predicate) throw new Error(`Unbekanntes Profil ${difficulty}`);
  return predicate;
}

const solveFormulaRatioCompare = (parameters) => staticExpected('formula-ratio-percent-metric', parameters);
const solveFormulaRatioShrinkage = (parameters) => {
  const share = (100 * parameters.sxx) / (parameters.sxx + parameters.lam);
  return { value: parameters.phrasing === 'shrink' ? 100 - share : share };
};
const solveFormulaRatioSubgroupGap = (parameters) => ({ value: (100 * Math.abs(parameters.e1 - parameters.e2)) / parameters.n });
const solveFormulaRatioR2 = (parameters) => ({ value: 100 - (100 * parameters.ssRes) / parameters.ssTot });
const solveFormulaRatioPca = (parameters) => ({
  value: (100 * parameters.lambda1) / (parameters.lambda1 + parameters.lambda2 + parameters.lambda3),
});
const solveFormulaRatioAllowedAction = (parameters) => ({
  value: parameters.shape === 'allowed'
    ? parameters.allowed
    : parameters.shape === 'denied'
      ? parameters.denied
      : (100 * parameters.allowed) / parameters.total,
});
const solveFormulaRatioBaseline = (parameters) => {
  const treffer = parameters.n - parameters.retrieval_fehler;
  const korrekt = treffer - parameters.antwort_fehler;
  if (parameters.shape === 'sep-percent') return { value: (100 * korrekt) / treffer };
  if (parameters.shape === 'naive-percent') return { value: (100 * korrekt) / parameters.n };
  return { value: Math.round((korrekt / treffer - korrekt / parameters.n) * 1000) };
};
const solveFormulaRatioDefault = (parameters) => (
  parameters.direction === 'count'
    ? { value: (parameters.nA * parameters.p) / parameters.q }
    : { value: (100 * parameters.c) / parameters.n }
);
const FORMULA_RATIO_SOLVERS = {
  'compare-systems-metric': solveFormulaRatioCompare,
  'ridge-shrinkage-percent': solveFormulaRatioShrinkage,
  'subgroup-error-gap-pp': solveFormulaRatioSubgroupGap,
  'r2-explained-share': solveFormulaRatioR2,
  'pca-explained-variance-percent': solveFormulaRatioPca,
  'allowed-action-count': solveFormulaRatioAllowedAction,
  'baseline-ledger-rates': solveFormulaRatioBaseline,
};

const solveFormulaCountLinear = (parameters) => {
  if (parameters.variant === 'single') return { value: parameters.d * parameters.h + parameters.h };
  if (parameters.variant === 'mlp') {
    return {
      value: (parameters.d * parameters.h1 + parameters.h1)
        + (parameters.h1 * parameters.h2 + parameters.h2),
    };
  }
  return {
    value: (parameters.hWide - parameters.hNarrow)
      * (parameters.d + 1 + parameters.out),
  };
};
const solveFormulaCountSgd = (parameters) => {
  if (parameters.variant === 'plain') {
    return { value: parameters.descending ? parameters.w0 - parameters.n * parameters.step : parameters.w0 + parameters.n * parameters.step };
  }
  if (parameters.variant === 'epochs') return { value: parameters.epochs * Math.ceil(parameters.n / parameters.batch) };
  if (parameters.variant === 'until') return { value: Math.ceil((parameters.w0 - parameters.target) / parameters.step) };
  return { value: 2 * parameters.g - parameters.g / 2 ** (parameters.n - 1) };
};
const solveFormulaCountDropout = (parameters) => {
  if (parameters.variant === 'kept') return { value: parameters.mask.filter(Boolean).length };
  if (parameters.variant === 'dropped') return { value: parameters.n - parameters.mask.filter(Boolean).length };
  return {
    value: parameters.mask1.reduce((count, value, index) => count + (value && parameters.mask2[index] ? 1 : 0), 0),
  };
};
const solveFormulaCountAttention = (parameters) => {
  if (parameters.variant === 'score-cells') return { value: parameters.n * parameters.m };
  if (parameters.variant === 'output-cells') return { value: parameters.n * parameters.dv };
  if (parameters.variant === 'mask-cells') return { value: (parameters.n * (parameters.n - 1)) / 2 };
  return { value: Math.sqrt(parameters.dk) };
};
const solveFormulaCountBpe = (parameters) => {
  if (parameters.variant === 'total') return { value: parameters.chars + parameters.merges + parameters.specials };
  if (parameters.variant === 'merges-needed') return { value: parameters.target - parameters.chars - parameters.specials };
  return { value: parameters.target - parameters.chars - parameters.merges };
};
const solveFormulaCountLora = (parameters) => {
  const lora = parameters.rank * (parameters.dIn + parameters.dOut);
  if (parameters.variant === 'lora') return { value: lora };
  if (parameters.variant === 'full') return { value: parameters.dIn * parameters.dOut };
  return { value: parameters.dIn * parameters.dOut - lora };
};
const FORMULA_COUNT_SOLVERS = {
  'linear-param-count': solveFormulaCountLinear,
  'sgd-update-count': solveFormulaCountSgd,
  'dropout-mask-kept-count': solveFormulaCountDropout,
  'attention-tensor-cells': solveFormulaCountAttention,
  'bpe-vocab-size': solveFormulaCountBpe,
  'lora-param-count': solveFormulaCountLora,
};

const solveFormulaStatGreedy = (parameters) => {
  if (parameters.variant === 'argmax-position') {
    return { value: 1 + parameters.logits.indexOf(Math.max(...parameters.logits)) };
  }
  if (parameters.variant === 'margin') {
    const sorted = [...parameters.logits].sort((left, right) => right - left);
    return { value: sorted[0] - sorted[1] };
  }
  return { value: parameters.init + parameters.steps };
};
const solveFormulaStatCardAudit = (parameters) => ({ value: countCardDefects(parameters.karten, parameters.pflichtfelder) });
const solveFormulaStatPipeline = (parameters) => {
  const index = new Map(parameters.stages.map((stage, i) => [stage.id, i]));
  if (parameters.shape === 'missing-hashes') {
    return { value: parameters.stages.filter((stage) => !stage.hash).length };
  }
  return {
    value: parameters.stages.filter((stage) => stage.hash
      && (stage.input === 'quelle'
        || (stage.input && index.get(stage.input) < index.get(stage.id)))).length,
  };
};
const solveFormulaStatEvalBatch = (parameters) => {
  const n = parameters.batches.reduce((sum, batch) => sum + batch.n, 0);
  const retrieval = parameters.batches.reduce((sum, batch) => sum + batch.retrieval_fehler, 0);
  const antwort = parameters.batches.reduce((sum, batch) => sum + batch.antwort_fehler, 0);
  const treffer = n - retrieval;
  const korrekt = treffer - antwort;
  if (parameters.shape === 'retrieval-error-count') return { value: retrieval };
  if (parameters.shape === 'answer-error-count') return { value: antwort };
  if (parameters.shape === 'answer-rate-percent') return { value: (100 * korrekt) / treffer };
  return { value: (100 * treffer) / n };
};
const solveFormulaStatFallback = (parameters) => {
  if (parameters.variant === 'count-gain') return { value: parameters.c2 - parameters.c1 };
  if (parameters.variant === 'relative-percent') {
    return { value: Math.round(100 * (parameters.newer - parameters.base) / parameters.base) };
  }
  if (parameters.variant === 'error-reduction') {
    return { value: Math.round(100 * (parameters.eBase - parameters.eNew) / parameters.eBase) };
  }
  return { value: parameters.newer - parameters.base };
};
const FORMULA_STAT_SOLVERS = {
  'greedy-step-stat': solveFormulaStatGreedy,
  'card-audit-missing-count': solveFormulaStatCardAudit,
  'pipeline-stage-audit': solveFormulaStatPipeline,
  'eval-batch-rates': solveFormulaStatEvalBatch,
  'stage-timeout-count': (parameters) => staticExpected('formula-stat-from-table', parameters),
  'dependency-pin-count': (parameters) => staticExpected('formula-stat-from-table', parameters),
};
const solveConfusionMarginal = (parameters) => ({
  value: parameters.metric === 'actual-neg'
    ? parameters.tn + parameters.fp
    : parameters.metric === 'predicted-pos'
      ? parameters.tp + parameters.fp
      : parameters.tp + parameters.fn,
});
const solveConfusionPrecisionRecall = (parameters) => {
  if (parameters.shape === 'precision') return { value: (100 * parameters.tp) / (parameters.tp + parameters.fp) };
  if (parameters.shape === 'recall') return { value: (100 * parameters.tp) / (parameters.tp + parameters.fn) };
  return { value: (200 * parameters.tp) / (2 * parameters.tp + parameters.fp + parameters.fn) };
};
const solveConfusionInjection = (parameters) => {
  if (parameters.shape === 'missed') return { value: parameters.fn };
  if (parameters.shape === 'false-alarms') return { value: parameters.fp };
  if (parameters.shape === 'caught-percent') return { value: (100 * parameters.tp) / (parameters.tp + parameters.fn) };
  return { value: parameters.tn };
};
const solveConfusionSubgroupRate = (parameters) => ({
  value: subgroupRatePerMille(parameters.a, parameters.b, parameters.kind),
});
const AGGREGATE_CONFUSION_SOLVERS = {
  'confusion-marginal-count': solveConfusionMarginal,
  'answer-filter-precision-recall-f1': solveConfusionPrecisionRecall,
  'injection-filter-counts': solveConfusionInjection,
  'subgroup-rate-gap-permille': solveConfusionSubgroupRate,
};

function staticExpected(familyId, parameters) {
  const expected = staticCaseBody(familyId, parameters.caseId).expected || {};
  if (Object.hasOwn(expected, 'value')) return { value: expected.value };
  if (Object.hasOwn(expected, 'output')) return { output: expected.output };
  if (expected.kind === 'rubric') return { kind: 'rubric' };
  return {};
}

const FAMILY_DEFINITIONS = {
  'count-remaining-rows-cleaning-rule': {
    cases: {
      'missing-target-rows': { generator: genCompleteRows },
      'duplicate-rows': { generator: genDedupRows },
    },
    solve(parameters) {
      if (parameters.caseId === 'missing-target-rows') {
        return { value: parameters.rows - parameters.missing };
      }
      if (parameters.caseId === 'duplicate-rows') {
        return {
          value: parameters.dropKey
            ? parameters.rows - parameters.exactDups - parameters.keyConflicts
            : parameters.rows - parameters.exactDups,
        };
      }
      throw new Error(`count-remaining-rows-cleaning-rule: unbekannter Fall ${parameters.caseId}`);
    },
  },
  'formula-ratio-percent-metric': {
    cases: {
      'conditional-count-percent': {
        generator: genConditionalCount,
        competencyIds: ['c-eda-viz'],
      },
      'r2-explained-share': {
        generator: genR2Share,
        competencyIds: ['c-ml-linear'],
      },
      'subgroup-error-gap-pp': {
        generator: genSubgroupGapPp,
        competencyIds: ['c-ml-erroranalysis'],
      },
      'ridge-shrinkage-percent': {
        generator: genShrinkagePercent,
        competencyIds: ['c-ml-regularization'],
      },
      'pca-explained-variance-percent': {
        generator: genPcaVariancePercent,
        competencyIds: ['c-ml-svm-pca'],
      },
      'compare-systems-metric': {
        competencyIds: ['c-dl-papers', 'c-ml-cv'],
      },
      'allowed-action-count': {
        generator: genAllowedActionCount,
        competencyIds: ['c-genai-prototype'],
      },
      'baseline-ledger-rates': {
        generator: genBaselineLedger,
        competencyIds: ['c-research-capstone'],
      },
      'ledger-rates-output-trace': {},
      'subgroup-recall-output-trace': {},
    },
    solve(parameters) {
      return (FORMULA_RATIO_SOLVERS[parameters.caseId] || solveFormulaRatioDefault)(parameters);
    },
  },
  'optimize-mse-gradient-closed-form': {
    cases: {
      'mse-gradient-wrt-w': { generator: genMseGradient },
      'grad-mse-numpy-reference': {},
    },
    solve(parameters) {
      if (parameters.caseId === 'grad-mse-numpy-reference') {
        return staticExpected('optimize-mse-gradient-closed-form', parameters);
      }
      const { n, w, b, points } = parameters;
      return {
        value: (2 / n) * points.reduce(
          (sum, [x, y]) => sum + x * (w * x + b - y),
          0,
        ),
      };
    },
  },
  'formula-quadratic-error-metric': {
    cases: {
      'rmse-unit-from-mse': {},
      'mse-from-residuals': { generator: genMseFromResiduals },
    },
    solve(parameters) {
      if (parameters.caseId === 'rmse-unit-from-mse') {
        return staticExpected('formula-quadratic-error-metric', parameters);
      }
      return {
        value: parameters.residuals.reduce((sum, residual) => sum + residual ** 2, 0) / parameters.n,
      };
    },
  },
  'aggregate-majority-rule-count': {
    cases: {
      'majority-baseline-errors': { generator: genBaselineCorrect },
      'ensemble-majority-output-count': {
        generator: genEnsembleAccuracy,
        competencyIds: ['c-ml-ensembles'],
      },
    },
    solve(parameters) {
      if (parameters.caseId === 'ensemble-majority-output-count') {
        const ones = parameters.votes[0].reduce(
          (count, _, index) => count
            + (parameters.votes[0][index] + parameters.votes[1][index] + parameters.votes[2][index] >= 2 ? 1 : 0),
          0,
        );
        return {
          value: parameters.direction === 'count' ? ones : ones * (100 / parameters.n),
        };
      }
      return { value: parameters.counts.reduce((sum, count) => sum + count, 0) - Math.max(...parameters.counts) };
    },
  },
  'aggregate-confusion-metric': {
    cases: {
      'confusion-marginal-count': {
        generator: genConfusionCount,
        competencyIds: ['c-ml-logistic'],
      },
      'threshold-under-asymmetric-cost': {},
      'sigmoid-predict-numpy': {},
      'confusion-cost-report': {},
      'metric-code-output-trace': {},
      'confusion-from-rows': {},
      'contains-injection-rules': {},
      'fairness-metric-compare': {},
      'answer-filter-precision-recall-f1': {
        generator: genF1orPrecision,
        competencyIds: ['c-genai-eval'],
      },
      'injection-filter-counts': {
        generator: genInjectionFlagCount,
        competencyIds: ['c-genai-security'],
      },
      'subgroup-rate-gap-permille': {
        generator: genSubgroupCost,
        competencyIds: ['c-research-responsible'],
      },
    },
    solve(parameters) {
      const solver = AGGREGATE_CONFUSION_SOLVERS[parameters.caseId];
      return solver ? solver(parameters) : staticExpected('aggregate-confusion-metric', parameters);
    },
  },
  'formula-metric-spread-range': {
    cases: {
      'cv-fold-accuracy-spread': {
        generator: genCvSpread,
        competencyIds: ['c-ml-cv'],
      },
      'seed-rerun-accuracy-spread': {
        generator: genSeedSpread,
        competencyIds: ['c-ml-repro', 'c-ml-cv'],
      },
    },
    solve(parameters) {
      return {
        value: Math.max(...parameters.scores) - Math.min(...parameters.scores),
      };
    },
  },
  'formula-count-from-construction': {
    cases: {
      'linear-param-count': {
        generator: genLinearParamCount,
        competencyIds: ['c-dl-tensors'],
      },
      'sgd-update-count': {
        generator: genSgdSteps,
        competencyIds: ['c-dl-training'],
      },
      'dropout-mask-kept-count': {
        generator: genDropoutCount,
        competencyIds: ['c-dl-regularization'],
      },
      'attention-tensor-cells': {
        generator: genAttentionShape,
        competencyIds: ['c-dl-attention'],
      },
      'bpe-vocab-size': {
        generator: genVocabAfterMerges,
        competencyIds: ['c-dl-tokenizer'],
      },
      'lora-param-count': {
        generator: genLoraParamCount,
        competencyIds: ['c-dl-finetuning'],
      },
    },
    solve(parameters) {
      const solver = FORMULA_COUNT_SOLVERS[parameters.caseId];
      if (!solver) throw new Error(`formula-count-from-construction: unbekannter Fall ${parameters.caseId}`);
      return solver(parameters);
    },
  },
  'formula-stat-from-table': {
    cases: {
      'greedy-step-stat': {
        generator: genGreedyToken,
        competencyIds: ['c-dl-inference'],
      },
      'paper-gain-from-counts': {
        generator: genRelativeGain,
        competencyIds: ['c-dl-papers'],
      },
      'card-audit-missing-count': {
        generator: genCardAudit,
        competencyIds: ['c-research-cards'],
      },
      'pipeline-stage-audit': {
        generator: genPipelineStages,
        competencyIds: ['c-capstone-pipeline', 'c-ml-repro'],
      },
      'stage-timeout-count': {},
      'dependency-pin-count': {},
      'eval-batch-rates': {
        generator: genEvalRates,
        competencyIds: ['c-capstone-pipeline', 'c-genai-security'],
      },
    },
    solve(parameters) {
      const solver = FORMULA_STAT_SOLVERS[parameters.caseId] || solveFormulaStatFallback;
      return solver(parameters);
    },
  },
  'optimize-backprop-path-sum': {
    cases: {
      'chain-rule-path-sum': {
        generator: genBackpropChain,
        competencyIds: ['c-dl-autograd'],
      },
    },
    solve(parameters) {
      if (parameters.variant === 'path') {
        return { value: parameters.locals.reduce((product, local) => product * local, 1) };
      }
      if (parameters.variant === 'repeat') return { value: parameters.a ** parameters.n };
      return {
        value: parameters.branchA[0] * parameters.branchA[1]
          + parameters.branchB[0] * parameters.branchB[1],
      };
    },
  },
  'aggregate-topk-relevance-arithmetic': {
    cases: {
      'recall-at-k-window': {
        generator: genRecallAtK,
        competencyIds: ['c-genai-rag'],
      },
    },
    solve(parameters) {
      if (parameters.shape === 'hits') return { value: parameters.hits };
      if (parameters.shape === 'percent') return { value: (100 * parameters.hits) / parameters.relevantTotal };
      if (parameters.shape === 'missing') return { value: parameters.relevantTotal - parameters.hits };
      return { value: parameters.k - parameters.hits };
    },
  },
  'validate-goalshift-flag-rules': {
    cases: {
      'protocol-shift-flag-count': {
        generator: genProtocolShifts,
        competencyIds: ['c-research-question'],
      },
      'detect-goal-shift': {},
    },
    solve(parameters) {
      if (parameters.caseId === 'detect-goal-shift') {
        return staticExpected('validate-goalshift-flag-rules', parameters);
      }
      return { value: protocolShiftFlags(parameters.versionen.a, parameters.versionen.b).length };
    },
  },
};

function generateDataMlFamily(familyId, { seed, caseId, difficulty }) {
  const definition = FAMILY_DEFINITIONS[familyId];
  const caseDefinition = definition?.cases[caseId];
  if (!definition || !caseDefinition) throw new Error(`${familyId}: unbekannter Fall ${caseId}`);
  if (!caseDefinition.generator) {
    const body = staticCaseBody(familyId, caseId);
    if (body.difficultyProfile !== difficulty) {
      throw new Error(`Unbekanntes Profil ${difficulty} für Fall ${caseId}`);
    }
    const {
      caseId: _caseId,
      difficultyProfile: _difficultyProfile,
      masteryEligible: _masteryEligible,
      sourceLineage: _sourceLineage,
      ...generated
    } = body;
    return {
      ...generated,
      masteryEligible: body.masteryEligible,
      parameters: { caseId, difficulty, ...(body.parameters || {}) },
    };
  }
  const drawn = difficulty === 'core'
    ? caseDefinition.generator(seed)
    : drawFamilyInstance(caseDefinition.generator, {
      seed,
      caseId,
      difficulty,
      wantShape: () => true,
      profileAccepts: profileAccepts(caseId, difficulty),
      profiles: DATA_ML_DIFFICULTY_PROFILES,
    });
  return {
    parameters: { caseId, difficulty, ...drawn.parameters },
    expected: { kind: 'integer', value: drawn.expected },
    prompt: drawn.prompt,
    fullSolution: drawn.fullSolution,
    ...(caseDefinition.competencyIds ? { competencyIds: [...caseDefinition.competencyIds] } : {}),
  };
}

export function solveCountRemainingRows(parameters) {
  return FAMILY_DEFINITIONS['count-remaining-rows-cleaning-rule'].solve(parameters);
}

export function generateCountRemainingRowsFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('count-remaining-rows-cleaning-rule', { seed, caseId, difficulty });
}

export function solveFormulaRatioPercentMetric(parameters) {
  return FAMILY_DEFINITIONS['formula-ratio-percent-metric'].solve(parameters);
}

export function generateFormulaRatioPercentMetricFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('formula-ratio-percent-metric', { seed, caseId, difficulty });
}

export function solveMseGradientClosedForm(parameters) {
  return FAMILY_DEFINITIONS['optimize-mse-gradient-closed-form'].solve(parameters);
}

export function generateMseGradientClosedFormFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('optimize-mse-gradient-closed-form', { seed, caseId, difficulty });
}

export function solveFormulaQuadraticErrorMetric(parameters) {
  return FAMILY_DEFINITIONS['formula-quadratic-error-metric'].solve(parameters);
}

export function generateFormulaQuadraticErrorMetricFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('formula-quadratic-error-metric', { seed, caseId, difficulty });
}

export function solveAggregateMajorityRuleCount(parameters) {
  return FAMILY_DEFINITIONS['aggregate-majority-rule-count'].solve(parameters);
}

export function generateAggregateMajorityRuleCountFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('aggregate-majority-rule-count', { seed, caseId, difficulty });
}

export function solveAggregateConfusionMetric(parameters) {
  return FAMILY_DEFINITIONS['aggregate-confusion-metric'].solve(parameters);
}

export function generateAggregateConfusionMetricFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('aggregate-confusion-metric', { seed, caseId, difficulty });
}

export function solveFormulaMetricSpreadRange(parameters) {
  return FAMILY_DEFINITIONS['formula-metric-spread-range'].solve(parameters);
}

export function generateFormulaMetricSpreadRangeFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('formula-metric-spread-range', { seed, caseId, difficulty });
}

export function solveFormulaCountFromConstruction(parameters) {
  return FAMILY_DEFINITIONS['formula-count-from-construction'].solve(parameters);
}

export function generateFormulaCountFromConstructionFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('formula-count-from-construction', { seed, caseId, difficulty });
}

export function solveOptimizeBackpropPathSum(parameters) {
  return FAMILY_DEFINITIONS['optimize-backprop-path-sum'].solve(parameters);
}

export function generateOptimizeBackpropPathSumFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('optimize-backprop-path-sum', { seed, caseId, difficulty });
}

export function solveFormulaStatFromTable(parameters) {
  return FAMILY_DEFINITIONS['formula-stat-from-table'].solve(parameters);
}

export function generateFormulaStatFromTableFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('formula-stat-from-table', { seed, caseId, difficulty });
}

export function solveAggregateTopkRelevanceArithmetic(parameters) {
  return FAMILY_DEFINITIONS['aggregate-topk-relevance-arithmetic'].solve(parameters);
}

export function generateAggregateTopkRelevanceArithmeticFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('aggregate-topk-relevance-arithmetic', { seed, caseId, difficulty });
}

export function solveValidateGoalshiftFlagRules(parameters) {
  return FAMILY_DEFINITIONS['validate-goalshift-flag-rules'].solve(parameters);
}

export function generateValidateGoalshiftFlagRulesFamily({ seed, caseId, difficulty }) {
  return generateDataMlFamily('validate-goalshift-flag-rules', { seed, caseId, difficulty });
}

const COUNT_REMAINING_ROWS_CASE_TYPES = [
  { caseId: 'missing-target-rows', sourceLineage: ['w06-e2'] },
  { caseId: 'duplicate-rows', sourceLineage: ['w06-e6'] },
];

const FORMULA_RATIO_PERCENT_CASE_TYPES = [
  { caseId: 'conditional-count-percent', sourceLineage: ['w07-e2'], competencyIds: ['c-eda-viz'] },
  { caseId: 'r2-explained-share', sourceLineage: ['w10-e3'], competencyIds: ['c-ml-linear'] },
  { caseId: 'subgroup-error-gap-pp', sourceLineage: ['w13-e2'], competencyIds: ['c-ml-erroranalysis'] },
  { caseId: 'ridge-shrinkage-percent', sourceLineage: ['w14-e2'], competencyIds: ['c-ml-regularization'] },
  { caseId: 'pca-explained-variance-percent', sourceLineage: ['w16-e2'], competencyIds: ['c-ml-svm-pca'] },
  {
    caseId: 'compare-systems-metric',
    propertyTest: false,
    sourceLineage: ['w26-e4'],
    competencyIds: ['c-dl-papers', 'c-ml-cv'],
  },
  { caseId: 'allowed-action-count', sourceLineage: ['w30-e2'], competencyIds: ['c-genai-prototype'] },
  {
    caseId: 'ledger-rates-output-trace',
    propertyTest: false,
    sourceLineage: ['w34-e3'],
    competencyIds: ['c-research-capstone', 'c-python-reading'],
  },
  { caseId: 'baseline-ledger-rates', sourceLineage: ['w34-e2'], competencyIds: ['c-research-capstone'] },
  {
    caseId: 'subgroup-recall-output-trace',
    propertyTest: false,
    sourceLineage: ['w37-e3'],
    competencyIds: ['c-capstone-pipeline', 'c-python-reading'],
  },
];

const MSE_GRADIENT_CLOSED_FORM_CASE_TYPES = [
  { caseId: 'mse-gradient-wrt-w' },
  {
    caseId: 'grad-mse-numpy-reference',
    propertyTest: false,
    competencyIds: ['c-grad-regression', 'c-numpy-basics'],
  },
];

const AGGREGATE_MAJORITY_RULE_COUNT_CASE_TYPES = [
  { caseId: 'majority-baseline-errors', sourceLineage: ['w09-e2'] },
  { caseId: 'ensemble-majority-output-count', sourceLineage: ['w15-e2'], competencyIds: ['c-ml-ensembles'] },
];

const FORMULA_QUADRATIC_ERROR_CASE_TYPES = [
  { caseId: 'rmse-unit-from-mse', propertyTest: false },
  { caseId: 'mse-from-residuals', sourceLineage: ['w10-e2'] },
];

const AGGREGATE_CONFUSION_METRIC_CASE_TYPES = [
  { caseId: 'confusion-marginal-count', sourceLineage: ['w11-e2'] },
  { caseId: 'threshold-under-asymmetric-cost', propertyTest: false },
  { caseId: 'sigmoid-predict-numpy', propertyTest: false },
  { caseId: 'confusion-cost-report', propertyTest: false },
  { caseId: 'answer-filter-precision-recall-f1', sourceLineage: ['w28-e2'], competencyIds: ['c-genai-eval'] },
  { caseId: 'injection-filter-counts', sourceLineage: ['w29-e2'], competencyIds: ['c-genai-security'] },
  { caseId: 'subgroup-rate-gap-permille', sourceLineage: ['w33-e2'], competencyIds: ['c-research-responsible'] },
  { caseId: 'metric-code-output-trace', propertyTest: false },
  { caseId: 'confusion-from-rows', propertyTest: false },
  { caseId: 'contains-injection-rules', propertyTest: false },
  { caseId: 'fairness-metric-compare', propertyTest: false },
];

const FORMULA_METRIC_SPREAD_RANGE_CASE_TYPES = [
  { caseId: 'cv-fold-accuracy-spread', sourceLineage: ['w12-e2', 'w17-e2'] },
  {
    caseId: 'seed-rerun-accuracy-spread',
    competencyIds: ['c-ml-repro', 'c-ml-cv'],
  },
];

const FORMULA_COUNT_FROM_CONSTRUCTION_CASE_TYPES = [
  { caseId: 'linear-param-count', sourceLineage: ['w18-e2'], competencyIds: ['c-dl-tensors'] },
  { caseId: 'sgd-update-count', sourceLineage: ['w20-e2'], competencyIds: ['c-dl-training'] },
  { caseId: 'dropout-mask-kept-count', sourceLineage: ['w21-e2'], competencyIds: ['c-dl-regularization'] },
  { caseId: 'attention-tensor-cells', sourceLineage: ['w22-e2'], competencyIds: ['c-dl-attention'] },
  { caseId: 'bpe-vocab-size', sourceLineage: ['w23-e2'], competencyIds: ['c-dl-tokenizer'] },
  { caseId: 'lora-param-count', sourceLineage: ['w25-e2'], competencyIds: ['c-dl-finetuning'] },
];

const FORMULA_STAT_FROM_TABLE_CASE_TYPES = [
  { caseId: 'greedy-step-stat', sourceLineage: ['w24-e2'], competencyIds: ['c-dl-inference'] },
  { caseId: 'paper-gain-from-counts', sourceLineage: ['w26-e2'], competencyIds: ['c-dl-papers'] },
  { caseId: 'card-audit-missing-count', sourceLineage: ['w32-e2'], competencyIds: ['c-research-cards'] },
  { caseId: 'pipeline-stage-audit', sourceLineage: ['w35-e2'], competencyIds: ['c-capstone-pipeline', 'c-ml-repro'] },
  { caseId: 'stage-timeout-count', propertyTest: false, sourceLineage: ['w36-e2'], competencyIds: ['c-capstone-pipeline', 'c-python-functions'] },
  { caseId: 'dependency-pin-count', propertyTest: false, sourceLineage: ['w38-e2'], competencyIds: ['c-capstone-pipeline', 'c-ml-repro'] },
  { caseId: 'eval-batch-rates', sourceLineage: ['w37-e2'], competencyIds: ['c-capstone-pipeline', 'c-genai-security'] },
];

const AGGREGATE_TOPK_RELEVANCE_CASE_TYPES = [
  { caseId: 'recall-at-k-window', sourceLineage: ['w27-e2'], competencyIds: ['c-genai-rag'] },
];

const VALIDATE_GOALSHIFT_CASE_TYPES = [
  { caseId: 'protocol-shift-flag-count', sourceLineage: ['w31-e2'], competencyIds: ['c-research-question'] },
  {
    caseId: 'detect-goal-shift',
    propertyTest: false,
    sourceLineage: ['w31-e6'],
    competencyIds: ['c-research-question', 'c-python-functions'],
  },
];

const OPTIMIZE_BACKPROP_PATH_SUM_CASE_TYPES = [
  { caseId: 'chain-rule-path-sum', sourceLineage: ['w19-e2'], competencyIds: ['c-dl-autograd'] },
];

export const COUNT_REMAINING_ROWS_CONTRACT = {
  familyId: 'count-remaining-rows-cleaning-rule',
  familyGroup: 'aggregate-count',
  summary: 'Berechnet nach Missingness- oder Duplikatregeln die Zahl der verbleibenden Datenzeilen.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: COUNT_REMAINING_ROWS_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-pandas-cleaning'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const FORMULA_RATIO_PERCENT_CONTRACT = {
  familyId: 'formula-ratio-percent-metric',
  familyGroup: 'formula-apply',
  summary: 'Wendet Verhältnis- und Prozentmetriken (bedingte Anteile, R²) als geschlossene Formel auf gezählte Größen an.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: FORMULA_RATIO_PERCENT_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-eda-viz', 'c-dl-papers', 'c-ml-cv'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const MSE_GRADIENT_CLOSED_FORM_CONTRACT = {
  familyId: 'optimize-mse-gradient-closed-form',
  familyGroup: 'optimize-update',
  summary: 'Leitet den MSE-Gradienten nach w her und prüft ihn gegen eine NumPy-Referenz.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: MSE_GRADIENT_CLOSED_FORM_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-grad-regression'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const AGGREGATE_MAJORITY_RULE_COUNT_CONTRACT = {
  familyId: 'aggregate-majority-rule-count',
  familyGroup: 'aggregate-count',
  summary: 'Zählt Vorkommen über Vorhersage- oder Labelmengen, wendet die Mehrheitsregel an und gibt die erfragte Anzahl oder den Anteil an.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: AGGREGATE_MAJORITY_RULE_COUNT_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-ml-baseline'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const FORMULA_QUADRATIC_ERROR_CONTRACT = {
  familyId: 'formula-quadratic-error-metric',
  familyGroup: 'formula-apply',
  summary: 'Berechnet quadratische Fehlermaße und ordnet ihre Einheit korrekt ein.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: FORMULA_QUADRATIC_ERROR_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-ml-linear'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const AGGREGATE_CONFUSION_METRIC_CONTRACT = {
  familyId: 'aggregate-confusion-metric',
  familyGroup: 'aggregate-count',
  summary: 'Erschließt Konfusionsmetriken aus {TP, FP, FN, TN} und bewertet Fehlerkosten und Schwellen.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: AGGREGATE_CONFUSION_METRIC_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-ml-logistic', 'c-genai-eval', 'c-genai-security', 'c-research-responsible'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const FORMULA_METRIC_SPREAD_RANGE_CONTRACT = {
  familyId: 'formula-metric-spread-range',
  familyGroup: 'formula-apply',
  summary: 'Berechnet die Spannweite von Metrikwerten über Folds oder Läufe als Stabilitätskennzahl in Prozentpunkten.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: FORMULA_METRIC_SPREAD_RANGE_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-ml-cv'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const FORMULA_COUNT_FROM_CONSTRUCTION_CONTRACT = {
  familyId: 'formula-count-from-construction',
  familyGroup: 'formula-apply',
  summary: 'Bestimmt eine Anzahl direkt aus der Konstruktion eines Objekts statt aus Messung.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: FORMULA_COUNT_FROM_CONSTRUCTION_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: [
    'c-dl-tensors',
    'c-dl-training',
    'c-dl-regularization',
    'c-dl-attention',
    'c-dl-tokenizer',
    'c-dl-finetuning',
  ],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const FORMULA_STAT_FROM_TABLE_CONTRACT = {
  familyId: 'formula-stat-from-table',
  familyGroup: 'formula-apply',
  summary: 'Berechnet eine Kennzahl aus einer gegebenen Datentabelle über eine geschlossene Formel.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: FORMULA_STAT_FROM_TABLE_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-dl-inference', 'c-dl-papers', 'c-research-cards'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const AGGREGATE_TOPK_RELEVANCE_CONTRACT = {
  familyId: 'aggregate-topk-relevance-arithmetic',
  familyGroup: 'aggregate-count',
  summary: 'Berechnet Recall@k, fehlende relevante Dokumente oder irrelevante Treffer aus Rankingfenstern.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: AGGREGATE_TOPK_RELEVANCE_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-genai-rag'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const VALIDATE_GOALSHIFT_CONTRACT = {
  familyId: 'validate-goalshift-flag-rules',
  familyGroup: 'validate-contract',
  summary: 'Zählt protokollierte Änderungen zwischen Versionen und prüft Goal-Shift-Detektoren.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: VALIDATE_GOALSHIFT_CASE_TYPES,
  difficultyProfiles: [...DATA_ML_DIFFICULTY_PROFILES, 'challenge'],
  competencyIds: ['c-research-question', 'c-python-functions'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const OPTIMIZE_BACKPROP_PATH_SUM_CONTRACT = {
  familyId: 'optimize-backprop-path-sum',
  familyGroup: 'optimize-update',
  summary: 'Berechnet den Gesamtgradienten eines Knotens als Summe der Pfadprodukte über parallele Kettenregel-Zweige.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: OPTIMIZE_BACKPROP_PATH_SUM_CASE_TYPES,
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-dl-autograd'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const DATA_ML_FAMILY_SPECS = [
  {
    ...COUNT_REMAINING_ROWS_CONTRACT,
    generate: generateCountRemainingRowsFamily,
    solve: solveCountRemainingRows,
  },
  {
    ...FORMULA_RATIO_PERCENT_CONTRACT,
    generate: generateFormulaRatioPercentMetricFamily,
    solve: solveFormulaRatioPercentMetric,
  },
  {
    ...MSE_GRADIENT_CLOSED_FORM_CONTRACT,
    generate: generateMseGradientClosedFormFamily,
    solve: solveMseGradientClosedForm,
  },
  {
    ...AGGREGATE_MAJORITY_RULE_COUNT_CONTRACT,
    generate: generateAggregateMajorityRuleCountFamily,
    solve: solveAggregateMajorityRuleCount,
  },
  {
    ...FORMULA_QUADRATIC_ERROR_CONTRACT,
    generate: generateFormulaQuadraticErrorMetricFamily,
    solve: solveFormulaQuadraticErrorMetric,
  },
  {
    ...AGGREGATE_CONFUSION_METRIC_CONTRACT,
    generate: generateAggregateConfusionMetricFamily,
    solve: solveAggregateConfusionMetric,
  },
  {
    ...FORMULA_METRIC_SPREAD_RANGE_CONTRACT,
    generate: generateFormulaMetricSpreadRangeFamily,
    solve: solveFormulaMetricSpreadRange,
  },
  {
    ...FORMULA_COUNT_FROM_CONSTRUCTION_CONTRACT,
    generate: generateFormulaCountFromConstructionFamily,
    solve: solveFormulaCountFromConstruction,
  },
  {
    ...FORMULA_STAT_FROM_TABLE_CONTRACT,
    generate: generateFormulaStatFromTableFamily,
    solve: solveFormulaStatFromTable,
  },
  {
    ...OPTIMIZE_BACKPROP_PATH_SUM_CONTRACT,
    generate: generateOptimizeBackpropPathSumFamily,
    solve: solveOptimizeBackpropPathSum,
  },
  {
    ...AGGREGATE_TOPK_RELEVANCE_CONTRACT,
    generate: ({ seed, caseId, difficulty }) => generateDataMlFamily('aggregate-topk-relevance-arithmetic', { seed, caseId, difficulty }),
    solve: (parameters) => FAMILY_DEFINITIONS['aggregate-topk-relevance-arithmetic'].solve(parameters),
  },
  {
    ...VALIDATE_GOALSHIFT_CONTRACT,
    generate: ({ seed, caseId, difficulty }) => generateDataMlFamily('validate-goalshift-flag-rules', { seed, caseId, difficulty }),
    solve: (parameters) => FAMILY_DEFINITIONS['validate-goalshift-flag-rules'].solve(parameters),
  },
];
