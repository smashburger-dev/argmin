// Procedural family classify-attack-surface: capsule gates (single-choice).
// Run: node --test tests/procedural_attack_surface_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ATTACK_SURFACE_CAPSULES,
  ATTACK_SURFACE_CONTRACT,
  FAMILY_SPEC,
  attackSurfaceCapsuleOk,
  attackSurfaceCorrectText,
  genAttackSurfaceCapsule,
  generateAttackSurfaceFamily,
  solveAttackSurfaceFamily,
} from '../assets/js/core/procedural/classify-attack-surface.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FAMILY_ID = 'classify-attack-surface';
const CASE_FOR = { intro: 'attack-surface-taxonomy' };
const CAPSULE_KEYS = Object.keys(CASE_FOR);
const capsuleFor = (caseId) => ATTACK_SURFACE_CAPSULES[CAPSULE_KEYS.find((key) => CASE_FOR[key] === caseId)];

const doc = JSON.parse(readFileSync(join(root, 'content/families/classify-attack-surface.json'), 'utf8'));

test('Orakel: Base-Eintrag reproduziert den JSON-Fall wörtlich', () => {
  for (const caseId of Object.values(CASE_FOR)) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    const base = capsuleFor(caseId).bank.find((item) => item.key === 'base');
    assert.ok(base, `${caseId}: Base-Orakel fehlt`);
    assert.equal(base.prompt, body.prompt, `${caseId}: Prompt`);
    assert.equal(base.correct, body.choices.find((choice) => choice.correct).text, `${caseId}: Schlüsseltext`);
    assert.deepEqual(base.wrong, body.choices.filter((choice) => !choice.correct).map((choice) => choice.text), `${caseId}: Distraktoren`);
    assert.equal(base.solution, body.fullSolution, `${caseId}: Lösung`);
  }
});

