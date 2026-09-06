import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// W2-W4 integration verification against the ADR-0014 part 1 contracts. The
// week packs (content/exercises/w02-w04.json) and the detailed curriculum
// weeks are authored by the main agent; this file pins the foundations
// exercise-definition assignments (legacyWeekId) and checks the isolated
// contracts that must hold once W2-W4 are realized: assignment map, unit
// coverage, competency routing, task distribution, no double assignment,
// gate freshness, mastery policy, and pack-vs-definition prompt separation.

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEEKS = ['w02', 'w03', 'w04'];
const FOUNDATIONS_DIR = 'content/exercise-definitions/foundations';
const WEEKLY_MINUTES = 600;
const PROMPT_PREFIX_LIMIT = 80;

// Fixed assignment map (ADR-0014 part 1): foundations definitions that are
// deliberately anchored at a roadmap week. meta-error-log.json stays null.
const WEEK_DEFINITION_FILES = {
  w02: [
    'control-choice.json',
    'control-trace.json',
    'control-parsons.json',
    'control-repair.json',
    'collections-choice.json',
    'collections-output.json',
    'code-reading-output.json',
    'control-flow-output.json',
  ],
  w03: [
    'files-choice.json',
    'files-parsons.json',
    'git-choice.json',
    'git-parsons.json',
    'git-merge-debug.json',
    'collection-step-trace.json',
    'exception-boundary.json',
    'git-next-action.json',
  ],
  w04: [
    'testing-choice.json',
    'testing-parsons.json',
    'data-code-repair.json',
    'branch-coverage.json',
  ],
};
const ASSIGNED_FILES = Object.values(WEEK_DEFINITION_FILES).flat();

const readJson = (path) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const definition = (file) => readJson(`${FOUNDATIONS_DIR}/${file}`);
const allFoundations = () => readdirSync(join(root, FOUNDATIONS_DIR))
  .filter((file) => file.endsWith('.json'))
  .map((file) => ({ file, definition: definition(file) }));
const pack = (weekId) => readJson(`content/exercises/${weekId}.json`);
const curriculumWeek = (weekId) => readJson('content/curriculum.json').weeks
  .find((week) => week.weekId === weekId);
// Week tasks = pack exercises (by exerciseId in the week pack) plus the
// foundations definitions assigned to that week via legacyWeekId.
const weekTasks = (weekId) => [
  ...pack(weekId).exercises.map((exercise) => ({
    id: exercise.exerciseId,
    type: exercise.type,
    difficulty: exercise.difficulty,
    masteryEligible: exercise.masteryEligible,
    prompt: String(exercise.prompt),
  })),
  ...WEEK_DEFINITION_FILES[weekId].map((file) => {
    const def = definition(file);
    return {
      id: def.definitionId,
      type: def.activityType,
      difficulty: def.difficulty,
      masteryEligible: def.masteryEligible,
      prompt: String(def.prompt),
    };
  }),
];
const longestCommonPrefix = (a, b) => {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
  return i;
};

// --- A: legacyWeekId assignment map ---------------------------------------------

test('every mapped foundations definition carries its assigned legacyWeekId', () => {
  assert.equal(ASSIGNED_FILES.length, 20, 'the assignment map must cover exactly 20 files');
  for (const [weekId, files] of Object.entries(WEEK_DEFINITION_FILES)) {
    for (const file of files) {
      const def = definition(file);
      assert.equal(def.legacyWeekId, weekId, `${file}: expected legacyWeekId ${weekId}`);
    }
  }
  // The diagnosis task is a family case and therefore has no authored
  // definition assignment.
  assert.equal(existsSync(join(root, 'content/exercise-definitions/foundations/meta-error-log.json')), false);
});

// --- B: week-to-competency coverage in the curriculum ------------------------------

test('w02-w04 curriculum weeks are detailed, reference existing competencies and budget 600 minutes', () => {
  const competencyIds = new Set(readJson('content/competencies/core.json').competencies
    .map((competency) => competency.competencyId));
  for (const weekId of WEEKS) {
    const week = curriculumWeek(weekId);
    assert.ok(week, `${weekId}: missing from curriculum weeks`);
    assert.equal(week.detailed, true, `${weekId}: must be detailed`);
    assert.ok(Array.isArray(week.learningUnits) && week.learningUnits.length > 0,
      `${weekId}: learningUnits missing`);
    let minutes = 0;
    for (const unit of week.learningUnits) {
      assert.ok(competencyIds.has(unit.competencyId),
        `${weekId}/${unit.unitId}: unknown competencyId ${unit.competencyId}`);
      minutes += unit.minutes || 0;
    }
    assert.equal(minutes, WEEKLY_MINUTES, `${weekId}: unit minutes must sum to ${WEEKLY_MINUTES}`);
  }
});

// --- C: competency routing ---------------------------------------------------------

test('c-python-files-errors is routed to a roadmap week (w03) through learningUnits', () => {
  // Previously documented gap (ADR-0014 part 1): the competency existed but no
  // roadmap week carried it, so it was unreachable via the curriculum.
  const routed = readJson('content/curriculum.json').weeks.some((week) => week.weekId === 'w03'
    && (week.learningUnits || []).some((unit) => unit.competencyId === 'c-python-files-errors'));
  assert.equal(routed, true, 'no w03 learningUnit references c-python-files-errors');
});

