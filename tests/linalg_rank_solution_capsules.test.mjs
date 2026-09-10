// Familie classify-rank-solution-case: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_rank_solution_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genRankSolutionCapsule,
  RANK_SOLUTION_CAPSULES,
  rankSolutionInstanceOk,
  rankSolutionCorrectText,
} from '../assets/js/core/linalg_generators.mjs';
import {
  RANK_SOLUTION_CONTRACT,
  generateRankSolutionFamily,
  solveRankSolutionFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';

// --- 18 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Beide Fälle teilen dieselben 9 Koeffizienten-Vierer (Stufenform
// 1 0 a b / 0 1 c d / 0 0 0 0, immer Rang 2 mit freier Variable). Regel:
// Kapsel weiten, nie Orakel umschreiben — der Sampler muss diese Bounds
// halten. Die kuratierte Rotation läuft mit Periode 4 über die Varianten
// (Variante i trägt die korrekte Antwort an Position i % 4).
const COEFFICIENT_ORACLES = [
  [2, 1, 3, 2],
  [1, 2, 4, 5],
  [3, -1, 2, -2],
  [2, 3, 5, 1],
  [4, 1, -3, 6],
  [1, -2, 3, 4],
  [5, 2, 1, -1],
  [2, -3, 4, 7],
  [3, 4, -2, 0],
];

const ABCD_IDS = ['a', 'b', 'c', 'd'];
const SYMBOLIC_IDS = ['rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero'];

// Kuratierte Rotationsfolge aus dem Content-Stand vor dem Strip (je Fall 9
// Varianten, korrekte Antwort an Position i % 4).
const ABCD_ROTATION = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd', 'a'];
const SYMBOLIC_ROTATION = [
  'rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero',
  'rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero', 'rank-two-free',
];

const CAPSULE_KEYS = ['core', 'stretch'];
const CASE_FOR = {
  core: 'echelon-read-rank-case',
  stretch: 'rank-system-authored',
};
const capsuleFor = (caseId) => RANK_SOLUTION_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-18: alle statischen Fälle form- und rotations-bestätigt', () => {
  assert.equal(COEFFICIENT_ORACLES.length, 9);
  COEFFICIENT_ORACLES.forEach((coeffs, index) => {
    const parameters = { systemCoefficients: coeffs };
    assert.ok(rankSolutionInstanceOk(parameters, capsuleFor('echelon-read-rank-case')), `abcd#${index}: Kapselform`);
    assert.ok(rankSolutionInstanceOk(parameters, capsuleFor('rank-system-authored')), `symbolic#${index}: Kapselform`);
    // Kuratierte Rotation: Variante i trägt die korrekte Antwort an Position i % 4.
    assert.equal(ABCD_ROTATION[index], ABCD_IDS[index % 4], `abcd#${index}: Rotationsposition`);
    assert.equal(SYMBOLIC_ROTATION[index], SYMBOLIC_IDS[index % 4], `symbolic#${index}: Rotationsposition`);
    assert.ok(Math.max(...coeffs.map((value) => Math.abs(value))) <= 7, `coeffs#${index}: im Bound`);
    assert.equal(rankSolutionCorrectText(parameters, capsuleFor('echelon-read-rank-case')), 'Rang 2, $z$ frei, unendlich viele Lösungen.', `abcd#${index}: Schlüsseltext`);
    assert.equal(rankSolutionCorrectText(parameters, capsuleFor('rank-system-authored')), 'Rang 2, eine freie Variable und unendlich viele Lösungen', `symbolic#${index}: Schlüsseltext`);
  });
});

test('Anker-Texte: kuratierte Basisfall-Schlüssel wörtlich im Template', () => {
  assert.equal(
    rankSolutionCorrectText(
      { systemCoefficients: [2, 3, -1, 2] }, RANK_SOLUTION_CAPSULES.core,
    ),
    'Rang 2, $z$ frei, unendlich viele Lösungen.',
  );
  assert.equal(
    rankSolutionCorrectText(
      { systemCoefficients: [2, 3, -1, 4] }, RANK_SOLUTION_CAPSULES.stretch,
    ),
    'Rang 2, eine freie Variable und unendlich viele Lösungen',
  );
});

test('Kapseltabelle: Arten, Bounds und Fallbindung', () => {
  assert.deepEqual(RANK_SOLUTION_CAPSULES.core, { kind: 'echelon-abcd', bound: 7, caseId: 'echelon-read-rank-case' });
  assert.deepEqual(RANK_SOLUTION_CAPSULES.stretch, { kind: 'echelon-symbolic', bound: 7, caseId: 'rank-system-authored' });
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_SOLUTION_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genRankSolutionCapsule(seed, capsule);
      assert.ok(rankSolutionInstanceOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, rankSolutionCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 2x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRankSolutionFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 2x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRankSolutionFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveRankSolutionFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 2x200: null Samples außerhalb der Kapselform', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = RANK_SOLUTION_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRankSolutionFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!rankSolutionInstanceOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  const idsFor = {
    core: ABCD_IDS,
    stretch: SYMBOLIC_IDS,
  };
  for (const key of CAPSULE_KEYS) {
    const counts = Object.fromEntries(idsFor[key].map((id) => [id, 0]));
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateRankSolutionFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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
    const capsule = RANK_SOLUTION_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genRankSolutionCapsule(seed, capsule);
      assert.deepEqual(first, genRankSolutionCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(rankSolutionInstanceOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(RANK_SOLUTION_CONTRACT.familyId, 'classify-rank-solution-case');
  assert.equal(RANK_SOLUTION_CONTRACT.authorityMode, 'seeded');
  assert.equal(RANK_SOLUTION_CONTRACT.activityType, 'single-choice');
  assert.deepEqual(RANK_SOLUTION_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.deepEqual(RANK_SOLUTION_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  const meta = {
    core: { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
    stretch: { masteryEligible: true, competencyIds: ['c-linalg-systems', 'c-linalg-gauss', 'c-linalg-independence'] },
  };
  for (const key of CAPSULE_KEYS) {
    const generated = generateRankSolutionFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveRankSolutionFamily(generated.parameters), { correctText: correct.text });
    assert.equal(generated.masteryEligible, meta[key].masteryEligible, `${key}: Mastery wie im Bestand`);
    assert.deepEqual(generated.competencyIds, meta[key].competencyIds, `${key}: Kompetenzen wie im Bestand`);
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateRankSolutionFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateRankSolutionFamily({ seed: 0, caseId: 'echelon-read-rank-case', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateRankSolutionFamily({ seed: 0, caseId: 'rank-system-authored', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateRankSolutionFamily({ seed: 0, caseId: 'rank-system-authored', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = LINALG_FAMILIES.instantiate('classify-rank-solution-case', 11, 'core', 'echelon-read-rank-case');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await LINALG_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await LINALG_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
