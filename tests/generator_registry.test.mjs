import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { graders } from '../assets/js/core/graders.js';
import { adaptLegacyExercise, hasLegacyGenerator, instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { SEED_GENERATORS } from '../assets/js/core/seed_generator_registry.mjs';
import { W01_SEED_GENERATORS } from '../assets/js/core/w01_generators.mjs';
import { genColumnCombination } from '../assets/js/core/w05_generators.mjs';
import { DATA_ML_SEED_GENERATORS } from '../assets/js/core/data_ml_generators.mjs';
import { W18_W21_SEED_GENERATORS } from '../assets/js/core/w18_w21_generators.mjs';
import { W22_W26_SEED_GENERATORS } from '../assets/js/core/w22_w26_generators.mjs';
import { W27_W30_SEED_GENERATORS } from '../assets/js/core/w27_w30_generators.mjs';
import { W31_W39_SEED_GENERATORS } from '../assets/js/core/w31_w39_generators.mjs';
import { FOUNDATIONS_FRESH_GENERATORS } from '../assets/js/core/foundations_fresh_generators.mjs';
import { LINALG_NUMPY_FRESH_GENERATORS } from '../assets/js/core/linalg_numpy_fresh_generators.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const registered = {
  ...W01_SEED_GENERATORS,
  genColumnCombination,
  ...DATA_ML_SEED_GENERATORS,
  ...W18_W21_SEED_GENERATORS,
  ...W22_W26_SEED_GENERATORS,
  ...W27_W30_SEED_GENERATORS,
  ...W31_W39_SEED_GENERATORS,
  ...FOUNDATIONS_FRESH_GENERATORS,
  ...LINALG_NUMPY_FRESH_GENERATORS,
};

const answerFor = (expected) => Array.isArray(expected) ? `(${expected.join(', ')})` : String(expected);

test('every registered generator resolves through compiler, adapter, grader and Preact session', async () => {
  const bundle = compileContent({ projectRoot: root, profile: 'public' });
  const compilerSource = readFileSync(join(root, 'tools/compile_content.mjs'), 'utf8');
  const sessionSource = readFileSync(join(root, 'src/adapters/exercise-session.ts'), 'utf8');
  assert.match(compilerSource, /hasLegacyGenerator\(exercise.generatorId\)/);
  assert.match(sessionSource, /instantiateLegacyExercise\(exercise, seed\)/);
  assert.deepEqual(Object.keys(SEED_GENERATORS).sort(), Object.keys(registered).sort());
  for (const definition of bundle.exerciseDefinitions.filter((item) => item.generatorId)) {
    assert.equal(hasLegacyGenerator(definition.generatorId), true, `${definition.definitionId}: compiler registry`);
  }
  for (const [generatorId, generator] of Object.entries(registered)) {
    assert.equal(SEED_GENERATORS[generatorId], generator, `${generatorId}: shared registry`);
    assert.equal(hasLegacyGenerator(generatorId), true, `${generatorId}: adapter registry`);
    const shipped = bundle.exerciseDefinitions.find((item) => item.generatorId === generatorId);
    const seed = shipped?.deterministicSeed ?? 1;
    const generated = generator(seed);
    const definition = shipped || {
      definitionId: `registry-${generatorId}`,
      version: 1,
      competencyIds: [],
      activityType: Array.isArray(generated.expected) ? 'vector' : 'numeric',
      graderId: 'deterministic',
      generatorId,
      referenceSolverId: null,
      deterministicSeed: seed,
      prompt: generated.prompt || generatorId,
      parameters: {},
      choices: [],
      expectedAnswer: { kind: Array.isArray(generated.expected) ? 'generated' : 'seeded-integer' },
    };
    const instance = instantiateLegacyExercise(definition, seed);
    assert.deepEqual(instance.parameters, generated.parameters, `${generatorId}: adapter parameters`);
    if (Array.isArray(generated.expected) || typeof generated.expected !== 'object') {
      assert.deepEqual(instance.expectedAnswer.value, generated.expected, `${generatorId}: adapter expected value`);
    } else {
      // ADR-0015 non-numeric shapes: the seeded expected object merges into
      // expectedAnswer ({ output } / { correctChoice }); grading proves parity.
      for (const [key, value] of Object.entries(generated.expected)) {
        assert.deepEqual(instance.expectedAnswer[key], value, `${generatorId}: adapter expected ${key}`);
      }
    }
    const type = definition.activityType;
    const answer = type === 'predict-output' ? generated.expected.output
      : type === 'single-choice' ? generated.expected.correctChoice
      : type === 'code-trace' ? Object.fromEntries((generated.parameters.variables || []).map((v) => [v.name, v.value]))
      : answerFor(generated.expected);
    const outcome = await graders.deterministic.grade(instance, answer);
    assert.equal(outcome.correct, true, `${generatorId}: deterministic grader`);
  }
});

test('unknown generator ids and invalid seeds fail closed before compilation or rendering', () => {
  assert.throws(() => adaptLegacyExercise({
    exerciseId: 'unknown-generator',
    type: 'numeric',
    grader: 'deterministic',
    deterministicSeed: 1,
    skillIds: [],
    parameters: { seedGenerator: 'missingGenerator' },
    expectedAnswer: { kind: 'seeded-integer', defaultSeed: 1, defaultExpected: 1 },
  }, 'w99'), /Unbekannter Legacy-Generator/);
  assert.throws(() => adaptLegacyExercise({
    exerciseId: 'invalid-seed',
    type: 'numeric',
    grader: 'deterministic',
    skillIds: [],
    parameters: { seedGenerator: 'genLinearEquation' },
    expectedAnswer: { kind: 'seeded-integer' },
  }, 'w99'), /deterministicSeed/);
});
