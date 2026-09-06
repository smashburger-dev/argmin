import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies } from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import { validateSourceDocument } from '../tools/compile_content.mjs';

const root = join(fileURLToPath(new URL('..', import.meta.url)));
const familyDir = join(root, 'content/families');
const docs = readdirSync(familyDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .map((name) => JSON.parse(readFileSync(join(familyDir, name), 'utf8')));

for (const doc of docs) {
  validateSourceDocument('exercise-family-cases', doc, root);
  registerStaticCases(doc.familyId, doc.cases);
}
const families = configureExerciseFamilies(docs);

test('every static case instantiates at its profile', () => {
  for (const doc of docs) {
    for (const item of doc.cases) {
      const instance = families.instantiate(doc.familyId, 0, item.difficultyProfile, item.caseId);
      assert.equal(instance.caseId, item.caseId);
      assert.equal(instance.difficulty, item.difficultyProfile);
      assert.equal(instance.masteryEligible, item.masteryEligible);
    }
  }
});

test('wrong static profiles fail closed', () => {
  for (const doc of docs.filter((item) => item.contract)) {
    for (const item of doc.cases) {
      const wrong = ['intro', 'core', 'stretch', 'challenge'].find((profile) => profile !== item.difficultyProfile);
      assert.throws(
        () => families.instantiate(doc.familyId, 0, wrong, item.caseId),
        new RegExp(`Unbekanntes Profil ${wrong} für Fall ${item.caseId}`),
      );
    }
  }
});

test('static choices have one correct option and solver text', async () => {
  for (const doc of docs) {
    for (const item of doc.cases) {
      if (!item.choices) continue;
      const instance = families.instantiate(doc.familyId, 0, item.difficultyProfile, item.caseId);
      const correct = item.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${doc.familyId}:${item.caseId}`);
      const result = await families.grade(instance, correct[0].id);
      assert.equal(result.correct, true, `${doc.familyId}:${item.caseId}`);
    }
  }
});

test('static Python cases carry executable content', () => {
  for (const doc of docs) {
    for (const item of doc.cases) {
      if (item.graderId !== 'pyodide') continue;
      assert.ok(item.parameters?.starterCode);
      assert.ok(item.expected?.referenceSolver);
      assert.ok(item.tests || item.expected.referenceSolver);
    }
  }
});

test('static-only profiles and placement are constrained', () => {
  for (const doc of docs.filter((item) => item.contract)) {
    const family = families.get(doc.familyId);
    const profiles = new Set(doc.cases.map((item) => item.difficultyProfile));
    assert.deepEqual(family.difficultyProfiles, ['intro', 'core', 'stretch', 'challenge'].filter((profile) => profiles.has(profile)));
    assert.throws(
      () => families.assertFamilyPlacement({ familyId: doc.familyId, role: 'practice-space', difficulty: doc.cases[0].difficultyProfile }),
      /Statische Familien dürfen nicht im Übungsraum platziert werden/,
    );
  }
});

test('intro choice cases are not mastery eligible', () => {
  for (const doc of docs) {
    if (doc.contract?.taskArchetype !== 'choice-diagnose') continue;
    for (const item of doc.cases) {
      if (item.difficultyProfile === 'intro') assert.equal(item.masteryEligible, false);
    }
  }
});
