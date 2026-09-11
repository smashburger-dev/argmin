// Procedural family fit-pca-kmeans-pipeline: capsule gates (python-code).
// Run: node --test tests/procedural_pca_kmeans_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/fit-pca-kmeans-pipeline.mjs';
import {
  PCA_KMEANS_CASES,
  PCA_KMEANS_CONTRACT,
  genPcaKmeansCase,
} from '../assets/js/core/procedural/fit-pca-kmeans-pipeline.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

const CASE_IDS = ['pca-eigh-projection', 'standardize-pca-kmeans'];

codeCapsuleSuite('fit-pca-kmeans-pipeline', mod, [
  { caseId: 'pca-eigh-projection', difficulty: 'core' },
  { caseId: 'standardize-pca-kmeans', difficulty: 'stretch' },
], { difficultyProfiles: ['core', 'stretch'] });

test('capsule extras: seeded block marker, ref copies and packages stay emitted', () => {
  for (const caseId of CASE_IDS) {
    const def = PCA_KMEANS_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genPcaKmeansCase(seed, caseId, def);
      assert.deepEqual(generated.parameters.packages, ['numpy']);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_pca'), `${caseId}:${seed}: pca ref copy embedded`);
      assert.ok(generated.parameters.tests.includes('__ref_kmeans'), `${caseId}:${seed}: kmeans ref copy embedded`);
      assert.equal(generated.fullSolution, def.fullSolution);
    }
  }
  // the pipeline case additionally embeds the composed reference helper
  const generated = genPcaKmeansCase(0, 'standardize-pca-kmeans', PCA_KMEANS_CASES['standardize-pca-kmeans']);
  assert.ok(generated.parameters.tests.includes('__ref_preprocess'), 'standardize: preprocess ref copy embedded');
});

test('seeded draws stay inside the declared domains', () => {
  const isOriginBlob = (row) => row.every((v) => v >= -1 && v <= 1);
  const isFarBlob = (row) => row.every((v) => v >= 7 && v <= 13);
  for (let seed = 0; seed < 200; seed += 1) {
    for (const caseId of CASE_IDS) {
      const generated = genPcaKmeansCase(seed, caseId, PCA_KMEANS_CASES[caseId]);
      for (const entry of generated.parameters.seedCases) {
        // two-blob layout: 2-4 origin rows followed by 2-4 far rows
        const near = entry.X.filter(isOriginBlob).length;
        const far = entry.X.filter(isFarBlob).length;
        assert.equal(near + far, entry.X.length, `${caseId}:${seed}: every row in a blob`);
        assert.ok(near >= 2 && near <= 4, `${caseId}:${seed}: blob A size`);
        assert.ok(far >= 2 && far <= 4, `${caseId}:${seed}: blob B size`);
        assert.ok(entry.X.slice(0, near).every(isOriginBlob), `${caseId}:${seed}: blob A comes first`);
        assert.ok(entry.X.every((row) => row.length === 2), `${caseId}:${seed}: 2-D rows`);
      }
    }
    const core = genPcaKmeansCase(seed, 'pca-eigh-projection', PCA_KMEANS_CASES['pca-eigh-projection']);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.k === 1 || entry.k === 2, `k in {1,2}: ${entry.k}`);
      assert.ok(Number.isInteger(entry.kmSeed) && entry.kmSeed >= 0 && entry.kmSeed <= 99, `kmSeed: ${entry.kmSeed}`);
    }
    const stretch = genPcaKmeansCase(seed, 'standardize-pca-kmeans', PCA_KMEANS_CASES['standardize-pca-kmeans']);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.seed) && entry.seed >= 0 && entry.seed <= 99, `seed: ${entry.seed}`);
      assert.ok(Number.isInteger(entry.constVal) && entry.constVal >= -5 && entry.constVal <= 5, `constVal: ${entry.constVal}`);
    }
  }
});

test('family extras: contract archetype, competencies and case types', () => {
  assert.equal(PCA_KMEANS_CONTRACT.taskArchetype, 'code-tests');
  assert.deepEqual(PCA_KMEANS_CONTRACT.competencyIds, ['c-ml-svm-pca', 'c-numpy-basics']);
  assert.deepEqual(PCA_KMEANS_CONTRACT.caseTypes, [
    { caseId: 'pca-eigh-projection', propertyTest: false },
    { caseId: 'standardize-pca-kmeans', propertyTest: false },
  ]);
});
