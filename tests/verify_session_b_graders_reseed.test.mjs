// Session-B verification: integrated grader / registry / reseed solution
// (ADR-0015). Counterexamples against the shipped behavior, graded through
// the REAL call path (graders.deterministic.grade, instantiateLegacyExercise,
// drawFreshSeed, freshReviewRoute). Two kinds of tests:
//  - contract tests (green): pin the accepted/rejected behavior;
//  - DEFECT tests (red today): encode the fail-closed contract the ADR claims
//    ("Mengen-Literale werden als sortierte Multimenge verglichen",
//    fail-closed validation) — they pass once the parent fix lands.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { graders } from '../assets/js/core/graders.js';
import { instantiateLegacyExercise, validateGeneratedChoices } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { SEED_GENERATORS } from '../assets/js/core/seed_generator_registry.mjs';
import { drawFreshSeed } from '../assets/js/domain/fresh_seed.mjs';
import { freshReviewRoute } from '../assets/js/domain/review_route.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = SEED_GENERATORS;
const grade = (exercise, answer) => graders.deterministic.grade(exercise, answer);
const readDefinition = (path) => JSON.parse(readFileSync(join(root, 'content/exercise-definitions', path), 'utf8'));

const DEFINITIONS = [
  ['foundations/python-state-trace.json', 'genPythonStateTrace'],
  ['foundations/code-reading-output.json', 'genCodeReadingOutput'],
  ['foundations/function-compose.json', 'genFunctionCompose'],
  ['foundations/meta-error-classify.json', 'genMetaErrorClassify'],
  ['foundations/control-flow-output.json', 'genControlFlowOutput'],
  ['foundations/collection-step-trace.json', 'genCollectionStepTrace'],
  ['foundations/exception-boundary.json', 'genExceptionBoundary'],
  ['foundations/branch-coverage.json', 'genBranchCoverageCount'],
  ['foundations/git-next-action.json', 'genGitNextAction'],
  ['linear-algebra/matmul-entry-fresh.json', 'genMatmulEntryFresh'],
  ['linear-algebra/solve-system-fresh.json', 'genLinear2Fresh'],
  ['linear-algebra/det2-fresh.json', 'genDet2'],
  ['linear-algebra/shape-predict.json', 'genShapePredict'],
];

// Raw legacy week-pack shape: parameters carry the seedGenerator, the grader
// resolves the instance at the CURRENT deterministicSeed (seededInstance path).
const rawExercise = (type, generatorId, seed, extra = {}) => ({
  exerciseId: `verify-${generatorId}`,
  type,
  activityType: type,
  grader: 'deterministic',
  graderId: 'deterministic',
  deterministicSeed: seed,
  parameters: { seedGenerator: generatorId },
  feedbackRules: [],
  ...extra,
});

// --- 1. validateGeneratedChoices (fail-closed shape gate) ----------------------

test('validateGeneratedChoices rejects every malformed shape', () => {
  const cases = {
    'empty array': [],
    'not an array': 'nope',
    'single choice': [{ id: 'a', text: 'x', correct: true }],
    'two correct': [
      { id: 'a', text: 'x', correct: true },
      { id: 'b', text: 'y', correct: true },
    ],
    'zero correct': [
      { id: 'a', text: 'x', correct: false },
      { id: 'b', text: 'y', correct: false },
    ],
    'duplicate ids': [
      { id: 'a', text: 'x', correct: true },
      { id: 'a', text: 'y', correct: false },
    ],
    'missing text': [
      { id: 'a', text: '', correct: true },
      { id: 'b', text: 'y', correct: false },
    ],
    'whitespace-only text': [
      { id: 'a', text: '   ', correct: true },
      { id: 'b', text: 'y', correct: false },
    ],
    'correct as string': [
      { id: 'a', text: 'x', correct: 'true' },
      { id: 'b', text: 'y', correct: false },
    ],
    'numeric id': [
      { id: 1, text: 'x', correct: true },
      { id: 2, text: 'y', correct: false },
    ],
    'null entry': [{ id: 'a', text: 'x', correct: true }, null],
  };
  for (const [name, choices] of Object.entries(cases)) {
    assert.throws(() => validateGeneratedChoices(choices, 'ctx'), { name: 'Error' }, `${name} must throw`);
  }
  // The one valid shape passes (guard against an over-strict gate).
  assert.doesNotThrow(() => validateGeneratedChoices([
    { id: 'a', text: 'x', correct: true },
    { id: 'b', text: 'y', correct: false },
  ], 'ctx'));
});

