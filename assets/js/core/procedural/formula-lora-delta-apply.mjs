// Procedural family formula-lora-delta-apply: the task text, starter code and
// reference solver stay fixed; the seed draws fresh LoRA matrix fixtures
// (rank r, input/output dims, integer scaling alpha/r) that get appended to
// the curated base test block as literal __check lines. Expected values are
// asserted inline against the np.* reference expression (alpha / r) * (B @ A)
// with the same exactness as the base checks, so the grading contract cannot
// drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/formula-lora-delta-apply.json' with { type: 'json' };

const PACKAGES = ['numpy'];

const drawMatrix = (r, rows, cols, lo, hi) =>
  Array.from({ length: rows }, () => Array.from({ length: cols }, () => randInt(r, lo, hi)));

// Case definitions: the draw domains produce consistent LoRA fixtures — A is
// (rank, dIn), B is (dOut, rank), W is (dOut, dIn) and alpha is an integer
// multiple of the rank so the scaling alpha/r stays exact under array_equal
// (the base block demands integer-exact arithmetic). The drawn fixtures get
// baked into the test block as literals (honest distinctness — the drawn
// inputs differ, not just a seed literal).
export const LORA_CASES = {
  'lora-delta-apply': {
    difficulty: 'core',
    draw(r) {
      const rank = randInt(r, 1, 3);
      const dIn = randInt(r, 2, 4);
      const dOut = randInt(r, 2, 4);
      const alpha = rank * randInt(r, 1, 3);
      return {
        A: drawMatrix(r, rank, dIn, -3, 4),
        B: drawMatrix(r, dOut, rank, -3, 4),
        W: drawMatrix(r, dOut, dIn, 0, 3),
        alpha,
        rank,
      };
    },
    extraCount: 3,
  },
  'lora-delta-scaled-update': {
    difficulty: 'stretch',
    draw(r) {
      const rank = randInt(r, 1, 2);
      const dIn = randInt(r, 2, 3);
      const dOut = randInt(r, 2, 3);
      const alpha = rank * randInt(r, 1, 4);
      return {
        A: drawMatrix(r, rank, dIn, -2, 3),
        B: drawMatrix(r, dOut, rank, -2, 3),
        W: drawMatrix(r, dOut, dIn, 0, 4),
        alpha,
        rank,
      };
    },
    extraCount: 3,
  },
};

const pyMatrix = (m) => `[${m.map((row) => `[${row.join(', ')}]`).join(', ')}]`;

// Appends the seeded literal checks: every draw is concrete in the test
// string, expected values via the inline np.* reference (alpha / r) * (B @ A)
// — exact integer arithmetic because alpha is drawn as a multiple of rank.
function seededChecks(entry, index) {
  const A = `__A${index}`;
  const B = `__B${index}`;
  const W = `__W${index}`;
  const ref = `(${entry.alpha} / ${entry.rank}) * (np.asarray(${B}, dtype=float) @ np.asarray(${A}, dtype=float))`;
  return [
    `${A} = ${pyMatrix(entry.A)}`,
    `${B} = ${pyMatrix(entry.B)}`,
    `${W} = ${pyMatrix(entry.W)}`,
    `__check('seeded delta ${index}', np.array_equal(lora_delta(${A}, ${B}, ${entry.alpha}, ${entry.rank}), ${ref}))`,
    `__check('seeded scale ${index}', np.array_equal(lora_delta(${A}, ${B}, ${2 * entry.alpha}, ${entry.rank}), 2 * lora_delta(${A}, ${B}, ${entry.alpha}, ${entry.rank})))`,
    `__check('seeded apply ${index}', np.array_equal(apply_lora(${W}, ${A}, ${B}, ${entry.alpha}, ${entry.rank}), np.asarray(${W}, dtype=float) + ${ref}))`,
  ].join('\n');
}

export const LORA_CONTRACT = {
  familyId: 'formula-lora-delta-apply',
  familyGroup: 'formula-apply',
  summary: 'Wendet die LoRA-Delta-Formel (alpha/r)*B@A an und sichert Rang-, Form- und Dimensionsverträge mit ValueError ab.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'lora-delta-apply', propertyTest: false },
    { caseId: 'lora-delta-scaled-update', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-finetuning', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: LORA_CONTRACT,
  cases: LORA_CASES,
  shapeError: 'LoRA-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

