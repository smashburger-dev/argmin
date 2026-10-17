import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { graders, assertFamilyActivityContracts } from '../assets/js/core/graders.js';
import { gradeSceneBuild, solveMixer } from '../assets/js/core/scene_build_grader.mjs';
import { solveBalance } from '../assets/js/core/balance_model.mjs';
import { evaluate } from '../assets/js/figures/scenes/smoothie.mjs';
import { isSceneBuildAnswer } from '../assets/js/domain/scene_answer.mjs';
import { buildLearningEvent } from '../assets/js/domain/learning_event.mjs';
import { normalizeAttemptV3, migratePayloadToV3 } from '../assets/js/core/progress_migration.mjs';
import { validateImportPayload, SCHEMA_VERSION } from '../assets/js/core/progress_store.js';
import { masteryFromAttempts } from '../assets/js/core/exercise_runtime.js';
import { freshRouteForDefinition } from '../assets/js/domain/activity_route.mjs';
import { createFamilyRegistry } from '../assets/js/domain/family_registry.mjs';
import { familyEventInput } from '../assets/js/domain/exercise_registry.mjs';
import { familySubseed } from '../assets/js/core/generator_draw_kit.mjs';
import { assertCaseTitle, validateSourceDocument } from '../tools/compile_content.mjs';
import { coverageForBundle } from '../tools/build_coverage_matrix.mjs';

const golden = JSON.parse(readFileSync(new URL('./fixtures/scene-build-golden-corpus.json', import.meta.url), 'utf8'));
const fixture = (id) => structuredClone(golden.cases.find((entry) => entry.id === id));
const exercise = (entry) => ({ activityType: 'scene-build', graderId: 'deterministic', parameters: entry.parameters,
  expectedAnswer: { kind: 'scene-properties', model: entry.model } });
const envelope = (form, steps = []) => ({ kind: 'scene-build', schemaVersion: 1, form, steps });
const context = { installationId: 'installation:s4a', contentVersion: 'catalog:s4a', nowIso: '2026-10-17T10:00:00.000Z' };
const event = (extra = {}) => buildLearningEvent({ exerciseId: 'balance-solve:seeded', cycleId: 's4a', eventType: 'attempt',
  activityType: 'scene-build', answer: fixture('balance-solve').answer, masteryEligible: true,
  competencyIds: ['c-algebra'], correct: true, seed: 3, occurredAt: context.nowIso, ...extra });
const payload = (attempt) => ({ schemaVersion: 3, data: { weeks: [], attempts: [normalizeAttemptV3(attempt, context)],
  journal: [], settings: [], meta: [], reviewQueue: [], plans: [], drafts: [] } });

test('scene-build golden corpus pins solvers, public dispatch and simulation feedback', async () => {
  for (const entry of golden.cases) {
    const solved = entry.model === 'mixer' ? solveMixer(entry.parameters) : solveBalance(entry.parameters);
    assert.deepEqual(solved, entry.solved, entry.id);
    const graded = await graders.deterministic.grade(exercise(entry), entry.answer);
    assert.equal(graded.correct, true, entry.id);
    assert.equal(graded.errorType, null);
    assert.deepEqual(graded.simulation, entry.simulation, entry.id);
    assert.ok(graded.fields.every((item) => item.correct));
  }
});

test('mixer uses the actual smoothie evaluate result and accepts every valid infinite solution', () => {
  const entry = fixture('mix-infinite');
  for (const portions of [[3, 0], [0, 1.5], [-1, 2]]) {
    const graded = gradeSceneBuild(exercise(entry), envelope({ solutionSet: 'infinite', portions }));
    assert.equal(graded.correct, true);
    assert.deepEqual(graded.simulation, evaluate({ ...entry.parameters, b: entry.parameters.target }, portions));
  }
  const wrong = gradeSceneBuild(exercise(entry), envelope({ solutionSet: 'infinite', portions: [0, 0] }));
  assert.deepEqual(wrong.simulation.diff, [3, 6]);
  assert.equal(wrong.fields.filter((item) => !item.correct).length, 2);
  assert.ok(wrong.fields.slice(1).every((item) => item.path === 'form.portions'));
  assert.equal(gradeSceneBuild(exercise(entry), envelope({ solutionSet: 'unique', portions: [3, 0] })).correct, false);
  assert.equal(gradeSceneBuild(exercise(entry), envelope({ solutionSet: 'none' })).correct, false);
  for (const target of [[0, 0], [0, 1]]) {
    assert.equal(solveMixer({ a1: [0, 0], a2: [0, 0], target }).solutionSet, target[1] ? 'none' : 'infinite');
  }
});

