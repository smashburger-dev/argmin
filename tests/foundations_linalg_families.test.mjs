import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LINALG_DIFFICULTY_PROFILES,
  SCALAR_PRODUCT_CONTRACT,
  generateScalarProductFamily,
  solveScalarProduct,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import { sanitizePublicValue } from '../tools/public_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATIC_SOURCES = {
  'matmul-entry-w05-e1': 'w05-e1',
  'matmul-entry-w05-e12': 'w05-e12',
  'dot-product-w05-e13': 'w05-e13',
  'dot-product-w05-e3': 'w05-e3',
};

test('contract carries the canonical scalar-product identity', () => {
  assert.equal(SCALAR_PRODUCT_CONTRACT.familyId, 'formula-scalar-product');
  assert.equal(SCALAR_PRODUCT_CONTRACT.familyGroup, 'formula-apply');
  assert.equal(SCALAR_PRODUCT_CONTRACT.taskArchetype, 'numeric-exact');
  assert.equal(SCALAR_PRODUCT_CONTRACT.activityType, 'numeric');
  assert.deepEqual(SCALAR_PRODUCT_CONTRACT.difficultyProfiles, LINALG_DIFFICULTY_PROFILES);
  assert.deepEqual(SCALAR_PRODUCT_CONTRACT.competencyIds, ['c-linalg-matrices']);
  assert.ok(EXERCISE_FAMILIES.get('formula-scalar-product'), 'zentral registriert');
});

test('static cases pin w05 definitions byte-identically', () => {
  const w05 = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
  for (const [caseId, exerciseId] of Object.entries(STATIC_SOURCES)) {
    const definition = w05.exercises.find((entry) => entry.exerciseId === exerciseId);
    const generated = generateScalarProductFamily({ seed: 511, caseId, difficulty: 'core' });
    assert.equal(generated.prompt, definition.prompt, `${caseId}: Prompt`);
    assert.equal(generated.fullSolution, definition.fullSolution, `${caseId}: Lösung`);
    assert.deepEqual(generated.parameters.A ?? null, definition.parameters.A ?? null, `${caseId}: A`);
    assert.deepEqual(generated.parameters.B ?? null, definition.parameters.B ?? null, `${caseId}: B`);
    assert.deepEqual(generated.parameters.u ?? null, definition.parameters.u ?? null, `${caseId}: u`);
    assert.deepEqual(generated.parameters.v ?? null, definition.parameters.v ?? null, `${caseId}: v`);
    assert.deepEqual(generated.parameters.entry ?? null, definition.parameters.entry ?? null, `${caseId}: entry`);
  }
});

test('independent solver matches seeded and static expectations', () => {
  const w05 = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
  const expectations = { 'w05-e1': 1, 'w05-e12': -4, 'w05-e13': 22, 'w05-e3': -8 };
  for (const [caseId, exerciseId] of Object.entries(STATIC_SOURCES)) {
    const generated = generateScalarProductFamily({ seed: 3, caseId, difficulty: 'core' });
    assert.equal(generated.expected.value, expectations[exerciseId], `${caseId}: Erwartungswert`);
    assert.equal(solveScalarProduct(generated.parameters).value, expectations[exerciseId], `${caseId}: Solver`);
  }
  for (const seed of [1, 7, 42]) {
    for (const difficulty of LINALG_DIFFICULTY_PROFILES) {
      const generated = generateScalarProductFamily({ seed, caseId: 'matmul-entry-seeded', difficulty });
      const { A, B, entry } = generated.parameters;
      const [i, j] = entry;
      const want = A[i - 1][0] * B[0][j - 1] + A[i - 1][1] * B[1][j - 1];
      assert.equal(generated.expected.value, want, `seed ${seed} ${difficulty}: Generator-Solver`);
      assert.equal(solveScalarProduct(generated.parameters).value, want, `seed ${seed} ${difficulty}: Solver`);
    }
  }
});

