// A3: LLM-benchmark gate. The fixture is built by
// tools/build_llm_benchmark.mjs (deterministic, no LLM). Every check below
// re-derives oracle data from the live content snapshot: schema validity,
// snapshot pinning (explicit "Snapshot veraltet" on drift, never silent
// green), solver consistency per item, 100 percent mutant rejection,
// disjointness of the held seeds from 0-199 and the training ranges, full
// modulo-class coverage for static cases, and an explicit python-code gap.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  BUILDER_VERSION,
  HELD_MODULO_BASE,
  TRAIN_SEED_RANGES,
  buildFixture,
  computeContentHash,
  contentCommit,
  correctAnswer,
  fixtureDigest,
  fixtureFileName,
  loadBenchmarkSnapshot,
} from '../tools/build_llm_benchmark.mjs';
import {
  HOLD_SEED_MAX,
  HOLD_SEED_MIN,
  TRAIN_SEED_MAX,
  TRAIN_SEED_MIN,
} from '../tools/llm/sample_pairs.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = await loadBenchmarkSnapshot(root);
const currentHash = computeContentHash(root);
const currentCommit = contentCommit(root);
const expectedName = fixtureFileName({ contentCommit: currentCommit, contentHash: currentHash });
const fixturePath = join(root, 'tests/fixtures', expectedName);

const loadFixture = () => {
  assert.ok(
    existsSync(fixturePath),
    `Snapshot veraltet: ${expectedName} fehlt (Branch- oder Content-Drift). `
    + 'tools/build_llm_benchmark.mjs neu laufen lassen und Fixture mit einfrieren.',
  );
  return JSON.parse(readFileSync(fixturePath, 'utf8'));
};

const inRanges = (seed, ranges) => ranges.some(({ start, end }) => seed >= start && seed <= end);

// Fixture data is JSON: -0/0, undefined-holes, and NaN compare in their
// serialized form (same canonicalization as family_golden_corpus).
const canon = (value) => JSON.parse(JSON.stringify(value));

test('benchmark constants match the sampling ranges', () => {
  assert.equal(HOLD_SEED_MIN, 90000);
  assert.equal(HOLD_SEED_MAX, 90999);
  assert.equal(HELD_MODULO_BASE, 10);
  assert.deepEqual(TRAIN_SEED_RANGES, [{ start: TRAIN_SEED_MIN, end: TRAIN_SEED_MAX }]);
});

test('fixture snapshot pinning matches the live content', () => {
  const fixture = loadFixture();
  assert.equal(
    fixture.contentHash, currentHash,
    `Snapshot veraltet: Fixture-Hash ${fixture.contentHash} statt ${currentHash}. Neu bauen.`,
  );
  assert.equal(
    fixture.contentCommit, currentCommit,
    `Snapshot veraltet: Fixture-Commit ${fixture.contentCommit} statt ${currentCommit}. Neu bauen.`,
  );
  assert.equal(fixture.builderVersion, BUILDER_VERSION);
  assert.equal(fixture.promptVersion, null);
  assert.deepEqual(fixture.heldSeedRange, { start: HOLD_SEED_MIN, end: HOLD_SEED_MAX });
  assert.deepEqual(fixture.trainSeedRanges, TRAIN_SEED_RANGES);
});

test('two builder runs produce the identical fixture digest', async () => {
  const first = await buildFixture(root);
  const second = await buildFixture(root);
  assert.ok(first.items.length > 0 && second.items.length > 0, 'Builder lieferte keine Items');
  assert.equal(fixtureDigest(first), fixtureDigest(second), 'Builder nicht deterministisch');
});

