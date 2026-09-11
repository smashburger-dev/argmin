// Procedural family validate-data-quality-contract: capsule gates.
// Run: node --test tests/procedural_data_quality_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as mod from '../assets/js/core/procedural/validate-data-quality-contract.mjs';
import { codeCapsuleSuite } from './procedural_capsule_suites.mjs';

codeCapsuleSuite('validate-data-quality-contract', mod, [
  { caseId: 'profile-table-schema-counts', difficulty: 'core' },
  { caseId: 'validate-rows-contract-errors', difficulty: 'stretch' },
], { difficultyProfiles: ['core', 'stretch'] });

test('seeded draws stay inside the declared domains', () => {
  const validRow = (row) => typeof row === 'object' && row !== null
    && typeof row.id === 'string' && (row.wert === null || (Number.isInteger(row.wert) && row.wert >= -1 && row.wert <= 40));
  const schemaOk = (row) => typeof row === 'object' && row !== null
    && new Set(Object.keys(row)).size === 2 && 'id' in row && 'wert' in row
    && typeof row.id === 'string'
    && (row.wert === null || (Number.isInteger(row.wert) && typeof row.wert !== 'boolean'));
  for (let seed = 0; seed < 200; seed += 1) {
    const core = mod.genDataQualityCase(seed, 'profile-table-schema-counts', mod.DATA_QUALITY_CASES['profile-table-schema-counts']);
    assert.ok(core.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(core.parameters.tests.includes('__ref_'), `${seed}: inline oracle`);
    for (const entry of core.parameters.seedCases) {
      assert.ok(entry.rows.length >= 4 && entry.rows.length <= 9, 'core row count');
      assert.ok(entry.rows.every(validRow), 'core rows valid shape');
      assert.ok(!schemaOk(entry.bad), `bad row must violate the schema: ${JSON.stringify(entry.bad)}`);
    }
    const stretch = mod.genDataQualityCase(seed, 'validate-rows-contract-errors', mod.DATA_QUALITY_CASES['validate-rows-contract-errors']);
    assert.ok(stretch.parameters.tests.includes('# seeded extra cases'), `${seed}: seeded block`);
    assert.ok(stretch.parameters.tests.includes('__ref_'), `${seed}: inline oracle`);
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
