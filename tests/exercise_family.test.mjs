import test from 'node:test';
import assert from 'node:assert/strict';
import { GIT_OPERATION_CONTRACT, solveGitOperation } from '../assets/js/core/foundations_fresh_generators.mjs';
import {
  createFamilyRegistry,
  familyEventInput,
  instantiate,
} from '../assets/js/domain/exercise_registry.mjs';
import { registerStaticCases, staticFamilySpec } from '../assets/js/domain/family_registry.mjs';
import { buildLearningEvent, isJournalWorthy } from '../assets/js/domain/learning_event.mjs';
import { assertModuleBindings } from '../assets/js/domain/learning_module.mjs';

const ids = {
  competencies: new Set(['c-git-basics']),
  tracks: new Set(['common-core']),
  rights: new Set(['ki-lernplattform-original']),
  lessons: new Set(['l-foundations-git']),
  exercises: new Set(['f-git-choice-01']),
  explanations: new Set(),
  projects: new Set(),
};

const familyModule = {
  moduleId: 'lm-git-basics',
  competencyIds: ['c-git-basics'],
  requires: [],
  trackIds: ['common-core'],
  rightsId: 'ki-lernplattform-original',
  lessonIds: ['l-foundations-git'],
  explanationIds: [],
  projectIds: [],
  placements: [],
};

function propertyCases(family) {
  return family.caseTypes.filter((item) => item.propertyTest !== false);
}




test('rationale-note members skip family property tests and stay non-authoritative', () => {
  const stub = {
    familyId: 'reflect-guided-note',
    familyGroup: 'reflect-rationale',
    summary: 'Freitext ohne Grammatik.',
    taskArchetype: 'rationale-note',
    authorityMode: 'static',
    masteryEligible: false,
    caseTypes: [
      { caseId: 'w01-e11', propertyTest: false },
      { caseId: 'w05-e9', propertyTest: false },
    ],
    difficultyProfiles: ['intro', 'core'],
    competencyIds: ['c-git-basics'],
    graderId: 'manual-rubric',
    activityType: 'short-rationale',
    generate: () => {
      throw new Error('rationale-note gehört nicht in den Property-Test');
    },
    solve: () => {
      throw new Error('rationale-note hat keinen autoritativen Solver');
    },
  };
  const registry = createFamilyRegistry([stub]);
  assert.deepEqual(propertyCases(registry.get('reflect-guided-note')), []);
  assert.equal(registry.get('reflect-guided-note').masteryEligible, false);
});

