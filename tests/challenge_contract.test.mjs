import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplitArtifacts, validateSourceDocument } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const contract = {
  familyId: 'challenge-demo',
  familyGroup: 'challenge-lab',
  summary: 'Demo-Familie fuer den Challenge-Vertrag.',
  taskArchetype: 'numeric-exact',
  authorityMode: 'static',
  masteryEligible: true,
  caseTypes: [{ caseId: 'sums-of-powers' }],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-algebra', 'c-analysis'],
  graderId: 'deterministic',
  activityType: 'numeric',
};

const baseCase = {
  caseId: 'sums-of-powers',
  difficultyProfile: 'challenge',
  masteryEligible: true,
  sourceLineage: ['eigenstaendig-entwickelt'],
  competencyIds: ['c-algebra', 'c-analysis'],
  expected: { kind: 'integer', value: 42 },
  parameters: {},
  hints: ['Denke an die Faktorisierung.', 'Pruefe die Randfaelle.'],
  fullSolution: 'Vollstaendiger Loesungsweg: zuerst die Summenformel anwenden, dann die Grenzen einsetzen und das Ergebnis sichern.',
};

const documentFor = (item, { familyId = 'challenge-demo', contract: contractField = contract } = {}) => ({
  schemaVersion: 1,
  familyId,
  contract: contractField,
  cases: [{ ...baseCase, ...item }],
});

test('challengeEligible case passes when the contract holds', () => {
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor({ challengeEligible: true }), root), true);
});

test('cases without the flag skip the challenge contract', () => {
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor({}), root), true);
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor({ challengeEligible: false }), root), true);
  assert.equal(
    validateSourceDocument('exercise-family-cases', documentFor({ difficultyProfile: 'core', challengeEligible: false }), root),
    true,
  );
  assert.equal(
    validateSourceDocument('exercise-family-cases', documentFor({ challengeEligible: false }, { contract: null }), root),
    true,
  );
});

for (
  const [label, item, reason] of [
    ['difficultyProfile', { challengeEligible: true, difficultyProfile: 'core' }, 'difficultyProfile challenge'],
    ['masteryEligible', { challengeEligible: true, masteryEligible: false }, 'masteryEligible'],
    ['hints', { challengeEligible: true, hints: [] }, 'hints'],
    ['fullSolution', { challengeEligible: true, fullSolution: '' }, 'fullSolution'],
    ['sourceLineage', { challengeEligible: true, sourceLineage: [] }, 'sourceLineage'],
  ]
) {
  test(`challengeEligible rejects a case with a broken ${label}`, () => {
    assert.throws(
      () => validateSourceDocument('exercise-family-cases', documentFor(item), root),
      new RegExp(`E_CHALLENGE_CONTRACT.*${reason}`),
    );
  });
}

test('challengeEligible python-code needs >=2 requiredFunctions or >=8 __check calls', () => {
  const codeCase = {
    challengeEligible: true,
    activityType: 'python-code',
    expected: { kind: 'reference-solver' },
    parameters: { tests: '__check(a)\n__check(b)' },
  };
  assert.throws(
    () => validateSourceDocument('exercise-family-cases', documentFor(codeCase), root),
    /E_CHALLENGE_CONTRACT.*(__check|requiredFunctions)/,
  );
  const compliant = {
    ...codeCase,
    parameters: { tests: Array.from({ length: 8 }, (_, i) => `__check(c${i})`).join('\n') },
  };
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor(compliant), root), true);
  const viaFunctions = { ...codeCase, expected: { kind: 'reference-solver', requiredFunctions: ['solve_it', 'check_it'] } };
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor(viaFunctions), root), true);
});

test('challengeEligible worked-example-fading needs >=4 gaps', () => {
  const gaps = (count) => ({
    kind: 'gaps',
    gaps: Array.from({ length: count }, (_, i) => ({ answer: `${i}`, input: 'numeric' })),
  });
  const fading = { challengeEligible: true, activityType: 'worked-example-fading' };
  assert.throws(
    () => validateSourceDocument('exercise-family-cases', documentFor({ ...fading, expected: gaps(3) }), root),
    /E_CHALLENGE_CONTRACT.*gaps/,
  );
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor({ ...fading, expected: gaps(4) }), root), true);
});

test('challengeEligible multiple-choice needs >=2 distinct correctIds', () => {
  const choice = {
    challengeEligible: true,
    activityType: 'multiple-choice',
    choices: [
      { id: 'a', text: 'A', correct: true },
      { id: 'b', text: 'B', correct: false },
      { id: 'c', text: 'C', correct: true },
    ],
    expected: { kind: 'choice-indices', correctIds: ['a', 'c'] },
  };
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor(choice), root), true);
  assert.throws(
    () => validateSourceDocument(
      'exercise-family-cases',
      documentFor({ ...choice, expected: { kind: 'choice-indices', correctIds: ['a', 'a'] } }),
      root,
    ),
    /E_CHALLENGE_CONTRACT.*correctIds/,
  );
});

test('challengeEligible numeric needs >=2 competencyIds', () => {
  assert.throws(
    () => validateSourceDocument('exercise-family-cases', documentFor({ challengeEligible: true, competencyIds: ['c-algebra'] }), root),
    /E_CHALLENGE_CONTRACT.*competencyIds/,
  );
});

test('challengeEligible needs a substantial fullSolution', () => {
  assert.throws(
    () => validateSourceDocument('exercise-family-cases', documentFor({ challengeEligible: true, fullSolution: 'Kurz.' }), root),
    /E_CHALLENGE_CONTRACT.*fullSolution/,
  );
  const twoBlocks = { challengeEligible: true, fullSolution: 'Erst faktorisieren.\n\nDann Grenzen einsetzen.' };
  assert.equal(validateSourceDocument('exercise-family-cases', documentFor(twoBlocks), root), true);
});

test('challengeEligible contract:null case fails closed when the JS spec lacks the case', () => {
  const ghostDoc = documentFor(
    { caseId: 'ghost-case', challengeEligible: true },
    { familyId: 'aggregate-detector-eval-compare', contract: null },
  );
  assert.throws(
    () => validateSourceDocument('exercise-family-cases', ghostDoc, root),
    /E_CHALLENGE_CONTRACT.*(Smoke-Check|instantiate)/,
  );
});

test('challengeEligible contract:null case checks structure on the instance', () => {
  const proceduralDoc = documentFor(
    { caseId: 'run-eval-compare-rulesets', challengeEligible: true },
    { familyId: 'aggregate-detector-eval-compare', contract: null },
  );
  assert.equal(validateSourceDocument('exercise-family-cases', proceduralDoc, root), true);
});

test('split artifacts carry the flag only when set', () => {
  const bundle = {
    sources: [],
    tools: [],
    visualizations: [],
    lessons: [],
    familyActivities: [],
    families: [{
      familyId: 'challenge-demo',
      contract: { summary: 'Demo' },
      cases: [
        { ...baseCase, challengeEligible: true },
        { ...baseCase, caseId: 'plain-case' },
      ],
    }],
  };
  const [flagged, plain] = buildSplitArtifacts(bundle).index.families[0].cases;
  assert.equal(flagged.challengeEligible, true);
  assert.equal(Object.hasOwn(plain, 'challengeEligible'), false);
});
