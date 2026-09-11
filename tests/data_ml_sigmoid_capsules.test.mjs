// Familie classify-sigmoid-regime: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_sigmoid_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SIGMOID_CAPSULES,
  sigmoidValue,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  SIGMOID_REGIME_CONTRACT,
  genSigmoidCapsule,
  sigmoidCapsuleOk,
  sigmoidCorrectText,
  generateSigmoidRegimeFamily,
  solveSigmoidRegimeFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  SIGMOID_CAPSULES,
  sigmoidCapsuleOk,
  sigmoidCorrectText,
  genSigmoidCapsule,
  SIGMOID_REGIME_CONTRACT,
  generateSigmoidRegimeFamily,
  solveSigmoidRegimeFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-sigmoid-regime'),
};

choiceCapsuleSuite('classify-sigmoid-regime', mod, [
  { caseId: 'sigmoid-large-z', difficulty: 'intro' },
  { caseId: 'sigmoid-threshold', difficulty: 'core' },
  { caseId: 'sigmoid-log-odds', difficulty: 'stretch' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro', 'core', 'stretch'] });

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit nachgerechneter Kennzahl und kuratiertem
// Schlüsseltext. Regel: Kapsel weiten, nie Orakel umschreiben — der Sampler
// muss diese Werte halten und die Schlüssel wörtlich treffen. Die drei
// Base-Fälle sind Konzept-Anker (Symmetriepunkt, z=0, log(3)) und bleiben
// als Befund unangetastet; generiert wird die Varianten-Bank.
const ORACLES = [
  {
    caseId: 'sigmoid-large-z', key: 'intro', entries: [
      { parameters: { z: 4, sigmoid: 0.982014 }, correctText: '$\\sigma(4)\\approx 0,982$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: -4, sigmoid: 0.017986 }, correctText: '$\\sigma(-4)\\approx 0,018$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: 2, sigmoid: 0.880797 }, correctText: '$\\sigma(2)\\approx 0,881$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: -2, sigmoid: 0.119203 }, correctText: '$\\sigma(-2)\\approx 0,119$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: 1, sigmoid: 0.731059 }, correctText: '$\\sigma(1)\\approx 0,731$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: -1, sigmoid: 0.268941 }, correctText: '$\\sigma(-1)\\approx 0,269$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: 3, sigmoid: 0.952574 }, correctText: '$\\sigma(3)\\approx 0,953$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: -3, sigmoid: 0.047426 }, correctText: '$\\sigma(-3)\\approx 0,047$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
      { parameters: { z: 0.5, sigmoid: 0.622459 }, correctText: '$\\sigma(0,5)\\approx 0,622$; die Ausgabe liegt strikt zwischen 0 und 1 und nähert sich bei großem positivem $z$ der 1.' },
    ],
  },
  {
    caseId: 'sigmoid-threshold', key: 'core', entries: [
      { parameters: { z: -2, threshold: 0.5, sigmoid: 0.119203 }, correctText: '$\\sigma(-2)\\approx 0,119$; bei Schwelle 0,5 entsteht die Klassenentscheidung 0.' },
      { parameters: { z: -0.5, threshold: 0.5, sigmoid: 0.377541 }, correctText: '$\\sigma(-0,5)\\approx 0,378$; bei Schwelle 0,5 entsteht die Klassenentscheidung 0.' },
      { parameters: { z: 0.5, threshold: 0.5, sigmoid: 0.622459 }, correctText: '$\\sigma(0,5)\\approx 0,622$; bei Schwelle 0,5 entsteht die Klassenentscheidung 1.' },
      { parameters: { z: 1.5, threshold: 0.5, sigmoid: 0.817574 }, correctText: '$\\sigma(1,5)\\approx 0,818$; bei Schwelle 0,5 entsteht die Klassenentscheidung 1.' },
      { parameters: { z: -1, threshold: 0.5, sigmoid: 0.268941 }, correctText: '$\\sigma(-1)\\approx 0,269$; bei Schwelle 0,5 entsteht die Klassenentscheidung 0.' },
      { parameters: { z: 2, threshold: 0.5, sigmoid: 0.880797 }, correctText: '$\\sigma(2)\\approx 0,881$; bei Schwelle 0,5 entsteht die Klassenentscheidung 1.' },
      { parameters: { z: -3, threshold: 0.5, sigmoid: 0.047426 }, correctText: '$\\sigma(-3)\\approx 0,047$; bei Schwelle 0,5 entsteht die Klassenentscheidung 0.' },
      { parameters: { z: 0.25, threshold: 0.5, sigmoid: 0.562177 }, correctText: '$\\sigma(0,25)\\approx 0,562$; bei Schwelle 0,5 entsteht die Klassenentscheidung 1.' },
      { parameters: { z: 3, threshold: 0.5, sigmoid: 0.952574 }, correctText: '$\\sigma(3)\\approx 0,953$; bei Schwelle 0,5 entsteht die Klassenentscheidung 1.' },
    ],
  },
  {
    caseId: 'sigmoid-log-odds', key: 'stretch', entries: [
      { parameters: { odds: 2, logit: 0.693147 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,667, entsprechend Odds von 2:1.' },
      { parameters: { odds: 3, logit: 1.098612 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,75, entsprechend Odds von 3:1.' },
      { parameters: { odds: 4, logit: 1.386294 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,8, entsprechend Odds von 4:1.' },
      { parameters: { odds: 5, logit: 1.609438 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,833, entsprechend Odds von 5:1.' },
      { parameters: { odds: 0.5, logit: -0.693147 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,333, entsprechend Odds von 0,5:1.' },
      { parameters: { odds: 1.5, logit: 0.405465 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,6, entsprechend Odds von 1,5:1.' },
      { parameters: { odds: 6, logit: 1.791759 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,857, entsprechend Odds von 6:1.' },
      { parameters: { odds: 0.25, logit: -1.386294 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,2, entsprechend Odds von 0,25:1.' },
      { parameters: { odds: 8, logit: 2.079442 }, correctText: 'Die Wahrscheinlichkeit ist ungefähr 0,889, entsprechend Odds von 8:1.' },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'sigmoid-large-z', core: 'sigmoid-threshold', stretch: 'sigmoid-log-odds' };
const capsuleFor = (caseId) => SIGMOID_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle statischen Kennzahlen nachgerechnet, im Constraint, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(sigmoidCapsuleOk(entry.parameters, capsule), `${oracle.caseId}: Kapselform`);
      if (capsule.kind === 'log-odds') {
        assert.ok(Math.abs(entry.parameters.logit - Math.log(entry.parameters.odds)) <= 1e-6, `${oracle.caseId}: Logit`);
      } else {
        assert.ok(Math.abs(entry.parameters.sigmoid - sigmoidValue(entry.parameters.z)) <= 1e-6, `${oracle.caseId}: Sigmoid`);
      }
      assert.equal(sigmoidCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-sigmoid-regime.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
    assert.deepEqual(body.parameters, { formula: 'sigmoid(z) = 1 / (1 + exp(-z))' });
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('sigmoid-large-z'),
    '$\\sigma(0) = 0{,}5$ und es gilt $\\sigma(-z) = 1 - \\sigma(z)$ — die Funktion ist symmetrisch zum Punkt $(0\\,|\\,0{,}5)$.',
  );
  assert.equal(
    correctOf('sigmoid-threshold'),
    'Die Ausgabe ist 0,5; die Klassenentscheidung entsteht erst durch einen Schwellenwert.',
  );
  assert.equal(
    correctOf('sigmoid-log-odds'),
    'Die Wahrscheinlichkeit ist 0,75, entsprechend Odds von 3:1.',
  );
});

test('Kapseltabelle: Banken, Fallbindung, keine Null- oder Eins-Entartung', () => {
  assert.equal(SIGMOID_CAPSULES.intro.caseId, 'sigmoid-large-z');
  assert.equal(SIGMOID_CAPSULES.core.caseId, 'sigmoid-threshold');
  assert.equal(SIGMOID_CAPSULES.stretch.caseId, 'sigmoid-log-odds');
  assert.equal(SIGMOID_CAPSULES.intro.zBank.length, 20);
  assert.equal(SIGMOID_CAPSULES.core.zBank.length, 20);
  assert.equal(SIGMOID_CAPSULES.stretch.oddsBank.length, 14);
  for (const key of ['intro', 'core']) {
    assert.ok(!SIGMOID_CAPSULES[key].zBank.includes(0), `${key}: z=0 wäre keine Entscheidung`);
  }
  assert.ok(!SIGMOID_CAPSULES.stretch.oddsBank.includes(1), 'stretch: Odds 1 wären p=0,5 ohne Richtung');
});
