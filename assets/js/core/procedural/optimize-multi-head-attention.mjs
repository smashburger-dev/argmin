// Procedural family optimize-multi-head-attention: task text, starter code
// and reference solver stay fixed; the seed draws fresh sequence lengths,
// model widths, head counts, weight matrices and masks that get appended to
// the curated base test block as literal __check lines. Expected values are
// asserted inline against the __ref_mha loop reference that the base block
// already defines, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';
import { pyMat, pyBoolMat } from './py_test_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/optimize-multi-head-attention.json' with { type: 'json' };

const PACKAGES = ['numpy'];

// Python literal emitters come from py_test_kit: ints stay ints, masks render
// True/False.

const drawMatrix = (r, nRows, nCols, lo, hi) =>
  Array.from({ length: nRows }, () => Array.from({ length: nCols }, () => randInt(r, lo, hi)));

// Shape bank: (seqLen, dModel, nHeads) with dModel % nHeads === 0.
const MHA_SHAPES = [
  { n: 2, d: 2, h: 1 },
  { n: 2, d: 2, h: 2 },
  { n: 2, d: 6, h: 3 },
  { n: 3, d: 4, h: 2 },
  { n: 3, d: 4, h: 4 },
  { n: 3, d: 6, h: 3 },
  { n: 4, d: 4, h: 1 },
  { n: 4, d: 4, h: 2 },
  { n: 4, d: 6, h: 2 },
  { n: 4, d: 8, h: 4 },
];

// Mask bank: null (unmasked), causal lower triangle, random rows — the random
// variant forces the diagonal True so every query row keeps at least one key.
const MHA_MASK_KINDS = ['none', 'causal', 'random'];

const drawMask = (r, n, kind) => {
  if (kind === 'none') return null;
  if (kind === 'causal') {
    return Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => j <= i));
  }
  return Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (j === i ? true : r() < 0.5)));
};

// Case definition: the draw domain produces concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal).
export const MHA_CASES = {
  'multi-head-attention': {
    difficulty: 'challenge',
    draw(r) {
      const shape = MHA_SHAPES[randInt(r, 0, MHA_SHAPES.length - 1)];
      const maskKind = MHA_MASK_KINDS[randInt(r, 0, MHA_MASK_KINDS.length - 1)];
      return {
        shape,
        X: drawMatrix(r, shape.n, shape.d, -2, 2),
        Wq: drawMatrix(r, shape.d, shape.d, -1, 1),
        Wk: drawMatrix(r, shape.d, shape.d, -1, 1),
        Wv: drawMatrix(r, shape.d, shape.d, -2, 2),
        Wo: drawMatrix(r, shape.d, shape.d, -1, 1),
        mask: drawMask(r, shape.n, maskKind),
      };
    },
    extraCount: 2,
  },
};

// Appends the seeded literal checks: every draw is concrete in the test
// string, expected values via the __ref_mha loop reference from the base
// block (same tolerance atol=1e-9).
function seededChecks(entry, index) {
  const { shape, X, Wq, Wk, Wv, Wo, mask } = entry;
  const lines = [
    `__X${index} = ${pyMat(X)}`,
    `__Wq${index} = ${pyMat(Wq)}`,
    `__Wk${index} = ${pyMat(Wk)}`,
    `__Wv${index} = ${pyMat(Wv)}`,
    `__Wo${index} = ${pyMat(Wo)}`,
    `__check('seeded mha ${index}', np.allclose(multi_head_attention(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}), __ref_mha(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}), atol=1e-9))`,
  ];
  if (mask) {
    lines.push(
      `__M${index} = ${pyBoolMat(mask)}`,
      `__check('seeded mha maske ${index}', np.allclose(multi_head_attention(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}, mask=__M${index}), __ref_mha(__X${index}, __Wq${index}, __Wk${index}, __Wv${index}, __Wo${index}, ${shape.h}, mask=__M${index}), atol=1e-9))`,
    );
  }
  return lines.join('\n');
}

export const MHA_CONTRACT = {
  familyId: 'optimize-multi-head-attention',
  familyGroup: 'optimize-update',
  summary: 'Zerlegt projizierte Q/K/V in Köpfe, rechnet je Kopf skalierte Attention mit Maske, konkateniert und projiziert die Ausgabe.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'multi-head-attention', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-attention', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: MHA_CONTRACT,
  cases: MHA_CASES,
  shapeError: 'Multi-Head-Attention-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

