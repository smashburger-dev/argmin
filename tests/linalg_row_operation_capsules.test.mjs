// Familie classify-row-operation-validity: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_row_operation_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genRowOperationCapsule,
  ROW_OPERATION_CAPSULES,
  rowOperationInstanceOk,
  rowOperationCorrectText,
} from '../assets/js/core/linalg_generators.mjs';
import {
  ROW_OPERATION_CONTRACT,
  generateRowOperationFamily,
  solveRowOperationFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';

// --- 18 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratierter Lösung und Bound (Gleichungen 9,
// Multiplikator 1-9 in der Kapsel 1-12). Regel: Kapsel weiten, nie Orakel
// umschreiben — der Sampler muss diese Bounds halten. Die kuratierte
// Rotation läuft mit Periode 4 über die Varianten (Variante i trägt die
// korrekte Antwort an Position i % 4).
const EQUATION_ORACLES = [
  ['a', [2, 1, 5], [1, -3, -8]],
  ['b', [1, 2, 4], [3, -1, 7]],
  ['c', [3, -1, 6], [2, 4, 1]],
  ['d', [2, 3, -5], [-1, 2, 9]],
  ['a', [4, 1, 8], [1, -2, 3]],
  ['b', [1, -2, 7], [2, 5, -4]],
  ['c', [3, 2, 1], [-2, 1, 6]],
  ['d', [2, -3, 4], [4, 1, -2]],
  ['a', [5, 1, -3], [-1, 3, 8]],
];

const MULTIPLIER_ORACLES = [
  ['row-add', 1],
  ['zero-row', 2],
  ['left-only', 3],
  ['delete', 4],
  ['row-add', 5],
  ['zero-row', 6],
  ['left-only', 7],
  ['delete', 8],
  ['row-add', 9],
];

const EQUATION_IDS = ['a', 'b', 'c', 'd'];
const MULTIPLIER_IDS = ['row-add', 'zero-row', 'left-only', 'delete'];

const CAPSULE_KEYS = ['core', 'intro'];
const CASE_FOR = {
  core: 'valid-operation-rhs',
  intro: 'row-operation-choice-contract',
};
const capsuleFor = (caseId) => ROW_OPERATION_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

// Unabhängige Nachrechnung im Test (plain Arithmetik, kein Template-Import):
// getragene Zeile II − 2·I plus kuratierte Vorzeichen-Schreibweise.
const expectedCarriedText = ([r1, r2]) => {
  const [cx, cy, cr] = [r2[0] - 2 * r1[0], r2[1] - 2 * r1[1], r2[2] - 2 * r1[2]];
  return `II \\leftarrow II - 2\\cdot I, rechte Seite mitgeführt: $${cx}x${cy < 0 ? `${cy}y` : `+${cy}y`}=${cr}$.`;
};

test('Orakel-18: alle statischen Fälle form- und schlüssel-bestätigt', () => {
  assert.equal(EQUATION_ORACLES.length, 9);
  EQUATION_ORACLES.forEach(([correctId, first, second], index) => {
    const parameters = { equations: [first, second] };
    assert.ok(rowOperationInstanceOk(parameters, capsuleFor('valid-operation-rhs')), `equations#${index}: Kapselform`);
    // Kuratierte Rotation: Variante i trägt die korrekte Antwort an Position i % 4.
    assert.equal(correctId, EQUATION_IDS[index % 4], `equations#${index}: Rotationsposition`);
    assert.ok(Math.max(...parameters.equations.flat().map((value) => Math.abs(value))) <= 9, `equations#${index}: im Bound`);
    assert.notEqual(first[0] * second[1] - first[1] * second[0], 0, `equations#${index}: det ungleich 0`);
    assert.equal(rowOperationCorrectText(parameters, capsuleFor('valid-operation-rhs')), expectedCarriedText([first, second]), `equations#${index}: Schlüsseltext`);
  });
  assert.equal(MULTIPLIER_ORACLES.length, 9);
  MULTIPLIER_ORACLES.forEach(([correctId, multiplier], index) => {
    const parameters = { multiplier };
    assert.ok(rowOperationInstanceOk(parameters, capsuleFor('row-operation-choice-contract')), `multiplier#${index}: Kapselform`);
    assert.equal(correctId, MULTIPLIER_IDS[index % 4], `multiplier#${index}: Rotationsposition`);
    assert.ok(multiplier >= 1 && multiplier <= 9, `multiplier#${index}: kuratierter Bereich`);
    assert.equal(rowOperationCorrectText(parameters, capsuleFor('row-operation-choice-contract')), `$Z_2 \\leftarrow Z_2-${multiplier}Z_1$`, `multiplier#${index}: Schlüsseltext`);
  });
});

test('Anker-Texte: kuratierte Erstvarianten-Schlüssel wörtlich im Template', () => {
  assert.equal(
    rowOperationCorrectText(
      { equations: [[2, 1, 5], [1, -3, -8]] }, ROW_OPERATION_CAPSULES.core,
    ),
    'II \\leftarrow II - 2\\cdot I, rechte Seite mitgeführt: $-3x-5y=-18$.',
  );
  assert.equal(
    rowOperationCorrectText({ multiplier: 1 }, ROW_OPERATION_CAPSULES.intro),
    '$Z_2 \\leftarrow Z_2-1Z_1$',
  );
});

test('Kapseltabelle: Arten, Bounds und Fallbindung', () => {
  assert.deepEqual(ROW_OPERATION_CAPSULES.core, { kind: 'equations', bound: 9, caseId: 'valid-operation-rhs' });
  assert.deepEqual(ROW_OPERATION_CAPSULES.intro, { kind: 'multiplier', min: 1, max: 12, caseId: 'row-operation-choice-contract' });
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ROW_OPERATION_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genRowOperationCapsule(seed, capsule);
      assert.ok(rowOperationInstanceOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, rowOperationCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 2x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRowOperationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 2x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRowOperationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveRowOperationFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 2x200: null Samples außerhalb der Kapselform', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ROW_OPERATION_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRowOperationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!rowOperationInstanceOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  const idsFor = {
    core: EQUATION_IDS,
    intro: MULTIPLIER_IDS,
  };
  for (const key of CAPSULE_KEYS) {
    const counts = Object.fromEntries(idsFor[key].map((id) => [id, 0]));
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRowOperationFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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
    const capsule = ROW_OPERATION_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genRowOperationCapsule(seed, capsule);
      assert.deepEqual(first, genRowOperationCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(rowOperationInstanceOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(ROW_OPERATION_CONTRACT.familyId, 'classify-row-operation-validity');
  assert.equal(ROW_OPERATION_CONTRACT.authorityMode, 'seeded');
  assert.equal(ROW_OPERATION_CONTRACT.activityType, 'single-choice');
  assert.deepEqual(ROW_OPERATION_CONTRACT.difficultyProfiles, ['intro', 'core']);
  assert.deepEqual(ROW_OPERATION_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  const meta = {
    core: { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
    intro: { masteryEligible: false, competencyIds: ['c-linalg-gauss'] },
  };
  for (const key of CAPSULE_KEYS) {
    const generated = generateRowOperationFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveRowOperationFamily(generated.parameters), { correctText: correct.text });
    assert.equal(generated.masteryEligible, meta[key].masteryEligible, `${key}: Mastery wie im Bestand`);
    assert.deepEqual(generated.competencyIds, meta[key].competencyIds, `${key}: Kompetenzen wie im Bestand`);
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateRowOperationFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateRowOperationFamily({ seed: 0, caseId: 'valid-operation-rhs', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => generateRowOperationFamily({ seed: 0, caseId: 'row-operation-choice-contract', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateRowOperationFamily({ seed: 0, caseId: 'row-operation-choice-contract', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = LINALG_FAMILIES.instantiate('classify-row-operation-validity', 11, 'core', 'valid-operation-rhs');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await LINALG_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await LINALG_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
