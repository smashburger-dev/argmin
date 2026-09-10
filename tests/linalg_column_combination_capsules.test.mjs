// Familie classify-column-combination: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_column_combination_capsules.test.mjs
// Anker-Korrektur (bewusst, gegen Strip-Prinzip): Base-Params aller 3 Fälle
// aufgefüllt (war {}), Contract-caseTypes 1→3, challenge-Profil verlustfrei
// gestrichen (keine challenge-differenzierten Varianten im Bestand).
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genColumnCombinationCapsule,
  COLUMN_COMBINATION_CAPSULES,
  columnInstanceOk,
  columnCorrectText,
  solveColumnSystem,
} from '../assets/js/core/linalg_generators.mjs';
import {
  COLUMN_COMBINATION_CONTRACT,
  generateColumnCombinationFamily,
  solveColumnCombinationFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratierter Lösung und Bound (12/12/2-7).
// Regel: Kapsel weiten, nie Orakel umschreiben — der Sampler muss diese
// Bounds halten. Die kuratierte Rotation läuft mit Periode 4 über die
// Varianten (Variante i trägt die korrekte Antwort an Position i % 4).
const ORACLES = [
  {
    caseId: 'column-coefficients-double', kind: 'coefficients', bound: 12, ids: ['a', 'b', 'c', 'd'], rows: [
      ['a', [2, 1], [-1, 3], [3, 5], [2, 1]],
      ['b', [1, 2], [3, -1], [7, 0], [1, 2]],
      ['c', [2, -2], [1, 4], [5, -10], [3, -1]],
      ['d', [3, 1], [-2, 2], [-3, 7], [1, 3]],
      ['a', [1, -3], [2, 2], [0, 8], [-2, 1]],
      ['b', [4, 1], [-1, 2], [9, 0], [2, -1]],
      ['c', [2, 5], [3, -2], [4, -9], [-1, 2]],
      ['d', [5, -1], [1, 3], [12, 4], [2, 2]],
      ['a', [3, 2], [-2, 5], [7, -8], [1, -2]],
    ],
  },
  {
    caseId: 'column-choice-authored', kind: 'choice', bound: 12,
    ids: ['both-one', 'first-only', 'second-only', 'swapped-target'], rows: [
      ['both-one', [2, 1], [1, 3], [3, 4], [1, 1]],
      ['first-only', [3, 1], [2, 4], [4, -2], [2, -1]],
      ['second-only', [1, 2], [3, -1], [5, -4], [-1, 2]],
      ['swapped-target', [2, 3], [-1, 2], [2, 10], [2, 2]],
      ['both-one', [4, 1], [1, 2], [-1, 5], [-1, 3]],
      ['first-only', [1, 4], [2, 1], [-1, 10], [3, -2]],
      ['second-only', [3, 2], [-2, 3], [-1, 8], [1, 2]],
      ['swapped-target', [2, -1], [1, 5], [-3, 7], [-2, 1]],
      ['both-one', [5, 2], [2, -3], [3, 5], [1, -1]],
    ],
  },
  {
    caseId: 'shape-debug-authored', kind: 'shape-debug',
    ids: ['matmul-contract', 'reshape-any', 'sum-all', 'transpose'], rows: [
      ['matmul-contract', 2, 3],
      ['reshape-any', 3, 2],
      ['sum-all', 4, 5],
      ['transpose', 5, 3],
      ['matmul-contract', 6, 4],
      ['reshape-any', 2, 7],
      ['sum-all', 7, 2],
      ['transpose', 3, 6],
      ['matmul-contract', 4, 7],
    ],
  },
];

const CAPSULE_KEYS = ['core', 'intro', 'stretch'];
const CASE_FOR = {
  core: 'column-coefficients-double',
  intro: 'column-choice-authored',
  stretch: 'shape-debug-authored',
};
const capsuleFor = (caseId) => COLUMN_COMBINATION_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

const oracleParams = (oracle, row) => {
  if (oracle.kind === 'shape-debug') return { matrixRows: row[1], matrixColumns: row[2] };
  if (oracle.kind === 'choice') return { a1: row[1], a2: row[2], target: row[3] };
  return { s1: row[1], s2: row[2], target: row[3] };
};

test('Orakel-27: alle statischen Fälle form- und schlüssel-bestätigt', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.rows.length, 9, `${oracle.caseId}: 9 Varianten`);
    oracle.rows.forEach((row, index) => {
      const params = oracleParams(oracle, row);
      assert.ok(columnInstanceOk(params, capsule), `${oracle.caseId}#${index}: Kapselform`);
      // Kuratierte Rotation: Variante i trägt die korrekte Antwort an Position i % 4.
      assert.equal(row[0], oracle.ids[index % 4], `${oracle.caseId}#${index}: Rotationsposition`);
      if (oracle.kind === 'shape-debug') {
        assert.ok(columnCorrectText(params, capsule).includes(`\`(${row[1]},)\``), `${oracle.caseId}#${index}: Ausgabe-Shape`);
      } else {
        const s1 = oracle.kind === 'choice' ? params.a1 : params.s1;
        const s2 = oracle.kind === 'choice' ? params.a2 : params.s2;
        assert.deepEqual(solveColumnSystem(s1, s2, params.target), row[4], `${oracle.caseId}#${index}: Solver-Lösung`);
        assert.ok(Math.max(...params.target.map((value) => Math.abs(value))) <= oracle.bound, `${oracle.caseId}#${index}: Ziel im Bound`);
      }
      count += 1;
    });
  }
  assert.equal(count, 27);
});

