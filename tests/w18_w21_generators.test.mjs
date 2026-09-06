import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { W18_W21_SEED_GENERATORS } from '../assets/js/core/w18_w21_generators.mjs';
import {
  adaptLegacyExercise,
  hasLegacyGenerator,
  instantiateLegacyExercise,
} from '../assets/js/core/legacy_exercise_adapter.mjs';

// Property tests for the W18-W21 seeded generators (ADR-0013, NumPy-first).
// Gates re-seed these families, so variation must be meaningful:
//   1. determinism: same seed -> identical instance
//   2. wide answer space: >= 20 distinct expected values over 2000 seeds
//   3. semantic variation: >= 3 distinct prompt shapes per family
//   4. honesty: prompt never shows the answer as a standalone number
//   5. independent solvers re-derive `expected` from `parameters` alone
//   6. the wired adapter path instantiates the documented instance
//   7. the week files embed the exact default-seed instance (no seed drift)

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genLinearParamCount: (p) => (p.variant === 'single'
    ? p.d * p.h + p.h
    : p.variant === 'mlp'
      ? p.d * p.h1 + p.h1 + p.h1 * p.h2 + p.h2
      : (p.hWide - p.hNarrow) * (p.d + 1 + p.out)),
  genBackpropChain: (p) => (p.variant === 'path'
    ? p.locals.reduce((acc, g) => acc * g, 1)
    : p.variant === 'repeat'
      ? p.a ** p.n
      : p.branchA[0] * p.branchA[1] + p.branchB[0] * p.branchB[1]),
  genSgdSteps: (p) => (p.variant === 'plain'
    ? p.descending ? p.w0 - p.n * p.step : p.w0 + p.n * p.step
    : p.variant === 'epochs'
      ? p.epochs * Math.ceil(p.n / p.batch)
      : p.variant === 'until'
        ? Math.ceil((p.w0 - p.target) / p.step)
        : 2 * p.g - p.g / 2 ** (p.n - 1)),
  genDropoutCount: (p) => (p.variant === 'kept'
    ? p.mask.reduce((a, v) => a + v, 0)
    : p.variant === 'dropped'
      ? p.n - p.mask.reduce((a, v) => a + v, 0)
      : p.mask1.reduce((acc, v, i) => acc + (v && p.mask2[i] ? 1 : 0), 0)),
};

for (const [name, generator] of Object.entries(W18_W21_SEED_GENERATORS)) {
  test(`w18-w21 ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 20260831]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`w18-w21 ${name}: >= 20 distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= 20, `${name} has only ${distinct.size} distinct answers`);
  });

  test(`w18-w21 ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    const shapes = new Set(SEEDS.slice(0, 400).map((seed) => {
      const { prompt } = generator(seed);
      return prompt.replace(/-?\d+/g, '#');
    }));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`w18-w21 ${name}: prompt never shows the answer, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`w18-w21 ${name}: independent solver agrees on every seed`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
  });

  test(`w18-w21 ${name}: wired into the legacy adapter registry`, () => {
    assert.equal(hasLegacyGenerator(name), true, `${name} missing in adapter registry`);
    assert.equal(hasLegacyGenerator('genDoesNotExist'), false);
  });
}

// The e2 slot of every W18-W21 week pack is a generated numeric task: the
// JSON prompt must be the generator output at the documented default seed,
// and the adapter must instantiate exactly that instance (prompt + value).
const E2_CASES = [
  ['w18', 'exercises/w18.json', 'genLinearParamCount', 'w18-e2'],
  ['w19', 'exercises/w19.json', 'genBackpropChain', 'w19-e2'],
  ['w20', 'exercises/w20.json', 'genSgdSteps', 'w20-e2'],
  ['w21', 'exercises/w21.json', 'genDropoutCount', 'w21-e2'],
];

for (const [weekId, file, generatorName, exerciseId] of E2_CASES) {
  test(`w18-w21 ${exerciseId}: JSON instance matches ${generatorName} at the default seed`, () => {
    const pack = JSON.parse(readFileSync(join(root, 'content', file), 'utf8'));
    const exercise = pack.exercises.find((item) => item.exerciseId === exerciseId);
    assert.ok(exercise, `${exerciseId} missing in ${file}`);
    assert.equal(exercise.parameters.seedGenerator, generatorName);
    const seed = exercise.deterministicSeed;
    const instance = W18_W21_SEED_GENERATORS[generatorName](seed);
    assert.equal(exercise.prompt, instance.prompt, `${exerciseId}: prompt drift at seed ${seed}`);
    assert.equal(exercise.expectedAnswer.kind, 'seeded-integer');
    assert.equal(exercise.expectedAnswer.generator, generatorName);
    assert.equal(exercise.expectedAnswer.defaultSeed, seed);
    assert.equal(exercise.expectedAnswer.defaultExpected, instance.expected,
      `${exerciseId}: documented default expected drift`);

    // Adapter path: the wired runtime resolves the instance from the seed.
    const definition = adaptLegacyExercise(exercise, weekId);
    assert.equal(definition.generatorId, generatorName);
    const fixed = instantiateLegacyExercise(definition);
    assert.equal(fixed.prompt, instance.prompt);
    assert.equal(fixed.expectedAnswer.value, instance.expected);
    const freshSeed = seed + 977;
    const fresh = instantiateLegacyExercise(definition, freshSeed);
    assert.equal(fresh.expectedAnswer.value, W18_W21_SEED_GENERATORS[generatorName](freshSeed).expected);
    assert.notEqual(fresh.expectedAnswer.value, fixed.expectedAnswer.value,
      `${exerciseId}: re-seed did not change the instance`);
  });
}

test('w18-w21 generator registry covers the documented e2 families exactly', () => {
  assert.deepEqual(Object.keys(W18_W21_SEED_GENERATORS).sort(),
    ['genBackpropChain', 'genDropoutCount', 'genLinearParamCount', 'genSgdSteps']);
});
