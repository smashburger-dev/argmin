// Procedural family construct-attention-mask: the task text, starter code and
// reference solver stay fixed; the seed draws fresh mask sizes, length lists,
// score matrices and boolean masks that get appended to the curated base test
// block as literal __check lines. Expected masks are asserted inline against
// np.* references / literal comprehensions and expected softmax weights are
// recomputed inline with the same stability rule (mask as -inf, subtract row
// max, normalize), so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/construct-attention-mask.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Python literal rendering for the seeded test block (ints, bools, lists).
const pyLit = (value) => {
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return String(value);
};

// Shared draw helpers: lengths stay inside [0, L] (the error path gets its
// own out-of-range entry), every mask row keeps at least one visible cell so
// the drawn instance never trips the ValueError guard.
function drawLengths(r) {
  const L = randInt(r, 2, 5);
  const count = randInt(r, 1, 3);
  const lengths = Array.from({ length: count }, () => randInt(r, 0, L));
  return { lengths, L };
}

function drawMaskedScores(r) {
  const rows = randInt(r, 1, 2);
  const cols = randInt(r, 2, 4);
  const scores = Array.from({ length: rows }, () => (
    Array.from({ length: cols }, () => randInt(r, -6, 6))
  ));
  const mask = Array.from({ length: rows }, () => {
    const row = Array.from({ length: cols }, () => r() < 0.6);
    if (!row.some(Boolean)) row[randInt(r, 0, cols - 1)] = true;
    return row;
  });
  return { scores, mask };
}

const drawBadLength = (r, L) => (r() < 0.5 ? L + randInt(r, 1, 2) : -randInt(r, 1, 2));

// Recomputes the stable masked softmax as inline np reference lines — the
// same spec the reference solver implements (mask as -inf, row max, exp,
// normalize).
function softmaxRefLines(entry, index) {
  return [
    `__S${index} = ${pyLit(entry.scores)}`,
    `__M${index} = ${pyLit(entry.mask)}`,
    `__E${index} = np.where(np.asarray(__M${index}, dtype=bool), np.asarray(__S${index}, dtype=float), -np.inf)`,
    `__E${index} = __E${index} - __E${index}.max(axis=1, keepdims=True)`,
    `__W${index} = np.exp(__E${index})`,
    `__W${index} = __W${index} / __W${index}.sum(axis=1, keepdims=True)`,
  ];
}

function fullSeededChecks(entry, index) {
  return [
    `__check('seeded kausal ${index}', causal_mask(${entry.n}).tolist() == np.tril(np.ones((${entry.n}, ${entry.n}), dtype=bool)).tolist())`,
    `__check('seeded padding ${index}', padding_mask(${pyLit(entry.lengths)}, ${entry.L}).tolist() == [[j < l for j in range(${entry.L})] for l in ${pyLit(entry.lengths)}])`,
    ...softmaxRefLines(entry, index),
    `__check('seeded softmax ${index}', np.allclose(masked_softmax(__S${index}, __M${index}), __W${index}))`,
    'try:',
    `    padding_mask(${pyLit(entry.badLengths)}, ${entry.L})`,
    `    __check('seeded laenge fehler ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded laenge fehler ${index}', True)`,
  ].join('\n');
}

function pairSeededChecks(entry, index) {
  return [
    `__check('seeded padding ${index}', padding_mask(${pyLit(entry.lengths)}, ${entry.L}).tolist() == [[j < l for j in range(${entry.L})] for l in ${pyLit(entry.lengths)}])`,
    ...softmaxRefLines(entry, index),
    `__check('seeded softmax ${index}', np.allclose(masked_softmax(__S${index}, __M${index}), __W${index}))`,
    'try:',
    `    padding_mask(${pyLit(entry.badLengths)}, ${entry.L})`,
    `    __check('seeded laenge fehler ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded laenge fehler ${index}', True)`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness). badLengths carries exactly one
// out-of-range entry so the ValueError arm stays deterministic.
export const ATTENTION_MASK_CASES = {
  'construct-causal-padding-mask': {
    difficulty: 'stretch',
    seededChecks: fullSeededChecks,
    draw(r) {
      const { lengths, L } = drawLengths(r);
      const { scores, mask } = drawMaskedScores(r);
      const badLengths = [...lengths];
      badLengths[randInt(r, 0, badLengths.length - 1)] = drawBadLength(r, L);
      return { n: randInt(r, 2, 6), lengths, L, scores, mask, badLengths };
    },
    extraCount: 2,
  },
  'construct-padding-mask-softmax': {
    difficulty: 'core',
    seededChecks: pairSeededChecks,
    draw(r) {
      const { lengths, L } = drawLengths(r);
      const { scores, mask } = drawMaskedScores(r);
      const badLengths = [...lengths];
      badLengths[randInt(r, 0, badLengths.length - 1)] = drawBadLength(r, L);
      return { lengths, L, scores, mask, badLengths };
    },
    extraCount: 2,
  },
};

export const ATTENTION_MASK_CONTRACT = {
  familyId: 'construct-attention-mask',
  familyGroup: 'construct-program',
  summary: 'Konstruiert Attention-Masken als boolesche Matrizen nach Sichtbarkeitsregeln und führt das vertragsgeprüfte, stabile maskierte Softmax aus.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'construct-causal-padding-mask', propertyTest: false },
    { caseId: 'construct-padding-mask-softmax', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'core'],
  competencyIds: ['c-dl-attention', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: ATTENTION_MASK_CONTRACT,
  cases: ATTENTION_MASK_CASES,
  shapeError: 'Attention-Mask-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

