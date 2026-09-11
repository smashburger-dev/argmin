// Procedural family validate-data-quality-contract: capsule gates.
// Run: node --test tests/procedural_data_quality_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  DATA_QUALITY_CASES,
  DATA_QUALITY_CONTRACT,
  FAMILY_SPEC,
  dataQualityCaseOk,
  genDataQualityCase,
  generateDataQualityFamily,
  solveDataQualityFamily,
} from '../assets/js/core/procedural/validate-data-quality-contract.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['profile-table-schema-counts', 'validate-rows-contract-errors'];

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/validate-data-quality-contract.json'), 'utf8'));
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
    const def = DATA_QUALITY_CASES[caseId];
    assert.equal(body.parameters.tests, def.baseTests, `${caseId}: base tests verbatim`);
    assert.equal(body.parameters.starterCode, def.starterCode, `${caseId}: starter verbatim`);
    assert.deepEqual(body.parameters.packages, def.packages, `${caseId}: packages verbatim`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.equal(body.expected.referenceSolver, def.referenceSolver, `${caseId}: solver verbatim`);
    assert.equal(body.fullSolution, def.fullSolution, `${caseId}: solution verbatim`);
  }
});

test('capsule shape: generated parameters satisfy dataQualityCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = DATA_QUALITY_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genDataQualityCase(seed, def);
      assert.ok(dataQualityCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.ok(generated.parameters.tests.startsWith(def.baseTests), `${caseId}:${seed}: base block kept`);
      assert.ok(generated.parameters.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded block`);
      assert.ok(generated.parameters.tests.includes('__ref_'), `${caseId}:${seed}: inline oracle`);
      assert.equal(generated.expected.referenceSolver, def.referenceSolver);
      assert.equal(generated.prompt, def.prompt);
    }
  }
});

test('seeded draws stay inside the declared domains', () => {
  const validRow = (row) => typeof row === 'object' && row !== null
    && typeof row.id === 'string' && (row.wert === null || (Number.isInteger(row.wert) && row.wert >= -1 && row.wert <= 40));
  const schemaOk = (row) => typeof row === 'object' && row !== null
    && new Set(Object.keys(row)).size === 2 && 'id' in row && 'wert' in row
    && typeof row.id === 'string'
    && (row.wert === null || (Number.isInteger(row.wert) && typeof row.wert !== 'boolean'));
  for (let seed = 0; seed < 200; seed += 1) {
    const core = genDataQualityCase(seed, DATA_QUALITY_CASES['profile-table-schema-counts']);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.rows.length >= 4 && entry.rows.length <= 9, 'core row count');
      assert.ok(entry.rows.every(validRow), 'core rows valid shape');
      assert.ok(!schemaOk(entry.bad), `bad row must violate the schema: ${JSON.stringify(entry.bad)}`);
    }
    const stretch = genDataQualityCase(seed, DATA_QUALITY_CASES['validate-rows-contract-errors']);
    for (const entry of stretch.parameters.seedCases) {
      assert.ok(entry.rows.length >= 5 && entry.rows.length <= 10, 'stretch row count');
      for (const row of entry.rows) {
        assert.ok(row && typeof row === 'object', 'row is a dict');
        const keys = Object.keys(row);
        assert.ok(keys.every((k) => ['id', 'alter', 'umsatz', 'notiz'].includes(k)), 'known columns only');
      }
    }
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = DATA_QUALITY_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateDataQualityFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = DATA_QUALITY_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genDataQualityCase(seed, def), genDataQualityCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve returns the case reference solver', () => {
  for (const caseId of CASE_IDS) {
    const def = DATA_QUALITY_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateDataQualityFamily({ seed, caseId, difficulty: def.difficulty });
      assert.deepEqual(solveDataQualityFamily(generated.parameters), { referenceCode: def.referenceSolver });
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(DATA_QUALITY_CONTRACT.familyId, 'validate-data-quality-contract');
  assert.equal(DATA_QUALITY_CONTRACT.authorityMode, 'seeded');
  assert.equal(DATA_QUALITY_CONTRACT.activityType, 'python-code');
  assert.equal(DATA_QUALITY_CONTRACT.graderId, 'pyodide');
  assert.equal(DATA_QUALITY_CONTRACT.masteryEligible, true);
  assert.deepEqual(DATA_QUALITY_CONTRACT.difficultyProfiles, ['core', 'stretch']);
  assert.equal(FAMILY_SPEC.generate, generateDataQualityFamily);
  assert.throws(() => generateDataQualityFamily({ seed: 0, caseId: 'profile-table-schema-counts', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateDataQualityFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannt/);
  assert.throws(() => generateDataQualityFamily({ seed: 0.5, caseId: 'profile-table-schema-counts', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveDataQualityFamily({}), /Kapselform/);
});