// --- D: task distribution per week ---------------------------------------------------

test('each of w02-w04 exposes at least 5 public tasks, 3 distinct activity types and one difficulty-3 task', () => {
  for (const weekId of WEEKS) {
    const tasks = weekTasks(weekId);
    assert.ok(tasks.length >= 5, `${weekId}: only ${tasks.length} public tasks (pack + assigned definitions)`);
    const types = new Set(tasks.map((task) => task.type));
    assert.ok(types.size >= 3, `${weekId}: only ${types.size} distinct activity types (${[...types].join(', ')})`);
    assert.ok(tasks.some((task) => task.difficulty === 3),
      `${weekId}: no Advanced (difficulty 3) task across pack and definitions`);
  }

  // W4 additionally anchors the foundations project.
  const project = readJson('content/projects/foundations-data-checker/project.json');
  assert.equal(project.projectId, 'p-foundations-data-checker');
  assert.equal(project.legacyWeekId, 'w04', 'p-foundations-data-checker must be anchored at w04');
});

// --- E: no double assignment ----------------------------------------------------------

test('legacyWeekId assignments are unique: exactly the 20 mapped files, no duplicate signatures', () => {
  // Every foundations file that carries a w02-w04 assignment must be one of
  // the mapped files (algebra and meta definitions stay unassigned), and no
  // file may appear under two weeks.
  const assignedElsewhere = allFoundations()
    .filter(({ file, definition: def }) => WEEKS.includes(def.legacyWeekId) && !ASSIGNED_FILES.includes(file))
    .map(({ file }) => file);
  assert.deepEqual(assignedElsewhere, [],
    `foundations files outside the map carry a w02-w04 legacyWeekId: ${assignedElsewhere.join(', ')}`);
  assert.equal(new Set(ASSIGNED_FILES).size, ASSIGNED_FILES.length, 'a file is listed under more than one week');

  // Definition ids are unique and no two definitions assigned to the same
  // week share competencyIds + activityType + prompt signature (80-char prefix).
  const seenIds = new Set();
  for (const weekId of WEEKS) {
    const signatures = new Map();
    for (const file of WEEK_DEFINITION_FILES[weekId]) {
      const def = definition(file);
      assert.ok(!seenIds.has(def.definitionId), `duplicate definitionId ${def.definitionId}`);
      seenIds.add(def.definitionId);
      const signature = [def.activityType, [...def.competencyIds].sort().join('+'), String(def.prompt).slice(0, PROMPT_PREFIX_LIMIT)].join('|');
      assert.ok(!signatures.has(signature),
        `${weekId}: ${file} duplicates the assignment signature of ${signatures.get(signature)}`);
      signatures.set(signature, file);
    }
  }
});

// --- F: cumulative gate freshness --------------------------------------------------------

test('cumulative gates reference the realized foundations weeks without future flags', () => {
  // w13 keeps c-git-basics fresh before the w17 final boss (ADR-0014).
  const w13refs = curriculumWeek('w13').gate.cumulativeExerciseRefs;
  const gitRef = w13refs.find((ref) => ref.weekId === 'w03' && ref.skillId === 'c-git-basics');
  assert.ok(gitRef, 'w13 gate has no {weekId: w03, skillId: c-git-basics} cumulative ref');
  assert.notEqual(gitRef.future, true, 'the w13 git ref must no longer be a future placeholder');

  // w10-w12 recall the now-realized foundations weeks; unmarked references
  // would fail the validator, future flags would silently drop the recall.
  for (const weekId of ['w10', 'w11', 'w12']) {
    const refs = (curriculumWeek(weekId).gate?.cumulativeExerciseRefs || [])
      .filter((ref) => WEEKS.includes(ref.weekId));
    assert.ok(refs.length > 0, `${weekId} gate has no cumulative ref into w02-w04`);
    for (const ref of refs) {
      assert.notEqual(ref.future, true,
        `${weekId} gate ref to ${ref.weekId} still carries future: true`);
      assert.ok(existsSync(join(root, 'content/exercises', `${ref.weekId}.json`)),
        `${weekId} gate ref targets week ${ref.weekId} without a pack`);
    }
  }
});

// --- G: mastery policy ----------------------------------------------------------------------

test('non-mastery tasks in w02-w04 are difficulty-1 concept questions', () => {
  for (const weekId of WEEKS) {
    for (const task of weekTasks(weekId)) {
      if (task.masteryEligible === false) {
        assert.equal(task.difficulty, 1,
          `${weekId}/${task.id}: masteryEligible false requires difficulty 1 (concept question), got ${task.difficulty}`);
      }
    }
  }
});

// --- H: semantic duplicate guard ---------------------------------------------------------------

test('w02-w04 pack prompts stay distinct from all 14 assigned definition prompts', () => {
  const definitionPrompts = ASSIGNED_FILES.map((file) => String(definition(file).prompt));
  for (const weekId of WEEKS) {
    for (const task of weekTasks(weekId)) {
      // Only the authored pack exercises are the new content here.
      if (!task.id.startsWith(`${weekId}-e`)) continue;
      for (const prompt of definitionPrompts) {
        const shared = longestCommonPrefix(task.prompt, prompt);
        assert.ok(shared < PROMPT_PREFIX_LIMIT,
          `${task.id} shares a ${shared}-char prompt prefix with an assigned definition`);
      }
    }
  }
});