test('static variants select deterministic cases and stay solver-aligned', () => {
  const baseChoice = (text, correct) => ({ id: correct ? 'a' : 'b', text, correct });
  const variantDoc = {
    familyId: 'variant-static-contract',
    contract: {
      familyId: 'variant-static-contract',
      familyGroup: 'classify-concept',
      summary: 'Testfamilie für deterministische Varianten.',
      taskArchetype: 'choice-diagnose',
      authorityMode: 'static',
      masteryEligible: true,
      caseTypes: [{ caseId: 'variant-case' }, { caseId: 'plain-case' }],
      difficultyProfiles: ['intro'],
      competencyIds: ['c-git-basics'],
      graderId: 'deterministic',
      activityType: 'single-choice',
    },
    cases: [
      {
        caseId: 'variant-case',
        difficultyProfile: 'intro',
        masteryEligible: true,
        sourceLineage: [],
        parameters: { base: true },
        expected: {},
        choices: [baseChoice('Basis', true), baseChoice('Distraktor', false)],
        prompt: 'Basis',
        fullSolution: 'Basis',
        variants: [
          {
            parameters: { value: 1 },
            expected: {},
            choices: [baseChoice('Variante 1', true), baseChoice('Distraktor 1', false)],
            prompt: 'Variante 1',
            fullSolution: 'Variante 1',
          },
          {
            parameters: { value: 2 },
            expected: {},
            choices: [baseChoice('Variante 2', true), baseChoice('Distraktor 2', false)],
            prompt: 'Variante 2',
            fullSolution: 'Variante 2',
          },
        ],
      },
      {
        caseId: 'plain-case',
        difficultyProfile: 'intro',
        masteryEligible: true,
        sourceLineage: [],
        parameters: { base: true },
        expected: {},
        choices: [baseChoice('Nur Basis', true), baseChoice('Distraktor', false)],
        prompt: 'Nur Basis',
        fullSolution: 'Nur Basis',
      },
    ],
  };
  registerStaticCases(variantDoc.familyId, variantDoc.cases);
  const registry = createFamilyRegistry([staticFamilySpec(variantDoc)]);
  const variantFamily = registry.get(variantDoc.familyId);
  assert.equal(variantFamily.caseTypes.find((item) => item.caseId === 'variant-case').propertyTest, true);
  assert.equal(variantFamily.caseTypes.find((item) => item.caseId === 'plain-case').propertyTest, false);
  assert.deepEqual(
    [0, 1, 2, 3].map((seed) => registry.instantiate(variantDoc.familyId, seed, 'intro', 'variant-case').prompt),
    ['Basis', 'Variante 1', 'Variante 2', 'Basis'],
  );
  for (const seed of [0, 1, 2, 3]) {
    const instance = registry.instantiate(variantDoc.familyId, seed, 'intro', 'variant-case');
    assert.equal(instance.parameters.variant, seed % 3);
    assert.equal(registry.get(variantDoc.familyId).solve(instance.parameters).correctText, instance.choices.find((choice) => choice.correct).text);
  }
  const plain = [0, 1, 2].map((seed) => registry.instantiate(variantDoc.familyId, seed, 'intro', 'plain-case'));
  assert.deepEqual(plain.map((instance) => instance.parameters), [
    { base: true, caseId: 'plain-case', difficulty: 'intro', variant: 0 },
    { base: true, caseId: 'plain-case', difficulty: 'intro', variant: 0 },
    { base: true, caseId: 'plain-case', difficulty: 'intro', variant: 0 },
  ]);
  assert.deepEqual(plain.map((instance) => instance.prompt), ['Nur Basis', 'Nur Basis', 'Nur Basis']);
});

test('vacuous-axis steps are declared, not silent', () => {
  const fileStep = GIT_OPERATION_CONTRACT.vacuousSteps.find((step) => step.stepId === 'file-localize');
  assert.ok(fileStep);
  assert.deepEqual([...fileStep.emptyWhen].sort(), ['core', 'intro']);
  const intro = instantiate('classify-git-operation', 4, 'intro', 'diff-unstaged');
  const stretch = instantiate('classify-git-operation', 4, 'stretch', 'diff-unstaged');
  assert.equal(intro.parameters.fileName, undefined);
  assert.equal(typeof stretch.parameters.fileName, 'string');
});

test('git operation variants: seed picks the body, solver and feedback follow it', () => {
  const variantOf = (instance) => instance.parameters.variant ?? 0;
  const anchor = instantiate('classify-git-operation', 0, 'core', 'push');
  assert.equal('variant' in anchor.parameters, false, 'Seed 0 bleibt der authored Fall ohne variant-Feld');
  const prompts = new Set();
  for (let seed = 0; seed < 12; seed += 1) {
    const instance = instantiate('classify-git-operation', seed, 'core', 'push');
    assert.equal(variantOf(instance), seed % 3);
    prompts.add(instance.prompt);
    const correct = instance.choices.find((choice) => choice.correct);
    assert.equal(solveGitOperation(instance.parameters).correctText, correct.text, `${seed}: Solver folgt parameters.variant`);
    const rules = instance.feedbackRules || [];
    if (variantOf(instance) > 0) assert.equal(rules.length, 3, `${seed}: jede Variante trägt Distraktor-Feedback`);
    for (const rule of rules) {
      const id = /^choice === '([a-d])'$/.exec(rule.if)?.[1];
      assert.ok(id && id !== correct.id, `${seed}: Regel ${rule.if} zeigt auf einen Distraktor`);
    }
  }
  assert.equal(prompts.size, 3);
});

