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

export const DATA_ML_DIFFICULTY_PROFILES = ['intro', 'core', 'stretch'];

function profileAccepts(caseId, difficulty) {
  if (difficulty === 'core') return null;
  if (caseId === 'missing-target-rows') {
    if (difficulty === 'intro') return (parameters) => parameters.framing === 'drop';
    if (difficulty === 'stretch') return (parameters) => parameters.framing === 'rate';
  }
  if (caseId === 'duplicate-rows') {
    if (difficulty === 'intro') return (parameters) => !parameters.dropKey && parameters.keyConflicts === 0;
    if (difficulty === 'stretch') return (parameters) => parameters.dropKey;
  }
  if (caseId === 'conditional-count-percent') {
    if (difficulty === 'intro') return (parameters) => parameters.direction === 'count';
    if (difficulty === 'stretch') return (parameters) => parameters.direction === 'percent';
  }
  if (caseId === 'subgroup-error-gap-pp') {
    if (difficulty === 'intro') return (parameters) => parameters.n === 100;
    if (difficulty === 'stretch') return (parameters) => parameters.n === 20 || parameters.n === 25;
  }
  if (caseId === 'ridge-shrinkage-percent') {
    if (difficulty === 'intro') return (parameters) => parameters.phrasing === 'share';
    if (difficulty === 'stretch') return (parameters) => parameters.phrasing === 'shrink';
  }
  if (caseId === 'mse-gradient-wrt-w') {
    if (difficulty === 'intro') return (parameters) => parameters.n === 2;
    if (difficulty === 'stretch') return (parameters) => parameters.n === 4;
  }
  if (caseId === 'majority-baseline-errors') {
    if (difficulty === 'intro') {
      return (parameters) => {
        const counts = [...parameters.counts].sort((a, b) => b - a);
        return counts[0] >= 2 * counts[1];
      };
    }
    if (difficulty === 'stretch') {
      return (parameters) => {
        const counts = [...parameters.counts].sort((a, b) => b - a);
        return counts[0] - counts[1] <= 10;
      };
    }
  }
  if (caseId === 'ensemble-majority-output-count') {
    if (difficulty === 'intro') return (parameters) => parameters.direction === 'count';
    if (difficulty === 'stretch') return (parameters) => parameters.direction === 'percent';
  }
  if (caseId === 'mse-from-residuals') {
    if (difficulty === 'intro') return (parameters) => parameters.n <= 3;
    if (difficulty === 'stretch') return (parameters) => parameters.n >= 5;
  }
  if (caseId === 'r2-explained-share') {
    if (difficulty === 'intro') return (parameters) => parameters.phrasing === 'r2';
    if (difficulty === 'stretch') return (parameters) => parameters.phrasing === 'context';
  }
  if (caseId === 'confusion-marginal-count') {
    if (difficulty === 'intro') return (parameters) => parameters.metric === 'predicted-pos';
    if (difficulty === 'stretch') return (parameters) => parameters.metric === 'actual-neg';
  }
  if (caseId === 'cv-fold-accuracy-spread') {
    if (difficulty === 'intro') return (parameters) => parameters.k === 4;
    if (difficulty === 'stretch') return (parameters) => parameters.k === 10;
  }
  if (caseId === 'seed-rerun-accuracy-spread') {
    if (difficulty === 'intro') {
      return (parameters) => parameters.unit === 'percent' && parameters.runs === 3;
    }
    if (difficulty === 'stretch') return (parameters) => parameters.unit === 'fraction';
  }
  if (caseId === 'pca-explained-variance-percent') {
    if (difficulty === 'intro') return (parameters) => parameters.total === 50;
    if (difficulty === 'stretch') return (parameters) => parameters.total === 25;
  }
  if (caseId === 'linear-param-count') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'single';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'compare';
  }
  if (caseId === 'sgd-update-count') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'epochs';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'until' || parameters.variant === 'momentum';
  }
  if (caseId === 'dropout-mask-kept-count') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'kept';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'both';
  }
  if (caseId === 'chain-rule-path-sum') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'path';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'fork';
  }
  if (caseId === 'attention-tensor-cells') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'score-cells';
    if (difficulty === 'stretch') {
      return (parameters) => parameters.variant === 'mask-cells' || parameters.variant === 'scale-divisor';
    }
  }
  if (caseId === 'bpe-vocab-size') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'total';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'merges-needed';
  }
  if (caseId === 'lora-param-count') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'lora';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'saved';
  }
  if (caseId === 'greedy-step-stat') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'argmax-position';
    if (difficulty === 'stretch') return (parameters) => parameters.variant === 'decode-length';
  }
  if (caseId === 'paper-gain-from-counts') {
    if (difficulty === 'intro') return (parameters) => parameters.variant === 'count-gain';
    if (difficulty === 'stretch') {
      return (parameters) => parameters.variant === 'relative-percent' || parameters.variant === 'error-reduction';
    }
  }
  throw new Error(`Unbekanntes Profil ${difficulty}`);
}

function staticExpected(familyId, parameters) {
  const expected = staticCaseBody(familyId, parameters.caseId).expected || {};
  if (Object.hasOwn(expected, 'value')) return { value: expected.value };
  if (Object.hasOwn(expected, 'output')) return { output: expected.output };
  if (expected.kind === 'rubric') return { kind: 'rubric' };
  return {};
}

function decimalFraction(value) {
  const text = String(value);
  if (!text.includes('.')) return { numerator: BigInt(text), denominator: 1n };
  const [whole, fraction] = text.split('.');
  const denominator = 10n ** BigInt(fraction.length);
  const sign = whole.startsWith('-') ? -1n : 1n;
  const absoluteWhole = whole.replace('-', '');
  return {
    numerator: sign * (BigInt(absoluteWhole) * denominator + BigInt(fraction)),
    denominator,
  };
}

