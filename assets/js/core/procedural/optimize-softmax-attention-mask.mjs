// Procedural family optimize-softmax-attention-mask: task text, starter code
// and reference solver stay fixed; the seed draws fresh Q/K/V matrices and
// masks for the scaled attention case plus fresh id sequences for the toy
// forward pass. The draws get appended to the curated base test block as
// literal __check lines whose expected values are asserted inline against the
// __ref_attention / __ref_forward loop references that the base blocks
// already define, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';
import { pyVec, pyMat, pyBoolMat } from './py_test_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/optimize-softmax-attention-mask.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Python literal emitters come from py_test_kit: ints stay ints, masks render
// True/False.

const drawMatrix = (r, nRows, nCols, lo, hi) =>
  Array.from({ length: nRows }, () => Array.from({ length: nCols }, () => randInt(r, lo, hi)));

// Mask bank: null (unmasked), causal lower triangle, random rows — the random
// variant pins column min(i, m - 1) per row so every query row keeps at least
// one visible key (for n > m rows pin the last column, not the diagonal).
const ATTN_MASK_KINDS = ['none', 'causal', 'random'];

const drawMask = (r, n, m, kind) => {
  if (kind === 'none') return null;
  if (kind === 'causal') {
    // Rectangular causal mask: query row i sees keys j <= i (tril over n x m).
    return Array.from({ length: n }, (_, i) => Array.from({ length: m }, (_, j) => j <= i));
  }
  // Rectangular masks may have more query rows than keys: pin column
  // min(i, m - 1) so every row keeps at least one visible key.
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: m }, (_, j) => (j === Math.min(i, m - 1) ? true : r() < 0.5)));
};

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const ATTN_CASES = {
  'scaled-dot-product-attention': {
    difficulty: 'core',
    draw(r) {
      const n = randInt(r, 2, 4);
      const m = randInt(r, 2, 4);
      const dK = randInt(r, 2, 4);
      const dV = randInt(r, 1, 3);
      const maskKind = ATTN_MASK_KINDS[randInt(r, 0, ATTN_MASK_KINDS.length - 1)];
      return {
        Q: drawMatrix(r, n, dK, -3, 3),
        K: drawMatrix(r, m, dK, -3, 3),
        V: drawMatrix(r, m, dV, -5, 5),
        mask: drawMask(r, n, m, maskKind),
      };
    },
    emitChecks(entry, index) {
      const { Q, K, V, mask } = entry;
      const lines = [
        `__Q${index} = ${pyMat(Q)}`,
        `__K${index} = ${pyMat(K)}`,
        `__V${index} = ${pyMat(V)}`,
        `__check('seeded attn ${index}', np.allclose(attention(__Q${index}, __K${index}, __V${index}), __ref_attention(__Q${index}, __K${index}, __V${index}), atol=1e-9))`,
      ];
      if (mask) {
        lines.push(
          `__M${index} = ${pyBoolMat(mask)}`,
          `__check('seeded attn maske ${index}', np.allclose(attention(__Q${index}, __K${index}, __V${index}, mask=__M${index}), __ref_attention(__Q${index}, __K${index}, __V${index}, mask=__M${index}), atol=1e-9))`,
        );
      }
      return lines.join('\n');
    },
    extraCount: 2,
  },
  'toy-forward-pass': {
    difficulty: 'stretch',
    draw(r) {
      const len = randInt(r, 1, 4);
      return { ids: Array.from({ length: len }, () => randInt(r, 0, 5)) };
    },
    emitChecks(entry, index) {
      return `__check('seeded forward ${index}', np.allclose(toy_forward(${pyVec(entry.ids)}, WEIGHTS), __ref_forward(${pyVec(entry.ids)}, WEIGHTS), atol=1e-9))`;
    },
    extraCount: 3,
  },
};

export const ATTN_CONTRACT = {
  familyId: 'optimize-softmax-attention-mask',
  familyGroup: 'optimize-update',
  summary: 'Berechnet Softmax-Aufmerksamkeit inklusive Maskierung der verbotenen Positionen.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'scaled-dot-product-attention', propertyTest: false },
    { caseId: 'toy-forward-pass', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-attention', 'c-numpy-basics', 'c-dl-inference'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: ATTN_CONTRACT,
  cases: ATTN_CASES,
  shapeError: 'Softmax-Attention-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.emitChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

