// Procedural family formula-descriptive-stats-numpy: capsule gates.
// Run: node --test tests/procedural_descriptive_stats_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  STATS_CASES,
  STATS_CONTRACT,
  genStatsCase,
  generateStatsFamily,
  solveStatsFamily,
  statsCaseOk,
} from '../assets/js/core/procedural/formula-descriptive-stats-numpy.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['describe-and-bins', 'describe-outlier-bins'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-descriptive-stats-numpy.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 2);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests preserved`);
    assert.equal(body.expected.kind, 'reference-solver');
    assert.ok(body.expected.referenceSolver.length > 50, `${caseId}: reference solver preserved`);
  }
  // base test blocks and prompts must equal the module constants verbatim
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    const def = STATS_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy statsCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = STATS_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genStatsCase(seed, def);
      assert.ok(statsCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genStatsCase(seed, STATS_CASES['describe-and-bins']);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.sample.length >= 5 && entry.sample.length <= 10, 'core sample length');
      assert.ok(entry.sample.every((v) => v >= -20 && v <= 40), 'core sample range');
      assert.ok(entry.edges.length >= 2 && entry.edges.length <= 4, 'core edge count');
      assert.ok(entry.edges.every((e, i) => i === 0 || entry.edges[i - 1] < e), 'edges sorted unique');
    }
    const challenge = genStatsCase(seed, STATS_CASES['describe-outlier-bins']);
    for (const entry of challenge.parameters.seedCases) {
      assert.ok(entry.sample.length >= 5 && entry.sample.length <= 8, 'challenge sample length');
      const outliers = entry.sample.filter((v) => v > 15 || v < -10);
      assert.equal(outliers.length, 1, `challenge exactly one outlier: ${entry.sample}`);
      assert.ok(entry.edges.length >= 3 && entry.edges.length <= 4, 'challenge edge count');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = STATS_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateStatsFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = STATS_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genStatsCase(seed, def), genStatsCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = STATS_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateStatsFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveStatsFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(STATS_CONTRACT.familyId, 'formula-descriptive-stats-numpy');
  assert.equal(STATS_CONTRACT.authorityMode, 'seeded');
  assert.equal(STATS_CONTRACT.activityType, 'python-code');
  assert.equal(STATS_CONTRACT.graderId, 'pyodide');
  assert.equal(STATS_CONTRACT.masteryEligible, true);
  assert.deepEqual(STATS_CONTRACT.difficultyProfiles, ['core', 'challenge']);
  assert.throws(() => generateStatsFamily({ seed: 0, caseId: 'describe-and-bins', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateStatsFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannt/);
  assert.throws(() => generateStatsFamily({ seed: 0.5, caseId: 'describe-and-bins', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveStatsFamily({}), /Kapselform/);
});

test('registry: instantiate, deterministic, spec wired', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('formula-descriptive-stats-numpy', 7, 'core', 'describe-and-bins');
  assert.equal(instance.graderId, 'pyodide');
  assert.equal(instance.masteryEligible, true);
  assert.deepEqual(instance.competencyIds, ['c-eda-viz', 'c-numpy-basics']);
  assert.ok(instance.parameters.tests.includes('seeded n 1'));
  assert.equal(instance.expectedAnswer.kind, 'reference-solver');
  assert.deepEqual(
    EXERCISE_FAMILIES.instantiate('formula-descriptive-stats-numpy', 7, 'core', 'describe-and-bins'),
    instance,
  );
});