function exactPercent(numeratorValue, denominatorValue) {
  const numerator = decimalFraction(numeratorValue);
  const denominator = decimalFraction(denominatorValue);
  const scaledNumerator = numerator.numerator * 100n * denominator.denominator;
  const scaledDenominator = numerator.denominator * denominator.numerator;
  if (scaledNumerator % scaledDenominator === 0n) {
    return Number(scaledNumerator / scaledDenominator);
  }
  return Number(scaledNumerator) / Number(scaledDenominator);
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
    },
    solve(parameters) {
      if (parameters.caseId === 'compare-systems-metric') {
        return staticExpected('formula-ratio-percent-metric', parameters);
      }
      if (parameters.caseId === 'ridge-shrinkage-percent') {
        const share = (100 * parameters.sxx) / (parameters.sxx + parameters.lam);
        return { value: parameters.phrasing === 'shrink' ? 100 - share : share };
      }
      if (parameters.caseId === 'subgroup-error-gap-pp') {
        return { value: (100 * Math.abs(parameters.e1 - parameters.e2)) / parameters.n };
      }
      if (parameters.caseId === 'r2-explained-share') {
        return { value: 100 - (100 * parameters.ssRes) / parameters.ssTot };
      }
      if (parameters.caseId === 'pca-explained-variance-percent') {
        return {
          value: (100 * parameters.lambda1)
            / (parameters.lambda1 + parameters.lambda2 + parameters.lambda3),
        };
      }
      if (parameters.direction === 'count') return { value: (parameters.nA * parameters.p) / parameters.q };
      return { value: (100 * parameters.c) / parameters.n };
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
    },
    solve(parameters) {
      if (parameters.caseId === 'confusion-marginal-count') {
        const value = parameters.metric === 'actual-neg'
          ? parameters.tn + parameters.fp
          : parameters.metric === 'predicted-pos'
            ? parameters.tp + parameters.fp
            : parameters.tp + parameters.fn;
        return { value };
      }
      return staticExpected('aggregate-confusion-metric', parameters);
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
      if (parameters.caseId === 'linear-param-count') {
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
      }
      if (parameters.caseId === 'sgd-update-count') {
        if (parameters.variant === 'plain') {
          return { value: parameters.descending ? parameters.w0 - parameters.n * parameters.step : parameters.w0 + parameters.n * parameters.step };
        }
        if (parameters.variant === 'epochs') return { value: parameters.epochs * Math.ceil(parameters.n / parameters.batch) };
        if (parameters.variant === 'until') return { value: Math.ceil((parameters.w0 - parameters.target) / parameters.step) };
        return { value: 2 * parameters.g - parameters.g / 2 ** (parameters.n - 1) };
      }
      if (parameters.caseId === 'dropout-mask-kept-count') {
        if (parameters.variant === 'kept') return { value: parameters.mask.filter(Boolean).length };
        if (parameters.variant === 'dropped') return { value: parameters.n - parameters.mask.filter(Boolean).length };
        return {
          value: parameters.mask1.reduce((count, value, index) => count + (value && parameters.mask2[index] ? 1 : 0), 0),
        };
      }
      if (parameters.caseId === 'attention-tensor-cells') {
        if (parameters.variant === 'score-cells') return { value: parameters.n * parameters.m };
        if (parameters.variant === 'output-cells') return { value: parameters.n * parameters.dv };
        if (parameters.variant === 'mask-cells') return { value: (parameters.n * (parameters.n - 1)) / 2 };
        return { value: Math.sqrt(parameters.dk) };
      }
      if (parameters.caseId === 'bpe-vocab-size') {
        if (parameters.variant === 'total') {
          return { value: parameters.chars + parameters.merges + parameters.specials };
        }
        if (parameters.variant === 'merges-needed') {
          return { value: parameters.target - parameters.chars - parameters.specials };
        }
        return { value: parameters.target - parameters.chars - parameters.merges };
      }
      if (parameters.caseId === 'lora-param-count') {
        const lora = parameters.rank * (parameters.dIn + parameters.dOut);
        if (parameters.variant === 'lora') return { value: lora };
        if (parameters.variant === 'full') return { value: parameters.dIn * parameters.dOut };
        return { value: parameters.dIn * parameters.dOut - lora };
      }
      throw new Error(`formula-count-from-construction: unbekannter Fall ${parameters.caseId}`);
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
    },
    solve(parameters) {
      if (parameters.caseId === 'greedy-step-stat') {
        if (parameters.variant === 'argmax-position') {
          return { value: 1 + parameters.logits.indexOf(Math.max(...parameters.logits)) };
        }
        if (parameters.variant === 'margin') {
          const sorted = [...parameters.logits].sort((left, right) => right - left);
          return { value: sorted[0] - sorted[1] };
        }
        return { value: parameters.init + parameters.steps };
      }
      if (parameters.variant === 'count-gain') return { value: parameters.c2 - parameters.c1 };
      if (parameters.variant === 'relative-percent') {
        return { value: exactPercent(parameters.newer - parameters.base, parameters.base) };
      }
      if (parameters.variant === 'error-reduction') {
        return { value: exactPercent(parameters.eBase - parameters.eNew, parameters.eBase) };
      }
      return { value: parameters.newer - parameters.base };
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
  competencyIds: ['c-ml-logistic'],
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
  competencyIds: ['c-dl-inference', 'c-dl-papers'],
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
];