test('Anker: Contract null, Fälle unverändert als Befund erhalten', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, CAPSULE_KEYS.length);
  for (const caseId of Object.values(CASE_FOR)) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: Anker fehlt`);
    assert.equal(body.choices.filter((choice) => choice.correct).length, 1, `${caseId}: genau eine korrekte Wahl`);
    assert.ok(body.prompt.length > 20 && body.fullSolution.length > 20, `${caseId}: Texte erhalten`);
  }
});

test('Kapseltabelle: Bankgröße 12–16, eindeutige Keys, vier verschiedene Optionen', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ATTACK_SURFACE_CAPSULES[key];
    assert.equal(capsule.caseId, CASE_FOR[key]);
    assert.ok(capsule.bank.length >= 12 && capsule.bank.length <= 16, `${key}: Bank ${capsule.bank.length}`);
    assert.equal(new Set(capsule.bank.map((item) => item.key)).size, capsule.bank.length, `${key}: Keys eindeutig`);
    for (const entry of capsule.bank) {
      assert.equal(entry.wrong.length, 3, `${key}:${entry.key}: drei Distraktoren`);
      assert.equal(new Set([entry.correct, ...entry.wrong]).size, 4, `${key}:${entry.key}: Optionen eindeutig`);
      assert.ok(entry.prompt.length > 20 && entry.solution.length > 20, `${key}:${entry.key}: Texte`);
    }
  }
});

test('Kapselform: 200 Seeds je Kapsel bestehen Shape, Choices und Schlüssel', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ATTACK_SURFACE_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genAttackSurfaceCapsule(seed, capsule);
      assert.ok(attackSurfaceCapsuleOk(generated.parameters, capsule), `${key}:${seed}: Kapselform`);
      assert.ok(capsule.bank.some((item) => item.key === generated.parameters.scenario), `${key}:${seed}: Szenario in Bank`);
      assert.equal(generated.choices.length, 4, `${key}:${seed}: vier Wahlen`);
      assert.equal(new Set(generated.choices.map((choice) => choice.text)).size, 4, `${key}:${seed}: eindeutige Texte`);
      const correct = generated.choices.filter((choice) => choice.correct);
      assert.equal(correct.length, 1, `${key}:${seed}: genau eine korrekte Wahl`);
      assert.equal(generated.expected.correctChoice, correct[0].id, `${key}:${seed}: Key-Id`);
      assert.equal(correct[0].text, attackSurfaceCorrectText(generated.parameters, capsule), `${key}:${seed}: Schlüsseltext`);
      assert.ok(generated.prompt.length > 20 && generated.fullSolution.length > 20, `${key}:${seed}: Texte`);
    }
  }
});

test('Distinct-Boden: je Kapsel mindestens 40 distincte Instanzen über 200 Seeds', () => {
  for (const key of CAPSULE_KEYS) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateAttackSurfaceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      seen.add(JSON.stringify([generated.prompt, generated.parameters, generated.expected]));
    }
    assert.ok(seen.size >= 40, `${key}: nur ${seen.size} distinct`);
  }
});

test('Determinismus: gleiche Seeds reproduzieren identisch, negative Seeds gültig', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ATTACK_SURFACE_CAPSULES[key];
    for (let seed = -30; seed < 30; seed += 1) {
      const first = genAttackSurfaceCapsule(seed, capsule);
      assert.deepEqual(first, genAttackSurfaceCapsule(seed, capsule), `${key}:${seed}: deterministisch`);
      assert.ok(attackSurfaceCapsuleOk(first.parameters, capsule), `${key}:${seed}: Kapselform`);
    }
    const viaFamily = generateAttackSurfaceFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    assert.deepEqual(viaFamily, generateAttackSurfaceFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key }), `${key}: Family deterministisch`);
  }
});

test('Leak/Rotation: Prompt nennt den Schlüssel nie, Positionen rotieren, Modulo-Klassen halten Varianz', () => {
  for (const key of CAPSULE_KEYS) {
    const counts = { a: 0, b: 0, c: 0, d: 0 };
    const byModulo = new Map();
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateAttackSurfaceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
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

test('Solver: unabhängiger Schlüsseltext, Fehler bei kaputten Parametern', () => {
  for (const key of CAPSULE_KEYS) {
    const capsule = ATTACK_SURFACE_CAPSULES[key];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = generateAttackSurfaceFamily({ seed, caseId: CASE_FOR[key], difficulty: key });
      const correct = generated.choices.find((choice) => choice.correct);
      assert.deepEqual(solveAttackSurfaceFamily(generated.parameters), { correctText: correct.text }, `${key}:${seed}`);
    }
    const base = capsule.bank.find((item) => item.key === 'base');
    assert.deepEqual(
      solveAttackSurfaceFamily({ caseId: CASE_FOR[key], scenario: 'base' }),
      { correctText: base.correct },
      `${key}: Solver ohne expected/difficulty`,
    );
  }
  assert.throws(() => solveAttackSurfaceFamily({ caseId: 'nope' }), /Unbekannter Fall/);
  assert.throws(() => solveAttackSurfaceFamily({ caseId: CASE_FOR.intro, scenario: 'nope' }), /Kapselform/);
  assert.throws(() => solveAttackSurfaceFamily({}), /Unbekannter Fall/);
});

test('Familien-Block: Contract 1:1 zum JSON-Stand, Dispatch, Fehlerpfade', () => {
  assert.equal(ATTACK_SURFACE_CONTRACT.familyId, FAMILY_ID);
  assert.equal(ATTACK_SURFACE_CONTRACT.authorityMode, 'seeded');
  assert.equal(ATTACK_SURFACE_CONTRACT.activityType, 'single-choice');
  assert.equal(ATTACK_SURFACE_CONTRACT.graderId, 'deterministic');
  assert.equal(ATTACK_SURFACE_CONTRACT.taskArchetype, 'choice-diagnose');
  assert.equal(ATTACK_SURFACE_CONTRACT.masteryEligible, false);
  assert.deepEqual(ATTACK_SURFACE_CONTRACT.difficultyProfiles, CAPSULE_KEYS);
  assert.deepEqual(ATTACK_SURFACE_CONTRACT.competencyIds, ['c-genai-security']);
  assert.deepEqual(
    ATTACK_SURFACE_CONTRACT.caseTypes,
    Object.values(CASE_FOR).map((caseId) => ({ caseId, propertyTest: false })),
  );
  for (const key of CAPSULE_KEYS) {
    const generated = generateAttackSurfaceFamily({ seed: 11, caseId: CASE_FOR[key], difficulty: key });
    const correct = generated.choices.find((choice) => choice.correct);
    assert.equal(generated.expected.correctChoice, correct.id);
    assert.deepEqual(generated.parameters.caseId, CASE_FOR[key]);
    assert.equal(generated.parameters.difficulty, key);
  }
  assert.throws(() => generateAttackSurfaceFamily({ seed: 0, caseId: 'attack-surface-taxonomy', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateAttackSurfaceFamily({ seed: 0, caseId: 'nope', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => generateAttackSurfaceFamily({ seed: 0.5, caseId: 'attack-surface-taxonomy', difficulty: 'intro' }), /Seed muss eine ganze Zahl sein/);
  assert.equal(typeof FAMILY_SPEC.generate, 'function');
  assert.equal(typeof FAMILY_SPEC.solve, 'function');
});
