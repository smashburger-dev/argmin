import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileContent } from '../tools/compile_content.mjs';
import { graders } from '../assets/js/core/graders.js';
import { instantiateLegacyExercise } from '../assets/js/core/legacy_exercise_adapter.mjs';
import { routeForDefinition } from '../assets/js/domain/activity_route.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundle = compileContent({ projectRoot: root, profile: 'public' });
const definition = (id) => bundle.exerciseDefinitions.find((item) => item.definitionId === id);

const TARGET_COMPETENCIES = [
  'c-pandas-cleaning', 'c-eda-viz', 'c-grad-regression',
  'c-ml-baseline', 'c-ml-linear', 'c-ml-logistic', 'c-ml-cv', 'c-ml-erroranalysis',
  'c-ml-regularization', 'c-ml-ensembles', 'c-ml-svm-pca', 'c-ml-repro',
];
const TARGET_WEEKS = Array.from({ length: 12 }, (_, i) => `w${String(i + 6).padStart(2, '0')}`);

test('every W6-W17 competency has a German draft lesson with public readings', () => {
  const sourceIds = new Set(bundle.sources.map((source) => source.sourceId));
  for (const competencyId of TARGET_COMPETENCIES) {
    const lesson = bundle.lessons.find((item) => item.competencyIds.includes(competencyId));
    assert.ok(lesson, `${competencyId} has no lesson`);
    assert.equal(lesson.releaseStatus, 'draft', `${competencyId} lesson must stay draft until human review`);
    assert.ok(lesson.sourceRefs.length > 0, `${lesson.lessonId} has no reading`);
    for (const reference of lesson.sourceRefs) assert.ok(sourceIds.has(reference.sourceId));
  }
});

test('every W6-W17 competency has independent mastery evidence from two definitions', () => {
  const authoritative = new Set(['deterministic', 'pyodide', 'pyodide-sympy']);
  for (const competencyId of TARGET_COMPETENCIES) {
    const mastery = bundle.exerciseDefinitions.filter((item) =>
      item.competencyIds.includes(competencyId) && item.masteryEligible && authoritative.has(item.graderId) && item.active);
    assert.ok(mastery.length >= 2, `${competencyId} has ${mastery.length} independent mastery definitions`);
    const types = new Set(mastery.map((item) => item.activityType));
    assert.ok(types.size >= 2, `${competencyId} mastery definitions cover only ${[...types].join(',')}`);
  }
});

test('every W6-W17 competency spans basic, core, advanced and a final boss', () => {
  for (const competencyId of TARGET_COMPETENCIES) {
    const exercises = bundle.exerciseDefinitions.filter((item) => item.competencyIds.includes(competencyId) && item.active);
    const tier = (d) => (d <= 1 ? 'basic' : d === 2 ? 'core' : d === 3 ? 'advanced' : 'finalBoss');
    const tiers = new Set(exercises.map((item) => tier(item.difficulty)));
    for (const expected of ['basic', 'core', 'advanced', 'finalBoss']) {
      assert.ok(tiers.has(expected), `${competencyId} misses tier ${expected}`);
    }
  }
});

test('every W6-W17 roadmap week is detailed with readings, units and public exercises', () => {
  const weeks = new Map(bundle.legacyProjection.weeks.map((week) => [week.weekId, week]));
  const sourceIds = new Set(bundle.sources.map((source) => source.sourceId));
  for (const weekId of TARGET_WEEKS) {
    const week = weeks.get(weekId);
    assert.ok(week, `${weekId} missing from projection`);
    assert.equal(week.detailed, true, `${weekId} is not detailed`);
    assert.ok((week.learningUnits || []).length >= 3, `${weekId} has fewer than 3 units`);
    for (const unit of week.learningUnits || []) {
      assert.ok(unit.competencyId, `${weekId} unit without competency`);
      for (const reference of unit.sources || []) assert.ok(sourceIds.has(reference.sourceId), `${weekId} unknown source ${reference.sourceId}`);
    }
    const exercises = bundle.exerciseDefinitions.filter((item) => item.legacyWeekId === weekId && item.active);
    assert.ok(exercises.length >= 5, `${weekId} has only ${exercises.length} public exercises`);
  }
});

test('gate refs into W6-W17 are concretized (no future flag on authored weeks)', () => {
  for (const week of bundle.legacyProjection.weeks) {
    const gate = week.gate;
    if (!gate || !gate.cumulativeExerciseRefs) continue;
    for (const ref of gate.cumulativeExerciseRefs) {
      if (!TARGET_WEEKS.includes(ref.weekId)) continue;
      assert.notEqual(ref.future, true, `${week.weekId} still future-flags authored week ${ref.weekId}`);
      const pack = bundle.exerciseDefinitions.filter((item) => item.legacyWeekId === ref.weekId);
      assert.ok(pack.some((item) => item.competencyIds.includes(ref.skillId)),
        `${week.weekId} gate skill ${ref.skillId} not present in ${ref.weekId}`);
    }
  }
});

