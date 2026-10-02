// Registry-wide invariant: every feedbackRule `misconception` on an
// instance links into the instance's stable typicalErrorIds (E: one id
// namespace for labels). Second leg: the instantiate seam fails closed
// when a typicalErrors entry is not an {id, text} object.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import {
  createFamilyRegistry,
  registerStaticCases,
  staticFamilySpec,
} from '../assets/js/domain/family_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const familyDocs = readdirSync(join(root, 'content/families'))
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(root, 'content/families', name), 'utf8')));
for (const document of familyDocs) registerStaticCases(document.familyId, document.cases);
const registry = configureExerciseFamilies(familyDocs);

test('misconception rules link into typicalErrorIds; texts and ids stay parallel', () => {
  const bad = [];
  let linked = 0;
  for (const doc of familyDocs) {
    const family = registry.get(doc.familyId);
    for (const caseType of family.caseTypes) {
      for (const difficulty of family.difficultyProfiles) {
        for (let seed = 0; seed < 24; seed += 1) {
          let instance;
          try {
            instance = registry.instantiate(doc.familyId, seed, difficulty, caseType.caseId);
          } catch { continue; }
          const label = `${doc.familyId}/${caseType.caseId} ${difficulty}:${seed}`;
          const texts = instance.typicalErrors ?? [];
          const ids = instance.typicalErrorIds ?? [];
          if (texts.length !== ids.length || ids.some((id) => typeof id !== 'string')) {
            bad.push(`${label}: typicalErrors/typicalErrorIds nicht parallel`);
          }
          for (const rule of instance.feedbackRules || []) {
            if (rule?.misconception === undefined) continue;
            linked += 1;
            if (!ids.includes(rule.misconception)) {
              bad.push(`${label}: misconception ${rule.misconception} ohne typicalError-id`);
            }
          }
        }
      }
    }
  }
  assert.ok(linked > 0, 'keine misconception-Regel gefunden — Test wäre tautologisch');
  assert.deepEqual(bad, [], `Unverlinkte Fehlkonzepte:\n${bad.slice(0, 25).join('\n')}`);
});

test('seam fails closed on a bare-string typicalError', () => {
  const poisonDoc = {
    schemaVersion: 1,
    familyId: 'te-id-throw-fixture',
    contract: {
      familyId: 'te-id-throw-fixture',
      familyGroup: 'test-fixtures',
      summary: 'Fixture für den typicalError-Seam.',
      taskArchetype: 'numeric-exact',
      authorityMode: 'static',
      masteryEligible: true,
      caseTypes: [{ caseId: 'bad-errors' }],
      difficultyProfiles: ['core'],
      competencyIds: ['c-test'],
      graderId: 'deterministic',
      activityType: 'numeric',
    },
    cases: [{
      caseId: 'bad-errors',
      difficultyProfile: 'core',
      masteryEligible: true,
      sourceLineage: ['fixture'],
      parameters: {},
      expected: { kind: 'integer', value: 1 },
      prompt: '1 + 0 = ?',
      typicalErrors: ['nackter Text ohne id'],
    }],
  };
  registerStaticCases(poisonDoc.familyId, poisonDoc.cases);
  const poisoned = createFamilyRegistry([staticFamilySpec(poisonDoc)]);
  assert.throws(
    () => poisoned.instantiate('te-id-throw-fixture', 0, 'core', 'bad-errors'),
    /typicalErrors-Eintrag ohne \{id, text\}/,
  );
});
