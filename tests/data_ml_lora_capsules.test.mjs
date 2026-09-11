// Familie classify-lora-tradeoff: Kapsel-Gates (single-choice-adaptiert).
// Geteilte Gates laufen über choiceCapsuleSuite; dieses File hält die Orakel,
// die Anker-Pins und die familienspezifischen Bank-Invarianten.
// Run: node --test tests/data_ml_lora_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  LORA_CAPSULES,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  LORA_TRADEOFF_CONTRACT,
  genLoraCapsule,
  loraCapsuleOk,
  loraCorrectText,
  generateLoraTradeoffFamily,
  solveLoraTradeoffFamily,
  DATA_ML_FAMILY_SPECS,
} from '../assets/js/core/data_ml_families.mjs';
import { standaloneNumberPresent } from '../assets/js/core/generator_draw_kit.mjs';
import { choiceCapsuleSuite } from './procedural_capsule_suites.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Gezielte Imports statt Modul-Spread: die Suite pickt ihre Oberfläche per
// Namens-Regex, deshalb bleibt mod absichtlich flach und eindeutig.
const mod = {
  LORA_CAPSULES,
  loraCapsuleOk,
  loraCorrectText,
  genLoraCapsule,
  LORA_TRADEOFF_CONTRACT,
  generateLoraTradeoffFamily,
  solveLoraTradeoffFamily,
  FAMILY_SPEC: DATA_ML_FAMILY_SPECS.find((spec) => spec.familyId === 'classify-lora-tradeoff'),
};

choiceCapsuleSuite('classify-lora-tradeoff', mod, [
  { caseId: 'lora-tradeoff', difficulty: 'intro' },
  { caseId: 'lora-parameter-count', difficulty: 'core' },
  { caseId: 'lora-alpha-rank', difficulty: 'stretch' },
], {
  familyGroup: 'classify-concept',
  difficultyProfiles: ['intro', 'core', 'stretch'],
  // alpha-rank trägt nackte Zahlen als Schlüsseltext — die Ziffer darf als
  // Substring in $\alpha=24$ vorkommen, aber nie als eigenständige Zahl.
  leakCheck: (prompt, text, generated) => generated.parameters.caseId === 'lora-alpha-rank'
    ? standaloneNumberPresent(prompt, text)
    : prompt.includes(text),
});