test('seeded profiles hold their numeric bounds', () => {
  const peak = (parameters) => Math.max(
    ...parameters.A.flat().map((value) => Math.abs(value)),
    ...parameters.B.flat().map((value) => Math.abs(value)),
  );
  for (const seed of [5, 9, 13]) {
    const intro = generateScalarProductFamily({ seed, caseId: 'matmul-entry-seeded', difficulty: 'intro' });
    assert.ok(peak(intro.parameters) <= 2, `intro klein (seed ${seed})`);
    const challenge = generateScalarProductFamily({ seed, caseId: 'matmul-entry-seeded', difficulty: 'challenge' });
    assert.ok(peak(challenge.parameters) >= 4, `challenge groß (seed ${seed})`);
  }
});

test('central registry instantiates and grades the family', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 7, 'core', 'matmul-entry-seeded');
  assert.equal(instance.activityType, 'numeric');
  assert.equal(instance.masteryEligible, true);
  const right = await EXERCISE_FAMILIES.grade(instance, String(instance.expectedAnswer.value));
  const wrong = await EXERCISE_FAMILIES.grade(instance, String(instance.expectedAnswer.value + 1));
  assert.equal(right.correct, true);
  assert.equal(wrong.correct, false);
  assert.throws(() => LINALG_FAMILIES.instantiate('formula-scalar-product', 7, 'nase', 'matmul-entry-seeded'), /Unbekanntes Profil/);
  assert.throws(() => LINALG_FAMILIES.instantiate('formula-scalar-product', 7, 'core', 'w05-e16'), /Unbekannter Fall/);
});

test('linalg golden corpus is byte-identical over seeds 0-63', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/foundations-linalg-golden-corpus.json'), 'utf8'));
  const [firstSeed, lastSeed] = fixture.seedRange;
  const instances = [];
  for (const [familyId, caseTypes] of Object.entries(fixture.cases)) {
    for (const caseId of caseTypes) {
      for (const difficulty of fixture.difficultyProfiles) {
        for (let seed = firstSeed; seed <= lastSeed; seed += 1) {
          instances.push(LINALG_FAMILIES.instantiate(familyId, seed, difficulty, caseId));
        }
      }
    }
  }
  assert.equal(instances.length, fixture.instances);
  assert.equal(
    createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex'),
    fixture.digest,
  );
});

const LINALG_RUNTIME = {
  'classify-matrix-shape': ['shape-product-drawn', 'w05-e2'],
  'classify-independence-multiple': ['dependent-pair-double', 'w05-e4'],
  'construct-matvec-shape-contract': ['matvec-contract-order', 'w05-e14'],
  'transform-rank-dependence-rowops': ['rank-3x3-staircase', 'w05-e10'],
};

test('static choice, parsons and numeric cases pin w05 sources', () => {
  const w05 = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
  for (const [familyId, [caseId, exerciseId]] of Object.entries(LINALG_RUNTIME)) {
    const definition = w05.exercises.find((entry) => entry.exerciseId === exerciseId);
    const generated = EXERCISE_FAMILIES.instantiate(familyId, 3, 'core', caseId);
    assert.equal(generated.prompt, definition.prompt, `${caseId}: Prompt`);
    // Lösungen folgen der Public-Redaktion (Lehrbuch-Zitate entfallen wie
    // im Content-Pipeline-Ausgang).
    assert.equal(generated.fullSolution, sanitizePublicValue(definition.fullSolution), `${caseId}: Lösung`);
    if (definition.choices) {
      assert.deepEqual(
        generated.choices.map((choice) => [choice.id, choice.text, choice.correct]),
        definition.choices.map((choice) => [choice.id, choice.text, choice.correct]),
        `${caseId}: Optionen`,
      );
    }
    if (definition.parameters.fragments) {
      assert.deepEqual(generated.parameters.fragments, definition.parameters.fragments, `${caseId}: Fragmente`);
      assert.deepEqual(generated.parameters.initialOrder, definition.parameters.initialOrder, `${caseId}: Startfolge`);
    }
  }
});

