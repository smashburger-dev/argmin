// Familie classify-shape-contract: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_shape_contract_capsules.test.mjs
// Gemeinsame Gates leben in tests/linalg_capsule_suites.mjs — die Kit-Produkte
// (capsuleOk/correctText/genCapsule/generate/solve) kommen aus
// foundations_linalg_families.mjs, Kapseln und Fachhelfer aus
// linalg_generators.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLASSIFY_SHAPE_CAPSULES,
  classifyShapeOk,
} from '../assets/js/core/linalg_generators.mjs';
import {
  CLASSIFY_SHAPE_CONTRACT,
  classifyShapeCapsuleOk,
  classifyShapeCorrectText,
  genClassifyShapeCapsule,
  generateClassifyShapeFamily,
  solveClassifyShapeFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { linalgChoiceCapsuleSuite } from './linalg_capsule_suites.mjs';

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratierter Shape-Arithmetik und dims-Bereich.
// Regel: Kapsel weiten, nie Orakel umschreiben — der Sampler muss diese
// Tupel halten. Die kuratierte Rotation läuft mit Periode 4 über die
// Varianten (Variante i trägt die korrekte Antwort an Position i % 4).
const ORACLES = [
  {
    caseId: 'shape-bias-broadcast-mc', kind: 'bias-broadcast',
    ids: ['a', 'b', 'c', 'd'], rows: [
      ['a', 32, 8, 16],
      ['b', 16, 12, 24],
      ['c', 64, 10, 6],
      ['d', 8, 5, 11],
      ['a', 24, 7, 9],
      ['b', 4, 13, 3],
      ['c', 48, 6, 20],
      ['d', 12, 9, 4],
      ['a', 20, 11, 15],
    ],
  },
  {
    caseId: 'shape-transformer-qkv', kind: 'transformer-qkv',
    ids: ['a', 'b', 'c', 'd'], rows: [
      ['a', 2, 5, 12, 4],
      ['b', 4, 8, 16, 6],
      ['c', 1, 7, 10, 5],
      ['d', 3, 11, 24, 8],
      ['a', 8, 4, 32, 16],
      ['b', 2, 13, 20, 10],
      ['c', 5, 6, 18, 9],
      ['d', 6, 9, 14, 7],
      ['a', 3, 3, 8, 2],
    ],
  },
  {
    caseId: 'shape-token-batch-flatten', kind: 'token-embedding',
    ids: ['a', 'b', 'c', 'd'], rows: [
      ['a', 3, 7, 16],
      ['b', 2, 5, 8],
      ['c', 4, 9, 12],
      ['d', 1, 11, 24],
      ['a', 6, 4, 10],
      ['b', 8, 3, 6],
      ['c', 5, 12, 14],
      ['d', 2, 10, 32],
      ['a', 7, 6, 18],
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = {
  intro: 'shape-bias-broadcast-mc',
  core: 'shape-transformer-qkv',
  stretch: 'shape-token-batch-flatten',
};
const capsuleFor = (caseId) => CLASSIFY_SHAPE_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

const oracleParams = (oracle, row) => {
  if (oracle.kind === 'transformer-qkv') return { inputShape: [row[1], row[2], row[3]], projectionWidth: row[4] };
  if (oracle.kind === 'token-embedding') return { batch: row[1], tokens: row[2], embeddingWidth: row[3] };
  return { batch: row[1], inputFeatures: row[2], outputFeatures: row[3] };
};

const oracleKeyShape = (oracle, row) => {
  if (oracle.kind === 'transformer-qkv') return `(${row[1]},${row[2]},${row[4]})`;
  if (oracle.kind === 'token-embedding') return `(${row[1]},${row[2]},${row[3]})`;
  return `(${row[1]},${row[3]})`;
};

test('Orakel-27: alle statischen Fälle form- und schlüssel-bestätigt', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(capsule.kind, oracle.kind, `${oracle.caseId}: Art`);
    assert.equal(oracle.rows.length, 9, `${oracle.caseId}: 9 Varianten`);
    oracle.rows.forEach((row, index) => {
      const params = oracleParams(oracle, row);
      assert.ok(classifyShapeOk(params, capsule), `${oracle.caseId}#${index}: Kapselform`);
      // Kuratierte Rotation: Variante i trägt die korrekte Antwort an Position i % 4.
      assert.equal(row[0], oracle.ids[index % 4], `${oracle.caseId}#${index}: Rotationsposition`);
      const key = classifyShapeCorrectText(params, capsule);
      assert.ok(key.includes(`$${oracleKeyShape(oracle, row)}$`), `${oracle.caseId}#${index}: Schlüssel-Shape`);
      const solved = solveClassifyShapeFamily({ caseId: oracle.caseId, ...params });
      assert.equal(solved.correctText, key, `${oracle.caseId}#${index}: Solver-Schlüssel`);
      count += 1;
    });
  }
  assert.equal(count, 27);
});

test('Anker-Texte: kuratierte Erstvarianten-Schlüssel wörtlich im Template', () => {
  assert.equal(
    classifyShapeCorrectText(
      { batch: 32, inputFeatures: 8, outputFeatures: 16 }, CLASSIFY_SHAPE_CAPSULES.intro,
    ),
    '$(32,16)$ — die Batch-Dimension bleibt außen, die Feature-Dimension wird von 8 auf 16 umprojiziert; $b$ wird zeilenweise broadcastet.',
  );
  assert.equal(
    classifyShapeCorrectText(
      { inputShape: [2, 5, 12], projectionWidth: 4 }, CLASSIFY_SHAPE_CAPSULES.core,
    ),
    '$(2,5,4)$',
  );
  assert.equal(
    classifyShapeCorrectText(
      { batch: 3, tokens: 7, embeddingWidth: 16 }, CLASSIFY_SHAPE_CAPSULES.stretch,
    ),
    '$(3,7,16)$',
  );
});

test('Kapseltabelle: Arten, Bereiche und Fallbindung', () => {
  assert.deepEqual(CLASSIFY_SHAPE_CAPSULES.intro, { kind: 'bias-broadcast', batch: [4, 64], inputFeatures: [5, 13], outputFeatures: [3, 24], caseId: 'shape-bias-broadcast-mc' });
  assert.deepEqual(CLASSIFY_SHAPE_CAPSULES.core, { kind: 'transformer-qkv', batch: [1, 8], seqLen: [3, 13], modelDim: [8, 32], projDim: [2, 16], caseId: 'shape-transformer-qkv' });
  assert.deepEqual(CLASSIFY_SHAPE_CAPSULES.stretch, { kind: 'token-embedding', batch: [1, 8], seqLen: [3, 12], embedDim: [6, 32], caseId: 'shape-token-batch-flatten' });
});

linalgChoiceCapsuleSuite('classify-shape-contract', {
  capsules: CLASSIFY_SHAPE_CAPSULES,
  contract: CLASSIFY_SHAPE_CONTRACT,
  capsuleOk: classifyShapeCapsuleOk,
  correctText: classifyShapeCorrectText,
  genCapsule: genClassifyShapeCapsule,
  generate: generateClassifyShapeFamily,
  solve: solveClassifyShapeFamily,
  registry: LINALG_FAMILIES,
}, CASE_FOR, {
  difficultyProfiles: ['intro', 'core', 'stretch'],
});
