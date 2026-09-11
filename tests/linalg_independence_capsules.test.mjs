// Familie classify-independence-multiple: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_independence_capsules.test.mjs
// Anker-Korrektur (bewusst, gegen Strip-Prinzip): Base-Params der Fälle
// independent-pair-negative und dependent-triple-span an den Prompt angeglichen;
// Bestand war ein Copy-Paste-Fehler.
// Gemeinsame Gates leben in tests/linalg_capsule_suites.mjs — die Kit-Produkte
// (capsuleOk/correctText/genCapsule/generate/solve) kommen aus
// foundations_linalg_families.mjs, Kapseln und Fachhelfer aus
// linalg_generators.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDEPENDENCE_CAPSULES,
  independenceShapeOk,
  dependenceFactor,
  pairIndependent,
  maxAbsVectors,
} from '../assets/js/core/linalg_generators.mjs';
import {
  INDEPENDENCE_CONTRACT,
  independenceCapsuleOk,
  independenceCorrectText,
  genIndependenceCapsule,
  generateIndependenceFamily,
  solveIndependenceFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';
import { linalgChoiceCapsuleSuite } from './linalg_capsule_suites.mjs';

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit Art-Nachweis und Bound (12/5/5). Regel: Kapsel
// weiten, nie Orakel umschreiben — der Sampler muss diese Bounds halten.
const ORACLES = [
  {
    caseId: 'dependent-pair-double', kind: 'dependent-pair', bound: 12, vectors: [
      [[1, 2], [2, 4]],
      [[2, -1], [6, -3]],
      [[3, 1], [-6, -2]],
      [[1, -3], [4, -12]],
      [[2, 5], [-2, -5]],
      [[4, -1], [8, -2]],
      [[1, 4], [-3, -12]],
      [[3, -2], [6, -4]],
      [[5, 1], [-10, -2]],
    ],
  },
  {
    caseId: 'independent-pair-negative', kind: 'independent-pair', bound: 5, vectors: [
      [[1, 2], [2, 3]],
      [[2, 1], [1, 3]],
      [[1, -1], [2, 1]],
      [[3, 2], [1, 4]],
      [[2, 5], [3, 1]],
      [[4, -1], [2, 3]],
      [[1, 3], [-2, 1]],
      [[5, 2], [1, -1]],
      [[2, -3], [4, 1]],
    ],
  },
  {
    caseId: 'dependent-triple-span', kind: 'dependent-triple', bound: 5, vectors: [
      [[1, 0, 1], [0, 1, 1], [1, 1, 2]],
      [[1, 2, 0], [0, 1, 3], [1, 3, 3]],
      [[2, 0, 1], [1, 1, 0], [3, 1, 1]],
      [[1, -1, 2], [2, 1, 1], [3, 0, 3]],
      [[2, 1, -1], [-1, 3, 2], [1, 4, 1]],
      [[1, 3, 1], [2, -1, 0], [3, 2, 1]],
      [[3, 0, 2], [1, 2, 1], [4, 2, 3]],
      [[2, -2, 1], [1, 4, 0], [3, 2, 1]],
      [[1, 1, 2], [-2, 1, 3], [-1, 2, 5]],
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'dependent-pair-double', core: 'independent-pair-negative', stretch: 'dependent-triple-span' };
const capsuleFor = (caseId) => INDEPENDENCE_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle statischen Vektorsätze schlüssel-bestätigt und innerhalb 12/5/5', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(capsule.kind, oracle.kind, `${oracle.caseId}: Art`);
    assert.equal(oracle.vectors.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const vectors of oracle.vectors) {
      assert.ok(maxAbsVectors(vectors) <= oracle.bound, `${oracle.caseId}: maxAbs im Bound`);
      assert.ok(independenceShapeOk(vectors, capsule), `${oracle.caseId}: Kapselform`);
      if (oracle.kind === 'dependent-pair') {
        const k = dependenceFactor(vectors[0], vectors[1]);
        assert.ok(Number.isInteger(k) && k !== 0 && k !== 1, `${oracle.caseId}: Faktor`);
      }
      if (oracle.kind === 'independent-pair') assert.ok(pairIndependent(vectors), `${oracle.caseId}: unabhängig`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Kapseltabelle: Arten und Bounds 12/5/5 mit Fallbindung', () => {
  assert.deepEqual(INDEPENDENCE_CAPSULES.intro, { kind: 'dependent-pair', bound: 12, caseId: 'dependent-pair-double' });
  assert.deepEqual(INDEPENDENCE_CAPSULES.core, { kind: 'independent-pair', bound: 5, caseId: 'independent-pair-negative' });
  assert.deepEqual(INDEPENDENCE_CAPSULES.stretch, { kind: 'dependent-triple', bound: 5, caseId: 'dependent-triple-span' });
});

linalgChoiceCapsuleSuite('classify-independence-multiple', {
  capsules: INDEPENDENCE_CAPSULES,
  contract: INDEPENDENCE_CONTRACT,
  capsuleOk: independenceCapsuleOk,
  correctText: independenceCorrectText,
  genCapsule: genIndependenceCapsule,
  generate: generateIndependenceFamily,
  solve: solveIndependenceFamily,
  registry: LINALG_FAMILIES,
}, CASE_FOR, {
  difficultyProfiles: ['intro', 'core', 'stretch'],
  complies: (parameters, capsule) => maxAbsVectors(parameters.vectors) <= capsule.bound,
});