test('adapter fails closed when a generator returns choices for a non-single-choice type', () => {
  const def = readDefinition('foundations/git-next-action.json');
  for (const activityType of ['predict-output', 'code-trace', 'numeric', 'vector']) {
    assert.throws(
      () => instantiateLegacyExercise({ ...def, activityType }, 5),
      { name: 'Error', message: /Generator liefert Choices/ },
      `${activityType} must reject generator choices`,
    );
  }
});

// --- 2. canonicalRepr acceptance matrix through the real grader ------------------

// Raw code-trace exercise driven by the real genCollectionStepTrace generator.
const rawTrace = (seed) => rawExercise('code-trace', 'genCollectionStepTrace', seed);
const traceVars = (seed) => F.genCollectionStepTrace(seed).parameters.variables;
const traceAnswers = (seed, mapValue = (v) => v.value) =>
  Object.fromEntries(traceVars(seed).map((v) => [v.name, mapValue(v)]));
const findTraceSeed = (family) => {
  for (let seed = 1; seed <= 200; seed++) {
    if (F.genCollectionStepTrace(seed).parameters.family === family) return seed;
  }
  throw new Error(`no seed found for family ${family}`);
};

// Synthetic code-trace definition (no generator) for repr shapes the current
// generators do not emit — graded through the same gradeCodeTrace path.
const syntheticTrace = (value) => ({
  exerciseId: 'verify-repr',
  type: 'code-trace',
  activityType: 'code-trace',
  grader: 'deterministic',
  graderId: 'deterministic',
  deterministicSeed: 1,
  parameters: { variables: [{ name: 'x', type: 'repr', value }] },
});