test('git operation file localization: option, solution and feedback texts follow the drawn file name', () => {
  for (const { caseId } of GIT_OPERATION_CONTRACT.caseTypes) {
    for (const difficulty of ['stretch', 'challenge']) {
      for (let seed = 0; seed <= 40; seed += 1) {
        const instance = instantiate('classify-git-operation', seed, difficulty, caseId);
        if (!instance.parameters.fileName) continue;
        const texts = [
          instance.fullSolution,
          ...instance.choices.map((choice) => choice.text),
          ...(instance.feedbackRules || []).map((rule) => rule.then),
        ];
        for (const text of texts) {
          assert.ok(!text.includes('datei.py'), `${caseId}/${difficulty}/${seed}: ${text}`);
        }
        const correct = instance.choices.find((choice) => choice.correct);
        assert.equal(solveGitOperation(instance.parameters).correctText, correct.text, `${caseId}/${difficulty}/${seed}`);
      }
    }
  }
});

test('mergeInto names the home family and does not rewrite the instance identity', () => {
  const stub = {
    familyId: 'classify-orphan-merge-source',
    familyGroup: 'classify-concept',
    summary: 'Merge-Quelle, Vollzug bleibt S4D.',
    taskArchetype: 'choice-diagnose',
    authorityMode: 'seeded',
    masteryEligible: true,
    mergeInto: 'classify-git-operation',
    caseTypes: [{ caseId: 'pending-a' }, { caseId: 'pending-b' }],
    difficultyProfiles: ['intro', 'core'],
    competencyIds: ['c-git-basics'],
    graderId: 'deterministic',
    activityType: 'single-choice',
    generate: ({ caseId, difficulty }) => ({
      parameters: { caseId, difficulty },
      expected: {},
      choices: [
        { id: 'a', text: 'behalten', correct: true },
        { id: 'b', text: 'umziehen', correct: false },
      ],
      prompt: caseId,
      fullSolution: 'behalten',
    }),
    solve: () => ({ correctText: 'behalten' }),
  };
  const registry = createFamilyRegistry([stub]);
  assert.equal(registry.get('classify-orphan-merge-source').mergeInto, 'classify-git-operation');
  const instance = registry.instantiate('classify-orphan-merge-source', 1, 'core', 'pending-a');
  assert.equal(instance.familyId, 'classify-orphan-merge-source');
  assert.equal(instance.caseId, 'pending-a');
});

test('curated placement without definitionId needs case type, seed and masteryEligible', () => {
  const base = {
    placementId: 'p-family-a',
    role: 'curated',
    familyId: 'classify-git-operation',
    difficulty: 'core',
  };
  assert.throws(
    () => assertModuleBindings({ ...familyModule, placements: [{ ...base, seed: 7, masteryEligible: true }] }, ids),
    /Falltyp und Seed/,
  );
  assert.throws(
    () => assertModuleBindings({ ...familyModule, placements: [{ ...base, caseId: 'diff-unstaged', masteryEligible: true }] }, ids),
    /Falltyp und Seed/,
  );
  assert.throws(
    () => assertModuleBindings({
      ...familyModule,
      placements: [{ ...base, caseId: 'diff-unstaged', seed: 7 }],
    }, ids),
    /masteryEligible ohne definitionId/,
  );
  assert.throws(
    () => assertModuleBindings({
      ...familyModule,
      placements: [{ ...base, role: 'practice-space', definitionId: 'f-git-choice-01' }],
    }, ids),
    /keine Einzelaufgabe kopieren/,
  );
});





test('S4D0 wrong family answers are journal-worthy with the case key', () => {
  const instance = instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged');
  const wrong = instance.choices.find((choice) => choice.correct !== true)?.id;
  const input = familyEventInput(instance);
  const event = buildLearningEvent({
    ...input, cycleId: 'cycle-9', eventType: 'attempt', answer: wrong,
    hintsUsed: 0, correct: false, errorType: 'wrong-choice',
  });
  assert.equal(event.exerciseId, 'classify-git-operation:diff-unstaged');
  assert.equal(isJournalWorthy({ ...event, errorType: 'wrong-choice' }), true);
});
