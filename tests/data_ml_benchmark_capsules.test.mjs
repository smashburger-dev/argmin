// Familie classify-benchmark-reading: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_benchmark_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BENCHMARK_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  BENCHMARK_READING_CONTRACT,
  genBenchmarkCapsule,
  benchmarkCapsuleOk,
  benchmarkCorrectText,
  generateBenchmarkReadingFamily,
  solveBenchmarkReadingFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  BENCHMARK_CAPSULES,
  benchmarkCapsuleOk,
  benchmarkCorrectText,
  genBenchmarkCapsule,
  BENCHMARK_READING_CONTRACT,
  generateBenchmarkReadingFamily,
  solveBenchmarkReadingFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-benchmark-reading'),
};

choiceCapsuleSuite('classify-benchmark-reading', mod, [
  { caseId: 'benchmark-absolute-gain', difficulty: 'intro' },
  { caseId: 'benchmark-absolute-relative', difficulty: 'core' },
  { caseId: 'benchmark-imbalanced-accuracy', difficulty: 'stretch' },
], { familyGroup: 'classify-concept', difficultyProfiles: ['intro', 'core', 'stretch'] });

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