test('Anker-Texte: kuratierte Erstvarianten-Schlüssel wörtlich im Template', () => {
  assert.equal(
    columnCorrectText(
      { s1: [2, 1], s2: [-1, 3], target: [3, 5] }, COLUMN_COMBINATION_CAPSULES.core,
    ),
    '$(a,b) = (2,1)$: $2(2,1) + 1(-1,3) = (3,5)$.',
  );
  assert.equal(
    columnCorrectText(
      { a1: [2, 1], a2: [1, 3], target: [3, 4] }, COLUMN_COMBINATION_CAPSULES.intro,
    ),
    '$x_1=1, x_2=1$',
  );
  assert.equal(
    columnCorrectText(
      { matrixRows: 2, matrixColumns: 3 }, COLUMN_COMBINATION_CAPSULES.stretch,
    ),
    'A und v mit `np.asarray` normalisieren, `A.ndim == 2`, `v.ndim == 1` und `A.shape[1] == v.shape[0]` prüfen, dann `A @ v` mit Ausgabe-Shape `(2,)` zurückgeben',
  );
});

test('Kapseltabelle: Arten, Bounds und Fallbindung', () => {
  assert.deepEqual(COLUMN_COMBINATION_CAPSULES.core, { kind: 'coefficients', bound: 12, caseId: 'column-coefficients-double' });
  assert.deepEqual(COLUMN_COMBINATION_CAPSULES.intro, { kind: 'choice', bound: 12, caseId: 'column-choice-authored' });
  assert.deepEqual(COLUMN_COMBINATION_CAPSULES.stretch, { kind: 'shape-debug', rows: [2, 7], cols: [2, 7], caseId: 'shape-debug-authored' });
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = COLUMN_COMBINATION_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genColumnCombinationCapsule(seed, capsule);
      assert.ok(columnInstanceOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, columnCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateColumnCombinationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateColumnCombinationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveColumnCombinationFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Kapselform', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = COLUMN_COMBINATION_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateColumnCombinationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!columnInstanceOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  const idsFor = {
    core: ['a', 'b', 'c', 'd'],
    intro: ['both-one', 'first-only', 'second-only', 'swapped-target'],
    stretch: ['matmul-contract', 'reshape-any', 'sum-all', 'transpose'],
  };
  for (const key of CAPSULE_KEYS) {
    const counts = Object.fromEntries(idsFor[key].map((id) => [id, 0]));
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateColumnCombinationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.ok(!generated.prompt.includes(correct.text), `${key}:${seed}: Schlüssel im Prompt`);
      counts[generated.expected.correctChoice] += 1;
      const bucket = seed % 8;
      if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
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
    const capsule = COLUMN_COMBINATION_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genColumnCombinationCapsule(seed, capsule);
      assert.deepEqual(first, genColumnCombinationCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(columnInstanceOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(COLUMN_COMBINATION_CONTRACT.familyId, 'classify-column-combination');
  assert.equal(COLUMN_COMBINATION_CONTRACT.authorityMode, 'seeded');
  assert.equal(COLUMN_COMBINATION_CONTRACT.activityType, 'single-choice');
  assert.deepEqual(COLUMN_COMBINATION_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(COLUMN_COMBINATION_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  const meta = {
    core: { masteryEligible: true, competencyIds: ['c-linalg-matrices'] },
    intro: { masteryEligible: false, competencyIds: ['c-linalg-systems'] },
    stretch: { masteryEligible: true, competencyIds: ['c-linalg-matrices', 'c-numpy-basics'] },
  };
  for (const key of CAPSULE_KEYS) {
    const generated = generateColumnCombinationFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveColumnCombinationFamily(generated.parameters), { correctText: correct.text });
    assert.equal(generated.masteryEligible, meta[key].masteryEligible, `${key}: Mastery wie im Bestand`);
    assert.deepEqual(generated.competencyIds, meta[key].competencyIds, `${key}: Kompetenzen wie im Bestand`);
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateColumnCombinationFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateColumnCombinationFamily({ seed: 0, caseId: 'column-coefficients-double', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => generateColumnCombinationFamily({ seed: 0, caseId: 'column-choice-authored', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateColumnCombinationFamily({ seed: 0, caseId: 'shape-debug-authored', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = LINALG_FAMILIES.instantiate('classify-column-combination', 11, 'core', 'column-coefficients-double');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await LINALG_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await LINALG_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
