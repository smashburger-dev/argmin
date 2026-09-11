// Procedural family fit-pca-kmeans-pipeline: capsule gates.
// Run: node --test tests/procedural_pca_kmeans_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  PCA_KMEANS_CASES,
  PCA_KMEANS_CONTRACT,
  genPcaKmeansCase,
  generatePcaKmeansFamily,
  pcaKmeansCaseOk,
  solvePcaKmeansFamily,
} from '../assets/js/core/procedural/fit-pca-kmeans-pipeline.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['pca-eigh-projection', 'standardize-pca-kmeans'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/fit-pca-kmeans-pipeline.json'), 'utf8'));
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
    const def = PCA_KMEANS_CASES[caseId];
    assert.deepEqual(body.parameters.packages, ['numpy'], `${caseId}: packages`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy pcaKmeansCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PCA_KMEANS_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genPcaKmeansCase(seed, def);
      assert.ok(pcaKmeansCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.deepEqual(generated.parameters.packages, ['numpy']);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_pca'), `${caseId}:${seed}: pca ref copy embedded`);
      assert.ok(generated.parameters.tests.includes('__ref_kmeans'), `${caseId}:${seed}: kmeans ref copy embedded`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
      assert.equal(generated.fullSolution, def.fullSolution);
    }
  }
  // the pipeline case additionally embeds the composed reference helper
  const generated = genPcaKmeansCase(0, PCA_KMEANS_CASES['standardize-pca-kmeans']);
  assert.ok(generated.parameters.tests.includes('__ref_preprocess'), 'standardize: preprocess ref copy embedded');
});

test('seeded draws stay inside the declared domains', () => {
  const isOriginBlob = (row) => row.every((v) => v >= -1 && v <= 1);
  const isFarBlob = (row) => row.every((v) => v >= 7 && v <= 13);
  for (let seed = 0; seed < 200; seed += 1) {
    for (const caseId of CASE_IDS) {
      const generated = genPcaKmeansCase(seed, PCA_KMEANS_CASES[caseId]);
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
    const core = genPcaKmeansCase(seed, PCA_KMEANS_CASES['pca-eigh-projection']);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.k === 1 || entry.k === 2, `k in {1,2}: ${entry.k}`);
      assert.ok(Number.isInteger(entry.kmSeed) && entry.kmSeed >= 0 && entry.kmSeed <= 99, `kmSeed: ${entry.kmSeed}`);
    }
    const stretch = genPcaKmeansCase(seed, PCA_KMEANS_CASES['standardize-pca-kmeans']);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(Number.isInteger(entry.seed) && entry.seed >= 0 && entry.seed <= 99, `seed: ${entry.seed}`);
      assert.ok(Number.isInteger(entry.constVal) && entry.constVal >= -5 && entry.constVal <= 5, `constVal: ${entry.constVal}`);
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PCA_KMEANS_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generatePcaKmeansFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = PCA_KMEANS_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genPcaKmeansCase(seed, def), genPcaKmeansCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = PCA_KMEANS_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generatePcaKmeansFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solvePcaKmeansFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(PCA_KMEANS_CONTRACT.familyId, 'fit-pca-kmeans-pipeline');
  assert.equal(PCA_KMEANS_CONTRACT.authorityMode, 'seeded');
  assert.equal(PCA_KMEANS_CONTRACT.taskArchetype, 'code-tests');
  assert.equal(PCA_KMEANS_CONTRACT.activityType, 'python-code');
  assert.equal(PCA_KMEANS_CONTRACT.graderId, 'pyodide');
  assert.equal(PCA_KMEANS_CONTRACT.masteryEligible, true);
  assert.deepEqual(PCA_KMEANS_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.deepEqual(PCA_KMEANS_CONTRACT.competencyIds, ['c-ml-svm-pca', 'c-numpy-basics']);
  assert.deepEqual(PCA_KMEANS_CONTRACT.caseTypes, [
    { caseId: 'pca-eigh-projection', propertyTest: false },
    { caseId: 'standardize-pca-kmeans', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generatePcaKmeansFamily);
  assert.equal(FAMILY_SPEC.solve, solvePcaKmeansFamily);
  assert.throws(() => generatePcaKmeansFamily({ seed: 0, caseId: 'pca-eigh-projection', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generatePcaKmeansFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generatePcaKmeansFamily({ seed: 0.5, caseId: 'pca-eigh-projection', difficulty: 'core' }), /Seed/);
  assert.throws(() => solvePcaKmeansFamily({}), /Kapselform/);
});
