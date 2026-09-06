import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPublicLegacyContent } from '../tools/public_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'));

const catalog = readJson(join(root, 'content/catalog.json'));
const registeredPackFiles = catalog.legacy.exerciseFiles;

const source = () => {
  const curriculum = readJson(join(root, 'content/curriculum.json'));
  const sources = readJson(join(root, 'content/sources.json'));
  if (!sources.sources.some((item) => item.contentClass === 'private')) {
    sources.sources.push({
      sourceId: 'private-test-source',
      title: 'Private Test Source',
      contentClass: 'private',
      localPath: '../private-test-source',
    });
    curriculum.derivedFrom = [...(curriculum.derivedFrom || []), { sourceId: 'private-test-source', file: '../private-test-source' }];
  }
  return {
    curriculum,
    sources,
    exercisePacks: catalog.legacy.exerciseFiles.map((file) => readJson(join(root, 'content', file))),
  };
};

const isPublicTask = (exercise) => exercise.active !== false;

const expectedPublicTaskCount = (packs) =>
  packs.reduce((total, pack) => total + (pack.exercises || []).filter(isPublicTask).length, 0);

test('source loads every registered week package from the catalog', () => {
  assert.ok(registeredPackFiles.length > 2, 'catalog must register more than the old W1/W5 pair');
  const input = source();
  assert.equal(input.exercisePacks.length, registeredPackFiles.length);
  for (const [index, file] of registeredPackFiles.entries()) {
    const pack = input.exercisePacks[index];
    assert.ok(Array.isArray(pack.exercises) && pack.exercises.length > 0, `${file} has exercises`);
  }
});

test('public legacy transform removes private source records and references', () => {
  const input = source();
  const privateIds = input.sources.sources
    .filter((item) => item.contentClass === 'private')
    .map((item) => item.sourceId);
  const output = createPublicLegacyContent(input);
  assert.ok(privateIds.length > 0);
  assert.equal(output.sources.sources.some((item) => item.contentClass === 'private'), false);
  assert.equal(output.sources.sources.some((item) => item.localPath || item.localFile), false);
  assert.equal(
    output.sources.sources.some((item) => item.localSha256),
    false,
    'no local file hashes may leak',
  );
  const serialized = JSON.stringify(output);
  for (const sourceId of privateIds) assert.doesNotMatch(serialized, new RegExp(`"${sourceId}"`));
  for (const item of output.curriculum.derivedFrom || []) {
    assert.equal(privateIds.includes(item.sourceId), false);
    assert.equal(item.file, undefined);
    assert.equal(item.sha256, undefined);
  }
  for (const week of output.curriculum.weeks || []) {
    for (const unit of week.learningUnits || []) {
      for (const unitSource of unit.sources || []) {
        assert.equal(privateIds.includes(unitSource.sourceId), false);
        assert.equal(unitSource.locatorPath, undefined);
      }
    }
  }
});

test('public legacy transform filters inactive tasks across the full corpus and preserves pack order', () => {
  const input = source();
  const output = createPublicLegacyContent(input);
  const exercises = output.exercisePacks.flatMap((pack) => pack.exercises);
  assert.equal(exercises.length, expectedPublicTaskCount(input.exercisePacks));
  assert.equal(exercises.some((item) => item.active === false), false);
  assert.equal(exercises.some((item) => /MML|Murphy|CS50P/.test(item.sourceLineage?.concept || '')), false);
  assert.equal(exercises.every((item) => item.sourceLineage?.concept === 'eigenständig entwickelte Aufgabenfamilie'), true);
  assert.equal(exercises.some((item) => /\(vgl\.\s*MML\b|\(MML\b/.test(item.prompt || '')), false);
  assert.doesNotMatch(JSON.stringify(output), /\bMML\b|mml-book|murphy-pml|cs50p-psets-harvard|library-private|private-extracts/);

  assert.equal(output.exercisePacks.length, input.exercisePacks.length);
  for (const [index, pack] of input.exercisePacks.entries()) {
    const expectedIds = (pack.exercises || [])
      .filter(isPublicTask)
      .map((exercise) => exercise.exerciseId);
    const actualIds = (output.exercisePacks[index].exercises || []).map((e) => e.exerciseId);
    assert.deepEqual(actualIds, expectedIds, `pack ${registeredPackFiles[index]} keeps order`);
  }
  const keptIds = new Set(exercises.map((item) => item.exerciseId));
  for (const week of output.curriculum.weeks || []) {
    for (const id of week.exercises || []) assert.ok(keptIds.has(id));
    for (const id of week.gate?.evidenceExerciseIds || []) assert.ok(keptIds.has(id));
    for (const unit of week.learningUnits || []) {
      for (const id of unit.unitExerciseIds || []) assert.ok(keptIds.has(id));
    }
  }
});

test('public search index is rebuilt only from filtered data across the full corpus', () => {
  const input = source();
  const privateIds = input.sources.sources
    .filter((item) => item.contentClass === 'private')
    .map((item) => item.sourceId);
  const output = createPublicLegacyContent(input);
  assert.equal(output.searchIndex.entries.some((item) => item.kind === 'source' && privateIds.includes(item.id)), false);
  const publicIds = new Set(
    output.exercisePacks.flatMap((pack) => (pack.exercises || []).map((e) => e.exerciseId)),
  );
  for (const entry of output.searchIndex.entries) {
    if (entry.kind === 'exercise') assert.ok(publicIds.has(entry.id), `index entry ${entry.id} must be a public task`);
  }
  for (const sourceId of privateIds) {
    assert.equal(output.searchIndex.entries.some((item) => item.text.includes(sourceId)), false);
  }
  const indexExerciseIds = output.searchIndex.entries
    .filter((item) => item.kind === 'exercise')
    .map((item) => item.id);
  assert.equal(indexExerciseIds.length, expectedPublicTaskCount(input.exercisePacks));
});

test('late-week injected private marker fails closed', () => {
  const input = source();
  const lastPack = input.exercisePacks[input.exercisePacks.length - 1];
  lastPack.exercises.push({
    exerciseId: 'w39-e999-injected',
    schemaVersion: 1,
    type: 'numeric',
    grader: 'deterministic',
    deterministicSeed: 999999,
    prompt: 'Testaufgabe nach MML §2.2',
    sourceLineage: { concept: 'MML §2.2, S. 22-23', statement: 'eigenständig entwickelt' },
    expectedAnswer: { kind: 'integer', value: 1 },
  });
  assert.throws(() => createPublicLegacyContent(input), /privaten Quellenmarker/);
});
