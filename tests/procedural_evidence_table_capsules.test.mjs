// Procedural family rank-evidence-table: capsule gates.
// Run: node --test tests/procedural_evidence_table_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  EVIDENCE_TABLE_CASES,
  EVIDENCE_TABLE_CONTRACT,
  FAMILY_SPEC,
  evidenceTableCaseOk,
  genEvidenceTableCase,
  generateEvidenceTableFamily,
  solveEvidenceTableFamily,
} from '../assets/js/core/procedural/rank-evidence-table.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['evidence-table-ranking'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/rank-evidence-table.json'), 'utf8'));
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
    const def = EVIDENCE_TABLE_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: fullSolution verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
  }
});

test('capsule shape: generated parameters satisfy evidenceTableCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = EVIDENCE_TABLE_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genEvidenceTableCase(seed, def);
      assert.ok(evidenceTableCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('seeded tabelle 1'), `${caseId}:${seed}: seeded checks`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const def = EVIDENCE_TABLE_CASES['evidence-table-ranking'];
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = genEvidenceTableCase(seed, def);
    for (const entry of generated.parameters.seedCases) {
      assert.ok(entry.papers.length >= 3 && entry.papers.length <= 6, 'paper count');
      const ids = entry.papers.map((p) => p.paperId);
      assert.equal(new Set(ids).size, ids.length, 'paperIds unique');
      for (const p of entry.papers) {
        assert.match(p.paperId, /^[a-z]+-\d{4}$/, 'paperId shape');
        assert.ok(typeof p.metric === 'string' && p.metric.length > 0, 'metric set');
        assert.ok(typeof p.baseline === 'number' && p.baseline >= 0, 'baseline domain');
        assert.ok(typeof p.system === 'number' && p.system >= 0, 'system domain');
      }
      // every drawn paper must be baked into the emitted test block
      for (const p of entry.papers) {
        assert.ok(generated.parameters.tests.includes(`"paperId": "${p.paperId}"`), `${p.paperId}: literal baked`);
      }
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = EVIDENCE_TABLE_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateEvidenceTableFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = EVIDENCE_TABLE_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genEvidenceTableCase(seed, def), genEvidenceTableCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = EVIDENCE_TABLE_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateEvidenceTableFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveEvidenceTableFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(EVIDENCE_TABLE_CONTRACT.familyId, 'rank-evidence-table');
  assert.equal(EVIDENCE_TABLE_CONTRACT.familyGroup, 'aggregate-count');
  assert.equal(EVIDENCE_TABLE_CONTRACT.authorityMode, 'seeded');
  assert.equal(EVIDENCE_TABLE_CONTRACT.activityType, 'python-code');
  assert.equal(EVIDENCE_TABLE_CONTRACT.graderId, 'pyodide');
  assert.equal(EVIDENCE_TABLE_CONTRACT.masteryEligible, true);
  assert.deepEqual(EVIDENCE_TABLE_CONTRACT.difficultyProfiles, ['challenge']);
  assert.equal(FAMILY_SPEC.generate, generateEvidenceTableFamily);
  assert.equal(FAMILY_SPEC.solve, solveEvidenceTableFamily);
  assert.throws(() => generateEvidenceTableFamily({ seed: 0, caseId: 'evidence-table-ranking', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateEvidenceTableFamily({ seed: 0, caseId: 'nope', difficulty: 'challenge' }), /Unbekannter Fall/);
  assert.throws(() => generateEvidenceTableFamily({ seed: 0.5, caseId: 'evidence-table-ranking', difficulty: 'challenge' }), /Seed/);
  assert.throws(() => solveEvidenceTableFamily({}), /Kapselform/);
});
