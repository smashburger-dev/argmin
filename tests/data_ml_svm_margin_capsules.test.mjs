// Familie classify-svm-margin: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_svm_margin_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genSvmMarginCapsule,
  SVM_MARGIN_CAPSULES,
  svmMarginCapsuleOk,
  svmMarginCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  SVM_MARGIN_CONTRACT,
  generateSvmMarginFamily,
  solveSvmMarginFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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

test('Kapsel-Constraints: Form, Kennzahlen, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = SVM_MARGIN_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genSvmMarginCapsule(seed, capsule);
      assert.ok(svmMarginCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      if (key === 'intro') {
        const norm = Math.hypot(generated.parameters.w[0], generated.parameters.w[1]);
        assert.ok(Math.abs(generated.parameters.marginWidth - 2 / norm) < 1e-6, `${key}:${seed}: marginWidth konsistent`);
      }
      if (key === 'stretch') {
        const { w, b, point, label, marginScore } = generated.parameters;
        assert.ok(Math.abs(marginScore - label * (w[0] * point[0] + w[1] * point[1] + b)) < 1e-6, `${key}:${seed}: marginScore konsistent`);
      }
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, svmMarginCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateSvmMarginFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateSvmMarginFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveSvmMarginFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Zahlenbank', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = SVM_MARGIN_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateSvmMarginFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!svmMarginCapsuleOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateSvmMarginFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.ok(!generated.prompt.includes(correct.text), `${key}:${seed}: Schlüssel im Prompt`);
      counts[generated.expected.correctChoice] += 1;
      const bucket = seed % 8;
      if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
      byModulo.get(bucket).add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    for (const [id, count] of Object.entries(counts)) {
      assert.ok(count >= 40 && count <= 60, `${key}: Position ${id} nur ${count}x`);
    }
    for (const [bucket, instances] of byModulo) {
      assert.ok(instances.size >= 10, `${key}: Modulo-Klasse ${bucket} hält nur ${instances.size} distinct`);
    }
  }
});

test('negative Seeds: gültig und deterministisch', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = SVM_MARGIN_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genSvmMarginCapsule(seed, capsule);
      assert.deepEqual(first, genSvmMarginCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(svmMarginCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(SVM_MARGIN_CONTRACT.familyId, 'classify-svm-margin');
  assert.equal(SVM_MARGIN_CONTRACT.authorityMode, 'seeded');
  assert.equal(SVM_MARGIN_CONTRACT.activityType, 'single-choice');
  assert.equal(SVM_MARGIN_CONTRACT.masteryEligible, false);
  assert.deepEqual(SVM_MARGIN_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(SVM_MARGIN_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateSvmMarginFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveSvmMarginFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateSvmMarginFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateSvmMarginFamily({ seed: 0, caseId: 'hard-margin-width', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateSvmMarginFamily({ seed: 0, caseId: 'svm-soft-margin-slack', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateSvmMarginFamily({ seed: 0, caseId: 'hard-margin-width', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-svm-margin', 11, 'intro', 'hard-margin-width');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
