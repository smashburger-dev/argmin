import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configureExerciseFamilies, familyEventInput } from '../assets/js/domain/exercise_registry.mjs';
import { createFamilyRegistry, registerStaticCases } from '../assets/js/domain/family_registry.mjs';
import { compileContent, validateSourceDocument } from '../tools/compile_content.mjs';

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

const registry = configureExerciseFamilies(docs);
const bundle = compileContent({ projectRoot: root, profile: 'public' });
const competencyIds = new Set(bundle.competencies.map((item) => item.competencyId));
const canonical = JSON.parse(readFileSync(
  join(root, 'research/streamlining/s4a-v2/canonical-families.json'),
  'utf8',
)).families;
const docsById = new Map(docs.map((doc) => [doc.familyId, doc]));
const staticBody = (familyId, caseId) => docsById.get(familyId)?.cases.find((item) => item.caseId === caseId);
const registeredFamilies = canonical.filter((family) => registry.get(family.familyId));
const FOUNDATIONS_CHOICE_FAMILY_IDS = [
  'classify-control-construct',
  'classify-python-collection-choice',
  'classify-exception-placement',
  'classify-test-attitude',
  'classify-error-hypothesis',
  'classify-string-immutability',
  'classify-set-operation-semantics',
];

const ANSWER_BUILDERS = {
  numeric: (instance) => String(instance.expectedAnswer.value),
  'single-choice': (instance) => instance.choices.find((choice) => choice.correct)?.id,
  vector: (instance) => `(${instance.expectedAnswer.solution.join(', ')})`,
  parsons: (instance) => instance.expectedAnswer.solutionOrder,
  'code-trace': (instance) => Object.fromEntries(
    instance.parameters.variables.map((variable) => [variable.name, String(variable.value)]),
  ),
  'predict-output': (instance) => instance.expectedAnswer.output,
};

const MUTANT_BUILDERS = {
  numeric: (instance) => {
    const value = instance.expectedAnswer.value;
    return String(value === 0 ? 2 : value + 1);
  },
  'single-choice': (instance) => instance.choices.find((choice) => !choice.correct)?.id,
  vector: (instance) => {
    const [first, second] = instance.expectedAnswer.solution;
    return `(${first + 1}, ${second})`;
  },
  parsons: (instance) => instance.expectedAnswer.solutionOrder.slice(0, -1),
  'code-trace': (instance) => {
    const variable = instance.parameters.variables[0];
    const value = typeof variable.value === 'number' ? String(variable.value + 1) : `${variable.value}x`;
    return { [variable.name]: value };
  },
  'predict-output': (instance) => `${instance.expectedAnswer.output}\nx`,
};

const supported = (instance) => instance.graderId === 'deterministic'
  && Object.hasOwn(ANSWER_BUILDERS, instance.activityType);

function validProfiles(familyId, caseId) {
  return registry.get(familyId).difficultyProfiles.filter((difficulty) => {
    try {
      registry.instantiate(familyId, 0, difficulty, caseId);
      return true;
    } catch {
      return false;
    }
  });
}

function assertChoices(instance) {
  if (!instance.choices) return;
  assert.ok(instance.choices.length >= 2, `${instance.familyId}:${instance.caseId}: too few choices`);
  assert.equal(new Set(instance.choices.map((choice) => choice.text)).size, instance.choices.length);
  assert.equal(instance.choices.filter((choice) => choice.correct).length, 1);
}

function assertStaticMastery(instance) {
  const body = staticBody(instance.familyId, instance.caseId);
  if (!body) return;
  const expected = body.graderId !== 'manual-rubric' && body.masteryEligible === true;
  assert.equal(instance.masteryEligible, expected, `${instance.familyId}:${instance.caseId}`);
}

test('all registered family contracts and taxonomy are valid', () => {
  for (const doc of docs) {
    validateSourceDocument('exercise-family-cases', doc, root);
    for (const item of doc.cases) {
      for (const competencyId of item.competencyIds || []) {
        assert.ok(competencyIds.has(competencyId), `${doc.familyId}:${item.caseId}: unknown competency ${competencyId}`);
      }
    }
  }
  for (const family of registeredFamilies) {
    const registered = registry.get(family.familyId);
    assert.ok(registered, `canonical family is not registered: ${family.familyId}`);
    assert.equal(typeof registered.generate, 'function');
    assert.equal(typeof registered.solve, 'function');
    assert.ok(Array.isArray(registered.caseTypes));
    assert.ok(Array.isArray(registered.difficultyProfiles));
    for (const competencyId of registered.competencyIds) {
      assert.ok(competencyIds.has(competencyId), `${family.familyId}: unknown competency ${competencyId}`);
    }
  }
});

