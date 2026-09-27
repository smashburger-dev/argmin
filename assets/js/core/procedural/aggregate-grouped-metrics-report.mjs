// Procedural family aggregate-grouped-metrics-report: the task text, starter
// code and reference solver stay fixed; the seed draws fresh grouped fixtures
// (metric pairs with two-group labels, error-rate tables, error categorization
// records, recall rows) that get appended to the curated base test block as
// literal __check lines. Every drawn expectation is evaluated against a
// renamed __ref_ copy of the reference solver and __raised covers the
// ValueError paths, so the grading contract cannot drift. Mirrors
// reproduce-seeded-split.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/aggregate-grouped-metrics-report.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/aggregate-grouped-metrics-report.json.
const CASE_PAYLOADS = {
  "hypothesis-report-groups": { "difficulty": "stretch", },
  "subgroup-error-rates-numpy": { "difficulty": "core", "competencyIds": ["c-ml-erroranalysis"] },
  "categorize-errors-report": { "difficulty": "stretch", "competencyIds": ["c-ml-erroranalysis"] },
  "subgroup-recall-report": { "difficulty": "core", "competencyIds": ["c-capstone-pipeline","c-genai-security"] },
};

// Draw pools: two-group label pairs for the hypothesis report, small group
// sets for the error-rate / categorization tables and recall rows in the
// subgroup-report register. All pools stay quote- and backslash-free.
const GROUP_PAIRS = [['ctrl', 'test'], ['a', 'b'], ['nah', 'fern'], ['nord', 'sued']];
const GROUP_SETS = [['A', 'B', 'C'], ['X', 'Y'], ['A', 'B'], ['K', 'L', 'M']];
const KIND_SETS = [
  ['drift', 'label_noise', 'subgroup'],
  ['drift', 'subgroup'],
  ['label_noise', 'subgroup'],
  ['drift', 'label_noise'],
];
const RECALL_LABEL_SETS = [
  ['versand', 'recht', 'rabatt', 'garantie'],
  ['versand', 'recht'],
  ['rabatt', 'garantie', 'versand'],
  ['recht', 'rabatt'],
];

// Half-step floats keep the emitted literals short and exactly representable;
// the last element is bumped when a draw lands on a constant series so
// np.corrcoef never produces NaN on the seeded probes.
const half = (r) => randInt(r, -6, 16) / 2;

const ensureVarying = (values) => {
  if (new Set(values).size === 1) values[values.length - 1] = values[0] + 1;
  return values;
};

