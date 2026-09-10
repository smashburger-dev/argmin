// Familie classify-benchmark-reading: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_benchmark_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genBenchmarkCapsule,
  BENCHMARK_CAPSULES,
  benchmarkCapsuleOk,
  benchmarkCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  BENCHMARK_READING_CONTRACT,
  generateBenchmarkReadingFamily,
  solveBenchmarkReadingFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit nachgerechneter Kennzahl und kuratiertem
// Schlüsseltext. Regel: Kapsel weiten, nie Orakel umschreiben — der Sampler
// muss diese Werte halten und die Schlüssel wörtlich treffen. Die drei
// Base-Fälle sind Konzept-Anker (BERT-GLUE, Accuracy-Basis,
// Mehrheits-Baseline) und bleiben als Befund unangetastet; generiert wird
// die Varianten-Bank. Fall 1 psim 0,43 divers, Fall 2/3 ab 0,95
// (zwei Zahlen-Templates plus eine Szenario-Bank).
const ORACLES = [
  {
    caseId: 'benchmark-absolute-gain', key: 'intro', entries: [
      { parameters: { before: 0.731, after: 0.808 }, correctText: 'Der Score stieg von 0,731 auf 0,808 — ein absoluter Zuwachs von 7,7 Prozentpunkten (relativ etwa 10,534 %).' },
      { parameters: { before: 0.62, after: 0.705 }, correctText: 'Der Score stieg von 0,62 auf 0,705 — ein absoluter Zuwachs von 8,5 Prozentpunkten (relativ etwa 13,71 %).' },
      { parameters: { before: 0.845, after: 0.901 }, correctText: 'Der Score stieg von 0,845 auf 0,901 — ein absoluter Zuwachs von 5,6 Prozentpunkten (relativ etwa 6,627 %).' },
      { parameters: { before: 0.55, after: 0.641 }, correctText: 'Der Score stieg von 0,55 auf 0,641 — ein absoluter Zuwachs von 9,1 Prozentpunkten (relativ etwa 16,545 %).' },
      { parameters: { before: 0.68, after: 0.752 }, correctText: 'Der Score stieg von 0,68 auf 0,752 — ein absoluter Zuwachs von 7,2 Prozentpunkten (relativ etwa 10,588 %).' },
      { parameters: { before: 0.79, after: 0.844 }, correctText: 'Der Score stieg von 0,79 auf 0,844 — ein absoluter Zuwachs von 5,4 Prozentpunkten (relativ etwa 6,835 %).' },
      { parameters: { before: 0.48, after: 0.573 }, correctText: 'Der Score stieg von 0,48 auf 0,573 — ein absoluter Zuwachs von 9,3 Prozentpunkten (relativ etwa 19,375 %).' },
      { parameters: { before: 0.905, after: 0.947 }, correctText: 'Der Score stieg von 0,905 auf 0,947 — ein absoluter Zuwachs von 4,2 Prozentpunkten (relativ etwa 4,641 %).' },
      { parameters: { before: 0.66, after: 0.738 }, correctText: 'Der Score stieg von 0,66 auf 0,738 — ein absoluter Zuwachs von 7,8 Prozentpunkten (relativ etwa 11,818 %).' },
    ],
  },
  {
    caseId: 'benchmark-absolute-relative', key: 'core', entries: [
      { parameters: { before: 0.62, after: 0.7 }, correctText: 'Es sind 8 Prozentpunkte absolut und ungefähr 12,903 Prozent relativ.' },
      { parameters: { before: 0.45, after: 0.54 }, correctText: 'Es sind 9 Prozentpunkte absolut und ungefähr 20 Prozent relativ.' },
      { parameters: { before: 0.7, after: 0.77 }, correctText: 'Es sind 7 Prozentpunkte absolut und ungefähr 10 Prozent relativ.' },
      { parameters: { before: 0.8, after: 0.86 }, correctText: 'Es sind 6 Prozentpunkte absolut und ungefähr 7,5 Prozent relativ.' },
      { parameters: { before: 0.35, after: 0.49 }, correctText: 'Es sind 14 Prozentpunkte absolut und ungefähr 40 Prozent relativ.' },
      { parameters: { before: 0.55, after: 0.66 }, correctText: 'Es sind 11 Prozentpunkte absolut und ungefähr 20 Prozent relativ.' },
      { parameters: { before: 0.64, after: 0.72 }, correctText: 'Es sind 8 Prozentpunkte absolut und ungefähr 12,5 Prozent relativ.' },
      { parameters: { before: 0.72, after: 0.81 }, correctText: 'Es sind 9 Prozentpunkte absolut und ungefähr 12,5 Prozent relativ.' },
      { parameters: { before: 0.25, after: 0.4 }, correctText: 'Es sind 15 Prozentpunkte absolut und ungefähr 60 Prozent relativ.' },
    ],
  },
  {
    caseId: 'benchmark-imbalanced-accuracy', key: 'stretch', entries: [
      { parameters: { negativeShare: 0.95, positiveShare: 0.05, accuracy: 0.95 }, correctText: 'Die Accuracy von 95 % entspricht hier der Mehrheits-Baseline (95 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.9, positiveShare: 0.1, accuracy: 0.9 }, correctText: 'Die Accuracy von 90 % entspricht hier der Mehrheits-Baseline (90 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.8, positiveShare: 0.2, accuracy: 0.8 }, correctText: 'Die Accuracy von 80 % entspricht hier der Mehrheits-Baseline (80 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.97, positiveShare: 0.03, accuracy: 0.97 }, correctText: 'Die Accuracy von 97 % entspricht hier der Mehrheits-Baseline (97 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.85, positiveShare: 0.15, accuracy: 0.85 }, correctText: 'Die Accuracy von 85 % entspricht hier der Mehrheits-Baseline (85 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.75, positiveShare: 0.25, accuracy: 0.75 }, correctText: 'Die Accuracy von 75 % entspricht hier der Mehrheits-Baseline (75 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.92, positiveShare: 0.08, accuracy: 0.92 }, correctText: 'Die Accuracy von 92 % entspricht hier der Mehrheits-Baseline (92 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.88, positiveShare: 0.12, accuracy: 0.88 }, correctText: 'Die Accuracy von 88 % entspricht hier der Mehrheits-Baseline (88 %) und sagt nichts über den positiven Recall aus.' },
      { parameters: { negativeShare: 0.7, positiveShare: 0.3, accuracy: 0.7 }, correctText: 'Die Accuracy von 70 % entspricht hier der Mehrheits-Baseline (70 %) und sagt nichts über den positiven Recall aus.' },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'benchmark-absolute-gain', core: 'benchmark-absolute-relative', stretch: 'benchmark-imbalanced-accuracy' };
const capsuleFor = (caseId) => BENCHMARK_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

test('Orakel-27: alle statischen Kennzahlen nachgerechnet, im Constraint, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(benchmarkCapsuleOk(entry.parameters, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(benchmarkCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-benchmark-reading.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  assert.deepEqual(byId.get('benchmark-absolute-gain').parameters, {});
  assert.deepEqual(byId.get('benchmark-absolute-relative').parameters, { before: 0.62, after: 0.7 });
  assert.deepEqual(byId.get('benchmark-imbalanced-accuracy').parameters, { negativeShare: 0.95, positiveShare: 0.05, accuracy: 0.95 });
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('benchmark-absolute-gain'),
    'GLUE stieg auf 80,5 % — ein absoluter Zuwachs von 7,7 Punkten (nicht 7,7 % relativ, was rechnerisch etwa 10,6 % wären).',
  );
  assert.equal(
    correctOf('benchmark-absolute-relative'),
    'Es sind 8 Prozentpunkte absolut und ungefähr 12,9 Prozent relativ.',
  );
  assert.equal(
    correctOf('benchmark-imbalanced-accuracy'),
    'Die Accuracy ist hier mit dem Mehrheits-Baselinewert vereinbar und sagt nichts über den positiven Recall.',
  );
});

test('Kapseltabelle: Arten, Banken, Fallbindung', () => {
  assert.equal(BENCHMARK_CAPSULES.intro.caseId, 'benchmark-absolute-gain');
  assert.equal(BENCHMARK_CAPSULES.core.caseId, 'benchmark-absolute-relative');
  assert.equal(BENCHMARK_CAPSULES.stretch.caseId, 'benchmark-imbalanced-accuracy');
  assert.equal(BENCHMARK_CAPSULES.intro.kind, 'absolute-gain');
  assert.equal(BENCHMARK_CAPSULES.core.kind, 'absolute-relative');
  assert.equal(BENCHMARK_CAPSULES.stretch.kind, 'imbalanced-accuracy');
  assert.equal(BENCHMARK_CAPSULES.stretch.shareBank.length, 18);
  for (const share of [0.95, 0.9, 0.8, 0.97, 0.85, 0.75, 0.92, 0.88, 0.7]) {
    assert.ok(BENCHMARK_CAPSULES.stretch.shareBank.includes(share), `Bank ohne Orakel-Anteil ${share}`);
  }
});

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = BENCHMARK_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genBenchmarkCapsule(seed, capsule);
      assert.ok(benchmarkCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, benchmarkCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateBenchmarkReadingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateBenchmarkReadingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveBenchmarkReadingFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Kapselform', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = BENCHMARK_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateBenchmarkReadingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!benchmarkCapsuleOk(generated.parameters, capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateBenchmarkReadingFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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
    const capsule = BENCHMARK_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genBenchmarkCapsule(seed, capsule);
      assert.deepEqual(first, genBenchmarkCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(benchmarkCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(BENCHMARK_READING_CONTRACT.familyId, 'classify-benchmark-reading');
  assert.equal(BENCHMARK_READING_CONTRACT.authorityMode, 'seeded');
  assert.equal(BENCHMARK_READING_CONTRACT.activityType, 'single-choice');
  assert.equal(BENCHMARK_READING_CONTRACT.masteryEligible, false);
  assert.deepEqual(BENCHMARK_READING_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(BENCHMARK_READING_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateBenchmarkReadingFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveBenchmarkReadingFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateBenchmarkReadingFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateBenchmarkReadingFamily({ seed: 0, caseId: 'benchmark-absolute-gain', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateBenchmarkReadingFamily({ seed: 0, caseId: 'benchmark-absolute-relative', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateBenchmarkReadingFamily({ seed: 0, caseId: 'benchmark-absolute-gain', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-benchmark-reading', 11, 'intro', 'benchmark-absolute-gain');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
