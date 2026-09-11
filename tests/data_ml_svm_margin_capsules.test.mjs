// Familie classify-svm-margin: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_svm_margin_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SVM_MARGIN_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  SVM_MARGIN_CONTRACT,
  genSvmMarginCapsule,
  svmMarginCapsuleOk,
  svmMarginCorrectText,
  generateSvmMarginFamily,
  solveSvmMarginFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  SVM_MARGIN_CAPSULES,
  svmMarginCapsuleOk,
  svmMarginCorrectText,
  genSvmMarginCapsule,
  SVM_MARGIN_CONTRACT,
  generateSvmMarginFamily,
  solveSvmMarginFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-svm-margin'),
};

choiceCapsuleSuite('classify-svm-margin', mod, [
  { caseId: 'hard-margin-width', difficulty: 'intro' },
  { caseId: 'svm-soft-margin-slack', difficulty: 'core' },
  { caseId: 'svm-support-boundary', difficulty: 'stretch' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro', 'core', 'stretch'] });

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schlüsseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Belegungen halten und die
// Schlüssel wörtlich treffen. marginWidth/marginScore stehen in den Orakeln
// und werden von svmMarginCapsuleOk gegen w/b/point/label nachgerechnet
// (Toleranz 1e-6). Die drei Base-Fälle tragen parameters:{} als Konzept-Anker
// und bleiben als Befund unangetastet; generiert wird die Zahlenbank.
// Befund Dezimalschreibweise: intro/core rendern Kommas, stretch hält die
// englische Punkt-Schreibweise des Bestands wörtlich.
const ORACLES = [
  {
    caseId: 'hard-margin-width', key: 'intro', entries: [
      { parameters: { w: [3, 4], b: -2, marginWidth: 0.4 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,4$ für $w=(3,4)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [5, 12], b: -1, marginWidth: 0.153846 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,154$ für $w=(5,12)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [8, 15], b: 0, marginWidth: 0.117647 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,118$ für $w=(8,15)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [7, 24], b: 1, marginWidth: 0.08 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,08$ für $w=(7,24)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [9, 12], b: 2, marginWidth: 0.133333 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,133$ für $w=(9,12)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [12, 16], b: 3, marginWidth: 0.1 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,1$ für $w=(12,16)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [20, 21], b: 4, marginWidth: 0.068966 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,069$ für $w=(20,21)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [6, 8], b: 5, marginWidth: 0.2 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,2$ für $w=(6,8)$; ein kleines $||w||$ bedeutet einen großen Margin." },
      { parameters: { w: [15, 20], b: 6, marginWidth: 0.08 }, correctText: "Die Marginbreite beträgt $2/||w||\\approx 0,08$ für $w=(15,20)$; ein kleines $||w||$ bedeutet einen großen Margin." },
    ],
  },
  {
    caseId: 'svm-soft-margin-slack', key: 'core', entries: [
      { parameters: { C: 1, slack: 0.4 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,4$, die mit Kostenparameter $C=1$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 2, slack: 0.2 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,2$, die mit Kostenparameter $C=2$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 0.5, slack: 1.5 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=1,5$, die mit Kostenparameter $C=0,5$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 3, slack: 0.1 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,1$, die mit Kostenparameter $C=3$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 4, slack: 0.75 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,75$, die mit Kostenparameter $C=4$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 1.5, slack: 0.3 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,3$, die mit Kostenparameter $C=1,5$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 0.25, slack: 2 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=2$, die mit Kostenparameter $C=0,25$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 5, slack: 0.05 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,05$, die mit Kostenparameter $C=5$ in der Zielfunktion bestraft wird." },
      { parameters: { C: 2.5, slack: 0.6 }, correctText: "Sie erlaubt eine Margin-Verletzung von $\\xi=0,6$, die mit Kostenparameter $C=2,5$ in der Zielfunktion bestraft wird." },
    ],
  },
  {
    caseId: 'svm-support-boundary', key: 'stretch', entries: [
      { parameters: { w: [1, 2], b: -1, point: [1, 1], label: 1, marginScore: 2 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=2$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [2, -1], b: 0.5, point: [2, 1], label: 1, marginScore: 3.5 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=3.5$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [1, 1], b: 0, point: [1, -2], label: -1, marginScore: 1 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=1$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [3, 2], b: -2, point: [1, 0], label: 1, marginScore: 1 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=1$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [2, 3], b: 1, point: [-1, 1], label: 1, marginScore: 2 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=2$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [4, -1], b: 0, point: [1, 2], label: -1, marginScore: -2 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=-2$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [1, -3], b: 2, point: [2, 1], label: 1, marginScore: 1 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=1$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [2, 2], b: -1, point: [1, -1], label: -1, marginScore: 1 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=1$, daher bestimmt der Punkt die Lösung." },
      { parameters: { w: [5, 1], b: -2, point: [0, 2], label: 1, marginScore: 0 }, correctText: "Die Support-Vektoren liegen an der Margin oder verletzen sie; hier ist der Margin-Score $y(w^Tx+b)=0$, daher bestimmt der Punkt die Lösung." },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'hard-margin-width', core: 'svm-soft-margin-slack', stretch: 'svm-support-boundary' };
const capsuleFor = (caseId) => SVM_MARGIN_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle kuratierten Belegungen in der Bank, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(svmMarginCapsuleOk({ ...entry.parameters, caseId: oracle.caseId }, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(svmMarginCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-svm-margin.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
    assert.deepEqual(body.parameters, {}, `${oracle.caseId}: Anker-Params bleiben leer`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('hard-margin-width'),
    'Die Breite des Korridors um die Trenngerade, den kein Trainingspunkt durchquert; sie beträgt 2/||w|| — kleines ||w|| heißt großer Margin.',
  );
  assert.equal(
    correctOf('svm-soft-margin-slack'),
    'Sie erlaubt Margin-Verletzungen, die über eine Kostenstrafe kontrolliert werden.',
  );
  assert.equal(
    correctOf('svm-support-boundary'),
    'Sie liegen an der Margin oder verletzen sie und bestimmen damit die Lösung.',
  );
});

test('Kapseltabelle: Banken, Fallbindung, konsistente Tupel', () => {
  assert.equal(SVM_MARGIN_CAPSULES.intro.caseId, 'hard-margin-width');
  assert.equal(SVM_MARGIN_CAPSULES.core.caseId, 'svm-soft-margin-slack');
  assert.equal(SVM_MARGIN_CAPSULES.stretch.caseId, 'svm-support-boundary');
  for (const capsule of Object.values(SVM_MARGIN_CAPSULES)) {
    assert.equal(capsule.bank.length, 14, `${capsule.caseId}: 14 Belegungen`);
    assert.equal(
      new Set(capsule.bank.map((item) => JSON.stringify(item))).size,
      14,
      `${capsule.caseId}: Tupel eindeutig`,
    );
  }
  // Intro-Bank: nur pythagoreische w, damit die Lösung die Norm ganzzahlig nennt.
  for (const entry of SVM_MARGIN_CAPSULES.intro.bank) {
    assert.ok(Number.isInteger(Math.hypot(entry.w[0], entry.w[1])), `intro: ||w|| ganzzahlig für ${entry.w}`);
  }
});

test('Kennzahlen: marginWidth und marginScore rechnen die Belegung nach', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const intro = genSvmMarginCapsule(seed, SVM_MARGIN_CAPSULES.intro);
    const norm = Math.hypot(intro.parameters.w[0], intro.parameters.w[1]);
    assert.ok(Math.abs(intro.parameters.marginWidth - 2 / norm) < 1e-6, `intro:${seed}: marginWidth konsistent`);
    const stretch = genSvmMarginCapsule(seed, SVM_MARGIN_CAPSULES.stretch);
    const { w, b, point, label, marginScore } = stretch.parameters;
    assert.ok(
      Math.abs(marginScore - label * (w[0] * point[0] + w[1] * point[1] + b)) < 1e-6,
      `stretch:${seed}: marginScore konsistent`,
    );
  }
});
