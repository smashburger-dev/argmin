// Characterization tests for the Group D core contracts (Session A):
//   1. seed generator registry (exact ID set, freeze, resolution, fail-closed)
//   2. legacy exercise adapter (field mapping, instantiation, reference solvers)
//   3. grader registry (adapter keys, unknown-type fail-closed, seeded numeric path)
//   4. timed mastery + review scheduler (slot ladder [2,5,11], instance-key
//      semantics, solution-reveal locking, queue entries, param overrides)
//   5. EvidenceEngine state machine (thresholds, freshness, disqualification)
// All clocks and seeds are injected. No product code is mutated on disk; the
// red proof rewrites module sources in flight through an ESM load hook only.
//
// NOTE on duplicate generator IDs: the `Doppelte Generator-ID` throw in
// seed_generator_registry.mjs fires during module evaluation over a
// closure-local map. Once the module is loaded, the exported registry is
// frozen and the throw can no longer be triggered — not even via object
// manipulation, and a second import is served from the ESM cache. A test
// therefore cannot simulate the duplicate-ID throw; we pin the next-best
// invariant instead: the exported registry is frozen (Object.isFrozen) and
// rejects mutation in strict mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SEED_GENERATORS, hasSeedGenerator, resolveSeedGenerator,
} from '../assets/js/core/seed_generator_registry.mjs';
import { W01_SEED_GENERATORS } from '../assets/js/core/w01_generators.mjs';
import { genColumnCombination } from '../assets/js/core/w05_generators.mjs';
import { DATA_ML_SEED_GENERATORS } from '../assets/js/core/data_ml_generators.mjs';
import { W18_W21_SEED_GENERATORS } from '../assets/js/core/w18_w21_generators.mjs';
import { W22_W26_SEED_GENERATORS } from '../assets/js/core/w22_w26_generators.mjs';
import { W27_W30_SEED_GENERATORS } from '../assets/js/core/w27_w30_generators.mjs';
import { W31_W39_SEED_GENERATORS } from '../assets/js/core/w31_w39_generators.mjs';
import {
  adaptLegacyExercise, instantiateLegacyExercise,
} from '../assets/js/core/legacy_exercise_adapter.mjs';
import { graders } from '../assets/js/core/graders.js';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';
import {
  DEFAULT_REVIEW_PARAMS, MASTERY_MAX_HINTS, WEEK_MS, DAY_MS,
  resolveReviewParams, reviewStateFromAttempts,
  buildReviewQueueEntry,
} from '../assets/js/core/review_scheduler.js';
import { EvidenceEngine } from '../assets/js/domain/evidence_engine.mjs';
import { FOUNDATIONS_FRESH_GENERATORS } from '../assets/js/core/foundations_fresh_generators.mjs';
import { LINALG_NUMPY_FRESH_GENERATORS } from '../assets/js/core/linalg_numpy_fresh_generators.mjs';

// ===========================================================================
// 1. Seed generator registry
// ===========================================================================

// Exact registry snapshot (Session A + Session B): 51 IDs total, composed of
// w01(4) + genColumnCombination(1) + data-ml(14) + w18-21(4) + w22-26(5)
// + w27-30(5) + w31-39(6) + foundations-fresh(9) + linalg-numpy-fresh(4).
// Session B (ADR-0015) added the last 13 fresh-variation generators.
const EXPECTED_GENERATOR_IDS = [
  'genLinearEquation', 'genPowerExpr', 'genLogExpr', 'genLinearBothSides',
  'genColumnCombination',
  'genCompleteRows', 'genDedupRows', 'genConditionalCount',
  'genMseGradient', 'genBaselineCorrect', 'genMseFromResiduals', 'genR2Share',
  'genConfusionCount', 'genCvSpread', 'genSubgroupGapPp', 'genShrinkagePercent', 'genSeedSpread',
  'genEnsembleAccuracy', 'genPcaVariancePercent', 'genLinearParamCount',
  'genBackpropChain', 'genSgdSteps', 'genDropoutCount', 'genAttentionShape',
  'genVocabAfterMerges', 'genGreedyToken', 'genLoraParamCount',
  'genRelativeGain', 'genRecallAtK', 'genChunkCount', 'genF1orPrecision',
  'genInjectionFlagCount', 'genAllowedActionCount', 'genProtocolShifts',
  'genCardAudit', 'genSubgroupCost', 'genBaselineLedger', 'genPipelineStages',
  'genEvalRates',
  'genPythonStateTrace', 'genCodeReadingOutput', 'genFunctionCompose',
  'genControlFlowOutput', 'genCollectionStepTrace', 'genMetaErrorClassify',
  'genExceptionBoundary', 'genBranchCoverageCount', 'genGitNextAction',
  'genMatmulEntryFresh', 'genLinear2Fresh', 'genDet2', 'genShapePredict',
];