test('generated numeric families re-seed correctly through the real grader', async () => {
  const cases = [
    ['w06-e2', 'genCompleteRows'], ['w06-e6', 'genDedupRows'], ['w07-e2', 'genConditionalCount'],
    ['w08-e2', 'genMseGradient'], ['w09-e2', 'genBaselineCorrect'], ['w10-e2', 'genMseFromResiduals'],
    ['w10-e3', 'genR2Share'], ['w11-e2', 'genConfusionCount'], ['w12-e2', 'genCvSpread'],
    ['w13-e2', 'genSubgroupGapPp'], ['w14-e2', 'genShrinkagePercent'], ['w15-e2', 'genEnsembleAccuracy'],
    ['w16-e2', 'genPcaVariancePercent'], ['w17-e2', 'genCvSpread'],
  ];
  for (const [id, generator] of cases) {
    const def = definition(id);
    assert.ok(def, `${id} missing`);
    assert.equal(def.generatorId, generator, `${id} expected generator ${generator}`);
    assert.equal(def.masteryEligible, true);
    const fixed = instantiateLegacyExercise(def);
    assert.equal((await graders.deterministic.grade(def, String(fixed.expectedAnswer.value))).correct, true,
      `${id}: fixed-seed answer graded wrong`);
    const fresh = instantiateLegacyExercise(def, def.deterministicSeed + 977);
    const seeded = { ...def, deterministicSeed: def.deterministicSeed + 977 };
    assert.equal((await graders.deterministic.grade(seeded, String(fresh.expectedAnswer.value))).correct, true,
      `${id}: re-seeded answer graded wrong`);
    assert.equal((await graders.deterministic.grade(seeded, String(fresh.expectedAnswer.value + 1))).correct, false,
      `${id}: wrong re-seeded answer graded correct`);
  }
});

test('fixed prompts of generated exercises match their generator at the default seed', async () => {
  const cases = [
    ['w06-e2', 'genCompleteRows'], ['w06-e6', 'genDedupRows'], ['w07-e2', 'genConditionalCount'],
    ['w08-e2', 'genMseGradient'], ['w09-e2', 'genBaselineCorrect'], ['w10-e2', 'genMseFromResiduals'],
    ['w10-e3', 'genR2Share'], ['w11-e2', 'genConfusionCount'], ['w12-e2', 'genCvSpread'],
    ['w13-e2', 'genSubgroupGapPp'], ['w14-e2', 'genShrinkagePercent'], ['w15-e2', 'genEnsembleAccuracy'],
    ['w16-e2', 'genPcaVariancePercent'], ['w17-e2', 'genCvSpread'],
  ];
  const { DATA_ML_SEED_GENERATORS } = await import('../assets/js/core/data_ml_generators.mjs');
  for (const [id, generator] of cases) {
    const def = definition(id);
    const instance = DATA_ML_SEED_GENERATORS[generator](def.deterministicSeed);
    assert.equal(def.prompt, instance.prompt, `${id} prompt differs from generator output at seed ${def.deterministicSeed}`);
    assert.equal(def.expectedAnswer.defaultSeed, def.deterministicSeed);
    assert.equal(def.expectedAnswer.defaultExpected, instance.expected);
  }
});

test('W6-W17 python-code tasks declare numpy and executable deterministic tests', () => {
  const pythonTasks = bundle.exerciseDefinitions.filter((item) =>
    TARGET_WEEKS.includes(item.legacyWeekId) && item.activityType === 'python-code');
  assert.ok(pythonTasks.length >= 24, `only ${pythonTasks.length} python-code tasks`);
  for (const task of pythonTasks) {
    assert.equal(task.graderId, 'pyodide');
    assert.deepEqual(task.parameters.packages, ['numpy']);
    assert.match(task.parameters.tests, /__check\(/);
    assert.ok(task.fullSolution.includes('def '), `${task.definitionId} lacks a reference solution`);
    assert.ok((task.typicalErrors || []).length >= 2, `${task.definitionId} lacks typical errors`);
  }
});

test('every W6-W17 exercise exposes a native new-UI route', () => {
  const exercises = bundle.exerciseDefinitions.filter((item) => TARGET_WEEKS.includes(item.legacyWeekId));
  assert.ok(exercises.length >= 60);
  for (const exercise of exercises) {
    const route = routeForDefinition(exercise);
    assert.match(route, /^#\/(exercise|lab)\//, `${exercise.definitionId} has no native route`);
  }
});

test('pandas and sklearn execution is never claimed in W6-W17 prompts or packages', () => {
  const exercises = bundle.exerciseDefinitions.filter((item) => TARGET_WEEKS.includes(item.legacyWeekId));
  for (const exercise of exercises) {
    const packages = exercise.parameters?.packages || [];
    assert.equal(packages.includes('pandas'), false, `${exercise.definitionId} requests pandas`);
    assert.equal(packages.includes('sklearn') && exercise.graderId === 'pyodide', false, `${exercise.definitionId} executes sklearn`);
  }
});

test('W17 ships the local reproducibility project with a valid manifest', () => {
  const project = bundle.projects.find((item) => item.projectId === 'p-ml-repro-comparison');
  assert.ok(project, 'p-ml-repro-comparison missing');
  assert.ok(project.competencyIds.includes('c-ml-repro'));
  assert.deepEqual(project.allowedCommands[0].args, ['-m', 'pytest', '-q', '--disable-warnings', '--maxfail=1', 'tests']);
  const competency = bundle.competencies.find((item) => item.competencyId === 'c-ml-repro');
  assert.ok(competency);
});

test('honest competency contract: pandas as reading competence, CV required for regularization', () => {
  const cleaning = bundle.competencies.find((item) => item.competencyId === 'c-pandas-cleaning');
  assert.match(cleaning.description, /Lese- und Vorhersagekompetenz/);
  assert.match(cleaning.description, /nicht browser-ausführbar/);
  const reg = bundle.competencies.find((item) => item.competencyId === 'c-ml-regularization');
  assert.ok(reg.requires.includes('c-ml-cv'), 'c-ml-regularization must require c-ml-cv');
  const svmpca = bundle.competencies.find((item) => item.competencyId === 'c-ml-svm-pca');
  assert.match(svmpca.description, /Clustering/);
  assert.match(svmpca.description, /überwachtes versus unüberwachtes/);
});