test('fixture validates against the llm-benchmark schema', () => {
  const fixture = loadFixture();
  const schema = JSON.parse(readFileSync(join(root, 'schemas/llm-benchmark.schema.json'), 'utf8'));
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  const ajv = new Ajv2020({ allErrors: true, strict: true, allowUnionTypes: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert.equal(validate(fixture), true, `Schema verletzt: ${ajv.errorsText(validate.errors)}`);
});

test('oracle instances are instantiable and solver-consistent', async () => {
  const fixture = loadFixture();
  assert.ok(fixture.items.length > 0);
  for (const item of fixture.items) {
    const label = `${item.familyId}:${item.caseId}:${item.difficulty}#${item.moduloClass}`;
    const instance = snapshot.registry.instantiate(item.familyId, item.heldSeed, item.difficulty, item.caseId);
    assert.deepEqual(canon(instance.prompt), item.prompt, `${label}: prompt`);
    assert.deepEqual(canon(instance.parameters), item.parameters, `${label}: parameters`);
    assert.deepEqual(canon(instance.expectedAnswer), item.expectedAnswer, `${label}: expectedAnswer`);
    assert.deepEqual(canon(instance.choices || null), item.choices, `${label}: choices`);
    assert.equal(instance.graderId, item.oracle.graderId, `${label}: graderId`);
    assert.equal(instance.activityType, item.oracle.activityType, `${label}: activityType`);
    const solved = snapshot.registry.get(item.familyId).solve(instance.parameters);
    const digest = createHash('sha256').update(JSON.stringify(solved)).digest('hex');
    assert.equal(digest, item.oracle.solverDigest, `${label}: solverDigest`);
    const answer = correctAnswer(instance);
    assert.notEqual(answer, undefined, `${label}: kein Antwort-Builder`);
    const graded = await snapshot.registry.grade(instance, answer);
    assert.equal(graded.correct, true, `${label}: Orakel-Antwort faellt durch`);
    for (const key of ['contentCommit', 'contentHash', 'builderVersion', 'promptVersion']) {
      assert.deepEqual(item.provenance[key], fixture[key], `${label}: provenance.${key}`);
    }
  }
});

test('every mutant is rejected with the documented reason', async () => {
  const fixture = loadFixture();
  let checked = 0;
  for (const item of fixture.items) {
    const label = `${item.familyId}:${item.caseId}:${item.difficulty}#${item.moduloClass}`;
    assert.ok(item.mutants.length >= 1, `${label}: mutants leer`);
    const instance = snapshot.registry.instantiate(item.familyId, item.heldSeed, item.difficulty, item.caseId);
    for (const mutant of item.mutants) {
      const graded = await snapshot.registry.grade(instance, mutant.answer);
      assert.equal(graded.correct, false, `${label}: Mutant akzeptiert (${mutant.text})`);
      assert.equal(graded.errorType ?? 'rejected', mutant.expectedRejectReason, `${label}: reject reason`);
      assert.equal(mutant.solverVerdict.correct, false, `${label}: solverVerdict`);
      checked += 1;
    }
  }
  assert.ok(checked > 0);
  assert.equal(fixture.mutantRejectionRate, 1);
});

test('held seeds are disjoint from training, audit, and golden seeds', () => {
  const fixture = loadFixture();
  assert.deepEqual([...fixture.heldSeeds].sort((a, b) => a - b), fixture.heldSeeds, 'heldSeeds unsortiert');
  for (const item of fixture.items) {
    const label = `${item.familyId}:${item.caseId}:${item.difficulty}`;
    assert.ok(
      item.heldSeed >= HOLD_SEED_MIN && item.heldSeed <= HOLD_SEED_MAX,
      `${label}: heldSeed ${item.heldSeed} ausserhalb des Haltebereichs`,
    );
    assert.ok(!inRanges(item.heldSeed, [{ start: 0, end: 199 }]), `${label}: heldSeed in 0-199 (Golden/Audit)`);
    assert.ok(!inRanges(item.heldSeed, fixture.trainSeedRanges), `${label}: heldSeed in Trainings-Range`);
    assert.equal(item.moduloClass, item.heldSeed % item.variantCount, `${label}: moduloClass`);
  }
  for (const seed of fixture.heldSeeds) {
    assert.ok(!inRanges(seed, [{ start: 0, end: 199 }]), `heldSeeds enthaelt ${seed} aus 0-199`);
    assert.ok(!inRanges(seed, fixture.trainSeedRanges), `heldSeeds enthaelt ${seed} aus Trainings-Range`);
  }
});

test('static cases cover every modulo class', () => {
  const fixture = loadFixture();
  const expected = new Map();
  for (const doc of snapshot.docs.filter((item) => item.contract)) {
    for (const body of doc.cases) {
      expected.set(`${doc.familyId}:${body.caseId}:${body.difficultyProfile}`, 1 + (body.variants ? body.variants.length : 0));
    }
  }
  const seen = new Map();
  for (const item of fixture.items) {
    const key = `${item.familyId}:${item.caseId}:${item.difficulty}`;
    if (!expected.has(key)) continue;
    if (!seen.has(key)) seen.set(key, new Set());
    seen.get(key).add(item.moduloClass);
  }
  assert.ok(seen.size > 0, 'kein statischer Fall im Benchmark');
  const excused = new Set(fixture.uncovered.map((entry) => `${entry.familyId}:${entry.caseId}:${entry.difficulty}`));
  for (const [key, variantCount] of expected) {
    assert.ok(seen.has(key) || excused.has(key), `${key}: weder abgedeckt noch als Luecke ausgewaiesen`);
    if (!seen.has(key)) continue;
    const classes = [...seen.get(key)].sort((a, b) => a - b);
    const full = Array.from({ length: variantCount }, (_, index) => index);
    assert.deepEqual(classes, full, `${key}: Modulo-Klassen unvollstaendig`);
  }
});

test('coverage gaps are explicit, verification never silently drops', () => {
  const fixture = loadFixture();
  for (const entry of fixture.uncovered) {
    assert.ok(entry.reason.length > 0, `${entry.familyId}: Grund fehlt`);
  }
  const failed = fixture.uncovered.filter((entry) => entry.category === 'verification-failed');
  assert.deepEqual(failed, [], `Solver-Verifikation verworfen: ${JSON.stringify(failed)}`);
  const workerGap = fixture.uncovered.filter((entry) => entry.category === 'worker-grader');
  assert.ok(workerGap.length > 0, 'python-code-Luecke nicht als worker-grader ausgewiesen');
  assert.ok(
    workerGap.every((entry) => /python-code|pyodide/.test(entry.reason)),
    'worker-grader ohne python-code/pyodide-Begruendung',
  );
});
