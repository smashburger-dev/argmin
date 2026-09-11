// Familie classify-row-operation-validity: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_row_operation_capsules.test.mjs
// Gemeinsame Gates leben in tests/linalg_capsule_suites.mjs — die Kit-Produkte
// (capsuleOk/correctText/genCapsule/generate/solve) kommen aus
// foundations_linalg_families.mjs, Kapseln und Fachhelfer aus
// linalg_generators.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROW_OPERATION_CAPSULES,
  rowOperationInstanceOk,
} from '../assets/js/core/linalg_generators.mjs';
import {
  ROW_OPERATION_CONTRACT,
  rowOperationCapsuleOk,
  rowOperationCorrectText,
  genRowOperationCapsule,
  generateRowOperationFamily,
  solveRowOperationFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { linalgChoiceCapsuleSuite } from './linalg_capsule_suites.mjs';

// --- 18 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratierter Lösung und Bound (Gleichungen 9,
// Multiplikator 1-9 in der Kapsel 1-12). Regel: Kapsel weiten, nie Orakel
// umschreiben — der Sampler muss diese Bounds halten. Die kuratierte
// Rotation läuft mit Periode 4 über die Varianten (Variante i trägt die
// korrekte Antwort an Position i % 4).
const EQUATION_ORACLES = [
  ['a', [2, 1, 5], [1, -3, -8]],
  ['b', [1, 2, 4], [3, -1, 7]],
  ['c', [3, -1, 6], [2, 4, 1]],
  ['d', [2, 3, -5], [-1, 2, 9]],
  ['a', [4, 1, 8], [1, -2, 3]],
  ['b', [1, -2, 7], [2, 5, -4]],
  ['c', [3, 2, 1], [-2, 1, 6]],
  ['d', [2, -3, 4], [4, 1, -2]],
  ['a', [5, 1, -3], [-1, 3, 8]],
];

const MULTIPLIER_ORACLES = [
  ['row-add', 1],
  ['zero-row', 2],
  ['left-only', 3],
  ['delete', 4],
  ['row-add', 5],
  ['zero-row', 6],
  ['left-only', 7],
  ['delete', 8],
  ['row-add', 9],
];

const EQUATION_IDS = ['a', 'b', 'c', 'd'];
const MULTIPLIER_IDS = ['row-add', 'zero-row', 'left-only', 'delete'];

const CAPSULE_KEYS = ['core', 'intro'];
const CASE_FOR = {
  core: 'valid-operation-rhs',
  intro: 'row-operation-choice-contract',
};
const capsuleFor = (caseId) => ROW_OPERATION_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

// Unabhängige Nachrechnung im Test (plain Arithmetik, kein Template-Import):
// getragene Zeile II − 2·I plus kuratierte Vorzeichen-Schreibweise.
const expectedCarriedText = ([r1, r2]) => {
  const [cx, cy, cr] = [r2[0] - 2 * r1[0], r2[1] - 2 * r1[1], r2[2] - 2 * r1[2]];
  return `II \\leftarrow II - 2\\cdot I, rechte Seite mitgeführt: $${cx}x${cy < 0 ? `${cy}y` : `+${cy}y`}=${cr}$.`;
};

test('Orakel-18: alle statischen Fälle form- und schlüssel-bestätigt', () => {
  assert.equal(EQUATION_ORACLES.length, 9);
  EQUATION_ORACLES.forEach(([correctId, first, second], index) => {
    const parameters = { equations: [first, second] };
    assert.ok(rowOperationInstanceOk(parameters, capsuleFor('valid-operation-rhs')), `equations#${index}: Kapselform`);
    // Kuratierte Rotation: Variante i trägt die korrekte Antwort an Position i % 4.
    assert.equal(correctId, EQUATION_IDS[index % 4], `equations#${index}: Rotationsposition`);
    assert.ok(Math.max(...parameters.equations.flat().map((value) => Math.abs(value))) <= 9, `equations#${index}: im Bound`);
    assert.notEqual(first[0] * second[1] - first[1] * second[0], 0, `equations#${index}: det ungleich 0`);
    assert.equal(rowOperationCorrectText(parameters, capsuleFor('valid-operation-rhs')), expectedCarriedText([first, second]), `equations#${index}: Schlüsseltext`);
  });
  assert.equal(MULTIPLIER_ORACLES.length, 9);
  MULTIPLIER_ORACLES.forEach(([correctId, multiplier], index) => {
    const parameters = { multiplier };
    assert.ok(rowOperationInstanceOk(parameters, capsuleFor('row-operation-choice-contract')), `multiplier#${index}: Kapselform`);
    assert.equal(correctId, MULTIPLIER_IDS[index % 4], `multiplier#${index}: Rotationsposition`);
    assert.ok(multiplier >= 1 && multiplier <= 9, `multiplier#${index}: kuratierter Bereich`);
    assert.equal(rowOperationCorrectText(parameters, capsuleFor('row-operation-choice-contract')), `$Z_2 \\leftarrow Z_2-${multiplier}Z_1$`, `multiplier#${index}: Schlüsseltext`);
  });
});

test('Anker-Texte: kuratierte Erstvarianten-Schlüssel wörtlich im Template', () => {
  assert.equal(
    rowOperationCorrectText(
      { equations: [[2, 1, 5], [1, -3, -8]] }, ROW_OPERATION_CAPSULES.core,
    ),
    'II \\leftarrow II - 2\\cdot I, rechte Seite mitgeführt: $-3x-5y=-18$.',
  );
  assert.equal(
    rowOperationCorrectText({ multiplier: 1 }, ROW_OPERATION_CAPSULES.intro),
    '$Z_2 \\leftarrow Z_2-1Z_1$',
  );
});

test('Kapseltabelle: Arten, Bounds und Fallbindung', () => {
  assert.deepEqual(ROW_OPERATION_CAPSULES.core, { kind: 'equations', bound: 9, caseId: 'valid-operation-rhs' });
  assert.deepEqual(ROW_OPERATION_CAPSULES.intro, { kind: 'multiplier', min: 1, max: 12, caseId: 'row-operation-choice-contract' });
});

linalgChoiceCapsuleSuite('classify-row-operation-validity', {
  capsules: ROW_OPERATION_CAPSULES,
  contract: ROW_OPERATION_CONTRACT,
  capsuleOk: rowOperationCapsuleOk,
  correctText: rowOperationCorrectText,
  genCapsule: genRowOperationCapsule,
  generate: generateRowOperationFamily,
  solve: solveRowOperationFamily,
  registry: LINALG_FAMILIES,
}, CASE_FOR, {
  difficultyProfiles: ['intro', 'core'],
  meta: {
    core: { masteryEligible: true, competencyIds: ['c-linalg-gauss'] },
    intro: { masteryEligible: false, competencyIds: ['c-linalg-gauss'] },
  },
});
