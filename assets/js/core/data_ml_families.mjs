// S4D8 data-cleaning family contracts. The seeded cases reuse the canonical
// W06 generators; this module only supplies profile filtering and family
// instance shape.

import { drawFamilyInstance } from './generator_draw_kit.mjs';
import { genCompleteRows, genDedupRows } from './data_ml_generators.mjs';

export const DATA_ML_DIFFICULTY_PROFILES = ['intro', 'core', 'stretch'];

const CASE_GENERATORS = {
  'missing-target-rows': genCompleteRows,
  'duplicate-rows': genDedupRows,
};

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
  throw new Error(`Unbekanntes Profil ${difficulty}`);
}

export function solveCountRemainingRows(parameters) {
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
}

export function generateCountRemainingRowsFamily({ seed, caseId, difficulty }) {
  const generator = CASE_GENERATORS[caseId];
  if (!generator) throw new Error(`count-remaining-rows-cleaning-rule: unbekannter Fall ${caseId}`);
  const drawn = difficulty === 'core'
    ? generator(seed)
    : drawFamilyInstance(generator, {
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
  };
}

export const COUNT_REMAINING_ROWS_CONTRACT = {
  familyId: 'count-remaining-rows-cleaning-rule',
  familyGroup: 'aggregate-count',
  summary: 'Berechnet nach Missingness- oder Duplikatregeln die Zahl der verbleibenden Datenzeilen.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'missing-target-rows', sourceLineage: ['w06-e2'] },
    { caseId: 'duplicate-rows', sourceLineage: ['w06-e6'] },
  ],
  difficultyProfiles: DATA_ML_DIFFICULTY_PROFILES,
  competencyIds: ['c-pandas-cleaning'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

export const DATA_ML_FAMILY_SPECS = [
  {
    ...COUNT_REMAINING_ROWS_CONTRACT,
    generate: generateCountRemainingRowsFamily,
    solve: solveCountRemainingRows,
  },
];