test('canonicalRepr via genCollectionStepTrace: spacing, quotes and set order are not semantic', async () => {
  const listSeed = findTraceSeed('list-mutate');
  assert.equal((await grade(rawTrace(listSeed), traceAnswers(listSeed, (v) => String(v.value).replace(/, /g, ',')))).correct, true, 'tight "[1,2]" accepted');
  assert.equal((await grade(rawTrace(listSeed), traceAnswers(listSeed, (v) => String(v.value).replace(/, /g, ',  ')))).correct, true, 'double-space "[1,  2]" accepted');
  assert.equal((await grade(rawTrace(listSeed), traceAnswers(listSeed, (v) => String(v.value).replace(/ /g, '   ')))).correct, true, 'heavy whitespace accepted');

  const dictSeed = findTraceSeed('dict-steps');
  assert.equal((await grade(rawTrace(dictSeed), traceAnswers(dictSeed, (v) => String(v.value).replace(/'/g, '"')))).correct, true, 'double-quoted dict {"a": 1} accepted');
  assert.equal((await grade(rawTrace(dictSeed), traceAnswers(dictSeed, (v) => String(v.value).replace(': ', ':')))).correct, true, 'colon without space accepted');

  const setSeed = findTraceSeed('set-steps');
  const reversedSet = traceAnswers(setSeed, (v) => {
    const inner = String(v.value).match(/^\{(.*)\}$/);
    return inner ? `{${inner[1].split(', ').reverse().join(', ')}}` : v.value;
  });
  assert.equal((await grade(rawTrace(setSeed), traceAnswers(setSeed, (v) => String(v.value).replace(/, /g, ',  ')))).correct, true, 'set spacing accepted');
  assert.equal((await grade(rawTrace(setSeed), reversedSet)).correct, true, '{2, 1} equals {1, 2}: set order is not observable');
});

test('canonicalRepr acceptance matrix for repr shapes beyond the generator alphabet', async () => {
  // "['a','b']" — string lists, both quote styles
  assert.equal((await grade(syntheticTrace("['a', 'b']"), { x: "['a','b']" })).correct, true);
  assert.equal((await grade(syntheticTrace("['a', 'b']"), { x: '["a","b"]' })).correct, true);
  // '{1, 2}' vs '{2, 1}' — numeric sets stay order-free
  assert.equal((await grade(syntheticTrace('{1, 2}'), { x: '{2, 1}' })).correct, true);
  assert.equal((await grade(syntheticTrace('{2, 10}'), { x: '{10, 2}' })).correct, true, 'lexicographic set canonicalization is applied to both sides');
  // Nested lists: spacing-insensitive, order-sensitive (list order IS observable)
  assert.equal((await grade(syntheticTrace('[[1, 2], [3]]'), { x: '[[1,2],[3]]' })).correct, true);
  assert.equal((await grade(syntheticTrace('[[1, 2], [3]]'), { x: '[[3], [1, 2]]' })).correct, false, 'nested list order is semantic');
  // Dicts are equal values in Python regardless of insertion order:
  // {'a': 1, 'b': 2} == {'b': 2, 'a': 1} is True, and the trace asks for the
  // VALUE, never for a printed repr (ADR-0015 amendment: dict entries are
  // compared as a sorted multiset of "key: value" pairs).
  assert.equal((await grade(syntheticTrace("{'a': 1, 'b': 2}"), { x: "{'b': 2, 'a': 1}" })).correct, true, 'dict order is not semantic (Python ==)');
  assert.equal((await grade(syntheticTrace("{'a': [1, 2], 'b': 3}"), { x: "{'b': 3, 'a': [1, 2]}" })).correct, true, 'nested dict values survive entry sorting');
  assert.equal((await grade(syntheticTrace("{'a': 1, 'b': 2}"), { x: "{'a': 2, 'b': 1}" })).correct, false, 'different dict values stay wrong');
  // Trailing commas are legal Python literals
  assert.equal((await grade(syntheticTrace('[1, 2]'), { x: '[1, 2,]' })).correct, true, 'list trailing comma accepted');
  assert.equal((await grade(syntheticTrace("{'code', 'lern'}"), { x: "{'code', 'lern',}" })).correct, true, 'set trailing comma creates no phantom element');
  assert.equal((await grade(syntheticTrace("{'a': 1}"), { x: "{'a': 1,}" })).correct, true, 'dict trailing comma accepted');
  // Empty literals "{ }" / "[]" are readable and self-consistent …
  assert.equal((await grade(syntheticTrace('{}'), { x: '  {  }  ' })).correct, true);
  assert.equal((await grade(syntheticTrace('[]'), { x: '[]' })).correct, true);
  // … but do not collapse into each other or into the set() spelling
  assert.equal((await grade(syntheticTrace('{}'), { x: '[]' })).correct, false);
  assert.equal((await grade(syntheticTrace('[]'), { x: '{}' })).correct, false);
  assert.equal((await grade(syntheticTrace('{}'), { x: 'set()' })).correct, false);
  // Whitespace-only is unreadable -> invalid-input (not wrong-value)
  const blank = await grade(syntheticTrace('[1]'), { x: '   ' });
  assert.equal(blank.correct, false);
  assert.equal(blank.errorType, 'invalid-input');
  // "None"/"none" are readable strings: graded wrong, not rejected
  const none = await grade(syntheticTrace('[1]'), { x: 'None' });
  assert.equal(none.correct, false);
  assert.equal(none.errorType, 'wrong-value');
  const lower = await grade(syntheticTrace('[1]'), { x: 'none' });
  assert.equal(lower.correct, false);
  assert.equal(lower.errorType, 'wrong-value');
});

test('generator invariant: genCollectionStepTrace set literals never put a colon inside a string element', () => {
  // Proves the DEFECT below is unreachable through today's generator; nothing
  // at grader or adapter level enforces it (see counterexample test).
  let sets = 0;
  for (let seed = 1; seed <= 3000; seed++) {
    const inst = F.genCollectionStepTrace(seed);
    if (inst.parameters.family !== 'set-steps') continue;
    sets += 1;
    for (const variable of inst.parameters.variables) {
      for (const element of String(variable.value).match(/'[^']*'/g) || []) {
        assert.ok(!element.includes(':'), `seed ${seed} ${variable.name}: colon inside set element ${element}`);
      }
    }
  }
  assert.ok(sets > 100, 'set-steps family must actually be exercised');
});

test('DEFECT canonicalRepr: a set whose string elements contain a colon loses order-free comparison', async () => {
  // {"ki:lw", "a"} == {"a", "ki:lw"} as Python sets. The grader discriminates
  // set-vs-dict by "no colon between the braces" (graders.js canonicalRepr),
  // so the colon string routes this set into the order-SENSITIVE dict path and
  // grades an equal set wrong. Reachable via hand-authored code-trace content
  // (the adapter validates choices, never repr variable values).
  const exercise = {
    exerciseId: 'verify-colon-set',
    type: 'code-trace',
    activityType: 'code-trace',
    grader: 'deterministic',
    graderId: 'deterministic',
    deterministicSeed: 1,
    parameters: { variables: [{ name: 'm', type: 'repr', value: "{'ki:lw', 'a'}" }] },
  };
  const result = await grade(exercise, { m: "{'a', 'ki:lw'}" });
  assert.equal(result.correct, true, 'equal Python sets in different iteration order must grade correct');
});

test('DEFECT gradeCodeTrace: a seeded generator without variables vacuously grades every answer correct', async () => {
  // A code-trace exercise pointed at a non-trace family (here genPythonStateTrace,
  // a predict-output generator whose parameters carry a snippet but no
  // `variables`) replaces exercise.parameters wholesale; gradeCodeTrace then
  // loops over zero variables and returns correct=true for any answer. Fail
  // open — the house pattern for missing config is grader-error (gradeParsons:
  // missing solutionOrder; gradeChoice: no correct option).
  const raw = rawExercise('code-trace', 'genPythonStateTrace', 5);
  const rawResult = await grade(raw, { x: 'völlig falsch' });
  assert.equal(rawResult.correct, false, 'raw path must not pass a variable-less trace');
  assert.equal(rawResult.errorType, 'grader-error');

  const instance = instantiateLegacyExercise({
    definitionId: 'verify-vacuous-trace',
    activityType: 'code-trace',
    graderId: 'deterministic',
    deterministicSeed: 5,
    competencyIds: [],
    parameters: { seedGenerator: 'genPythonStateTrace' },
  }, 5);
  const instanceResult = await grade(instance, { x: 'völlig falsch' });
  assert.equal(instanceResult.correct, false, 'instantiated path must not pass a variable-less trace');
  assert.equal(instanceResult.errorType, 'grader-error');
});

// --- 3. gradePair with seedGenerator (vector / genLinear2Fresh) ------------------

test('gradePair: seeded system parameters follow the seed, stale statics are ignored, swap is diagnosed', async () => {
  // Static A/b from another instance must not survive the seeded resolution.
  const raw = (seed) => rawExercise('vector', 'genLinear2Fresh', seed, {
    parameters: { seedGenerator: 'genLinear2Fresh', A: [[9, 9], [9, 9]], b: [9, 9] },
  });
  for (const seed of [4201, 4202]) {
    const [x, y] = F.genLinear2Fresh(seed).expected;
    assert.equal((await grade(raw(seed), `(${x}, ${y})`)).correct, true, `seed ${seed}: generator solution accepted`);
    assert.equal((await grade(raw(seed), '(9, 9)')).correct, false, `seed ${seed}: stale static system answer rejected`);
    const swapped = await grade(raw(seed), `(${y}, ${x})`);
    assert.equal(swapped.correct, false);
    assert.equal(swapped.errorType, 'swapped');
    assert.match(String(swapped.diagnosis), /Reihenfolge/);
  }
});

test('gradePair: invalid deterministicSeed values coerce via >>> 0 deterministically instead of crashing', async () => {
  for (const bad of [-1, 2 ** 32 + 7]) {
    const coerced = bad >>> 0;
    const [x, y] = F.genLinear2Fresh(coerced).expected;
    const result = await grade(rawExercise('vector', 'genLinear2Fresh', bad), `(${x}, ${y})`);
    assert.equal(result.correct, true, `seed ${bad}: grades against the uint32-wrapped seed ${coerced}`);
    assert.notEqual(result.errorType, 'grader-error');
  }
});

// --- 4. gradeChoice with seedGenerator (single-choice / genGitNextAction) ---------

test('gradeChoice: the same choice id is right on one seed and wrong on another; static choices are ignored', async () => {
  // genGitNextAction rotates the correct position with the case
  // (caseIndex % 4): seed 0 -> 'a' correct, seed 1 -> 'b' correct.
  const raw = (seed) => rawExercise('single-choice', 'genGitNextAction', seed, {
    choices: [{ id: 'z', text: 'veraltete Option', correct: true }],
  });
  assert.equal((await grade(raw(0), 'a')).correct, true, 'seed 0: choice a correct');
  assert.equal((await grade(raw(1), 'a')).correct, false, 'seed 1: same choice id now wrong');
  assert.equal((await grade(raw(1), 'b')).correct, true, 'seed 1: rotated correct choice accepted');
  assert.equal((await grade(raw(0), 'z')).correct, false, 'stale static choice z must not win over the seeded choices');
});

// --- 5. gradePredictOutput with seedGenerator --------------------------------------

test('gradePredictOutput: expected output follows the seed and beats a stale expectedAnswer.output', async () => {
  const cases = [
    ['genPythonStateTrace', 11, 12],
    ['genShapePredict', 11, 12],
  ];
  for (const [generatorId, seedA, seedB] of cases) {
    const own = F[generatorId](seedA).expected.output;
    const other = F[generatorId](seedB).expected.output;
    assert.notEqual(own, other, 'precondition: the two seeds must produce different outputs');
    // Stale static output from another seed sits in expectedAnswer — the
    // seeded resolution must win.
    const raw = rawExercise('predict-output', generatorId, seedA, { expectedAnswer: { output: other } });
    assert.equal((await grade(raw, own)).correct, true, `${generatorId}: own-seed output accepted`);
    assert.equal((await grade(raw, other)).correct, false, `${generatorId}: other-seed output rejected`);
  }
  // Output normalization follows the seed too: tuple/comma spacing is free.
  const shape = rawExercise('predict-output', 'genShapePredict', 11);
  const tuple = F.genShapePredict(11).expected.output;
  assert.equal((await grade(shape, tuple.replace(', ', ','))).correct, true, '(5,4) equals (5, 4)');
  const state = rawExercise('predict-output', 'genPythonStateTrace', 11);
  const output = F.genPythonStateTrace(11).expected.output;
  assert.equal((await grade(state, output.replace(/ /g, '  '))).correct, true, 'doubled spaces inside the output line are not semantic');
});

// --- 6. instance path: instantiateLegacyExercise across all 13 families ------------

test('instantiateLegacyExercise: choices, parameters and expected flow from the generator for all 13 families x 5 seeds', () => {
  for (const [path, generatorId] of DEFINITIONS) {
    const definition = readDefinition(path);
    const generator = F[generatorId];
    const seeds = [definition.deterministicSeed, 7, 12345, 999999, 2];
    for (const seed of seeds) {
      const instance = instantiateLegacyExercise(definition, seed);
      const generated = generator(seed);
      assert.equal(instance.instanceId, `${definition.definitionId}:${seed}`, `${generatorId}@${seed}: instanceId format`);
      assert.deepEqual(instance.parameters, generated.parameters, `${generatorId}@${seed}: parameters`);
      if (generated.choices) {
        assert.deepEqual(instance.choices, generated.choices, `${generatorId}@${seed}: choices`);
        // choices must be re-generated, not passed through from the authored
        // definition (proven by emptying the authored ones).
        const stripped = instantiateLegacyExercise({ ...definition, choices: [] }, seed);
        assert.deepEqual(stripped.choices, generated.choices, `${generatorId}@${seed}: choices survive empty authored list`);
      }
      if (generated.prompt) assert.equal(instance.prompt, generated.prompt, `${generatorId}@${seed}: prompt`);
      const ea = instance.expectedAnswer;
      if (Array.isArray(generated.expected) || typeof generated.expected !== 'object') {
        assert.deepEqual(ea.value, generated.expected, `${generatorId}@${seed}: expected value`);
      } else {
        for (const [key, value] of Object.entries(generated.expected)) {
          assert.deepEqual(ea[key], value, `${generatorId}@${seed}: expected.${key}`);
        }
      }
    }
  }
});

test('instantiateLegacyExercise: every instance grades its own generated answer correct (13 families, seed != default)', async () => {
  for (const [path, generatorId] of DEFINITIONS) {
    const definition = readDefinition(path);
    const seed = (definition.deterministicSeed + 4783) % 1000000;
    const generated = F[generatorId](seed);
    const instance = instantiateLegacyExercise(definition, seed);
    const answer = definition.activityType === 'predict-output' ? generated.expected.output
      : definition.activityType === 'single-choice' ? generated.expected.correctChoice
        : definition.activityType === 'code-trace' ? Object.fromEntries(generated.parameters.variables.map((v) => [v.name, v.value]))
          : Array.isArray(generated.expected) ? `(${generated.expected.join(', ')})` : String(generated.expected);
    const gradedInstance = await grade(instance, answer);
    assert.equal(gradedInstance.correct, true, `${generatorId}@${seed} instance path`);
    // Raw path parity: same seed, same verdict.
    const gradedRaw = await grade({ ...definition, deterministicSeed: seed }, answer);
    assert.equal(gradedRaw.correct, true, `${generatorId}@${seed} raw path`);
  }
});

// --- 7. drawFreshSeed ----------------------------------------------------------------

test('drawFreshSeed: procedural families return the first draw in [1, 1000000] without comparing to the current seed', () => {
  // Pin of the shipped behavior: the procedural branch returns immediately and
  // never checks seed !== currentSeed — with a healthy random the identical
  // seed recurs with p = 1/1e6 per click (documented sharp edge, not a guard).
  // random() contract is [0, 1): floor(r * 1e6) in [0, 999999] -> seed in [1, 1000000].
  const toSeed = (n) => () => (n - 0.5) / 1_000_000; // draws seed n
  assert.equal(drawFreshSeed('genPythonStateTrace', 77, toSeed(78)), 78, 'first draw is returned as-is');
  assert.equal(drawFreshSeed('genPythonStateTrace', 77, toSeed(77)), 77, 're-drawing the CURRENT seed is not filtered for procedural families');
  const seen = new Set();
  for (let i = 0; i <= 1000; i++) {
    const seed = drawFreshSeed('genPythonStateTrace', 1, () => i / 1001);
    assert.ok(Number.isInteger(seed) && seed >= 1 && seed <= 1_000_000, `seed out of range: ${seed}`);
    seen.add(seed);
  }
  assert.equal(seen.has(0), false, 'seed 0 is never drawn');
});

test('drawFreshSeed: variant banks avoid the immediately previous case, including multi-try draws', () => {
  const caseOf = (seed) => F.genGitNextAction(seed).parameters.caseId;
  const randomReturning = (n) => () => (n - 0.5) / 1_000_000; // maps to seed n
  // First draw lands on the same case (seed 6 shares case 0) -> keeps trying.
  const sequence = [6, 12, 1];
  let i = 0;
  const drawn = drawFreshSeed('genGitNextAction', 0, () => {
    const n = sequence[i++];
    return (n - 0.5) / 1_000_000;
  });
  assert.equal(drawn, 1, 'same-case draws are skipped until a different case appears');
  assert.notEqual(caseOf(drawn), caseOf(0));
  // First draw is already a different case -> returned immediately.
  assert.equal(drawFreshSeed('genGitNextAction', 0, randomReturning(1)), 1);
  // Healthy pseudo-random sweep: no repeated case across many draws.
  let state = 987654321;
  const random = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return state / 2147483648;
  };
  for (let current = 0; current < 40; current++) {
    const fresh = drawFreshSeed('genGitNextAction', current, random);
    assert.notEqual(caseOf(fresh), caseOf(current), `case repeated for current seed ${current}`);
  }
});

test('drawFreshSeed: maxTries exhaustion returns the last candidate (documented fallback)', () => {
  // Docstring contract: "on a degenerate generator the last candidate is
  // returned so re-rolling never blocks the learner" — with a constant
  // random()=0.5 this re-serves the previous case (characterization).
  const caseOf = (seed) => F.genGitNextAction(seed).parameters.caseId;
  const sameCaseSeed = 6; // caseOf(6) === caseOf(0) === 'diff-unstaged'
  assert.equal(drawFreshSeed('genGitNextAction', 0, () => (sameCaseSeed - 0.5) / 1_000_000, 3), 6, 'last candidate after maxTries');
  // Degenerate const-0.5 random: procedural always 500001, bank repeats the case.
  assert.equal(drawFreshSeed('genPythonStateTrace', 42, () => 0.5), 500001);
  const degenerate = drawFreshSeed('genGitNextAction', 3, () => 0.5);
  assert.equal(caseOf(degenerate), caseOf(3), 'const-0.5 random re-serves the previous case (maxTries fallback)');
});

// --- 8. freshReviewRoute --------------------------------------------------------------

test('freshReviewRoute: deterministic per due key, no generator or non-exercise route stays unchanged, seed < 1000000', () => {
  const route = freshReviewRoute('#/exercise/w01-e8', 'genLinearEquation', 'w01-e8:2026-09-01');
  assert.match(route, /^#\/exercise\/w01-e8\?seed=\d+$/);
  assert.equal(route, freshReviewRoute('#/exercise/w01-e8', 'genLinearEquation', 'w01-e8:2026-09-01'), 'same due key -> same fresh instance');
  assert.notEqual(route, freshReviewRoute('#/exercise/w01-e8', 'genLinearEquation', 'w01-e8:2026-10-01'), 'next due period -> different instance');
  assert.equal(freshReviewRoute('#/exercise/w03-e1', null, 'x'), '#/exercise/w03-e1', 'no generator -> no seed param');
  assert.equal(freshReviewRoute('#/lab/w05-e8', 'genLinearEquation', 'x'), '#/lab/w05-e8', 'lab routes pass through');
  let maxSeed = 0;
  for (let i = 0; i < 5000; i++) {
    const seed = Number(freshReviewRoute('#/exercise/x1', 'genLinearEquation', `x1:${i}`).match(/seed=(\d+)$/)[1]);
    assert.ok(seed < 1_000_000, `seed must stay below 1000000, got ${seed}`);
    maxSeed = Math.max(maxSeed, seed);
  }
  assert.ok(maxSeed > 0);
});

// --- 9. Preact reseed UI path (ExerciseView + instantiateExercise) -----------

test('Preact reseed UI: generator-backed tasks draw a fresh seed and remount controls', () => {
  const source = readFileSync(join(root, 'src/ui/ExerciseView.tsx'), 'utf8');
  assert.match(source, /drawFreshSeed/);
  assert.match(source, /Neue Variante starten/);
  assert.ok(source.includes('AnswerControls key={`${exercise.definitionId}:${cycleRevision}`}'));
  const session = readFileSync(join(root, 'src/adapters/exercise-session.ts'), 'utf8');
  assert.match(session, /export function instantiateExercise/);
});

test('no shipped exercise pairs a seedGenerator with a non-reseedable control type', () => {
  // Preact remounts AnswerControls on a new cycle. Generator-backed tasks
  // of an excluded type would still be a content contract failure: the
  // control state (fragment order, starter code) is not a seeded redraw.
  const reseedable = new Set(['numeric', 'single-choice', 'vector', 'code-trace', 'predict-output']);
  const walk = (dir) => readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : (entry.endsWith('.json') ? [path] : []);
  });
  const offenders = [];
  for (const path of walk(join(root, 'content'))) {
    const parsed = JSON.parse(readFileSync(path, 'utf8'));
    const exercises = Array.isArray(parsed) ? parsed : parsed.exercises || [];
    for (const exercise of exercises) {
      const hasGenerator = exercise.parameters?.seedGenerator || exercise.generatorId;
      const type = exercise.type || exercise.activityType;
      if (hasGenerator && type && !reseedable.has(type)) {
        offenders.push(`${path}: ${exercise.exerciseId || exercise.definitionId} (${type})`);
      }
    }
  }
  assert.deepEqual(offenders, [], 'generator-backed exercises must use reseedable control types');
});
