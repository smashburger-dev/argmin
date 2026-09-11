// Familie classify-matrix-shape: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_matrix_shape_capsules.test.mjs
// Gemeinsame Gates leben in tests/linalg_capsule_suites.mjs — die Kit-Produkte
// (capsuleOk/correctText/genCapsule/generate/solve) kommen aus
// foundations_linalg_families.mjs, Kapseln und Fachhelfer aus
// linalg_generators.mjs. Kit-Konvention: correctText({ dimsA, dimsB }, capsule).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MATRIX_SHAPE_CAPSULES,
  matrixShapeOk,
} from '../assets/js/core/linalg_generators.mjs';
import {
  MATRIX_SHAPE_CONTRACT,
  matrixShapeCapsuleOk,
  matrixShapeCorrectText,
  genMatrixShapeCapsule,
  generateMatrixShapeFamily,
  solveMatrixShapeFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { linalgChoiceCapsuleSuite } from './linalg_capsule_suites.mjs';

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit Art-Nachweis und dims-Bereich. Regel: Kapsel
// weiten, nie Orakel umschreiben — der Sampler muss diese Tupel halten.
// Anker-Texte sind die drei kuratierten Base-Schlüssel (Fall 3 am
// prompt-konsistenten 1×3/3×1-Tupel; seine Base-Parameter weichen davon ab
// und bleiben als Befund unangetastet).
const ORACLES = [
  {
    caseId: 'shape-product-drawn', kind: 'product', pairs: [
      [[2, 3], [3, 4]],
      [[4, 2], [2, 3]],
      [[3, 4], [4, 2]],
      [[5, 2], [2, 4]],
      [[2, 5], [5, 3]],
      [[4, 3], [3, 5]],
      [[3, 2], [2, 5]],
      [[6, 2], [2, 3]],
      [[2, 4], [4, 5]],
    ],
  },
  {
    caseId: 'shape-add-broadcast-trap', kind: 'add', pairs: [
      [[2, 3], [2, 3]],
      [[3, 4], [3, 4]],
      [[4, 2], [4, 2]],
      [[5, 3], [5, 3]],
      [[2, 6], [2, 6]],
      [[6, 4], [6, 4]],
      [[3, 5], [3, 5]],
      [[4, 7], [4, 7]],
      [[7, 2], [7, 2]],
    ],
  },
  {
    caseId: 'shape-vector-matmul-chain', kind: 'vector', pairs: [
      [[1, 2], [2, 1]],
      [[1, 3], [3, 1]],
      [[1, 4], [4, 1]],
      [[1, 5], [5, 1]],
      [[1, 6], [6, 1]],
      [[1, 7], [7, 1]],
      [[1, 8], [8, 1]],
      [[1, 9], [9, 1]],
      [[1, 10], [10, 1]],
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'shape-product-drawn', core: 'shape-add-broadcast-trap', stretch: 'shape-vector-matmul-chain' };
const capsuleFor = (caseId) => MATRIX_SHAPE_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle statischen Shape-Tupel art-bestätigt und im Constraint', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(capsule.kind, oracle.kind, `${oracle.caseId}: Art`);
    assert.equal(oracle.pairs.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const [dimsA, dimsB] of oracle.pairs) {
      assert.ok(matrixShapeOk(dimsA, dimsB, capsule), `${oracle.caseId}: Kapselform`);
      if (oracle.kind === 'product') {
        assert.equal(dimsA[1], dimsB[0], `${oracle.caseId}: Innendims`);
        assert.notEqual(dimsA[0], dimsB[1], `${oracle.caseId}: BA undefiniert`);
      }
      if (oracle.kind === 'add') {
        assert.deepEqual(dimsA, dimsB, `${oracle.caseId}: gleiche Shapes`);
        assert.notEqual(dimsA[0], dimsA[1], `${oracle.caseId}: kein Quadrat`);
      }
      if (oracle.kind === 'vector') {
        assert.deepEqual([dimsA[0], dimsB[1]], [1, 1], `${oracle.caseId}: Außen-Einsen`);
        assert.equal(dimsA[1], dimsB[0], `${oracle.caseId}: Innen-k`);
      }
      assert.ok(matrixShapeCorrectText({ dimsA, dimsB }, capsule).length > 20, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker-Texte: kuratierte Base-Schlüssel wörtlich im Template', () => {
  assert.equal(
    matrixShapeCorrectText({ dimsA: [3, 2], dimsB: [2, 4] }, MATRIX_SHAPE_CAPSULES.intro),
    '$AB$ ist definiert und hat die Form $3\\times4$; $BA$ ist nicht definiert.',
  );
  assert.equal(
    matrixShapeCorrectText({ dimsA: [2, 3], dimsB: [2, 3] }, MATRIX_SHAPE_CAPSULES.core),
    '$A+B$ ist definiert und hat die Form $2\\times3$; beide Operanden haben dieselbe Form.',
  );
  assert.equal(
    matrixShapeCorrectText({ dimsA: [1, 3], dimsB: [3, 1] }, MATRIX_SHAPE_CAPSULES.stretch),
    '$AB$ ist $1\\times1$ und $BA$ ist $3\\times3$; beide Produkte sind definiert.',
  );
});

test('Kapseltabelle: Arten, Bereiche und Fallbindung', () => {
  assert.deepEqual(MATRIX_SHAPE_CAPSULES.intro, { kind: 'product', rows: [2, 6], inner: [2, 5], cols: [2, 5], caseId: 'shape-product-drawn' });
  assert.deepEqual(MATRIX_SHAPE_CAPSULES.core, { kind: 'add', dims: [2, 7], caseId: 'shape-add-broadcast-trap' });
  assert.deepEqual(MATRIX_SHAPE_CAPSULES.stretch, { kind: 'vector', inner: [2, 12], caseId: 'shape-vector-matmul-chain' });
});

linalgChoiceCapsuleSuite('classify-matrix-shape', {
  capsules: MATRIX_SHAPE_CAPSULES,
  contract: MATRIX_SHAPE_CONTRACT,
  capsuleOk: matrixShapeCapsuleOk,
  correctText: matrixShapeCorrectText,
  genCapsule: genMatrixShapeCapsule,
  generate: generateMatrixShapeFamily,
  solve: solveMatrixShapeFamily,
  registry: LINALG_FAMILIES,
}, CASE_FOR, {
  difficultyProfiles: ['intro', 'core', 'stretch'],
  checkParameters: (generated, capsule, label) => {
    for (const dims of [generated.parameters.dimsA, generated.parameters.dimsB]) {
      assert.equal(dims.length, 2, `${label}: Tupel`);
      for (const value of dims) assert.ok(Number.isInteger(value) && value >= 1, `${label}: ganzzahlig`);
    }
  },
});
