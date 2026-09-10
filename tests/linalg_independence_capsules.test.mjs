// Familie classify-independence-multiple: Kapsel-Gates (single-choice-adaptiert).
// Run: node --test tests/linalg_independence_capsules.test.mjs
// Anker-Korrektur (bewusst, gegen Strip-Prinzip): Base-Params der Fälle
// independent-pair-negative und dependent-triple-span an den Prompt angeglichen;
// Bestand war ein Copy-Paste-Fehler.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genIndependenceCapsule,
  INDEPENDENCE_CAPSULES,
  independenceShapeOk,
  independenceCorrectText,
  dependenceFactor,
  pairIndependent,
  maxAbsVectors,
} from '../assets/js/core/linalg_generators.mjs';
import {
  INDEPENDENCE_CONTRACT,
  generateIndependenceFamily,
  solveIndependenceFamily,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { LINALG_FAMILIES } from '../assets/js/domain/foundations_linalg_registry.mjs';

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

test('Kapsel-Constraints: Form, Bound, Choices über je 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = INDEPENDENCE_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genIndependenceCapsule(seed, capsule);
      assert.ok(independenceShapeOk(generated.parameters.vectors, capsule), `${key}:${seed}: Kapselform`);
      assert.ok(maxAbsVectors(generated.parameters.vectors) <= capsule.bound, `${key}:${seed}: Bound`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key zeigt auf korrekte Wahl`);
      assert.equal(correct[0].text, independenceCorrectText(generated.parameters.vectors, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20, `${key}:${seed}: Prompt`);
    }
  }
});

test('Distinct-Boden 3x200: je Kapsel mindestens 40 distincte Instanzen', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateIndependenceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Key-Agreement 3x200: Solve-Schlüssel gegen Generator ohne Abweichung', () => {
  for (const key of CAPSULE_KEYS) {
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateIndependenceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const solved = solveIndependenceFamily(generated.parameters);
      const correct = generated.choices.find((choice) => choice.correct);
      assert.equal(solved.correctText, correct.text, `${key}:${seed}: Schlüsseltext`);
      assert.equal(generated.expected.correctChoice, correct.id, `${key}:${seed}: Key-Id`);
    }
  }
});

test('Bound-Compliance 3x200: null Samples über dem Kapsel-Bound', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = INDEPENDENCE_CAPSULES[key];
    let violations = 0;
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateIndependenceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      if (maxAbsVectors(generated.parameters.vectors) > capsule.bound) violations += 1;
    }
    assert.equal(violations, 0, `${key}: Bound-Verletzungen`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten nichts zurück', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateIndependenceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.ok(!generated.prompt.includes(correct.text), `${key}:${seed}: Schlüssel im Prompt`);
      counts[generated.expected.correctChoice] += 1;
      const bucket = seed % 8;
      if (!byModulo.has(bucket)) byModulo.set(bucket, new Set());
      byModulo.get(bucket).add(generated.prompt);
    }
    for (const [id, count] of Object.entries(counts)) {
      assert.ok(count >= 40 && count <= 60, `${key}: Position ${id} nur ${count}x`);
    }
    for (const [bucket, prompts] of byModulo) {
      assert.ok(prompts.size >= 10, `${key}: Modulo-Klasse ${bucket} hält nur ${prompts.size} distinct`);
    }
  }
});

test('negative Seeds: gültig und deterministisch', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = INDEPENDENCE_CAPSULES[key];
    for (let seed = -50; seed < 0; seed += 1) {
      const first = genIndependenceCapsule(seed, capsule);
      assert.deepEqual(first, genIndependenceCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(independenceShapeOk(first.parameters.vectors, capsule), `${key}:${seed}: Kapselform`);
      assert.ok(maxAbsVectors(first.parameters.vectors) <= capsule.bound, `${key}:${seed}: Bound`);
    }
  }
});

test('Familien-Block: Dispatch, Contract, Solve', () => {
  assert.equal(INDEPENDENCE_CONTRACT.familyId, 'classify-independence-multiple');
  assert.equal(INDEPENDENCE_CONTRACT.authorityMode, 'seeded');
  assert.equal(INDEPENDENCE_CONTRACT.activityType, 'single-choice');
  assert.deepEqual(INDEPENDENCE_CONTRACT.difficultyProfiles, ['intro', 'core', 'stretch']);
  assert.deepEqual(INDEPENDENCE_CONTRACT.caseTypes.map((item) => item.caseId).sort(), Object.values(CASE_FOR).sort());
  for (const key of CAPSULE_KEYS) {
    const generated = generateIndependenceFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(solveIndependenceFamily(generated.parameters), { correctText: correct.text });
    assert.ok(generated.prompt.length > 20);
    assert.deepEqual(generateIndependenceFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), generated);
  }
  assert.throws(() => generateIndependenceFamily({ seed: 0, caseId: 'dependent-pair-double', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateIndependenceFamily({ seed: 0, caseId: 'independent-pair-negative', difficulty: 'intro' }), /Unbekannt/);
  assert.throws(() => generateIndependenceFamily({ seed: 0, caseId: 'dependent-pair-double', difficulty: 'challenge' }), /Unbekannt/);
});

test('Familien-Block: Registry löst, gradet und bleibt deterministisch', async () => {
  const instance = LINALG_FAMILIES.instantiate('classify-independence-multiple', 11, 'intro', 'dependent-pair-double');
  const correct = instance.choices.find((choice) => choice.correct);
  assert.equal(instance.expectedAnswer.correctChoice, correct.id);
  const right = await LINALG_FAMILIES.grade(instance, correct.id);
  assert.equal(right.correct, true);
  const wrong = instance.choices.find((choice) => !choice.correct);
  const graded = await LINALG_FAMILIES.grade(instance, wrong.id);
  assert.equal(graded.correct, false);
});