test('static vector and shape cases pin w05 and w18 sources', () => {
  const w05 = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
  for (const [caseId, exerciseId, solution] of [
    ['system-w05-e11', 'w05-e11', [8, 4]],
    ['system-w05-e6', 'w05-e6', [1, 3]],
  ]) {
    const definition = w05.exercises.find((entry) => entry.exerciseId === exerciseId);
    const generated = EXERCISE_FAMILIES.instantiate('transform-system-2x2-elimination', 3, 'core', caseId);
    assert.equal(generated.prompt, definition.prompt, `${caseId}: Prompt`);
    assert.equal(generated.fullSolution, definition.fullSolution, `${caseId}: Lösung`);
    assert.deepEqual(generated.expectedAnswer.solution, solution, `${caseId}: Paar`);
  }
  const w18 = JSON.parse(readFileSync(join(root, 'content/exercises/w18.json'), 'utf8'));
  const definition = w18.exercises.find((entry) => entry.exerciseId === 'w18-e3');
  const generated = EXERCISE_FAMILIES.instantiate('validate-shape-contract', 3, 'core', 'shapes-w18-broadcast-axes');
  assert.equal(generated.prompt, definition.prompt, 'w18-e3: Prompt');
  assert.equal(generated.fullSolution, definition.fullSolution, 'w18-e3: Lösung');
  assert.equal(generated.parameters.snippet, definition.parameters.snippet, 'w18-e3: Snippet');
  assert.equal(generated.expectedAnswer.output, definition.expectedAnswer.output, 'w18-e3: Ausgabe');
});

test('seeded linalg cases solve, grade and hold profile bounds', async () => {
  for (const [familyId, caseId] of [
    ['formula-det2-independence', 'det2-seeded-columns'],
    ['transform-system-2x2-elimination', 'system-seeded-2x2'],
    ['validate-shape-contract', 'shapes-seeded-predict'],
  ]) {
    for (const difficulty of ['intro', 'core', 'stretch', 'challenge']) {
      const instance = EXERCISE_FAMILIES.instantiate(familyId, 11, difficulty, caseId);
      assert.ok(instance.prompt.length > 20, `${familyId}: Prompt`);
      assert.equal(instance.masteryEligible, true, `${familyId}: Mastery`);
    }
  }
  const det = EXERCISE_FAMILIES.instantiate('formula-det2-independence', 11, 'core', 'det2-seeded-columns');
  const detRight = await EXERCISE_FAMILIES.grade(det, String(det.expectedAnswer.value));
  assert.equal(detRight.correct, true);
  const sys = EXERCISE_FAMILIES.instantiate('transform-system-2x2-elimination', 11, 'core', 'system-seeded-2x2');
  const [x, y] = sys.expectedAnswer.solution;
  const sysRight = await EXERCISE_FAMILIES.grade(sys, `(${x}, ${y})`);
  assert.equal(sysRight.correct, true);
  const sysSwapped = await EXERCISE_FAMILIES.grade(sys, `(${y}, ${x})`);
  assert.equal(sysSwapped.correct, x === y ? true : false);
  const shape = EXERCISE_FAMILIES.instantiate('validate-shape-contract', 11, 'core', 'shapes-seeded-predict');
  const shapeRight = await EXERCISE_FAMILIES.grade(shape, shape.expectedAnswer.output);
  assert.equal(shapeRight.correct, true);
  const parsons = EXERCISE_FAMILIES.instantiate('construct-matvec-shape-contract', 3, 'core', 'matvec-contract-order');
  const parsonsRight = await EXERCISE_FAMILIES.grade(parsons, ['p1', 'p2', 'p3', 'p4', 'p5']);
  assert.equal(parsonsRight.correct, true);
  const parsonsWrong = await EXERCISE_FAMILIES.grade(parsons, ['p1', 'p3', 'p2', 'p4', 'p5']);
  assert.equal(parsonsWrong.correct, false);
});

