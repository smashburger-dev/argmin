import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplitArtifacts } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function dirname(path) { return path.slice(0, Math.max(path.lastIndexOf('/'), 0)); }

function loadCompiledProfile(profile) {
  return JSON.parse(readFileSync(join(root, `.content-build/${profile}/content-bundle.json`), 'utf8'));
}

test('split index keeps summaries but never lesson or exercise bodies', () => {
  const bundle = loadCompiledProfile('public');
  const { index } = buildSplitArtifacts(bundle);
  assert.equal(index.lessons.length, bundle.lessons.length, 'lesson summaries survive');
  assert.equal(index.exerciseDefinitions.length, bundle.exerciseDefinitions.length, 'exercise summaries survive');
  for (const lesson of index.lessons) assert.deepEqual(lesson.blocks, [], `lesson ${lesson.lessonId} body must stay out of the index`);
  for (const exercise of index.exerciseDefinitions) {
    for (const field of ['parameters', 'fullSolution', 'hints', 'workedExample', 'expectedAnswer', 'choices', 'prompt', 'sourceLineage']) {
      assert.equal(exercise[field], undefined, `exercise ${exercise.definitionId} leaks body field ${field} into the index`);
    }
    assert.ok(typeof exercise.promptSnippet === 'string' && exercise.promptSnippet.length > 0, `exercise ${exercise.definitionId} keeps a prompt snippet for list views`);
    assert.ok(exercise.promptSnippet.length <= 120, `exercise ${exercise.definitionId} snippet must stay short`);
    assert.ok(exercise.competencyIds, `exercise ${exercise.definitionId} keeps competencies for planning`);
  }
});


test('index stays structurally body-free: no solutions, starters, test code or long prompts', () => {
  // ADR-0014 Teil 5: belt-and-suspenders guard against accidental index
  // inflation — even if a future editor adds a new summary field, raw body
  // text (solutions, starter code, embedded tests, full prompts) must never
  // serialize into the entry-chunk index.
  const bundle = loadCompiledProfile('public');
  const { index } = buildSplitArtifacts(bundle);
  const serialized = JSON.stringify(index);
  const solutions = bundle.exerciseDefinitions
    .map((exercise) => exercise.fullSolution)
    .filter((solution) => typeof solution === 'string' && solution.length >= 80);
  for (const solution of solutions) {
    const fragment = solution.slice(0, 60);
    assert.ok(!serialized.includes(fragment), 'index must not contain full solution text (fragment leaked)');
  }
  for (const exercise of bundle.exerciseDefinitions) {
    const starter = exercise.parameters?.starterCode;
    if (typeof starter === 'string' && starter.length >= 60) {
      assert.ok(!serialized.includes(starter.slice(0, 50)), `index leaks starter code of ${exercise.definitionId}`);
    }
    const tests = exercise.parameters?.tests;
    if (typeof tests === 'string' && tests.length >= 60) {
      assert.ok(!serialized.includes(tests.slice(0, 50)), `index leaks test code of ${exercise.definitionId}`);
    }
    if (typeof exercise.prompt === 'string' && exercise.prompt.length > 120) {
      const beyondSnippet = exercise.prompt.slice(60, 160);
      assert.ok(!serialized.includes(beyondSnippet), `index leaks prompt body of ${exercise.definitionId}`);
    }
  }
  // Size guard on the exercise summary section only (baseline 2026-08-31:
  // ~620 B per exercise summary; a leaked body field adds 1-8 KiB per hit).
  const sectionBytes = JSON.stringify(index.exerciseDefinitions).length;
  const perExercise = sectionBytes / bundle.exerciseDefinitions.length;
  assert.ok(perExercise < 1000, `exercise summaries grew to ${Math.round(perExercise)} B each — body data suspected (budget 1000 B, baseline ~620 B)`);
});


test('split bodies together with the index rebuild every full definition', () => {
  const bundle = loadCompiledProfile('public');
  const { index, lessonBodies, exerciseBodies } = buildSplitArtifacts(bundle);
  const bodyFields = ['parameters', 'choices', 'expectedAnswer', 'tolerancePolicy', 'hints', 'feedbackRules', 'fullSolution', 'workedExample', 'rubric', 'typicalErrors', 'prompt', 'sourceLineage'];
  for (const lesson of bundle.lessons) {
    const summary = index.lessons.find((item) => item.lessonId === lesson.lessonId);
    const body = lessonBodies.find((item) => item.id === lesson.lessonId);
    assert.ok(summary && body, `lesson ${lesson.lessonId} split incomplete`);
    assert.deepEqual(body.body.blocks, lesson.blocks, `lesson ${lesson.lessonId} blocks must move into the body chunk unchanged`);
  }
  for (const exercise of bundle.exerciseDefinitions) {
    const summary = index.exerciseDefinitions.find((item) => item.definitionId === exercise.definitionId);
    const body = exerciseBodies.find((item) => item.id === exercise.definitionId);
    assert.ok(summary && body, `exercise ${exercise.definitionId} split incomplete`);
    const merged = { ...summary, ...body.body };
    const mergedBodyFields = [...bodyFields, 'prompt'];
    for (const field of mergedBodyFields) assert.deepEqual(merged[field], exercise[field], `exercise ${exercise.definitionId} field ${field} differs after merge`);
  }
});

test('chunks module registers exactly the shipped bodies with safe file names', () => {
  const bundle = loadCompiledProfile('public');
  const { chunks, lessonBodies, exerciseBodies } = buildSplitArtifacts(bundle);
  for (const { id } of lessonBodies) assert.match(chunks, new RegExp(`"${id}": \\(\\) => import\\('./lessons/${id}\\.json'\\)`), `lesson ${id} missing from chunks`);
  for (const { id } of exerciseBodies) assert.match(chunks, new RegExp(`"${id}": \\(\\) => import\\('./exercises/${id}\\.json'\\)`), `exercise ${id} missing from chunks`);
  assert.doesNotMatch(chunks, /\.\.\//, 'chunk imports must not escape the split directory');
});

test('written split artifacts on disk match the compiled bundle', () => {
  const bundle = loadCompiledProfile('public');
  const splitDir = join(root, '.content-build/public/split');
  const index = JSON.parse(readFileSync(join(splitDir, 'index.json'), 'utf8'));
  assert.equal(index.catalogId, bundle.catalogId);
  for (const lesson of bundle.lessons) {
    const bodyPath = join(splitDir, 'lessons', `${lesson.lessonId}.json`);
    assert.ok(existsSync(bodyPath), `missing lesson chunk ${lesson.lessonId}`);
    const body = JSON.parse(readFileSync(bodyPath, 'utf8'));
    assert.deepEqual(body.blocks, lesson.blocks);
  }
  for (const exercise of bundle.exerciseDefinitions) {
    const bodyPath = join(splitDir, 'exercises', `${exercise.definitionId}.json`);
    assert.ok(existsSync(bodyPath), `missing exercise chunk ${exercise.definitionId}`);
    const body = JSON.parse(readFileSync(bodyPath, 'utf8'));
    assert.equal(body.fullSolution, exercise.fullSolution, `exercise ${exercise.definitionId} solution body differs`);
  }
});

test('public split never contains private bodies or markers', () => {
  const bundle = loadCompiledProfile('public');
  const { index } = buildSplitArtifacts(bundle);
  const privateMarkers = /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i;
  assert.doesNotMatch(JSON.stringify(index), privateMarkers, 'public index leaks a private marker');
});
