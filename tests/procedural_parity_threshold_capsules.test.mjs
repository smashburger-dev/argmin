// Procedural family aggregate-parity-threshold-selection: capsule gates.
// Run: node --test tests/procedural_parity_threshold_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  PARITY_THRESHOLD_CASES,
  PARITY_THRESHOLD_CONTRACT,
  genParityThresholdCase,
  generateParityThresholdFamily,
  parityThresholdCaseOk,
  solveParityThresholdFamily,
} from '../assets/js/core/procedural/aggregate-parity-threshold-selection.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['parity-threshold-selection'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-parity-threshold-selection.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, CASE_IDS.length);
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
    const def = PARITY_THRESHOLD_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy parityThresholdCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PARITY_THRESHOLD_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genParityThresholdCase(seed, def);
      assert.ok(parityThresholdCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded sweep a 1'), `${caseId}:${seed}: seeded checks`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = PARITY_THRESHOLD_CASES['parity-threshold-selection'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genParityThresholdCase(seed, def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.kandidaten.length >= 3 && entry.kandidaten.length <= 5, 'kandidaten count');
      const schwellen = entry.kandidaten.map((k) => k.schwelle);
      assert.ok(schwellen.every((s) => s >= 0.3 && s <= 0.9 && Math.abs(s * 100 - Math.round(s * 100)) < 1e-9), 'schwelle grid');
      assert.ok(new Set(schwellen).size === schwellen.length, 'schwellen distinct');
      assert.ok(schwellen.every((s, i) => i === 0 || schwellen[i - 1] < s), 'schwellen ascending');
      for (const k of entry.kandidaten) {
        assert.ok(k.selrate.a >= 0.5 && k.selrate.a <= 0.95, 'selrate a range');
        assert.ok(k.selrate.b >= 0.5 && k.selrate.b <= 0.95, 'selrate b range');
        assert.ok(k.f1 >= 0.6 && k.f1 <= 0.92, 'f1 range');
      }
      assert.equal(entry.bands.length, 2, 'two bands per draw');
      assert.ok(entry.bands.every((b) => b >= 0.02 && b <= 0.25), 'band range');
      assert.ok(entry.cost.tokenIn % 1000 === 0 && entry.cost.tokenIn >= 10000 && entry.cost.tokenIn <= 500000, 'tokenIn');
      assert.ok(entry.cost.tokenOut % 1000 === 0 && entry.cost.tokenOut >= 10000 && entry.cost.tokenOut <= 500000, 'tokenOut');
      assert.ok(entry.cost.preisIn >= 0.5 && entry.cost.preisIn <= 6.0, 'preisIn');
      assert.ok(entry.cost.preisOut >= 0.5 && entry.cost.preisOut <= 6.0, 'preisOut');
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = PARITY_THRESHOLD_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateParityThresholdFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = PARITY_THRESHOLD_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genParityThresholdCase(seed, def), genParityThresholdCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = PARITY_THRESHOLD_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateParityThresholdFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveParityThresholdFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(PARITY_THRESHOLD_CONTRACT.familyId, 'aggregate-parity-threshold-selection');
  assert.equal(PARITY_THRESHOLD_CONTRACT.familyGroup, 'aggregate-count');
  assert.equal(PARITY_THRESHOLD_CONTRACT.authorityMode, 'seeded');
  assert.equal(PARITY_THRESHOLD_CONTRACT.activityType, 'python-code');
  assert.equal(PARITY_THRESHOLD_CONTRACT.graderId, 'pyodide');
  assert.equal(PARITY_THRESHOLD_CONTRACT.masteryEligible, true);
  assert.deepEqual(PARITY_THRESHOLD_CONTRACT.difficultyProfiles, ['stretch']);
  assert.equal(FAMILY_SPEC.generate, generateParityThresholdFamily);
  assert.equal(FAMILY_SPEC.solve, solveParityThresholdFamily);
  assert.throws(() => generateParityThresholdFamily({ seed: 0, caseId: 'parity-threshold-selection', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateParityThresholdFamily({ seed: 0, caseId: 'nope', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateParityThresholdFamily({ seed: 0.5, caseId: 'parity-threshold-selection', difficulty: 'stretch' }), /Seed/);
  assert.throws(() => solveParityThresholdFamily({}), /Kapselform/);
});
