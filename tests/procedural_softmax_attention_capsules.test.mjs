// Procedural family optimize-softmax-attention-mask: capsule gates.
// Run: node --test tests/procedural_softmax_attention_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors. (procedural_attention_mask_capsules
// covers the sibling family construct-attention-mask.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATTN_CASES,
  ATTN_CONTRACT,
  FAMILY_SPEC,
  attnCaseOk,
  genAttnCase,
  generateAttnFamily,
  solveAttnFamily,
} from '../assets/js/core/procedural/optimize-softmax-attention-mask.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['scaled-dot-product-attention', 'toy-forward-pass'];

const intMat = (m, lo, hi) => m.every((row) => row.every((v) => Number.isInteger(v) && v >= lo && v <= hi));

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/optimize-softmax-attention-mask.json'), 'utf8'));
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
    const def = ATTN_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy attnCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTN_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genAttnCase(seed, def);
      assert.ok(attnCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded attention draws stay inside the declared domains', () => {
  const def = ATTN_CASES['scaled-dot-product-attention'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genAttnCase(seed, def);
    generated.parameters.seedCases.forEach((entry, i) => {
      const index = i + 1;
      const n = entry.Q.length;
      const dK = entry.Q[0].length;
      const m = entry.K.length;
      const dV = entry.V[0].length;
      assert.ok(n >= 2 && n <= 4, 'n range');
      assert.ok(m >= 2 && m <= 4, 'm range');
      assert.ok(dK >= 2 && dK <= 4, 'd_k range');
      assert.ok(dV >= 1 && dV <= 3, 'd_v range');
      assert.ok(entry.K.every((row) => row.length === dK), 'K cols match d_k');
      assert.ok(entry.V.length === m, 'V rows match m');
      assert.ok(intMat(entry.Q, -3, 3) && intMat(entry.K, -3, 3), 'Q/K int range');
      assert.ok(intMat(entry.V, -5, 5), 'V int range');
      if (entry.mask === null) {
        assert.ok(!generated.parameters.tests.includes(`seeded attn maske ${index}`), 'no mask check for null mask');
      } else {
        assert.equal(entry.mask.length, n, 'mask rows');
        assert.ok(entry.mask.every((row) => row.length === m), 'mask cols');
        assert.ok(entry.mask.every((row) => row.some((v) => v === true)), 'every query row keeps a visible key');
        assert.ok(generated.parameters.tests.includes(`seeded attn maske ${index}`), 'mask check emitted for drawn mask');
      }
    });
    assert.ok(generated.parameters.tests.includes('seeded attn 1'), 'attn seeded check emitted');
  }
});

test('seeded toy-forward draws stay inside the declared domains', () => {
  const def = ATTN_CASES['toy-forward-pass'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genAttnCase(seed, def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.ids.length >= 1 && entry.ids.length <= 4, 'ids length');
      assert.ok(entry.ids.every((v) => Number.isInteger(v) && v >= 0 && v <= 5), 'ids in vocab range');
      assert.ok(generated.parameters.tests.includes(`toy_forward([${entry.ids.join(', ')}], WEIGHTS)`), 'ids literal baked');
    }
    assert.ok(generated.parameters.tests.includes('seeded forward 1'), 'toy seeded check emitted');
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTN_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateAttnFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTN_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genAttnCase(seed, def), genAttnCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = ATTN_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateAttnFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveAttnFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(ATTN_CONTRACT.familyId, 'optimize-softmax-attention-mask');
  assert.equal(ATTN_CONTRACT.familyGroup, 'optimize-update');
  assert.equal(ATTN_CONTRACT.authorityMode, 'seeded');
  assert.equal(ATTN_CONTRACT.activityType, 'python-code');
  assert.equal(ATTN_CONTRACT.graderId, 'pyodide');
  assert.equal(ATTN_CONTRACT.masteryEligible, true);
  assert.deepEqual(ATTN_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.equal(FAMILY_SPEC.generate, generateAttnFamily);
  assert.equal(FAMILY_SPEC.solve, solveAttnFamily);
  assert.throws(() => generateAttnFamily({ seed: 0, caseId: 'scaled-dot-product-attention', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateAttnFamily({ seed: 0, caseId: 'toy-forward-pass', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateAttnFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateAttnFamily({ seed: 0.5, caseId: 'scaled-dot-product-attention', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveAttnFamily({}), /Kapselform/);
});
