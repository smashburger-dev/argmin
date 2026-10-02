import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assertModuleBindings,
  compileLearningModule,
  deriveModuleMinutes,
  indexLearningModules,
} from '../assets/js/domain/learning_module.mjs';

const lookup = {
  lessons: [{ lessonId: 'l-a', estimatedMinutes: 30 }],
  definitions: [
    { definitionId: 'f-a', estimatedMinutes: 5 },
    { definitionId: 'f-b', estimatedMinutes: 8 },
  ],
  projects: [{ projectId: 'p-a', estimatedMinutes: 40 }],
};

const baseModule = {
  moduleId: 'lm-a',
  lessonIds: ['l-a'],
  projectIds: ['p-a'],
  placements: [
    { placementId: 'p-curated-a', role: 'curated', definitionId: 'f-a' },
    { placementId: 'p-space', role: 'practice-space', familyId: 'classify-x', difficulty: 'core' },
  ],
};

test('duration sums lessons, curated placements and projects, not the practice space', () => {
  assert.equal(deriveModuleMinutes(baseModule, lookup), 75);
});

test('duration override replaces the derived total but keeps the derivation', () => {
  const compiled = compileLearningModule({ ...baseModule, durationOverrideMinutes: 90 }, lookup);
  assert.equal(compiled.derivedMinutes, 75);
  assert.equal(compiled.estimatedMinutes, 90);
  assert.equal(compiled.durationOverridden, true);
});

test('duplicate placement ids fail closed', () => {
  assert.throws(
    () => indexLearningModules([
      { moduleId: 'lm-a', placements: [{ placementId: 'p-dup' }], trackIds: [], competencyIds: [], lessonIds: [] },
      { moduleId: 'lm-b', placements: [{ placementId: 'p-dup' }], trackIds: [], competencyIds: [], lessonIds: [] },
    ]),
    /Placement-ID doppelt: p-dup/,
  );
});

const bindingIds = {
  competencies: new Set(['c-a']),
  tracks: new Set(['t-a']),
  rights: new Set(['r-a']),
  lessons: new Set(['l-a', 'l-b', 'l-foreign']),
  explanations: new Set(),
  projects: new Set(),
  exercises: new Set(),
};

const boundModule = (placements, lessonIds = ['l-a', 'l-b']) => ({
  moduleId: 'lm-a',
  competencyIds: ['c-a'],
  requires: [],
  trackIds: ['t-a'],
  rightsId: 'r-a',
  lessonIds,
  placements,
});

const curated = (lessonId, placementId = `p-${lessonId}`) => ({
  placementId, role: 'curated', familyId: 'f-x', caseId: 'case-x', seed: 1, difficulty: 'core', lessonId, masteryEligible: true,
});

test('placement lessonId outside the module fails closed', () => {
  assert.throws(
    () => assertModuleBindings(boundModule([curated('l-a'), curated('l-foreign')]), bindingIds),
    /lm-a: Placement p-l-foreign verweist auf Lektion l-foreign außerhalb des Moduls/,
  );
});

test('module lesson without curated placement fails closed', () => {
  assert.throws(
    () => assertModuleBindings(boundModule([curated('l-a')]), bindingIds),
    /lm-a: Lektion l-b hat kein kuratiertes Placement/,
  );
});

test('module with one curated placement per lesson passes', () => {
  assert.doesNotThrow(
    () => assertModuleBindings(boundModule([curated('l-a'), curated('l-b')]), bindingIds),
  );
});
