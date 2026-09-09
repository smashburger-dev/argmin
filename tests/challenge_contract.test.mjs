import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSplitArtifacts, validateSourceDocument } from '../tools/compile_content.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const baseCase = {
  caseId: 'sums-of-powers',
  difficultyProfile: 'challenge',
  masteryEligible: true,
  sourceLineage: ['eigenstaendig-entwickelt'],
  hints: ['Denke an die Faktorisierung.'],
  fullSolution: 'Vollstaendiger Loesungsweg.',
};

const documentFor = (item) => ({
  schemaVersion: 1,
  familyId: 'challenge-demo',
  contract: null,
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