test('balance accepts a different path, exact fractions, x on the right and no-op steps', () => {
  const entry = fixture('balance-solve');
  const scale = (operation) => ({ operation, side: 'both', term: { x: 0, constant: '999999999999999999' } });
  assert.equal(gradeSceneBuild(exercise(entry), { ...entry.answer,
    steps: [scale('multiply'), scale('multiply'), scale('divide'), scale('divide'), ...entry.answer.steps],
  }).correct, true, 'intermediate coefficients may exceed the input safe-integer range');
  entry.answer.steps = [
    { operation: 'divide', side: 'both', term: { x: 0, constant: 2 } },
    { operation: 'add', side: 'both', term: { x: 0, constant: '-3/2' } },
    { operation: 'multiply', side: 'both', term: { x: 0, constant: 1 } },
  ];
  assert.equal(gradeSceneBuild(exercise(entry), entry.answer).correct, true);
  entry.answer.steps = [
    { operation: 'subtract', side: 'both', term: { x: 2, constant: 7 } },
    { operation: 'divide', side: 'both', term: { x: 0, constant: -2 } },
  ];
  entry.answer.form.equation = { left: { x: 0, constant: 2 }, right: { x: 1, constant: 0 } };
  assert.equal(gradeSceneBuild(exercise(entry), entry.answer).correct, true);
  assert.deepEqual(solveBalance({ left: { x: '1/3', constant: '1/7' }, right: { x: 0, constant: '2/7' } }),
    { solutionSet: 'unique', value: '3/7' });
});

test('balance rejects illegal operations, intermediate mistakes and forged end states', () => {
  const entry = fixture('balance-solve');
  const bad = [
    { operation: 'multiply', side: 'both', term: { x: 0, constant: 0 } },
    { operation: 'divide', side: 'both', term: { x: 0, constant: 0 } },
    { operation: 'divide', side: 'both', term: { x: 1, constant: 2 } },
    { operation: 'subtract', side: 'left', term: { x: 0, constant: 3 } },
    { operation: 'unknown', side: 'both', term: { x: 0, constant: 2 } },
    { operation: 'constructor', side: 'both', term: { x: 0, constant: 2 } },
  ];
  for (const step of bad) {
    const graded = gradeSceneBuild(exercise(entry), { ...entry.answer, steps: [step, ...entry.answer.steps] });
    assert.equal(graded.correct, false);
    assert.equal(graded.errorType, 'non-equivalent-step');
    assert.equal(graded.fields.at(-1).path, 'steps.0');
  }
  assert.equal(gradeSceneBuild(exercise(entry), { ...entry.answer, steps: [] }).correct, false);
  entry.answer.form.equation.right.constant = '3';
  assert.equal(gradeSceneBuild(exercise(entry), entry.answer).correct, false);
});

test('invalid learner data and broken authored contracts fail closed without becoming mastery', () => {
  const entry = fixture('mix-to-target');
  for (const answer of [null, '2, 1', [], {}, { ...entry.answer, schemaVersion: 2 },
    envelope({ portions: [NaN, 1] }), envelope({ portions: [Infinity, 1] })]) {
    assert.equal(gradeSceneBuild(exercise(entry), answer).errorType, 'invalid-input');
  }
  const broken = gradeSceneBuild({ ...exercise(entry), expectedAnswer: { kind: 'scene-properties', model: 'unknown' } }, entry.answer);
  assert.equal(broken.errorType, 'grader-error');
  assert.equal(broken.masteryEligible, false);
  assert.equal(isSceneBuildAnswer({ ...entry.answer, svg: '<path>' }), false);
  assert.equal(isSceneBuildAnswer(envelope({}, Array(129).fill({}))), false);
  assert.equal(isSceneBuildAnswer(envelope({ portions: Array(2) })), false);
});

test('attempt v3 JSON roundtrip preserves form and step order without a schema upgrade', () => {
  assert.equal(SCHEMA_VERSION, 3);
  const source = fixture('balance-solve').answer;
  const built = event({ answer: source });
  source.steps.reverse();
  assert.deepEqual(built.answer, fixture('balance-solve').answer, 'snapshot is independent of mutable form');
  const exported = JSON.parse(JSON.stringify(payload(built)));
  assert.deepEqual(validateImportPayload(exported), { ok: true, errors: [] });
  const imported = migratePayloadToV3(exported, context);
  assert.deepEqual(imported.data.attempts, exported.data.attempts);
  for (const answer of [null, 'serialized scene', { kind: 'scene-build', form: {}, steps: [] }]) {
    const bad = structuredClone(exported);
    bad.data.attempts[0].answer = answer;
    assert.equal(validateImportPayload(bad).ok, false);
    assert.throws(() => normalizeAttemptV3(bad.data.attempts[0], context), /scene-build/);
  }
  assert.doesNotThrow(() => event({ eventType: 'hint-used', answer: null }));
});