export const GROUPED_CASES = {
  'hypothesis-report-groups': {
    ...CASE_PAYLOADS['hypothesis-report-groups'],
    refNames: ['hypothesis_report'],
    // Two-group labels over n rows plus half-step metric draws; the bad probe
    // alternates between the length-mismatch and the single-group arm.
    draw(r) {
      const n = randInt(r, 4, 8);
      const pair = pick(r, GROUP_PAIRS);
      const labels = Array.from({ length: n }, () => pick(r, pair));
      if (!labels.includes(pair[0])) labels[0] = pair[0];
      if (!labels.includes(pair[1])) labels[1] = pair[1];
      const a = ensureVarying(Array.from({ length: n }, () => half(r)));
      const b = ensureVarying(Array.from({ length: n }, () => half(r)));
      const bad = r() < 0.5
        ? { a, b: b.slice(0, n - 1), labels }
        : { a, b, labels: labels.map(() => pair[0]) };
      return { a, b, labels, bad };
    },
    emit(entry, index) {
      const p = `__hr${index}`;
      return [
        `${p}_a = ${pyLit(entry.a)}`,
        `${p}_b = ${pyLit(entry.b)}`,
        `${p}_l = ${pyLit(entry.labels)}`,
        `__check('seeded report ${index}', hypothesis_report(${p}_a, ${p}_b, ${p}_l) == __ref_hypothesis_report(${p}_a, ${p}_b, ${p}_l))`,
        `${p}_bad = ${pyLit(entry.bad)}`,
        `__check('seeded report fehler ${index}', __raised(hypothesis_report, ${p}_bad["a"], ${p}_bad["b"], ${p}_bad["labels"]) == __raised(__ref_hypothesis_report, ${p}_bad["a"], ${p}_bad["b"], ${p}_bad["labels"]))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'subgroup-error-rates-numpy': {
    ...CASE_PAYLOADS['subgroup-error-rates-numpy'],
    competencyIds: ['c-ml-erroranalysis'],
    refNames: ['subgroup_error_rates', 'largest_gap'],
    // Binary y_true/y_pred over a drawn group assignment plus a truncated
    // y_pred for the length-mismatch ValueError arm.
    draw(r) {
      const n = randInt(r, 4, 10);
      const groups = pick(r, GROUP_SETS);
      const gl = Array.from({ length: n }, () => pick(r, groups));
      if (new Set(gl).size === 1) gl[n - 1] = groups.find((g) => g !== gl[0]);
      const yt = Array.from({ length: n }, () => randInt(r, 0, 1));
      const yp = Array.from({ length: n }, () => randInt(r, 0, 1));
      return { yt, yp, gl, badPred: yp.slice(0, n - 1) };
    },
    emit(entry, index) {
      const p = `__er${index}`;
      return [
        `${p}_t = ${pyLit(entry.yt)}`,
        `${p}_p = ${pyLit(entry.yp)}`,
        `${p}_g = ${pyLit(entry.gl)}`,
        `__check('seeded rates ${index}', subgroup_error_rates(${p}_t, ${p}_p, ${p}_g) == __ref_subgroup_error_rates(${p}_t, ${p}_p, ${p}_g))`,
        `${p}_rates = __ref_subgroup_error_rates(${p}_t, ${p}_p, ${p}_g)`,
        `__check('seeded gap ${index}', largest_gap(${p}_rates) == __ref_largest_gap(${p}_rates))`,
        `__check('seeded rates fehler ${index}', __raised(subgroup_error_rates, ${p}_t, ${pyLit(entry.badPred)}, ${p}_g) == __raised(__ref_subgroup_error_rates, ${p}_t, ${pyLit(entry.badPred)}, ${p}_g))`,
        `__check('seeded gap leer ${index}', __raised(largest_gap, {}) == __raised(__ref_largest_gap, {}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'categorize-errors-report': {
    ...CASE_PAYLOADS['categorize-errors-report'],
    competencyIds: ['c-ml-erroranalysis'],
    refNames: ['categorize_errors', 'model_card_stub'],
    // Error dicts over drawn kind/group sets plus a metrics dict for the
    // model card; the bad probe alternates between a missing-key record and
    // the empty list.
    draw(r) {
      const kinds = pick(r, KIND_SETS);
      const groups = pick(r, GROUP_SETS);
      const count = randInt(r, 5, 9);
      const errors = Array.from({ length: count }, (_, j) => ({
        id: j + 1,
        kind: pick(r, kinds),
        group: pick(r, groups),
      }));
      const metrics = {};
      for (const g of groups) metrics[g] = randInt(r, 1, 10) / 10;
      const bad = r() < 0.5 ? [] : [{ id: 99, kind: pick(r, kinds) }];
      return { errors, metrics, bad };
    },
    emit(entry, index) {
      const p = `__ce${index}`;
      return [
        `${p}_err = ${pyLit(entry.errors)}`,
        `__check('seeded kategorien ${index}', categorize_errors(${p}_err) == __ref_categorize_errors(${p}_err))`,
        `${p}_met = ${pyLit(entry.metrics)}`,
        `__check('seeded karte ${index}', model_card_stub(${p}_met) == __ref_model_card_stub(${p}_met))`,
        `__check('seeded kategorien fehler ${index}', __raised(categorize_errors, ${pyLit(entry.bad)}) == __raised(__ref_categorize_errors, ${pyLit(entry.bad)}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'subgroup-recall-report': {
    ...CASE_PAYLOADS['subgroup-recall-report'],
    competencyIds: ['c-capstone-pipeline', 'c-genai-security'],
    refNames: ['subgroup_recall'],
    // Recall rows over drawn subgroup labels; some records drop the subgroup
    // key so the "alle" fallback is exercised.
    draw(r) {
      const labels = pick(r, RECALL_LABEL_SETS);
      const count = randInt(r, 4, 8);
      const recs = Array.from({ length: count }, () => {
        const rec = { recall: randInt(r, 0, 4) / 4 };
        if (r() < 0.85) rec.subgroup = pick(r, labels);
        return rec;
      });
      return { recs };
    },
    emit(entry, index) {
      const p = `__sr${index}`;
      return [
        `${p}_d = ${pyLit(entry.recs)}`,
        `__check('seeded recall ${index}', subgroup_recall(${p}_d) == __ref_subgroup_recall(${p}_d))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const GROUPED_CONTRACT = {
  familyId: 'aggregate-grouped-metrics-report',
  familyGroup: 'aggregate-count',
  summary: 'Berechnet gruppenweise Kennzahlen und Anteile und füllt daraus einen strukturierten Bericht ohne Kausaldeutung.',
  taskArchetype: 'code-test',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'hypothesis-report-groups', propertyTest: false },
    { caseId: 'subgroup-error-rates-numpy', propertyTest: false },
    { caseId: 'categorize-errors-report', propertyTest: false },
    { caseId: 'subgroup-recall-report', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-capstone-pipeline', 'c-genai-security', 'c-ml-erroranalysis'],
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: GROUPED_CONTRACT,
  cases: GROUPED_CASES,
  shapeError: 'Gruppen-Kennzahlen-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n')}`,
});

