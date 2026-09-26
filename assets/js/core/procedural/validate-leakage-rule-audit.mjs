// Procedural family validate-leakage-rule-audit: the task text, starter code
// and reference solver stay fixed; the seed draws fresh pipelines (dict steps
// for the stretch case, plain action strings for the challenge case) that get
// appended to the curated base test block as literal __check lines. Expected
// values are asserted inline against a __ref_ copy of the reference solver,
// so the grading contract cannot drift. Mirrors palindromExtraCases in
// foundations_construct_families.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt } from '../generator_draw_kit.mjs';
import { pyLit, refCopy } from './py_test_kit.mjs';
import doc from '../../../../content/families/validate-leakage-rule-audit.json' with { type: 'json' };

const anchor = (caseId) => doc.cases.find((entry) => entry.caseId === caseId);
const AUDIT_REFERENCE = anchor('pipeline-leakage-audit').expected.referenceSolver;

const SPLIT_REFERENCE = anchor('pipeline-clean-split').expected.referenceSolver;

// Draw banks: clean strings contain at most one marker of each AND-rule and
// never 'alle zeilen'; leak strings each trigger at least one rule. The
// __ref_ oracle decides, so any mixture is contract-true.
const CLEAN_ACTIONS = [
  'Deterministischer Train/Test-Split mit Seed',
  'Mittelwert der Train-Spalten als Fill-Wert',
  'Modell auf Train gefittet',
  'Bewertung auf Test',
  'Cross-Validation ueber fuenf Folds',
  'Feature-Selektion auf Train',
  'Ziel-Verteilung der Train-Daten geprueft',
  'Imputation auf Train gefittet',
  'Test-Metriken in den Bericht geschrieben',
  'Kalendarischer Split nach Datum',
  'fit model on train features',
  'score on test rows',
];

const LEAK_ACTIONS = [
  'Ziel-Spalte als Feature uebernommen',
  'Ziel-Mittelwert als Feature eingefuegt',
  'Feature aus Ziel-Transformation abgeleitet',
  'Standardisierung ueber alle Zeilen',
  'Skalierung ueber alle Zeilen berechnet',
  'Imputation ueber alle Zeilen gelernt',
  'Transformation auf Test neu gefittet',
  'Scorer auf dem Test-Set gefittet',
  'Kalibrierung auf Testdaten gefittet',
  'fit model on test features',
];

const STEP_NAMES = ['split', 'scale', 'impute', 'fit', 'report', 'engineer', 'valid', 'build', 'score', 'select'];

const drawActions = (r, len) => Array.from(
  { length: len },
  () => (r() < 0.4 ? pick(r, LEAK_ACTIONS) : pick(r, CLEAN_ACTIONS)),
);

export const LEAKAGE_AUDIT_CASES = {
  'pipeline-leakage-audit': {
    difficulty: 'stretch',
    prelude: refCopy(AUDIT_REFERENCE, ['audit_pipeline']),
    draw(r) {
      const len = randInt(r, 3, 6);
      const steps = drawActions(r, len).map((action) => ({ step: pick(r, STEP_NAMES), action }));
      return { steps };
    },
    emit({ steps }, index) {
      return [
        `__steps${index} = ${pyLit(steps)}`,
        `__check('seeded audit ${index}', audit_pipeline(__steps${index}) == __ref_audit_pipeline(__steps${index}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'pipeline-clean-split': {
    difficulty: 'challenge',
    prelude: refCopy(SPLIT_REFERENCE, ['audit_pipeline']),
    draw(r) {
      return { steps: drawActions(r, randInt(r, 3, 6)) };
    },
    emit({ steps }, index) {
      return [
        `__steps${index} = ${pyLit(steps)}`,
        `__check('seeded audit ${index}', audit_pipeline(__steps${index}) == __ref_audit_pipeline(__steps${index}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const LEAKAGE_AUDIT_CONTRACT = {
  familyId: 'validate-leakage-rule-audit',
  familyGroup: 'validate-contract',
  summary: 'Prüft Pipelines auf Ziel-, Statistik- und Test-Leakage.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'pipeline-leakage-audit', propertyTest: false },
    { caseId: 'pipeline-clean-split', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'challenge'],
  competencyIds: ['c-ml-cv'],
};

// The per-case prelude (renamed reference copy) is emitted once at the top of
// the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: LEAKAGE_AUDIT_CONTRACT,
  cases: LEAKAGE_AUDIT_CASES,
  shapeError: 'Leakage-Audit-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${[
      caseDef.prelude,
      ...seedCases.map((entry, i) => caseDef.emit(entry, i + 1)),
    ].join('\n\n')}`,
});

