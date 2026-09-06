import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { graders } from '../assets/js/core/graders.js';
import {
  GIT_OPERATION_CONTRACT,
  generateGitOperationFamily,
  solveGitOperation,
} from '../assets/js/core/foundations_fresh_generators.mjs';
import {
  createFamilyRegistry,
  familyEventInput,
  familyIdTokens,
  instantiate,
  grade,
  assertFamilyPlacement,
  EXERCISE_FAMILIES,
} from '../assets/js/domain/exercise_registry.mjs';
import { buildLearningEvent, isJournalWorthy } from '../assets/js/domain/learning_event.mjs';
import { instanceKey } from '../assets/js/domain/learning_policy.mjs';
import { assertModuleBindings } from '../assets/js/domain/learning_module.mjs';
import { validateSourceDocument } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonical = JSON.parse(readFileSync(join(root, 'research/streamlining/s4a-v2/canonical-families.json'), 'utf8'));
const SOLVER_TABLE = {
  'diff-unstaged': 'git diff',
  'diff-staged': 'git diff --staged',
  'merge-conflict-test-flow': 'Konfliktmarker und beide Absichten lesen, fachlich auflösen, Tests ausführen, `git diff` prüfen, dann den Merge committen',
};

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

function counterexample(instance) {
  const wrong = instance.choices.find((choice) => choice.correct !== true);
  assert.ok(wrong, `${instance.caseId}: Gegenbeispiel fehlt`);
  return wrong.id;
}

function propertyCases(family) {
  return family.caseTypes.filter((item) => item.propertyTest !== false);
}

test('family contract schema accepts the git operation family and rejects extra keys', () => {
  validateSourceDocument('exercise-family', GIT_OPERATION_CONTRACT, root);
  assert.throws(
    () => validateSourceDocument('exercise-family', { ...GIT_OPERATION_CONTRACT, generate: true }, root),
    /additional/,
  );
});

test('classify-git-operation is the S4A family, not a silent token permutation', () => {
  const known = new Map(canonical.families.map((family) => [familyIdTokens(family.familyId), family.familyId]));
  assert.equal(known.get(familyIdTokens('classify-git-operation')), 'classify-git-operation');
  assert.equal(known.get(familyIdTokens('git-operation-classify')), 'classify-git-operation');
  assert.equal(instantiate('classify-git-operation', 7, 'core', 'diff-unstaged').familyId, 'classify-git-operation');
});

test('registry rejects token-multiset aliases and duplicate family ids', () => {
  const collision = {
    ...GIT_OPERATION_CONTRACT,
    familyId: 'git-classify-operation',
    caseTypes: [
      { caseId: 'alpha-case' },
      { caseId: 'beta-case' },
    ],
  };
  assert.throws(
    () => createFamilyRegistry([
      { ...GIT_OPERATION_CONTRACT, generate: generateGitOperationFamily, solve: solveGitOperation },
      { ...collision, generate: generateGitOperationFamily, solve: solveGitOperation },
    ]),
    /Token-Multiset/,
  );
  assert.throws(
    () => createFamilyRegistry([
      { ...GIT_OPERATION_CONTRACT, generate: generateGitOperationFamily, solve: solveGitOperation },
      { ...GIT_OPERATION_CONTRACT, generate: generateGitOperationFamily, solve: solveGitOperation },
    ]),
    /doppelt/,
  );
});

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