test('w05 rest cases pin sources with per-case activity and grader', async () => {
  const w05 = JSON.parse(readFileSync(join(root, 'content/exercises/w05.json'), 'utf8'));
  const loop = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 7, 'core', 'scalar-loop-output');
  const loopDef = w05.exercises.find((entry) => entry.exerciseId === 'w05-e16');
  assert.equal(loop.activityType, 'predict-output');
  assert.equal(loop.prompt, loopDef.prompt);
  assert.equal(loop.fullSolution, loopDef.fullSolution);
  assert.equal(loop.parameters.snippet, loopDef.parameters.snippet);
  assert.equal(loop.expectedAnswer.output, loopDef.expectedAnswer.output);
  const loopGrade = await EXERCISE_FAMILIES.grade(loop, '[3, -1]');
  assert.equal(loopGrade.correct, true);
  const rationale = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 7, 'core', 'product-definition-rationale');
  const rationaleDef = w05.exercises.find((entry) => entry.exerciseId === 'w05-e9');
  assert.equal(rationale.activityType, 'short-rationale');
  assert.equal(rationale.graderId, 'manual-rubric');
  assert.equal(rationale.prompt, rationaleDef.prompt);
  assert.deepEqual(rationale.rubric, rationaleDef.rubric);
  assert.equal(rationale.parameters.minWords, 25);
  const code = EXERCISE_FAMILIES.instantiate('construct-matvec-shape-contract', 7, 'core', 'matvec-code-reference');
  const codeDef = w05.exercises.find((entry) => entry.exerciseId === 'w05-e8');
  assert.equal(code.activityType, 'python-code');
  assert.equal(code.graderId, 'pyodide');
  assert.equal(code.prompt, codeDef.prompt);
  assert.equal(code.parameters.starterCode, codeDef.parameters.starterCode);
  assert.equal(code.expectedAnswer.referenceSolver, codeDef.expectedAnswer.referenceSolver);
});

test('authored statics verify their own mathematics', async () => {
  const check = async (familyId, caseId) => {
    const instance = EXERCISE_FAMILIES.instantiate(familyId, 7, 'core', caseId);
    assert.equal(instance.choices.length, 4);
    assert.equal(instance.choices.filter((choice) => choice.correct).length, 1);
    const solved = await EXERCISE_FAMILIES.grade(
      instance,
      instance.choices.find((choice) => choice.correct).id,
    );
    assert.equal(solved.correct, true);
    const firstWrong = instance.choices.find((choice) => !choice.correct).id;
    const failed = await EXERCISE_FAMILIES.grade(instance, firstWrong);
    assert.equal(failed.correct, false);
    return instance;
  };
  const column = await check('classify-column-combination', 'column-coefficients-double');
  assert.ok(column.prompt.includes('(3,5)'));
  await check('classify-rank-solution-case', 'echelon-read-rank-case');
  await check('classify-row-operation-validity', 'valid-operation-rhs');
  await check('construct-linalg-contract-synthesis', 'synthesis-three-contracts');
});

test('rationale case grades word count and self-assessment without a worker', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('formula-scalar-product', 7, 'core', 'product-definition-rationale');
  const short = await EXERCISE_FAMILIES.grade(instance, { text: 'zu kurz', checks: [] });
  assert.equal(short.correct, false);
  assert.equal(short.errorType, 'invalid-input');
  const full = await EXERCISE_FAMILIES.grade(instance, {
    text: Array.from({ length: 30 }, (_, index) => `wort${index}`).join(' '),
    checks: ['r1', 'r2', 'r3', 'r4'],
  });
  assert.equal(full.correct, true);
  assert.equal(full.masteryEligible, false);
});
