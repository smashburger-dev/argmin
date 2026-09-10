// Familie classify-matrix-shape: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_matrix_shape_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genMatrixShapeCapsule,
  MATRIX_SHAPE_CAPSULES,
  matrixShapeOk,
  matrixShapeCorrectText,
} from '../assets/js/core/linalg_generators.mjs';
import {
  MATRIX_SHAPE_CONTRACT,
  generateMatrixShapeFamily,
  solveMatrixShapeFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';

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
      assert.ok(matrixShapeCorrectText(dimsA, dimsB, capsule).length > 20, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker-Texte: kuratierte Base-Schlüssel wörtlich im Template', () => {
  assert.equal(
    matrixShapeCorrectText([3, 2], [2, 4], MATRIX_SHAPE_CAPSULES.intro),
    '$AB$ ist definiert und hat die Form $3\\times4$; $BA$ ist nicht definiert.',
  );
  assert.equal(
    matrixShapeCorrectText([2, 3], [2, 3], MATRIX_SHAPE_CAPSULES.core),
    '$A+B$ ist definiert und hat die Form $2\\times3$; beide Operanden haben dieselbe Form.',
  );
  assert.equal(
    matrixShapeCorrectText([1, 3], [3, 1], MATRIX_SHAPE_CAPSULES.stretch),
    '$AB$ ist $1\\times1$ und $BA$ ist $3\\times3$; beide Produkte sind definiert.',
  );
});

test('Kapseltabelle: Arten, Bereiche und Fallbindung', () => {
  assert.deepEqual(MATRIX_SHAPE_CAPSULES.intro, { kind: 'product', rows: [2, 6], inner: [2, 5], cols: [2, 5], caseId: 'shape-product-drawn' });
  assert.deepEqual(MATRIX_SHAPE_CAPSULES.core, { kind: 'add', dims: [2, 7], caseId: 'shape-add-broadcast-trap' });
  assert.deepEqual(MATRIX_SHAPE_CAPSULES.stretch, { kind: 'vector', inner: [2, 12], caseId: 'shape-vector-matmul-chain' });
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = MATRIX_SHAPE_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genMatrixShapeCapsule(seed, capsule);
      const { dimsA, dimsB } = generated.parameters;
      assert.ok(matrixShapeOk(dimsA, dimsB, capsule), `${key}:${seed}: Kapselform`);
      for (const dims of [dimsA, dimsB]) {
        assert.equal(dims.length, 2, `${key}:${seed}: Tupel`);
        for (const value of dims) assert.ok(Number.isInteger(value) && value >= 1, `${key}:${seed}: ganzzahlig`);
      }
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, matrixShapeCorrectText(dimsA, dimsB, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMatrixShapeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMatrixShapeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveMatrixShapeFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb des Shape-Tupels', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = MATRIX_SHAPE_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMatrixShapeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!matrixShapeOk(generated.parameters.dimsA, generated.parameters.dimsB, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateMatrixShapeFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.ok(!generated.prompt.includes(correct.text), `${key}:${seed}: Schlüssel im Prompt`);
      counts[generated.expected.correctChoice] += 1;
      const bucket = seed % 8;
      if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
      // Instanzen statt Prompts: der Vektorraum hat nur 11 Prompts auf 25er
      // Buckets, Rotation trägt die Variation (Audit-Dedup-Schlüssel).
      byModulo.get(bucket).add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    for (const [id, count] of Object.entries(counts)) {
      assert.ok(count >= 40 && count <= 60, `${key}: Position ${id} nur ${count}x`);
    }
    for (const [bucket, instances] of byModulo) {
      assert.ok(instances.size >= 10, `${key}: Modulo-Klasse ${bucket} hält nur ${instances.size} distinct`);
    }
  }
});

test('negative Seeds: gültig und deterministisch', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = MATRIX_SHAPE_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genMatrixShapeCapsule(seed, capsule);
      assert.deepEqual(first, genMatrixShapeCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(matrixShapeOk(first.parameters.dimsA, first.parameters.dimsB, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(MATRIX_SHAPE_CONTRACT.familyId, 'classify-matrix-shape');
  assert.equal(MATRIX_SHAPE_CONTRACT.authorityMode, 'seeded');
  assert.equal(MATRIX_SHAPE_CONTRACT.activityType, 'single-choice');
  assert.deepEqual(MATRIX_SHAPE_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(MATRIX_SHAPE_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateMatrixShapeFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveMatrixShapeFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateMatrixShapeFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateMatrixShapeFamily({ seed: 0, caseId: 'shape-product-drawn', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateMatrixShapeFamily({ seed: 0, caseId: 'shape-add-broadcast-trap', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateMatrixShapeFamily({ seed: 0, caseId: 'shape-product-drawn', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = LINALG_FAMILIES.instantiate('classify-matrix-shape', 11, 'intro', 'shape-product-drawn');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await LINALG_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await LINALG_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
