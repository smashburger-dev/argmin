// Familie classify-rank-solution-case: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_rank_solution_capsules.test.mjs
// Gemeinsame Gates leben in tests/linalg_capsule_suites.mjs — die Kit-Produkte
// (capsuleOk/correctText/genCapsule/generate/solve) kommen aus
// foundations_linalg_families.mjs, Kapseln und Fachhelfer aus
// linalg_generators.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RANK_SOLUTION_CAPSULES,
  rankSolutionInstanceOk,
} from '../assets/js/core/linalg_generators.mjs';
import {
  RANK_SOLUTION_CONTRACT,
  rankSolutionCapsuleOk,
  rankSolutionCorrectText,
  genRankSolutionCapsule,
  generateRankSolutionFamily,
  solveRankSolutionFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { linalgChoiceCapsuleSuite } from './linalg_capsule_suites.mjs';

// --- 18 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Beide Fälle teilen dieselben 9 Koeffizienten-Vierer (Stufenform
// 1 0 a b / 0 1 c d / 0 0 0 0, immer Rang 2 mit freier Variable). Regel:
// Kapsel weiten, nie Orakel umschreiben — der Sampler muss diese Bounds
// halten. Die kuratierte Rotation läuft mit Periode 4 über die Varianten
// (Variante i trägt die korrekte Antwort an Position i % 4).
const COEFFICIENT_ORACLES = [
  [2, 1, 3, 2],
  [1, 2, 4, 5],
  [3, -1, 2, -2],
  [2, 3, 5, 1],
  [4, 1, -3, 6],
  [1, -2, 3, 4],
  [5, 2, 1, -1],
  [2, -3, 4, 7],
  [3, 4, -2, 0],
];

const ABCD_IDS = ['a', 'b', 'c', 'd'];
const SYMBOLIC_IDS = ['rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero'];

// Kuratierte Rotationsfolge aus dem Content-Stand vor dem Strip (je Fall 9
// Varianten, korrekte Antwort an Position i % 4).
const ABCD_ROTATION = ['a', 'b', 'c', 'd', 'a', 'b', 'c', 'd', 'a'];
const SYMBOLIC_ROTATION = [
  'rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero',
  'rank-two-free', 'rank-three-unique', 'contradiction', 'rank-zero', 'rank-two-free',
];

const CAPSULE_KEYS = ['core', 'stretch'];
const CASE_FOR = {
  core: 'echelon-read-rank-case',
  stretch: 'rank-system-authored',
};
const capsuleFor = (caseId) => RANK_SOLUTION_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-18: alle statischen Fälle form- und rotations-bestätigt', () => {
  assert.equal(COEFFICIENT_ORACLES.length, 9);
  COEFFICIENT_ORACLES.forEach((coeffs, index) => {
    const parameters = { systemCoefficients: coeffs };
    assert.ok(rankSolutionInstanceOk(parameters, capsuleFor('echelon-read-rank-case')), `abcd#${index}: Kapselform`);
    assert.ok(rankSolutionInstanceOk(parameters, capsuleFor('rank-system-authored')), `symbolic#${index}: Kapselform`);
    // Kuratierte Rotation: Variante i trägt die korrekte Antwort an Position i % 4.
    assert.equal(ABCD_ROTATION[index], ABCD_IDS[index % 4], `abcd#${index}: Rotationsposition`);
    assert.equal(SYMBOLIC_ROTATION[index], SYMBOLIC_IDS[index % 4], `symbolic#${index}: Rotationsposition`);
    assert.ok(Math.max(...coeffs.map((value) => Math.abs(value))) <= 7, `coeffs#${index}: im Bound`);
    assert.equal(rankSolutionCorrectText(parameters, capsuleFor('echelon-read-rank-case')), 'Rang 2, $z$ frei, unendlich viele Lösungen.', `abcd#${index}: Schlüsseltext`);
    assert.equal(rankSolutionCorrectText(parameters, capsuleFor('rank-system-authored')), 'Rang 2, eine freie Variable und unendlich viele Lösungen', `symbolic#${index}: Schlüsseltext`);
  });
});

test('Anker-Texte: kuratierte Basisfall-Schlüssel wörtlich im Template', () => {
  assert.equal(
    rankSolutionCorrectText(
      { systemCoefficients: [2, 3, -1, 2] }, RANK_SOLUTION_CAPSULES.core,
    ),
    'Rang 2, $z$ frei, unendlich viele Lösungen.',
  );
  assert.equal(
    rankSolutionCorrectText(
      { systemCoefficients: [2, 3, -1, 4] }, RANK_SOLUTION_CAPSULES.stretch,
    ),
    'Rang 2, eine freie Variable und unendlich viele Lösungen',
  );
});

test('Kapseltabelle: Arten, Bounds und Fallbindung', () => {
  assert.deepEqual(RANK_SOLUTION_CAPSULES.core, { kind: 'echelon-abcd', bound: 7, caseId: 'echelon-read-rank-case' });
  assert.deepEqual(RANK_SOLUTION_CAPSULES.stretch, { kind: 'echelon-symbolic', bound: 7, caseId: 'rank-system-authored' });
});

linalgChoiceCapsuleSuite('classify-rank-solution-case', {
  capsules: RANK_SOLUTION_CAPSULES,
  contract: RANK_SOLUTION_CONTRACT,
  capsuleOk: rankSolutionCapsuleOk,
  correctText: rankSolutionCorrectText,
  genCapsule: genRankSolutionCapsule,
  generate: generateRankSolutionFamily,
  solve: solveRankSolutionFamily,
  registry: LINALG_FAMILIES,
}, CASE_FOR, {
  difficultyProfiles: ['core', 'stretch'],
  meta: {
    core: { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
    stretch: { masteryEligible: true, competencyIds: ['c-linalg-systems', 'c-linalg-gauss', 'c-linalg-independence'] },
  },
});
