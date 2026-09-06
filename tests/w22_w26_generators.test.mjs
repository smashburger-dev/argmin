import test from 'node:test';
import assert from 'node:assert/strict';
import { W22_W26_SEED_GENERATORS } from '../assets/js/core/w22_w26_generators.mjs';
import { hasLegacyGenerator } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Property tests for the W22-W26 seeded generators (ADR-0013), mirroring the
// data_ml generator contract:
//   1. determinism: same seed -> identical instance
//   2. wide answer space: >= 20 distinct expected values over 2000 seeds
//   3. semantic variation: >= 3 distinct prompt shapes per family
//   4. honesty: prompt never shows the answer as a standalone number
//   5. independent solvers re-derive `expected` from `parameters` alone
//   6. the fixed instances in wNN.json match the generator at the default seed

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genAttentionShape: (p) => (p.variant === 'score-cells'
    ? p.n * p.m
    : p.variant === 'output-cells' ? p.n * p.dv
      : p.variant === 'mask-cells' ? (p.n * (p.n - 1)) / 2
        : Math.sqrt(p.dk)),
  genVocabAfterMerges: (p) => (p.variant === 'total'
    ? p.chars + p.merges + p.specials
    : p.variant === 'merges-needed' ? p.target - p.chars - p.specials
      : p.target - p.chars - p.merges),
  genGreedyToken: (p) => (p.variant === 'argmax-position'
    ? 1 + p.logits.indexOf(Math.max(...p.logits))
    : p.variant === 'margin'
      ? [...p.logits].sort((a, b) => b - a)[0] - [...p.logits].sort((a, b) => b - a)[1]
      : p.init + p.steps),
  genLoraParamCount: (p) => (p.variant === 'lora'
    ? p.rank * (p.dIn + p.dOut)
    : p.variant === 'full' ? p.dIn * p.dOut
      : p.dIn * p.dOut - p.rank * (p.dIn + p.dOut)),
  genRelativeGain: (p) => (p.variant === 'pp-accuracy'
    ? p.newer - p.base
    : p.variant === 'relative-percent' ? Math.round((100 * (p.newer - p.base)) / p.base)
      : p.variant === 'error-reduction' ? Math.round((100 * (p.eBase - p.eNew)) / p.eBase)
        : p.c2 - p.c1),
};

for (const [name, generator] of Object.entries(W22_W26_SEED_GENERATORS)) {
  test(`w22-w26 ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 20260831]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`w22-w26 ${name}: >= 20 distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= 20, `${name} has only ${distinct.size} distinct answers`);
  });

  test(`w22-w26 ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    const shapes = new Set(SEEDS.slice(0, 400).map((seed) => {
      const { prompt } = generator(seed);
      return prompt.replace(/-?\d+/g, '#');
    }));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`w22-w26 ${name}: integer expected, prompt never shows it, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`w22-w26 ${name}: independent solver agrees on every seed`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
  });
}

test('w22-w26 generator registry is wired into the legacy adapter', () => {
  for (const name of Object.keys(W22_W26_SEED_GENERATORS)) {
    assert.equal(hasLegacyGenerator(name), true, `${name} missing in adapter registry`);
  }
  assert.equal(hasLegacyGenerator('genDoesNotExistW22'), false);
});

// The fixed prompt/expected documented in wNN.json must be exactly what the
// generator produces at the exercise's default seed (no seed drift).
const GENERATED_EXERCISES = [
  ['w22', 'w22-e2', 'genAttentionShape'],
  ['w23', 'w23-e2', 'genVocabAfterMerges'],
  ['w24', 'w24-e2', 'genGreedyToken'],
  ['w25', 'w25-e2', 'genLoraParamCount'],
  ['w26', 'w26-e2', 'genRelativeGain'],
];

test('wNN.json instances match their generator at the default seed', async () => {
  for (const [weekId, exerciseId, generatorName] of GENERATED_EXERCISES) {
    const pack = JSON.parse(await readFile(join(root, 'content', 'exercises', `${weekId}.json`), 'utf8'));
    const exercise = pack.exercises.find((item) => item.exerciseId === exerciseId);
    assert.ok(exercise, `${exerciseId} missing in ${weekId}.json`);
    assert.equal(exercise.parameters.seedGenerator, generatorName);
    const seed = exercise.deterministicSeed;
    const instance = W22_W26_SEED_GENERATORS[generatorName](seed);
    assert.equal(exercise.prompt, instance.prompt,
      `${exerciseId} prompt differs from generator output at seed ${seed}`);
    assert.equal(exercise.expectedAnswer.kind, 'seeded-integer');
    assert.equal(exercise.expectedAnswer.defaultSeed, seed);
    assert.equal(exercise.expectedAnswer.defaultExpected, instance.expected);
  }
});