test('vacuous-axis steps are declared, not silent', () => {
  const fileStep = GIT_OPERATION_CONTRACT.vacuousSteps.find((step) => step.stepId === 'file-localize');
  assert.ok(fileStep);
  assert.deepEqual([...fileStep.emptyWhen].sort(), ['core', 'intro']);
  const intro = instantiate('classify-git-operation', 4, 'intro', 'diff-unstaged');
  const stretch = instantiate('classify-git-operation', 4, 'stretch', 'diff-unstaged');
  assert.equal(intro.parameters.fileName, undefined);
  assert.equal(typeof stretch.parameters.fileName, 'string');
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
      expected: { correctChoice: 'a' },
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

test('unknown family, case, profile or seed fail closed', () => {
  assert.throws(() => instantiate('classify-git-status-command', 1, 'core', 'diff-unstaged'), /Unbekannte Familie/);
  assert.throws(() => instantiate('classify-git-operation', 1, 'core', 'dirty-tree'), /Unbekannter Fall/);
  assert.throws(() => instantiate('classify-git-operation', 1, 'expert', 'diff-unstaged'), /Unbekanntes Profil/);
  assert.throws(() => instantiate('classify-git-operation', 1.5, 'core', 'diff-unstaged'), /Seed/);
  assert.throws(
    () => assertFamilyPlacement({
      placementId: 'p-x',
      role: 'curated',
      familyId: 'classify-git-operation',
      caseId: 'dirty-tree',
      seed: 1,
      difficulty: 'core',
      masteryEligible: true,
    }),
    /Unbekannter Fall/,
  );
});

test('case type, seed and profile instantiate distinct variants', () => {
  const unstaged = instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged');
  const staged = instantiate('classify-git-operation', 7, 'intro', 'diff-staged');
  const otherSeed = instantiate('classify-git-operation', 8, 'intro', 'diff-unstaged');
  const core = instantiate('classify-git-operation', 7, 'core', 'diff-unstaged');
  assert.equal(unstaged.caseId, 'diff-unstaged');
  assert.equal(staged.caseId, 'diff-staged');
  assert.notEqual(unstaged.prompt, staged.prompt);
  assert.notEqual(unstaged.expectedAnswer.correctChoice, undefined);
  assert.notDeepEqual(unstaged.choices, otherSeed.choices);
  assert.equal(unstaged.choices.length, 2);
  assert.equal(core.choices.length, 4);
  assert.equal(unstaged.definitionId, undefined);
  assert.equal(unstaged.masteryEligible, true);
  assert.equal(unstaged.instanceId, 'classify-git-operation:diff-unstaged:intro:7');
  assert.deepEqual(unstaged, instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged'));
});

test('independent solver matches the expected choice; a distractor is the counterexample', async () => {
  for (const caseId of Object.keys(SOLVER_TABLE)) {
    for (const difficulty of GIT_OPERATION_CONTRACT.difficultyProfiles) {
      const instance = instantiate('classify-git-operation', 21, difficulty, caseId);
      const solved = solveGitOperation(instance.parameters);
      assert.equal(solved.correctText, SOLVER_TABLE[caseId], `${caseId} ${difficulty}: Solver-Tabelle`);
      const correct = instance.choices.find((choice) => choice.id === instance.expectedAnswer.correctChoice);
      assert.equal(correct.text, solved.correctText);
      const right = await grade(instance, instance.expectedAnswer.correctChoice);
      const wrong = await grade(instance, counterexample(instance));
      assert.equal(right.correct, true, `${caseId} ${difficulty}: Sollantwort`);
      assert.equal(wrong.correct, false, `${caseId} ${difficulty}: Gegenbeispiel`);
      assert.equal((await graders.deterministic.grade(instance, instance.expectedAnswer.correctChoice)).correct, true);
    }
  }
});

test('property tests cover every authoritative case type and profile over 32 seeds', async () => {
  const family = EXERCISE_FAMILIES.get('classify-git-operation');
  for (const caseType of propertyCases(family)) {
    for (const difficulty of family.difficultyProfiles) {
      for (let seed = 0; seed < 32; seed += 1) {
        const instance = instantiate(family.familyId, seed, difficulty, caseType.caseId);
        assert.deepEqual(instance, instantiate(family.familyId, seed, difficulty, caseType.caseId));
        assert.equal(instance.caseId, caseType.caseId);
        assert.equal(instance.difficulty, difficulty);
        const solved = family.solve(instance.parameters);
        const correct = instance.choices.find((choice) => choice.correct);
        assert.equal(correct.text, solved.correctText);
        assert.equal((await grade(instance, correct.id)).correct, true);
        assert.equal((await grade(instance, counterexample(instance))).correct, false);
      }
    }
  }
});

test('S4C family golden corpus is byte-identical over seeds 0-63', () => {
  const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/exercise-family-golden-corpus.json'), 'utf8'));
  const [firstSeed, lastSeed] = fixture.seedRange;
  const instances = [];
  for (const caseId of fixture.caseTypes) {
    for (const difficulty of fixture.difficultyProfiles) {
      for (let seed = firstSeed; seed <= lastSeed; seed += 1) {
        instances.push(instantiate(fixture.familyId, seed, difficulty, caseId));
      }
    }
  }
  assert.equal(instances.length, fixture.instances);
  assert.equal(
    createHash('sha256').update(instances.map(JSON.stringify).join('\n')).digest('hex'),
    fixture.digest,
  );
});

test('S4D0 familyEventInput maps instances to the S3 write path', () => {
  const instance = instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged');
  const input = familyEventInput(instance);
  assert.equal(input.definitionId, 'classify-git-operation:diff-unstaged');
  assert.equal(input.activityId, 'classify-git-operation');
  assert.equal(input.exerciseId, 'classify-git-operation:diff-unstaged');
  assert.deepEqual(input.competencyIds, ['c-git-basics']);
  assert.equal(input.seed, 7);
  assert.equal(input.masteryEligible, true);
  assert.throws(() => familyEventInput(null), /familyId und caseId/);
  assert.throws(() => familyEventInput({ familyId: 'classify-git-operation' }), /familyId und caseId/);
});

test('S4D0 instance key is stable per case and shared across profiles', () => {
  const intro = instantiate('classify-git-operation', 7, 'intro', 'diff-unstaged');
  const challenge = instantiate('classify-git-operation', 7, 'challenge', 'diff-unstaged');
  const keyFor = (instance) => instanceKey(buildLearningEvent({
    ...familyEventInput(instance), cycleId: 'cycle-9', eventType: 'attempt',
    answer: 'a', hintsUsed: 0, correct: true,
  }));
  assert.equal(keyFor(intro), 'classify-git-operation:diff-unstaged:cycle-9:7');
  assert.equal(keyFor(challenge), keyFor(intro));
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