// --- 27 statische Orakel aus dem Content-Stand vor dem Strip -----------------
// Je Fall 9 Varianten mit kuratiertem Schluesseltext. Regel: Kapsel weiten,
// nie Orakel umschreiben — der Sampler muss diese Werte halten und die
// Schluessel woertlich treffen. Die drei Base-Faelle sind Konzept-Anker und
// bleiben als Befund unangetastet; generiert wird je ein Template pro Fall.
// Fall 1 psim 0,26 (Begriffs-Template Kernidee), Fall 2/3 ab 0,95 (zwei
// Rechen-Templates Parameterzahl und Skalierung).
const ORACLES = [
  {
    caseId: 'lora-tradeoff', key: 'intro', entries: [
      { parameters: { rank: 4, alpha: 8 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{8}{4}BA$ mit kleinem Rang $r=4$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 8, alpha: 16 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{16}{8}BA$ mit kleinem Rang $r=8$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 2, alpha: 4 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{4}{2}BA$ mit kleinem Rang $r=2$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 16, alpha: 32 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{32}{16}BA$ mit kleinem Rang $r=16$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 6, alpha: 12 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{12}{6}BA$ mit kleinem Rang $r=6$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 3, alpha: 24 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{24}{3}BA$ mit kleinem Rang $r=3$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 10, alpha: 20 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{20}{10}BA$ mit kleinem Rang $r=10$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 5, alpha: 15 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{15}{5}BA$ mit kleinem Rang $r=5$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
      { parameters: { rank: 12, alpha: 6 }, correctText: 'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{6}{12}BA$ mit kleinem Rang $r=12$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.' },
    ],
  },
  {
    caseId: 'lora-parameter-count', key: 'core', entries: [
      { parameters: { dIn: 256, dOut: 512, rank: 4 }, correctText: '3.072, weil $r(d_{in}+d_{out})=4(256+512)$ gilt.' },
      { parameters: { dIn: 512, dOut: 1024, rank: 8 }, correctText: '12.288, weil $r(d_{in}+d_{out})=8(512+1024)$ gilt.' },
      { parameters: { dIn: 768, dOut: 1024, rank: 6 }, correctText: '10.752, weil $r(d_{in}+d_{out})=6(768+1024)$ gilt.' },
      { parameters: { dIn: 1024, dOut: 2048, rank: 8 }, correctText: '24.576, weil $r(d_{in}+d_{out})=8(1024+2048)$ gilt.' },
      { parameters: { dIn: 2048, dOut: 1024, rank: 16 }, correctText: '49.152, weil $r(d_{in}+d_{out})=16(2048+1024)$ gilt.' },
      { parameters: { dIn: 384, dOut: 768, rank: 3 }, correctText: '3.456, weil $r(d_{in}+d_{out})=3(384+768)$ gilt.' },
      { parameters: { dIn: 128, dOut: 256, rank: 5 }, correctText: '1.920, weil $r(d_{in}+d_{out})=5(128+256)$ gilt.' },
      { parameters: { dIn: 1536, dOut: 768, rank: 12 }, correctText: '27.648, weil $r(d_{in}+d_{out})=12(1536+768)$ gilt.' },
      { parameters: { dIn: 640, dOut: 1280, rank: 10 }, correctText: '19.200, weil $r(d_{in}+d_{out})=10(640+1280)$ gilt.' },
    ],
  },
  {
    caseId: 'lora-alpha-rank', key: 'stretch', entries: [
      { parameters: { alpha: 16, rank: 4 }, correctText: '4' },
      { parameters: { alpha: 12, rank: 3 }, correctText: '4' },
      { parameters: { alpha: 24, rank: 6 }, correctText: '4' },
      { parameters: { alpha: 8, rank: 2 }, correctText: '4' },
      { parameters: { alpha: 20, rank: 5 }, correctText: '4' },
      { parameters: { alpha: 18, rank: 3 }, correctText: '6' },
      { parameters: { alpha: 30, rank: 10 }, correctText: '3' },
      { parameters: { alpha: 14, rank: 7 }, correctText: '2' },
      { parameters: { alpha: 9, rank: 3 }, correctText: '3' },
    ],
  },
];

const CAPSULE_KEYS = ['intro', 'core', 'stretch'];
const CASE_FOR = { intro: 'lora-tradeoff', core: 'lora-parameter-count', stretch: 'lora-alpha-rank' };
const capsuleFor = (caseId) => LORA_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];
test('Orakel-27: alle statischen Kennzahlen im Constraint, Schlüssel wörtlich', () => {
  let count = 0;
  for (const oracle of ORACLES) {
    const capsule = capsuleFor(oracle.caseId);
    assert.equal(oracle.entries.length, 9, `${oracle.caseId}: 9 Varianten`);
    for (const entry of oracle.entries) {
      assert.ok(loraCapsuleOk(entry.parameters, capsule), `${oracle.caseId}: Kapselform`);
      assert.equal(loraCorrectText(entry.parameters, capsule), entry.correctText, `${oracle.caseId}: Schlüsseltext`);
      count += 1;
    }
  }
  assert.equal(count, 27);
});

test('Anker: Contract null, Varianten gestrippt, Konzept-Texte wörtlich', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-lora-tradeoff.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  const byId = new Map(doc.cases.map((item) => [item.caseId, item]));
  assert.deepEqual(byId.get('lora-tradeoff').parameters, {});
  assert.deepEqual(byId.get('lora-parameter-count').parameters, { dIn: 1024, dOut: 2048, rank: 8 });
  assert.deepEqual(byId.get('lora-alpha-rank').parameters, { alpha: 16, rank: 4 });
  for (const oracle of ORACLES) {
    const body = byId.get(oracle.caseId);
    assert.ok(body, `${oracle.caseId}: Anker fehlt`);
    assert.ok(!('variants' in body), `${oracle.caseId}: Varianten nicht gestrippt`);
  }
  const correctOf = (caseId) => byId.get(caseId).choices.find((choice) => choice.correct).text;
  assert.equal(
    correctOf('lora-tradeoff'),
    'Die Basisgewichte $W$ bleiben eingefroren; trainiert wird nur $\\Delta W = \\frac{\\alpha}{r}BA$ mit kleinem Rang $r$ — beim Einsatz lässt sich $\\Delta W$ direkt in $W$ einrechnen.',
  );
  assert.equal(correctOf('lora-parameter-count'), '24.576, weil $r(d_{in}+d_{out})=8(1024+2048)$ gilt.');
  assert.equal(correctOf('lora-alpha-rank'), '4');
});

test('Kapseltabelle: Arten, Bereiche, Fallbindung', () => {
  assert.equal(LORA_CAPSULES.intro.caseId, 'lora-tradeoff');
  assert.equal(LORA_CAPSULES.core.caseId, 'lora-parameter-count');
  assert.equal(LORA_CAPSULES.stretch.caseId, 'lora-alpha-rank');
  assert.equal(LORA_CAPSULES.intro.kind, 'tradeoff');
  assert.equal(LORA_CAPSULES.core.kind, 'param-count');
  assert.equal(LORA_CAPSULES.stretch.kind, 'alpha-rank');
  for (const oracle of ORACLES) {
    assert.ok(loraCapsuleOk(oracle.entries[0].parameters, capsuleFor(oracle.caseId)), `${oracle.caseId}: Orakel im Bereich`);
  }
});
