// Procedural family formula-descriptive-stats-numpy: capsule gates.
// Run: node --test tests/procedural_descriptive_stats_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/formula-descriptive-stats-numpy.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-descriptive-stats-numpy.json'), 'utf8'));

// The case defs do not carry `packages` and their fullSolution is the module's
// own reference walkthrough (generated instances carry it verbatim), while the
// JSON anchors pin their own curated fullSolution text — so the suite surface
// aligns both fields with the anchor bodies.
const suiteMod = {
  ...mod,
  STATS_CASES: Object.fromEntries(
    Object.entries(mod.STATS_CASES).map(([id, def]) => [id, {
      ...def,
      packages: ['numpy'],
      fullSolution: doc.cases.find((entry) => entry.caseId === id).fullSolution,
    }]),
  ),
};

codeCapsuleSuite('formula-descriptive-stats-numpy', suiteMod, [
  { caseId: 'describe-and-bins', difficulty: 'core' },
  { caseId: 'describe-outlier-bins', difficulty: 'challenge' },
], { difficultyProfiles: ['core', 'challenge'] });

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const core = mod.genStatsCase(seed, 'describe-and-bins', mod.STATS_CASES['describe-and-bins']);
    assert.ok(core.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.sample.length >= 5 && entry.sample.length <= 10, 'core sample length');
      assert.ok(entry.sample.every((v) => v >= -20 && v <= 40), 'core sample range');
      assert.ok(entry.edges.length >= 2 && entry.edges.length <= 4, 'core edge count');
      assert.ok(entry.edges.every((e, i) => i === 0 || entry.edges[i - 1] < e), 'edges sorted unique');
    }
    const challenge = mod.genStatsCase(seed, 'describe-outlier-bins', mod.STATS_CASES['describe-outlier-bins']);
    assert.ok(challenge.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    for (const entry of challenge.parameters.seedCases) {
      assert.ok(entry.sample.length >= 5 && entry.sample.length <= 8, 'challenge sample length');
      const outliers = entry.sample.filter((v) => v > 15 || v < -10);
      assert.equal(outliers.length, 1, `challenge exactly one outlier: ${entry.sample}`);
      assert.ok(entry.edges.length >= 3 && entry.edges.length <= 4, 'challenge edge count');
    }
  }
});

test('module extras: generated instances carry the module fullSolution', () => {
  for (const [caseId, def] of Object.entries(mod.STATS_CASES)) {
    const generated = mod.genStatsCase(0, caseId, def);
    assert.equal(generated.fullSolution, def.fullSolution, `${def.caseId ?? 'case'}: module fullSolution`);
    assert.ok(generated.fullSolution.length > 40, 'fullSolution is a real walkthrough');
  }
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
