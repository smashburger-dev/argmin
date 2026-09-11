// Procedural family classify-attack-surface: capsule gates (single-choice).
// Run: node --test tests/procedural_attack_surface_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as mod from '../assets/js/core/procedural/classify-attack-surface.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

choiceCapsuleSuite('classify-attack-surface', mod, [
  { caseId: 'attack-surface-taxonomy', difficulty: 'intro' },
], { difficultyProfiles: ['intro'] });

test('Familien-Extras: Bank-Korridor, Archetyp, Kompetenzen, Fallkörper-Größe', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-attack-surface.json'), 'utf8'));
  assert.equal(doc.cases.length, 1);
  const capsule = mod.ATTACK_SURFACE_CAPSULES.intro;
  assert.equal(capsule.caseId, 'attack-surface-taxonomy');
  assert.ok(capsule.bank.length >= 12 && capsule.bank.length <= 16, `Bank ${capsule.bank.length}`);
  assert.equal(mod.ATTACK_SURFACE_CONTRACT.taskArchetype, 'choice-diagnose');
  assert.deepEqual(mod.ATTACK_SURFACE_CONTRACT.competencyIds, ['c-genai-security']);
  assert.deepEqual(mod.ATTACK_SURFACE_CONTRACT.caseTypes, [
    { caseId: 'attack-surface-taxonomy', propertyTest: false },
  ]);
});
