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
  genSubgroupGapPp,
  genShrinkagePercent,
  genMseFromResiduals,
  genMseGradient,
  genR2Share,
} from './data_ml_generators.mjs';

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
  throw new Error(`Unbekanntes Profil ${difficulty}`);
}

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
    },
    solve(parameters) {
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
    },
    solve(parameters) {
      return {
        value: Math.max(...parameters.scores) - Math.min(...parameters.scores),
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

const COUNT_REMAINING_ROWS_CASE_TYPES = [
  { caseId: 'missing-target-rows', sourceLineage: ['w06-e2'] },
  { caseId: 'duplicate-rows', sourceLineage: ['w06-e6'] },
];

const FORMULA_RATIO_PERCENT_CASE_TYPES = [
  { caseId: 'conditional-count-percent', sourceLineage: ['w07-e2'], competencyIds: ['c-eda-viz'] },
  { caseId: 'r2-explained-share', sourceLineage: ['w10-e3'], competencyIds: ['c-ml-linear'] },
  { caseId: 'subgroup-error-gap-pp', sourceLineage: ['w13-e2'], competencyIds: ['c-ml-erroranalysis'] },
  { caseId: 'ridge-shrinkage-percent', sourceLineage: ['w14-e2'], competencyIds: ['c-ml-regularization'] },
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
  { caseId: 'cv-fold-accuracy-spread', sourceLineage: ['w12-e2'] },
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
  competencyIds: ['c-eda-viz'],
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
];
