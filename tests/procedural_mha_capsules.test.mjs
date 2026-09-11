// Procedural family optimize-multi-head-attention: capsule gates.
// Run: node --test tests/procedural_mha_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  MHA_CASES,
  MHA_CONTRACT,
  genMhaCase,
  generateMhaFamily,
  mhaCaseOk,
  solveMhaFamily,
} from '../assets/js/core/procedural/optimize-multi-head-attention.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['multi-head-attention'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-multi-head-attention.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 1);
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
    const def = MHA_CASES[caseId];
    assert.equal(body.difficultyProfile, def.difficulty, `${caseId}: difficulty`);
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy mhaCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = MHA_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genMhaCase(seed, def);
      assert.ok(mhaCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded mha 1'), `${caseId}:${seed}: seeded check emitted`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genMhaCase(seed, MHA_CASES['multi-head-attention']);
    assert.equal(generated.parameters.seedCases.length, 2, 'extraCount');
    for (const entry of generated.parameters.seedCases) {
      const { shape, X, Wq, Wk, Wv, Wo, mask } = entry;
      assert.ok(shape.n >= 2 && shape.n <= 4, 'seq len range');
      assert.ok(shape.d >= 2 && shape.d <= 8, 'd_model range');
      assert.ok(shape.h >= 1 && shape.h <= 4, 'n_heads range');
      assert.equal(shape.d % shape.h, 0, 'd_model divisible by n_heads');
      assert.equal(X.length, shape.n, 'X rows = n');
      for (const row of X) {
        assert.equal(row.length, shape.d, 'X cols = d');
        assert.ok(row.every((v) => v >= -2 && v <= 2), 'X range');
      }
      for (const [name, W, lo, hi] of [['Wq', Wq, -1, 1], ['Wk', Wk, -1, 1], ['Wv', Wv, -2, 2], ['Wo', Wo, -1, 1]]) {
        assert.equal(W.length, shape.d, `${name} rows = d`);
        for (const row of W) {
          assert.equal(row.length, shape.d, `${name} cols = d`);
          assert.ok(row.every((v) => v >= lo && v <= hi), `${name} range`);
        }
      }
      if (mask === null) continue;
      assert.equal(mask.length, shape.n, 'mask rows = n');
      mask.forEach((row, i) => {
        assert.equal(row.length, shape.n, 'mask cols = n');
        assert.equal(row[i], true, `mask row ${i} keeps its diagonal key`);
        assert.ok(row.some(Boolean), `mask row ${i} keeps at least one key`);
      });
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = MHA_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateMhaFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = MHA_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genMhaCase(seed, def), genMhaCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = MHA_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateMhaFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveMhaFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(MHA_CONTRACT.familyId, 'optimize-multi-head-attention');
  assert.equal(MHA_CONTRACT.authorityMode, 'seeded');
  assert.equal(MHA_CONTRACT.activityType, 'python-code');
  assert.equal(MHA_CONTRACT.graderId, 'pyodide');
  assert.equal(MHA_CONTRACT.masteryEligible, true);
  assert.deepEqual(MHA_CONTRACT.difficultyProfiles, ['challenge']);
  assert.deepEqual(MHA_CONTRACT.competencyIds, ['c-dl-attention', 'c-numpy-basics']);
  assert.deepEqual(MHA_CONTRACT.caseTypes, [
    { caseId: 'multi-head-attention', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateMhaFamily);
  assert.equal(FAMILY_SPEC.solve, solveMhaFamily);
  assert.throws(() => generateMhaFamily({ seed: 0, caseId: 'multi-head-attention', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateMhaFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateMhaFamily({ seed: 1.5, caseId: 'multi-head-attention', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveMhaFamily({}), /Kapselform/);
});