test('registry: exactly 52 generator IDs with documented per-source composition', () => {
  assert.equal(Object.keys(SEED_GENERATORS).length, 52);
  assert.deepEqual(
    Object.keys(SEED_GENERATORS).sort(),
    [...EXPECTED_GENERATOR_IDS].sort(),
  );
  // Composition: every source module is fully merged, nothing dropped.
  const union = {
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
  assert.deepEqual(Object.keys(SEED_GENERATORS).sort(), Object.keys(union).sort());
  assert.equal(Object.keys(W01_SEED_GENERATORS).length, 4);
  assert.equal(Object.keys(DATA_ML_SEED_GENERATORS).length, 14);
  assert.equal(Object.keys(W18_W21_SEED_GENERATORS).length, 4);
  assert.equal(Object.keys(W22_W26_SEED_GENERATORS).length, 5);
  assert.equal(Object.keys(W27_W30_SEED_GENERATORS).length, 5);
  assert.equal(Object.keys(W31_W39_SEED_GENERATORS).length, 6);
  assert.equal(Object.keys(FOUNDATIONS_FRESH_GENERATORS).length, 9);
  assert.equal(Object.keys(LINALG_NUMPY_FRESH_GENERATORS).length, 4);
});

test('registry: SEED_GENERATORS is frozen — duplicate registration cannot be simulated post-load', () => {
  // The duplicate-ID throw is module-load-only (closure-local map), so it is
  // unreachable after load. The frozen export is the observable guard.
  assert.equal(Object.isFrozen(SEED_GENERATORS), true);
  assert.throws(() => { SEED_GENERATORS.genEvil = () => ({}); }, TypeError);
  assert.throws(() => { delete SEED_GENERATORS.genLinearEquation; }, TypeError);
  assert.equal(Object.keys(SEED_GENERATORS).length, 52);
  assert.equal(typeof SEED_GENERATORS.genLinearEquation, 'function');
});

test('registry: hasSeedGenerator accepts exactly the registered string IDs', () => {
  for (const id of EXPECTED_GENERATOR_IDS) {
    assert.equal(hasSeedGenerator(id), true, id);
  }
  // Unknown, empty, non-string and prototype keys are all rejected.
  assert.equal(hasSeedGenerator('genDoesNotExist'), false);
  assert.equal(hasSeedGenerator('genLinearEquationTypo'), false);
  assert.equal(hasSeedGenerator(''), false);
  assert.equal(hasSeedGenerator(null), false);
  assert.equal(hasSeedGenerator(undefined), false);
  assert.equal(hasSeedGenerator(42), false);
  assert.equal(hasSeedGenerator({}), false);
  assert.equal(hasSeedGenerator('toString'), false);      // own-check, not in
  assert.equal(hasSeedGenerator('constructor'), false);
});

test('registry: resolveSeedGenerator returns the identical function, throws on unknown IDs', () => {
  assert.equal(resolveSeedGenerator('genLinearEquation'), W01_SEED_GENERATORS.genLinearEquation);
  assert.equal(resolveSeedGenerator('genColumnCombination'), genColumnCombination);
  assert.throws(() => resolveSeedGenerator('genDoesNotExist'), /Unbekannter Legacy-Generator genDoesNotExist/);
  assert.throws(() => resolveSeedGenerator(''), /Unbekannter Legacy-Generator/);
  assert.throws(() => resolveSeedGenerator(42), /Unbekannter Legacy-Generator/);
  assert.throws(() => resolveSeedGenerator(null), /Unbekannter Legacy-Generator/);
});

// ===========================================================================
// 2. Legacy exercise adapter
// ===========================================================================

const legacyExercise = () => ({
  exerciseId: 'w05-e2',
  schemaVersion: 2,
  locale: 'de',
  title: 'Spaltenkombination',
  skillIds: ['c-linalg-matrices', 'c-linalg-vectors'],
  type: 'vector',
  grader: 'deterministic',
  deterministicSeed: 511,
  prompt: 'Bestimme die Koeffizienten.',
  parameters: { A: [[1, 2], [3, 4]] },
  choices: [{ id: 'a', correct: false }],
  expectedAnswer: { kind: 'seeded-integer', defaultSeed: 511 },
  tolerancePolicy: { absolute: 0 },
  hints: ['Denke an Rang'],
  feedbackRules: [{ if: 'value === 1', then: 'Anders herum.' }],
  fullSolution: 'Loese das System.',
  difficulty: 2,
  estimatedMinutes: 6,
  sourceLineage: { statement: 'adaptiert nach Goetz', seed: 77 },
  validationStatus: 'browser-verified 2026-08-24',
  testedSeedCount: 40,
  workedExample: { steps: ['s1'] },
  rubric: null,
  typicalErrors: ['sign'],
});

test('adapter: adaptLegacyExercise maps every legacy field onto the definition contract', () => {
  const d = adaptLegacyExercise(legacyExercise(), 'w05');
  assert.deepEqual(d, {
    definitionId: 'w05-e2',
    version: 2,
    locale: 'de',
    title: 'Spaltenkombination',
    competencyIds: ['c-linalg-matrices', 'c-linalg-vectors'],
    activityType: 'vector',
    graderId: 'deterministic',
    generatorId: null,
    referenceSolverId: null,
    deterministicSeed: 511,
    prompt: 'Bestimme die Koeffizienten.',
    parameters: { A: [[1, 2], [3, 4]] },
    choices: [{ id: 'a', correct: false }],
    expectedAnswer: { kind: 'seeded-integer', defaultSeed: 511 },
    tolerancePolicy: { absolute: 0 },
    hints: ['Denke an Rang'],
    feedbackRules: [{ if: 'value === 1', then: 'Anders herum.' }],
    fullSolution: 'Loese das System.',
    difficulty: 2,
    estimatedMinutes: 6,
    sourceLineage: { statement: 'adaptiert nach Goetz', seed: 77 },
    rightsId: 'ki-lernplattform-original',
    releaseStatus: 'browser-verified',
    testedSeedCount: 40,
    masteryEligible: true,
    active: true,
    legacyWeekId: 'w05',
    workedExample: { steps: ['s1'] },
    rubric: null,
    typicalErrors: ['sign'],
  });
});

test('adapter: defaults for sparse legacy exercises, clone-isolated from the source', () => {
  const src = {
    exerciseId: 'w01-e1',
    type: 'numeric',
    grader: 'deterministic',
    deterministicSeed: 7,
    parameters: { seedGenerator: 'genLinearEquation' },
  };
  const d = adaptLegacyExercise(src, 'w01');
  assert.equal(d.version, 1);            // no schemaVersion -> 1
  assert.equal(d.locale, 'de');
  assert.equal(d.title, 'w01-e1');       // title falls back to exerciseId
  assert.deepEqual(d.competencyIds, []);
  assert.equal(d.generatorId, 'genLinearEquation');
  assert.equal(d.referenceSolverId, null);
  assert.equal(d.deterministicSeed, 7);
  assert.deepEqual(d.parameters, { seedGenerator: 'genLinearEquation' });
  assert.deepEqual(d.choices, []);
  assert.equal(d.expectedAnswer, null);  // expectedAnswer ?? null
  assert.deepEqual(d.tolerancePolicy, {});
  assert.deepEqual(d.hints, []);
  assert.deepEqual(d.feedbackRules, []);
  assert.equal(d.fullSolution, '');
  assert.equal(d.difficulty, 1);
  assert.equal(d.estimatedMinutes, 1);
  assert.deepEqual(d.sourceLineage, { statement: 'eigenständig entwickelt', seed: 7 });
  assert.equal(d.rightsId, 'ki-lernplattform-original');
  assert.equal(d.releaseStatus, 'draft'); // validationStatus missing
  assert.equal(d.testedSeedCount, 0);
  assert.equal(d.masteryEligible, true);
  assert.equal(d.active, true);
  assert.equal(d.legacyWeekId, 'w01');
  assert.equal(d.workedExample, null);
  assert.equal(d.rubric, null);
  assert.equal(d.typicalErrors, null);
  // Clone isolation: mutating the adapter output never leaks into the legacy source.
  d.parameters.seedGenerator = 'mutated';
  d.choices.push({ id: 'x' });
  assert.deepEqual(src.parameters, { seedGenerator: 'genLinearEquation' });
  assert.equal(src.choices, undefined);
});

test('adapter: deterministicSeed is mandatory — invalid seeds throw, numeric strings coerce', () => {
  assert.throws(() => adaptLegacyExercise(null, 'w01'), TypeError);
  assert.throws(() => adaptLegacyExercise('nope', 'w01'), TypeError);
  assert.throws(() => adaptLegacyExercise({ type: 'numeric' }, 'w01'), /Legacy-Aufgabe ohne exerciseId/);
  const base = { exerciseId: 's', type: 'numeric', grader: 'deterministic' };
  for (const bad of [undefined, 'abc', 1.5, -0.5, NaN, Infinity]) {
    assert.throws(() => adaptLegacyExercise({ ...base, deterministicSeed: bad }, 'w01'),
      /deterministicSeed ist ungültig/, `seed ${String(bad)}`);
  }
  // Documented Number() coercion: numeric strings (and null) become seeds.
  assert.equal(adaptLegacyExercise({ ...base, deterministicSeed: '42' }, 'w01').deterministicSeed, 42);
  assert.equal(adaptLegacyExercise({ ...base, deterministicSeed: '0x10' }, 'w01').deterministicSeed, 16);
  assert.equal(adaptLegacyExercise({ ...base, deterministicSeed: null }, 'w01').deterministicSeed, 0);
  assert.equal(adaptLegacyExercise({ ...base, deterministicSeed: 0 }, 'w01').deterministicSeed, 0);
});

test('adapter: unknown generator ids fail closed; releaseStatus and masteryEligible rules', () => {
  const withGen = (generator, grader = 'deterministic') => ({
    exerciseId: 'g', type: 'numeric', grader, deterministicSeed: 1,
    parameters: { seedGenerator: generator },
  });
  assert.throws(() => adaptLegacyExercise(withGen('missingGenerator'), 'w01'), /Unbekannter Legacy-Generator missingGenerator/);
  assert.throws(() => adaptLegacyExercise({
    exerciseId: 'g2', type: 'numeric', grader: 'deterministic', deterministicSeed: 1,
    expectedAnswer: { generator: 'alsoMissing' },
  }, 'w01'), /Unbekannter Legacy-Generator alsoMissing/);
  // masteryEligible: manual-rubric never qualifies; explicit false wins.
  assert.equal(adaptLegacyExercise({ ...withGen('genLinearEquation', 'manual-rubric') }, 'w01').masteryEligible, false);
  const explicitFalse = adaptLegacyExercise({
    exerciseId: 'g3', type: 'numeric', grader: 'deterministic', deterministicSeed: 1, masteryEligible: false,
  }, 'w01');
  assert.equal(explicitFalse.masteryEligible, false);
  assert.equal(adaptLegacyExercise({ ...withGen('genLinearEquation'), active: false }, 'w01').active, false);
});

test('adapter: instantiateLegacyExercise without generator keeps parameters; instanceId is definitionId:seed', () => {
  const def = adaptLegacyExercise({
    exerciseId: 'fix-e1', schemaVersion: 3, type: 'numeric', grader: 'deterministic',
    deterministicSeed: 9, prompt: 'Fest.', skillIds: ['c-1'],
    parameters: { fixed: { x: 1 } }, expectedAnswer: { kind: 'integer', value: 4 },
    fullSolution: 'Lösung.',
  }, 'w02');
  const inst = instantiateLegacyExercise(def);
  assert.equal(inst.instanceId, 'fix-e1:9');           // `${definitionId}:${seed}`
  assert.equal(inst.seed, 9);
  assert.equal(inst.deterministicSeed, 9);             // default seed = definition seed
  assert.deepEqual(inst.parameters, { fixed: { x: 1 } }); // unchanged, no generator
  assert.equal(inst.prompt, 'Fest.');
  assert.equal(inst.fullSolution, 'Lösung.');
  assert.equal(inst.exerciseId, 'fix-e1');
  assert.equal(inst.definitionId, 'fix-e1');
  assert.equal(inst.definitionVersion, 3);
  assert.deepEqual(inst.skillIds, ['c-1']);
  assert.deepEqual(inst.competencyIds, ['c-1']);
  assert.equal(inst.grader, 'deterministic');
  assert.equal(inst.graderId, 'deterministic');
  assert.equal(inst.type, 'numeric');
  assert.equal(inst.activityType, 'numeric');
  // No generator/solver path: expectedAnswer is a plain clone, kind is NOT defaulted.
  assert.deepEqual(inst.expectedAnswer, { kind: 'integer', value: 4 });
  // Explicit seed overrides the definition seed and the instanceId.
  const other = instantiateLegacyExercise(def, 77);
  assert.equal(other.instanceId, 'fix-e1:77');
  assert.equal(other.seed, 77);
  // Clone isolation between definition and instances.
  inst.parameters.fixed.x = 99;
  assert.deepEqual(def.parameters, { fixed: { x: 1 } });
});

test('adapter: with generatorId the instance is rebuilt from the generator (parameters, prompt, expected)', async () => {
  const def = adaptLegacyExercise({
    exerciseId: 'gen-e1', type: 'numeric', grader: 'deterministic', deterministicSeed: 2,
    prompt: 'Alter Prompt.', fullSolution: 'Alte Lösung.',
    parameters: { seedGenerator: 'genLinearEquation' },
    expectedAnswer: { kind: 'seeded-integer' },
  }, 'w01');
  const inst = instantiateLegacyExercise(def, 2); // genLinearEquation(2): x = -3
  assert.equal(inst.instanceId, 'gen-e1:2');
  assert.deepEqual(inst.parameters, { shape: 'both-sides', a: 4, b: 9, c: 6, d: 15 });
  assert.equal(inst.prompt, 'Löse die Gleichung 4x + 9 = 6x + 15. Gib den Wert von x als ganze Zahl ein.');
  assert.equal(inst.fullSolution, 'Alte Lösung.'); // generator ships no fullSolution
  assert.equal(inst.expectedAnswer.kind, 'seeded-integer');
  assert.equal(inst.expectedAnswer.value, -3);      // expected adopted from the generator
  assert.equal(inst.expectedAnswer.generator, undefined); // solver metadata not copied
  // Scalar expected grades correctly through the deterministic grader.
  assert.equal((await graders.deterministic.grade(inst, '-3')).correct, true);
  // genColumnCombination: array expected fills value AND solution, prompt and
  // fullSolution are replaced because the generator ships both.
  const def2 = adaptLegacyExercise({
    exerciseId: 'gen-e2', type: 'vector', grader: 'deterministic', deterministicSeed: 7,
    prompt: 'Alt.', parameters: { seedGenerator: 'genColumnCombination' },
    expectedAnswer: { kind: 'seeded-integer' },
  }, 'w05');
  const inst2 = instantiateLegacyExercise(def2, 7);
  assert.deepEqual(inst2.parameters, { A: [[4, 2], [-1, -2]], b: [-52, 25] });
  assert.equal(inst2.prompt, 'Die Spalten von A sind a₁ = (4, -1) und a₂ = (2, -2). Finde die Koeffizienten (x₁, x₂), sodass x₁·a₁ + x₂·a₂ = (-52, 25).');
  assert.match(inst2.fullSolution, /Die Koeffizienten sind/);
  assert.deepEqual(inst2.expectedAnswer.value, [-9, -8]);
  assert.deepEqual(inst2.expectedAnswer.solution, [-9, -8]);
});

test('adapter: reference solvers compute expected from the parameters', () => {
  const solverCase = (generator, parameters, expectedValue) => {
    const def = adaptLegacyExercise({
      exerciseId: `ref-${generator}`, type: 'numeric', grader: 'deterministic',
      deterministicSeed: 1, parameters,
      expectedAnswer: { kind: 'integer', generator },
    }, 'w05');
    assert.equal(def.generatorId, null);            // solver, not seed generator
    assert.equal(def.referenceSolverId, generator);
    const inst = instantiateLegacyExercise(def);
    assert.deepEqual(inst.parameters, parameters);  // parameters stay untouched
    assert.equal(inst.prompt, undefined);           // solvers replace no prompt
    if (Array.isArray(expectedValue)) {
      assert.deepEqual(inst.expectedAnswer.value, expectedValue);
      assert.deepEqual(inst.expectedAnswer.solution, expectedValue);
    } else {
      assert.equal(inst.expectedAnswer.value, expectedValue);
    }
    return inst;
  };
  solverCase('dotProduct', { u: [1, 2, 3], v: [4, 5, 6] }, 32);
  solverCase('matmulEntry', { A: [[1, 2], [3, 4]], B: [[5, 6], [7, 8]], entry: [2, 1] }, 43);
  solverCase('rank3', { A: [[1, 2, 3], [2, 4, 6], [1, 1, 1]] }, 2);
  solverCase('solveLinear2', { A: [[2, 1], [1, 2]], b: [5, 4] }, [2, 1]);
  // Hand-built definitions fail closed on unknown ids.
  const def = adaptLegacyExercise({
    exerciseId: 'x', type: 'numeric', grader: 'deterministic', deterministicSeed: 1,
  }, 'w01');
  assert.throws(() => instantiateLegacyExercise({ ...def, referenceSolverId: 'stokes' }),
    /Unbekannter Legacy-Referenzsolver stokes/);
  assert.throws(() => instantiateLegacyExercise({ ...def, generatorId: 'nope' }),
    /Unbekannter Legacy-Generator nope/);
});

// ===========================================================================
// 3. Grader registry
// ===========================================================================

test('graders: registry exposes exactly the four Node-loadable core adapters', () => {
  assert.deepEqual(Object.keys(graders).sort(), ['deterministic', 'manual-rubric', 'pyodide', 'pyodide-sympy']);
  for (const key of Object.keys(graders)) assert.equal(typeof graders[key].grade, 'function');
  assert.equal(graders.pyodide.needsWorker, true);
  assert.equal(graders['pyodide-sympy'].needsWorker, true);
  assert.equal('needsWorker' in graders.deterministic, false);
  assert.equal('needsWorker' in graders['manual-rubric'], false);
});

test('graders: deterministic adapter throws on unknown activity types; activityType wins over type', async () => {
  await assert.rejects(
    () => graders.deterministic.grade({ type: 'telepathy' }, 'x'),
    /deterministic: unbekannter Aufgabentyp telepathy/,
  );
  await assert.rejects(
    () => graders.deterministic.grade({}, 'x'),
    /deterministic: unbekannter Aufgabentyp undefined/,
  );
  // activityType has precedence over type: the numeric path is taken.
  const numeric = {
    activityType: 'numeric', type: 'single-choice', deterministicSeed: 999,
    expectedAnswer: {}, parameters: { seedGenerator: 'genLinearEquation' },
  };
  assert.equal((await graders.deterministic.grade(numeric, '3')).correct, true);
});

test('graders: numeric seeded path resolves the expected value from exercise.deterministicSeed', async () => {
  const seeded = (seed) => ({
    type: 'numeric',
    deterministicSeed: seed,
    expectedAnswer: { kind: 'seeded-integer' }, // no fixed value
    parameters: { seedGenerator: 'genLinearEquation' },
  });
  // genLinearEquation(1) -> x = -9, genLinearEquation(999) -> x = 3.
  assert.equal((await graders.deterministic.grade(seeded(1), '-9')).correct, true);
  const wrongSeed = await graders.deterministic.grade(seeded(1), '3');
  assert.equal(wrongSeed.correct, false);
  assert.equal(wrongSeed.errorType, 'wrong-value');
  assert.equal(wrongSeed.verdictText, 'Nicht richtig.');
  // Same answer, different seed -> different expected value.
  assert.equal((await graders.deterministic.grade(seeded(999), '3')).correct, true);
  // A fixed expectedAnswer.value is authoritative over the generator.
  const fixed = { ...seeded(1), expectedAnswer: { kind: 'integer', value: 7 } };
  assert.equal((await graders.deterministic.grade(fixed, '7')).correct, true);
  assert.equal((await graders.deterministic.grade(fixed, '-9')).correct, false);
});

test('graders: numeric grading fails closed on unparseable input and missing configuration', async () => {
  const seeded = {
    type: 'numeric', deterministicSeed: 1,
    expectedAnswer: {}, parameters: { seedGenerator: 'genLinearEquation' },
  };
  const invalid = await graders.deterministic.grade(seeded, 'abc');
  assert.equal(invalid.correct, false);
  assert.equal(invalid.errorType, 'invalid-input');
  assert.equal(invalid.verdictText, 'Bitte eine ganze Zahl eingeben.');
  const unconfigured = await graders.deterministic.grade({ type: 'numeric' }, '1');
  assert.equal(unconfigured.correct, false);
  assert.equal(unconfigured.errorType, 'grader-error');
  assert.equal(unconfigured.verdictText, 'Interner Fehler: Unbekannte Aufgabe.');
});

// ===========================================================================
// 4. Timed mastery + review scheduler
// ===========================================================================

const T0 = Date.parse('2026-02-02T08:00:00.000Z'); // Monday, arbitrary pinned epoch
const iso = (ms) => new Date(ms).toISOString();
const att = (tsMs, over = {}) => ({
  exerciseId: 'w05-e1', cycleId: 'cyc-1', seed: 511, answer: '1', correct: true,
  hintsUsed: 0, revealedSolution: false, masteryEligible: true,
  ts: iso(tsMs), ...over,
});
const reveal = (tsMs, over = {}) => att(tsMs, {
  correct: false, answer: null, revealedSolution: true, event: 'solution-revealed', ...over,
});

test('scheduler: qualified hits open the [2, 5, 11] week ladder and repeat the last slot', () => {
  const t2 = T0 + 2 * WEEK_MS;
  const t3 = t2 + 5 * WEEK_MS;
  const t4 = t3 + 11 * WEEK_MS;
  const s1 = reviewStateFromAttempts([att(T0)], T0);
  assert.equal(s1.qualified, true);
  assert.equal(s1.qualifiedHitCount, 1);
  assert.equal(s1.validUntilMs, T0 + 2 * WEEK_MS);
  assert.equal(s1.nextDueMs, s1.validUntilMs); // due when validity ends
  assert.equal(s1.consolidated, false);
  assert.equal(s1.lastQualifiedAt, iso(T0));
  assert.equal(s1.locked, false);
  const s2 = reviewStateFromAttempts([att(T0), att(t2)], t2);
  assert.equal(s2.validUntilMs, t2 + 5 * WEEK_MS);
  const s3 = reviewStateFromAttempts([att(T0), att(t2), att(t3)], t3);
  assert.equal(s3.validUntilMs, t3 + 11 * WEEK_MS);
  // Default postLadderPolicy 'repeat-last': the fourth hit repeats 11 weeks.
  const s4 = reviewStateFromAttempts([att(T0), att(t2), att(t3), att(t4)], t4);
  assert.equal(s4.qualifiedHitCount, 4);
  assert.equal(s4.consolidated, false);
  assert.equal(s4.validUntilMs, t4 + 11 * WEEK_MS);
  // Legacy 'consolidate' policy: mastered stays true without a deadline.
  const pConsolidate = { ...DEFAULT_REVIEW_PARAMS, postLadderPolicy: 'consolidate' };
  const st = masteryFromAttempts([att(T0), att(t2), att(t3), att(t4)], t4 + 100 * WEEK_MS, pConsolidate);
  assert.deepEqual(st, {
    mastered: true, reason: 'ok', locked: false, consolidated: true,
    qualifiedHitCount: 4, lastQualifiedAt: iso(t4),
  });
});

test('mastery: valid right up to validUntilMs (inclusive), expired one millisecond later', () => {
  const validUntil = T0 + 2 * WEEK_MS;
  const before = masteryFromAttempts([att(T0)], validUntil - 1);
  assert.equal(before.mastered, true);
  assert.equal(before.reason, 'ok');
  assert.equal(before.locked, false);
  assert.equal(before.validUntilMs, validUntil);
  assert.equal(before.qualifiedHitCount, 1);
  assert.equal(before.lastQualifiedAt, iso(T0));
  const exact = masteryFromAttempts([att(T0)], validUntil);
  assert.equal(exact.mastered, true); // boundary is inclusive (nowMs <= validUntilMs)
  const after = masteryFromAttempts([att(T0)], validUntil + 1);
  assert.equal(after.mastered, false);
  assert.equal(after.reason, 'expired');
  assert.equal(after.locked, false);
  assert.equal(after.validUntilMs, validUntil);
  assert.equal(after.nextDueMs, validUntil);
  assert.equal(after.qualifiedHitCount, 1);
});

test('mastery: a revealed solution locks only when no open attempt and no open current instance remain', () => {
  const A = { instanceId: 'w05-e1:cyc-1:511', seed: 511 };
  const B = { instanceId: 'w05-e1:cyc-1:512', seed: 512 };
  // Everything on the revealed instance key: locked.
  const allRevealed = masteryFromAttempts([att(T0, A), reveal(T0 + 1, A)], T0 + 2);
  assert.equal(allRevealed.mastered, false);
  assert.equal(allRevealed.reason, 'solution-revealed');
  assert.equal(allRevealed.locked, true);
  // Same history, but the runtime asks for the OTHER (fresh) instance.
  const freshInstance = masteryFromAttempts([att(T0, A), reveal(T0 + 1, A)], T0 + 2, DEFAULT_REVIEW_PARAMS, B.instanceId);
  assert.equal(freshInstance.mastered, false);
  assert.equal(freshInstance.reason, 'not-solved'); // not locked: current instance is open
  assert.equal(freshInstance.locked, false);
  // A qualified hit on another instance lifts the lock entirely — even when
  // the CURRENT instance is the revealed one.
  const viaOther = masteryFromAttempts(
    [reveal(T0, A), att(T0 + 1, B)], T0 + 2, DEFAULT_REVIEW_PARAMS, A.instanceId,
  );
  assert.equal(viaOther.mastered, true);
  assert.equal(viaOther.reason, 'ok');
  assert.equal(viaOther.locked, false);
  assert.equal(viaOther.qualifiedHitCount, 1);
  // A reveal alone does not lock: an open (non-qualified) attempt on another
  // instance keeps the scheduler unlocked, mastery just stays unsolved.
  const missB = att(T0 + 1, { ...B, correct: false });
  const notLocked = masteryFromAttempts([reveal(T0, A), missB], T0 + 2);
  assert.equal(notLocked.locked, false);
  assert.equal(notLocked.mastered, false);
  assert.equal(notLocked.reason, 'not-solved');
});

test('mastery: the reveal erases earlier hits on the same instance key only', () => {
  const A = { instanceId: 'w05-e1:cyc-1:511', seed: 511 };
  const B = { instanceId: 'w05-e1:cyc-1:512', seed: 512 };
  const st = reviewStateFromAttempts(
    [att(T0, A), reveal(T0 + 1, A), att(T0 + 2, B)], T0 + 3,
  );
  assert.equal(st.qualifiedHitCount, 1);           // A's hit is gone, B survives
  assert.equal(st.validUntilMs, (T0 + 2) + 2 * WEEK_MS); // ladder restarts at slot 1 for B
  // Without instanceIds the composed key `exerciseId:cycleId:seed` decides:
  // a reveal on seed 511 does not touch a hit with seed 512.
  const composed = masteryFromAttempts([
    att(T0), reveal(T0 + 1), att(T0 + 2, { seed: 512 }),
  ], T0 + 3);
  assert.equal(composed.mastered, true);
  assert.equal(composed.qualifiedHitCount, 1);
  // Same composed key (same seed): the reveal disqualifies the hit.
  const sameSeed = masteryFromAttempts([att(T0), reveal(T0 + 1)], T0 + 2);
  assert.equal(sameSeed.locked, true);
  assert.equal(sameSeed.reason, 'solution-revealed');
});

test('scheduler: buildReviewQueueEntry is null without qualification or under lock, ISO dates otherwise', () => {
  const never = buildReviewQueueEntry('w05-e1', [att(T0, { correct: false })], T0 + 1);
  assert.equal(never, null);
  const locked = buildReviewQueueEntry('w05-e1', [att(T0), reveal(T0 + 1)], T0 + 2);
  assert.equal(locked, null); // all attempts share the revealed composed key
  const entry = buildReviewQueueEntry('w05-e1', [att(T0)], T0 + 1);
  assert.deepEqual(entry, {
    exerciseId: 'w05-e1',
    lastQualifiedAt: iso(T0),
    qualifiedHitCount: 1,
    nextDueAt: iso(T0 + 2 * WEEK_MS),
    consolidated: false,
    mode: 'expanding',
    updatedAt: iso(T0 + 1),
  });
  // Consolidated ladder: the entry stays, but no due date remains.
  const t2 = T0 + 2 * WEEK_MS, t3 = t2 + 5 * WEEK_MS, t4 = t3 + 11 * WEEK_MS;
  const consolidated = buildReviewQueueEntry(
    'w05-e1', [att(T0), att(t2), att(t3), att(t4)], t4 + 1,
    { ...DEFAULT_REVIEW_PARAMS, postLadderPolicy: 'consolidate' },
  );
  assert.equal(consolidated.consolidated, true);
  assert.equal(consolidated.nextDueAt, null);
  assert.equal(consolidated.qualifiedHitCount, 4);
});

test('scheduler: resolveReviewParams accepts monotonic custom slots, repairs invalid ones', () => {
  assert.equal(resolveReviewParams(null), DEFAULT_REVIEW_PARAMS);
  assert.equal(resolveReviewParams('nope'), DEFAULT_REVIEW_PARAMS);
  assert.equal(resolveReviewParams(42), DEFAULT_REVIEW_PARAMS);
  const custom = resolveReviewParams({ expandingSlotsWeeks: [1, 3] });
  assert.deepEqual(custom.expandingSlotsWeeks, [1, 3]);
  assert.equal(custom.mode, 'expanding');                 // defaults preserved
  assert.equal(custom.postLadderPolicy, 'repeat-last');
  assert.equal(custom.maxHints, MASTERY_MAX_HINTS);
  // Custom slots change the validity window end to end.
  const st = reviewStateFromAttempts([att(T0)], T0, custom);
  assert.equal(st.validUntilMs, T0 + 1 * WEEK_MS);
  // Invalid slot lists all fall back to [2, 5, 11].
  for (const bad of [[], [5, 2, 11], [2, 900], [0, 3], ['2', '5'], [2, 5, 11, 0], [3, 3, 7]]) {
    assert.deepEqual(resolveReviewParams({ expandingSlotsWeeks: bad }).expandingSlotsWeeks,
      [2, 5, 11], JSON.stringify(bad));
  }
  const repaired = resolveReviewParams({ postLadderPolicy: 'nope' });
  assert.equal(repaired.postLadderPolicy, 'repeat-last');
  assert.equal(resolveReviewParams({}).expandingSlotsWeeks[2], 11);
});

// ===========================================================================
// 5. EvidenceEngine
// ===========================================================================

const DAY = 86_400_000;
const TEV0 = Date.UTC(2026, 0, 5);
const competencies = [
  { competencyId: 'c-strict', requires: [], evidencePolicy: {
    minimumIndependentHits: 2, minimumDistinctDefinitions: 2,
    delayedHitRequired: true, minimumDelayDays: 1, freshnessDays: 30,
  } },
  { competencyId: 'c-loose', requires: [], evidencePolicy: {
    minimumIndependentHits: 1, minimumDistinctDefinitions: 1,
  } },
  { competencyId: 'c-fresh7', requires: [], evidencePolicy: {
    minimumIndependentHits: 1, minimumDistinctDefinitions: 1, freshnessDays: 7,
  } },
];
const ev = (competencyId, definitionId, instanceId, atMs, over = {}) => ({
  eventType: 'attempt', competencyIds: [competencyId], definitionId, instanceId,
  occurredAt: iso(atMs), correct: true, evidenceEligible: true,
  masteryEligible: true, hintsUsed: 0, revealedSolution: false, ...over,
});

test('evidence: no usable events leave the competency unassessed; unknown ids throw', () => {
  const engine = new EvidenceEngine(competencies);
  assert.deepEqual(engine.evaluateCompetency('c-loose', [], TEV0), {
    competencyId: 'c-loose', state: 'unassessed', reasonCodes: ['missing-evidence'],
    evidenceCount: 0, distinctDefinitionCount: 0, firstQualifiedAt: null,
    lastQualifiedAt: null, dueAt: null, disqualifiedInstanceIds: [],
  });
  // Events for another competency are filtered out.
  const foreign = engine.evaluateCompetency('c-loose', [ev('c-strict', 'd', 'i', TEV0)], TEV0);
  assert.equal(foreign.state, 'unassessed');
  // Unparseable timestamps are dropped, never graded.
  const timeless = engine.evaluateCompetency('c-loose', [
    { ...ev('c-loose', 'd', 'i', TEV0), occurredAt: 'not-a-date' },
  ], TEV0);
  assert.equal(timeless.state, 'unassessed');
  assert.throws(() => engine.evaluateCompetency('c-nope', [], TEV0), /Unbekannte Kompetenz c-nope/);
});

test('evidence: strict policy needs independent hits, definitions and a delayed hit', () => {
  const engine = new EvidenceEngine(competencies);
  const one = engine.evaluateCompetency('c-strict', [ev('c-strict', 'd-1', 'i-1', TEV0)], TEV0 + DAY);
  assert.equal(one.state, 'learning');
  assert.deepEqual(one.reasonCodes, [
    'insufficient-independent-hits', 'insufficient-distinct-definitions', 'delayed-hit-missing',
  ]);
  assert.equal(one.evidenceCount, 1);
  assert.equal(one.distinctDefinitionCount, 1);
  assert.equal(one.firstQualifiedAt, iso(TEV0));
  // Two instances but one definition: only the definition gate remains.
  const sameDef = engine.evaluateCompetency('c-strict', [
    ev('c-strict', 'd-1', 'i-1', TEV0), ev('c-strict', 'd-1', 'i-2', TEV0 + 2 * DAY),
  ], TEV0 + 3 * DAY);
  assert.deepEqual(sameDef.reasonCodes, ['insufficient-distinct-definitions']);
  // Two definitions but too close together: only the delay gate remains.
  const tooClose = engine.evaluateCompetency('c-strict', [
    ev('c-strict', 'd-1', 'i-1', TEV0), ev('c-strict', 'd-2', 'i-2', TEV0 + 12 * 3600 * 1000),
  ], TEV0 + 2 * DAY);
  assert.deepEqual(tooClose.reasonCodes, ['delayed-hit-missing']);
  // Independence is per instanceKey: the latest event per instance wins.
  const deduped = engine.evaluateCompetency('c-loose', [
    ev('c-loose', 'd-1', 'i-1', TEV0), ev('c-loose', 'd-2', 'i-1', TEV0 + DAY),
  ], TEV0 + 2 * DAY);
  assert.equal(deduped.evidenceCount, 1);
  assert.equal(deduped.state, 'demonstrated'); // loose policy, latest hit only
  assert.equal(deduped.lastQualifiedAt, iso(TEV0 + DAY));
});

test('evidence: satisfied policy is demonstrated (retained with delayed hit), then review_due', () => {
  const engine = new EvidenceEngine(competencies);
  // Loose policy: fresh single hit is demonstrated, due 30 days later (default).
  const demo = engine.evaluateCompetency('c-loose', [ev('c-loose', 'd-1', 'i-1', TEV0)], TEV0);
  assert.equal(demo.state, 'demonstrated');
  assert.deepEqual(demo.reasonCodes, []);
  assert.equal(demo.dueAt, iso(TEV0 + 30 * DAY));
  // Boundary: exactly at dueAt the evidence is still fresh (strict >).
  assert.equal(engine.evaluateCompetency('c-loose', [ev('c-loose', 'd-1', 'i-1', TEV0)], TEV0 + 30 * DAY).state, 'demonstrated');
  const due = engine.evaluateCompetency('c-loose', [ev('c-loose', 'd-1', 'i-1', TEV0)], TEV0 + 30 * DAY + 1);
  assert.equal(due.state, 'review_due');
  assert.deepEqual(due.reasonCodes, ['evidence-expired']);
  assert.equal(due.dueAt, iso(TEV0 + 30 * DAY));
  assert.equal(due.lastQualifiedAt, iso(TEV0));
  // Custom freshnessDays shortens the window.
  assert.equal(engine.evaluateCompetency('c-fresh7', [ev('c-fresh7', 'd-1', 'i-1', TEV0)], TEV0 + 7 * DAY).state, 'demonstrated');
  assert.equal(engine.evaluateCompetency('c-fresh7', [ev('c-fresh7', 'd-1', 'i-1', TEV0)], TEV0 + 8 * DAY).state, 'review_due');
  // Strict policy satisfied (2 instances, 2 definitions, >= 1 day apart): retained.
  const retained = engine.evaluateCompetency('c-strict', [
    ev('c-strict', 'd-1', 'i-1', TEV0), ev('c-strict', 'd-2', 'i-2', TEV0 + 2 * DAY),
  ], TEV0 + 3 * DAY);
  assert.equal(retained.state, 'retained');
  assert.deepEqual(retained.reasonCodes, []);
  assert.equal(retained.evidenceCount, 2);
  assert.equal(retained.distinctDefinitionCount, 2);
});

test('evidence: only correct, eligible, low-hint attempts count as evidence', () => {
  const engine = new EvidenceEngine(competencies, { maxHints: 1 });
  const excluded = [
    ev('c-loose', 'd-1', 'i-1', TEV0, { correct: false }),
    ev('c-loose', 'd-1', 'i-2', TEV0, { evidenceEligible: false }),
    ev('c-loose', 'd-1', 'i-3', TEV0, { masteryEligible: false }),
    ev('c-loose', 'd-1', 'i-4', TEV0, { hintsUsed: 2 }), // above maxHints 1
  ];
  // Events exist but none qualify: the competency stays 'learning' with zero
  // evidence ('unassessed' is reserved for competencies without any event).
  const none = engine.evaluateCompetency('c-loose', excluded, TEV0);
  assert.equal(none.state, 'learning');
  assert.deepEqual(none.reasonCodes, ['insufficient-independent-hits', 'insufficient-distinct-definitions']);
  assert.equal(none.evidenceCount, 0);
  assert.equal(none.distinctDefinitionCount, 0);
  // hintsUsed === maxHints still qualifies. A constructor maxHints above the
  // policy is repaired; see tests/learning_policy.test.mjs.
  const oneHint = engine.evaluateCompetency('c-loose', [ev('c-loose', 'd-1', 'i-5', TEV0, { hintsUsed: 1 })], TEV0);
  assert.equal(oneHint.state, 'demonstrated');
});

test('evidence: a revealed solution disqualifies its instance key (explicit and composed)', () => {
  const engine = new EvidenceEngine(competencies);
  const events = [
    ev('c-strict', 'd-1', 'i-1', TEV0),
    ev('c-strict', 'd-1', 'i-1', TEV0 + 1, { eventType: 'solution-revealed', correct: false, evidenceEligible: false }),
    ev('c-strict', 'd-2', 'i-2', TEV0 + 2 * DAY),
    ev('c-strict', 'd-3', 'i-3', TEV0 + 3 * DAY),
  ];
  const res = engine.evaluateCompetency('c-strict', events, TEV0 + 4 * DAY);
  assert.equal(res.state, 'retained');                 // i-2 + i-3 still satisfy the policy
  assert.equal(res.evidenceCount, 2);
  assert.deepEqual(res.disqualifiedInstanceIds, ['i-1']);
  assert.equal(res.firstQualifiedAt, iso(TEV0 + 2 * DAY)); // i-1 hit is erased
  // The revealedSolution flag alone (no eventType) disqualifies as well.
  const flagged = engine.evaluateCompetency('c-loose', [
    ev('c-loose', 'd-1', 'i-1', TEV0, { revealedSolution: true }),
    ev('c-loose', 'd-2', 'i-2', TEV0 + DAY),
  ], TEV0 + 2 * DAY);
  assert.equal(flagged.evidenceCount, 1);
  assert.deepEqual(flagged.disqualifiedInstanceIds, ['i-1']);
  // Without instanceId the key composes from definitionId:cycle:seed.
  const composed = engine.evaluateCompetency('c-loose', [
    { ...ev('c-loose', 'd-1', null, TEV0), instanceId: undefined, seed: 5 },
    { ...ev('c-loose', 'd-1', null, TEV0 + 1), instanceId: undefined, seed: 5, correct: false, evidenceEligible: false, revealedSolution: true },
    { ...ev('c-loose', 'd-2', null, TEV0 + DAY), instanceId: undefined, seed: 6 },
  ], TEV0 + 2 * DAY);
  assert.equal(composed.evidenceCount, 1);
  assert.deepEqual(composed.disqualifiedInstanceIds, ['d-1:legacy:5']);
});