test('scene mastery follows hint cap, reveals and independent seed policy', () => {
  const now = Date.parse(context.nowIso);
  for (const extra of [{ correct: false }, { hintsUsed: 2 }, { masteryEligible: false }, { revealedSolution: true }]) {
    assert.equal(masteryFromAttempts([event(extra)], now).mastered, false);
  }
  assert.equal(masteryFromAttempts([event({ hintsUsed: 1 })], now).mastered, true);
  const revealed = event({ eventType: 'solution-revealed', answer: null });
  const fresh = event({ seed: 4 });
  assert.equal(masteryFromAttempts([revealed, event()], now).mastered, false);
  assert.equal(masteryFromAttempts([revealed, fresh], now, undefined, fresh.instanceId).mastered, true);
});

test('scene reference families preserve case identity on fresh review seeds and enter coverage', async () => {
  for (const id of ['mix-to-target', 'balance-solve']) {
    const entry = fixture(id);
    const contract = { familyId: id, familyGroup: 'scene-build', summary: 'Eigenschaften prüfen', taskArchetype: 'scene-properties',
      authorityMode: 'seeded', masteryEligible: true, caseTypes: [{ caseId: 'seeded' }], difficultyProfiles: ['intro', 'core'],
      competencyIds: ['c-algebra'], activityType: 'scene-build', graderId: 'deterministic' };
    validateSourceDocument('exercise-family', contract);
    const registry = createFamilyRegistry([{ ...contract,
      generate: ({ seed, caseId, difficulty }) => {
        const offset = familySubseed(seed, caseId, difficulty) % 5;
        const parameters = structuredClone(entry.parameters);
        if (entry.model === 'balance') {
          parameters.left.constant += offset;
          parameters.right.constant += offset;
        } else parameters.target = parameters.target.map((value, index) => value + offset * parameters.a1[index]);
        return { parameters, expected: { kind: 'scene-properties', model: entry.model }, prompt: 'Baue den Zielzustand.' };
      }, solve: entry.model === 'mixer' ? solveMixer : solveBalance,
    }]);
    const route = freshRouteForDefinition({ familyId: id, caseId: 'seeded', seed: 3, difficulty: 'core' });
    assert.equal(route, `#/family/${id}/seeded/-/core`);
    const draws = [];
    for (const seed of [0, 1, 42, -1, 2 ** 32 - 1, Number.MAX_SAFE_INTEGER]) {
      const instance = registry.instantiate(id, seed, 'core', 'seeded');
      const answer = structuredClone(entry.answer);
      if (entry.model === 'balance') {
        answer.steps[0].term.constant = instance.parameters.left.constant;
      } else answer.form.portions = solveMixer(instance.parameters).portions;
      assert.equal((await registry.grade(instance, answer)).correct, true);
      assert.equal(familyEventInput(instance).activityType, 'scene-build');
      draws.push(JSON.stringify(instance.parameters));
    }
    assert.ok(new Set(draws).size > 1);
    const coverage = coverageForBundle({ catalogId: 's4a', catalogVersion: 1, families: [contract], lessons: [],
      competencies: [{ competencyId: 'c-algebra' }], familyActivities: [{ ...contract, caseId: 'seeded' }] });
    assert.deepEqual(coverage.coverage[0], { competencyId: 'c-algebra', familyIds: [id], placedCaseCount: 1, seededFamilyCount: 1 });
  }
});

test('authored scene contract validates expected properties and concrete German titles', () => {
  const entry = fixture('mix-to-target');
  const document = { familyId: 'mix-to-target', contract: { activityType: 'scene-build', graderId: 'deterministic' },
    cases: [{ caseId: 'seeded', parameters: entry.parameters, expected: exercise(entry).expectedAnswer }] };
  assert.doesNotThrow(() => assertFamilyActivityContracts(document));
  const broken = structuredClone(document);
  broken.cases[0].expected.model = 'svg-path';
  assert.throws(() => assertFamilyActivityContracts(broken), /scene-build/);
  assert.throws(() => assertCaseTitle('Szene konstruieren', 'scene'), /Aktivitätstyp/);
  assert.equal(assertCaseTitle('Mixer auf Ziel einstellen', 'scene'), 'Mixer auf Ziel einstellen');
});
