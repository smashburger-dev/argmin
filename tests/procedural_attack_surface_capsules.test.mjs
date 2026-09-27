// Procedural family classify-attack-surface: capsule gates (single-choice).
// Run: node --test tests/procedural_attack_surface_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bank from '../content/banks/classify-attack-surface.json' with { type: 'json' };
import { JS_FAMILY_SPECS } from '../assets/js/domain/exercise_registry.mjs';

const spec = JS_FAMILY_SPECS.find((item) => item.familyId === 'classify-attack-surface');

const root = join(dirname(fileURLToPath(import.meta.url)), '..');


test('Familien-Extras: Bank-Korridor, Archetyp, Kompetenzen, Fallkörper-Größe', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-attack-surface.json'), 'utf8'));
  assert.equal(doc.cases.length, 1);
  const capsule = bank.capsules.intro;
  assert.equal(capsule.caseId, 'attack-surface-taxonomy');
  assert.ok(capsule.bank.length >= 12 && capsule.bank.length <= 16, `Bank ${capsule.bank.length}`);
  assert.equal(bank.contract.taskArchetype, 'choice-diagnose');
  assert.deepEqual(bank.contract.competencyIds, ['c-genai-security']);
  assert.deepEqual(bank.contract.caseTypes, [
    { caseId: 'attack-surface-taxonomy', propertyTest: false },
  ]);
});
