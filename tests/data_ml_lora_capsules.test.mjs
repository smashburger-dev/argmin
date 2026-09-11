// Familie classify-lora-tradeoff: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/data_ml_lora_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  genLoraCapsule,
  LORA_CAPSULES,
  loraCapsuleOk,
  loraCorrectText,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  LORA_TRADEOFF_CONTRACT,
  generateLoraTradeoffFamily,
  solveLoraTradeoffFamily,
} from '../assets/js/core/data_ml_families.mjs';
import { standaloneNumberPresent } from '../assets/js/core/generator_draw_kit.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

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
const bareParameters = (parameters) => {
  const { caseId, difficulty, ...rest } = parameters;
  return rest;
};
const leaksKey = (generated, correct) => (
  generated.parameters.caseId === 'lora-alpha-rank'
    ? standaloneNumberPresent(generated.prompt, correct.text)
    : generated.prompt.includes(correct.text)
);

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

test('Kapsel-Constraints: Form, Choices, Schlüssel über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = LORA_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genLoraCapsule(seed, capsule);
      assert.ok(loraCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, loraCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
      assert.ok(generated.fullSolution.length > 20, `${key}:${seed}: Lösung`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateLoraTradeoffFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateLoraTradeoffFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveLoraTradeoffFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Constraint-Compliance 3x200: null Samples außerhalb der Kapselform', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = LORA_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateLoraTradeoffFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (!loraCapsuleOk(bareParameters(generated.parameters), capsule)) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Constraint-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateLoraTradeoffFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.ok(!leaksKey(generated, correct), `${key}:${seed}: Schlüssel im Prompt`);
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
    const capsule = LORA_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genLoraCapsule(seed, capsule);
      assert.deepEqual(first, genLoraCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(loraCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(LORA_TRADEOFF_CONTRACT.familyId, 'classify-lora-tradeoff');
  assert.equal(LORA_TRADEOFF_CONTRACT.authorityMode, 'seeded');
  assert.equal(LORA_TRADEOFF_CONTRACT.activityType, 'single-choice');
  assert.equal(LORA_TRADEOFF_CONTRACT.masteryEligible, false);
  assert.deepEqual(LORA_TRADEOFF_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(LORA_TRADEOFF_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateLoraTradeoffFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveLoraTradeoffFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateLoraTradeoffFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateLoraTradeoffFamily({ seed: 0, caseId: 'lora-tradeoff', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateLoraTradeoffFamily({ seed: 0, caseId: 'lora-parameter-count', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateLoraTradeoffFamily({ seed: 0, caseId: 'lora-tradeoff', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = EXERCISE_FAMILIES.instantiate('classify-lora-tradeoff', 11, 'intro', 'lora-tradeoff');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await EXERCISE_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await EXERCISE_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
