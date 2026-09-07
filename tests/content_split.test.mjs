import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplitArtifacts } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const loadCompiledProfile = (profile) => JSON.parse(readFileSync(join(root, `.content-build/${profile}/content-bundle.json`), 'utf8'));

test('split index keeps summaries but never lesson or family bodies', () => {
  const bundle = loadCompiledProfile('public');
  const { index } = buildSplitArtifacts(bundle);
  assert.equal(index.lessons.length, bundle.lessons.length);
  assert.deepEqual(index.familyActivities, bundle.familyActivities);
  for (const lesson of index.lessons) assert.deepEqual(lesson.blocks, []);
  for (const family of index.families) {
    for (const item of family.cases) assert.deepEqual(Object.keys(item).sort(), ['caseId', 'difficultyProfile', 'masteryEligible'].sort());
  }
});

test('index stays structurally body-free', () => {
  const bundle = loadCompiledProfile('public');
  const { index } = buildSplitArtifacts(bundle);
  const serialized = JSON.stringify({ lessons: index.lessons, families: index.families });
  for (const family of bundle.families) {
    for (const item of family.cases) {
      for (const fragment of [item.prompt, item.expected?.referenceSolver, item.parameters?.starterCode, item.parameters?.tests]
        .filter((value) => typeof value === 'string' && value.length >= 60)) {
        assert.equal(serialized.includes(fragment.slice(0, 50)), false, `${family.familyId}:${item.caseId} body leaked`);
      }
    }
  }
  assert.ok(JSON.stringify(index.familyActivities).length / bundle.familyActivities.length < 1000);
});

test('split bodies together with the index rebuild every lesson and family', () => {
  const bundle = loadCompiledProfile('public');
  const { index, lessonBodies, familyBodies } = buildSplitArtifacts(bundle);
  for (const lesson of bundle.lessons) {
    const summary = index.lessons.find((item) => item.lessonId === lesson.lessonId);
    const body = lessonBodies.find((item) => item.id === lesson.lessonId);
    assert.ok(summary && body);
    assert.deepEqual({ ...summary, ...body.body }, lesson);
  }
  for (const family of bundle.families) {
    const summary = index.families.find((item) => item.familyId === family.familyId);
    const body = familyBodies.find((item) => item.id === family.familyId);
    assert.ok(summary && body);
    assert.deepEqual(body.body, family);
  }
});

test('chunks module registers exactly the shipped bodies with safe file names', () => {
  const bundle = loadCompiledProfile('public');
  const { chunks, lessonBodies, familyBodies } = buildSplitArtifacts(bundle);
  for (const { id } of lessonBodies) assert.match(chunks, new RegExp(`"${id}": \\(\\) => import\\('./lessons/${id}\\.json'\\)`));
  for (const { id } of familyBodies) assert.match(chunks, new RegExp(`"${id}": \\(\\) => import\\('./families/${id}\\.json'\\)`));
  assert.doesNotMatch(chunks, /\.\.\//);
});

test('written split artifacts on disk match the compiled bundle', () => {
  const bundle = loadCompiledProfile('public');
  const splitDir = join(root, '.content-build/public/split');
  const index = JSON.parse(readFileSync(join(splitDir, 'index.json'), 'utf8'));
  assert.equal(index.catalogId, bundle.catalogId);
  for (const lesson of bundle.lessons) {
    const path = join(splitDir, 'lessons', `${lesson.lessonId}.json`);
    assert.ok(existsSync(path));
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')).blocks, lesson.blocks);
  }
  for (const family of bundle.families) {
    const path = join(splitDir, 'families', `${family.familyId}.json`);
    assert.ok(existsSync(path));
    assert.deepEqual(JSON.parse(readFileSync(path, 'utf8')), family);
  }
});

test('public split never contains private bodies or markers', () => {
  const bundle = loadCompiledProfile('public');
  const { index } = buildSplitArtifacts(bundle);
  assert.doesNotMatch(JSON.stringify(index), /library-private|private-extracts|locatorPath|localPath|\/Users\/|\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard/i);
});