test('family registry fails closed and rejects aliases', () => {
  for (const family of registeredFamilies) {
    assert.throws(
      () => registry.instantiate(`${family.familyId}-unknown`, 0, 'intro', family.familyId),
      /Unbekannte Familie/,
    );
    const registered = registry.get(family.familyId);
    const caseId = registered.caseTypes[0].caseId;
    const difficulty = registered.difficultyProfiles[0];
    assert.throws(
      () => registry.instantiate(family.familyId, 0, difficulty, `${caseId}-unknown`),
      /Unbekannter Fall/,
    );
    assert.throws(
      () => registry.instantiate(family.familyId, 0, '__unknown__', caseId),
      /Unbekanntes Profil/,
    );
    assert.throws(
      () => registry.instantiate(family.familyId, 0.5, difficulty, caseId),
      /Seed muss eine ganze Zahl sein/,
    );
  }
  const source = registry.get(registeredFamilies[0].familyId);
  assert.throws(
    () => createFamilyRegistry([
      source,
      { ...source },
    ]),
    /doppelt/,
  );
  const alias = source.familyId.split('-').reverse().join('-');
  assert.throws(
    () => createFamilyRegistry([
      source,
      { ...source, familyId: alias },
    ]),
    /Token-Multiset/,
  );
});

test('family instances are deterministic, grade their expected answers, and reject mutants', async () => {
  for (const family of registeredFamilies) {
    const registered = registry.get(family.familyId);
    for (const caseType of registered.caseTypes) {
      const profiles = validProfiles(family.familyId, caseType.caseId);
      for (const difficulty of profiles) {
        const first = registry.instantiate(family.familyId, 0, difficulty, caseType.caseId);
        assert.deepEqual(first, registry.instantiate(family.familyId, 0, difficulty, caseType.caseId));
        assert.equal(familyEventInput(first).definitionId, `${family.familyId}:${caseType.caseId}`);
        assert.equal(familyEventInput(first).activityId, family.familyId);
        assertChoices(first);
        assertStaticMastery(first);
        if (supported(first)) {
          const answer = ANSWER_BUILDERS[first.activityType](first);
          const result = await registry.grade(first, answer);
          assert.equal(result.correct, true, `${family.familyId}:${caseType.caseId}:${difficulty}`);
          const mutant = await registry.grade(first, MUTANT_BUILDERS[first.activityType](first));
          assert.equal(mutant.correct, false, `${family.familyId}:${caseType.caseId}:${difficulty}: mutant`);
        }
        for (let seed = 0; seed < 32; seed += 1) {
          const instance = registry.instantiate(family.familyId, seed, difficulty, caseType.caseId);
          assert.deepEqual(instance, registry.instantiate(family.familyId, seed, difficulty, caseType.caseId));
        }
      }
      if (caseType.propertyTest !== false && !staticBody(family.familyId, caseType.caseId)
        && registered.authorityMode !== 'static') {
        const differences = Array.from({ length: 31 }, (_, seed) => {
          const left = registry.instantiate(family.familyId, seed, registered.difficultyProfiles[0], caseType.caseId);
          const right = registry.instantiate(family.familyId, seed + 1, registered.difficultyProfiles[0], caseType.caseId);
          return JSON.stringify(left.prompt) !== JSON.stringify(right.prompt)
            || JSON.stringify(left.parameters) !== JSON.stringify(right.parameters);
        });
        const different = differences.filter(Boolean).length;
        if (different > 0) {
          assert.ok(different >= 16, `${family.familyId}:${caseType.caseId}: only ${different}/31 seed pairs differ`);
        }
      }
    }
  }
});

test('static families expose only their authored profile and placements are valid', () => {
  for (const doc of docs.filter((item) => item.contract)) {
    const family = registry.get(doc.familyId);
    for (const item of doc.cases) {
      const instance = registry.instantiate(doc.familyId, 0, item.difficultyProfile, item.caseId);
      assertStaticMastery(instance);
      assert.throws(
        () => registry.instantiate(
          doc.familyId,
          0,
          family.difficultyProfiles.find((profile) => profile !== item.difficultyProfile) || '__unknown__',
          item.caseId,
        ),
        /Unbekanntes Profil/,
      );
    }
  }
  for (const module of bundle.learningModules) {
    for (const placement of module.placements || []) registry.assertFamilyPlacement(placement);
  }
  for (const doc of docs.filter((item) => item.contract)) {
    assert.throws(
      () => registry.assertFamilyPlacement({
        familyId: doc.familyId,
        role: 'practice-space',
        difficulty: doc.cases[0].difficultyProfile,
      }),
      /Statische Familien dürfen nicht im Übungsraum platziert werden/,
    );
  }
});

test('foundations choice cases keep their compact parameter contract', () => {
  for (const familyId of FOUNDATIONS_CHOICE_FAMILY_IDS) {
    const family = registry.get(familyId);
    assert.equal(family.vacuousSteps, undefined, `${familyId}: no vacuous steps`);
    for (const caseType of family.caseTypes) {
      for (const difficulty of validProfiles(familyId, caseType.caseId)) {
        const instance = registry.instantiate(familyId, 5, difficulty, caseType.caseId);
        assert.deepEqual(Object.keys(instance.parameters).sort(), ['caseId', 'difficulty']);
      }
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
