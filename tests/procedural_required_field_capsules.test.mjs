// Procedural cases of validate-required-field-raise: capsule gates for the
// four python-code cases (paper-card, protocol, card-fields, readme).
// Run: node --test tests/procedural_required_field_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRequiredFieldFamily, solveRequiredField, REQUIRED_FIELD_CONTRACT } from '../assets/js/core/foundations_construct_families.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/validate-required-field-raise.json'), 'utf8'));
const PYTHON_CASES = ['paper-card-required-fields', 'protocol-validator', 'validate-card-fields', 'readme-required-headings'];
const FN_TABLE = {
  'paper-card-required-fields': ['review_paper_card'],
  'protocol-validator': ['validate_protocol'],
  'validate-card-fields': ['validate_card', 'splits_ok', 'is_semver'],
  'readme-required-headings': ['fehlende_uberschriften'],
};

const gen = (seed, caseId) => generateRequiredFieldFamily({ seed, caseId, difficulty: 'core' });

test('anchor: authored bodies stay byte-identical, variants removed', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 4);
  for (const caseId of PYTHON_CASES) {
    const body = doc.cases.find((entry) => entry.caseId === caseId);
    assert.ok(body, `${caseId}: anchor fehlt`);
    assert.equal(body.variants, undefined, `${caseId}: variants entfernt`);
    assert.equal(body.activityType, 'python-code');
    assert.equal(body.graderId, 'pyodide');
    assert.equal(body.expected.kind, 'reference-solver');
    assert.ok(body.parameters.tests.includes('__check'), `${caseId}: base tests erhalten`);
    assert.ok(body.parameters.starterCode.length > 40 && body.expected.referenceSolver.length > 50, `${caseId}: Strings erhalten`);
  }
});

test('generated tests: base block verbatim prefix + __ref oracle + seeded checks', () => {
  for (const caseId of PYTHON_CASES) {
    const body = doc.cases.find((entry) => entry.caseId === caseId);
    for (let seed = 0; seed < 60; seed += 1) {
      const g = gen(seed, caseId);
      const p = g.parameters;
      assert.ok(p.tests.startsWith(body.parameters.tests), `${caseId}:${seed}: base tests verbatim`);
      assert.ok(p.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded marker`);
      for (const fn of FN_TABLE[caseId]) {
        assert.ok(p.tests.includes(`def __ref_${fn}(`), `${caseId}:${seed}: __ref_${fn} vorhanden`);
        assert.ok(p.tests.includes(`== __ref_${fn}(`) || p.tests.includes(`is __ref_${fn}(`), `${caseId}:${seed}: oracle check fuer ${fn}`);
      }
      assert.equal(p.starterCode, body.parameters.starterCode, `${caseId}:${seed}: starter verbatim`);
      assert.deepEqual(p.packages, body.parameters.packages, `${caseId}:${seed}: packages verbatim`);
      assert.deepEqual(g.expected, body.expected, `${caseId}:${seed}: expected verbatim`);
      assert.equal(p.seedFixtures.length, 2, `${caseId}:${seed}: zwei Fixtures`);
      assert.ok(g.prompt.startsWith(body.prompt), `${caseId}:${seed}: prompt-Praefix authored`);
    }
  }
});

test('capsule shape: seedFixtures rebuild the emitted test block', () => {
  // requiredPythonParamsOk is exercised indirectly: solve() only accepts
  // parameters whose fixtures rebuild the tests byte-identically.
  for (const caseId of PYTHON_CASES) {
    for (let seed = 0; seed < 60; seed += 1) {
      const g = gen(seed, caseId);
      const solved = solveRequiredField(g.parameters);
      const body = doc.cases.find((entry) => entry.caseId === caseId);
      assert.equal(solved.referenceCode, body.expected.referenceSolver, `${caseId}:${seed}: solver`);
      // tampering with a fixture must fail closed
      const tampered = JSON.parse(JSON.stringify(g.parameters));
      tampered.tests = `${tampered.tests}\n# tampered`;
      assert.throws(() => solveRequiredField(tampered), /Unbekannter Fall/, `${caseId}:${seed}: tamper fail-closed`);
    }
  }
});

test('mixed dispatch: parsons cases still generate, python cases stamp metadata', () => {
  for (const caseId of ['specific-except-with-issue', 'required-key-with-issue']) {
    const g = gen(5, caseId);
    assert.equal(g.parameters.parsonsCase, caseId);
    const solved = solveRequiredField(g.parameters);
    assert.deepEqual(solved.solutionOrder.sort(), ['p1', 'p2', 'p3', 'p4']);
  }
  for (const caseId of PYTHON_CASES) {
    const g = gen(5, caseId);
    assert.equal(g.activityType, 'python-code');
    assert.equal(g.graderId, 'pyodide');
    assert.equal(g.masteryEligible, true);
    assert.ok(g.competencyIds.length >= 1, `${caseId}: competencyIds`);
  }
});

test('distinct floor: at least 40 distinct fixtures per case over 200 seeds', () => {
  for (const caseId of PYTHON_CASES) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(gen(seed, caseId).parameters.seedFixtures));
    }
    assert.ok(seen.size >= 40, `${caseId}: nur ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical instance, negative seeds valid', () => {
  for (const caseId of PYTHON_CASES) {
    for (let seed = -10; seed < 10; seed += 1) {
      assert.deepEqual(gen(seed, caseId), gen(seed, caseId), `${caseId}:${seed}`);
    }
  }
  // python cases stay excluded from the random practice pool
  for (const caseId of PYTHON_CASES) {
    const spec = REQUIRED_FIELD_CONTRACT.caseTypes.find((entry) => entry.caseId === caseId);
    assert.equal(spec.propertyTest, false, `${caseId}: propertyTest bleibt false`);
  }
});
