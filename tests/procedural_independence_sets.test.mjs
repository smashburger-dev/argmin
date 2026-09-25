// Procedural independent-sets cases of multiple-choice-linalg-independence:
// seeded five-option vector sets with stable ids a-e. Each instance draws a
// trap class per wrong option (collinear, combo a·v1+b·v2, >n rule, zero-vector
// set) and at least two genuinely independent sets; rank() is the authority.
// The authored members independence-statements and rank-nullity-combined stay
// static via staticVariantInstance. Run: node --test tests/procedural_independence_sets.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  generateMcIndependenceFamily,
  solveMcIndependence,
  MC_INDEPENDENCE_CONTRACT,
} from '../assets/js/core/foundations_linalg_families.mjs';
import { rank } from '../assets/js/core/linalg_generators.mjs';
import './helpers/register_static_cases.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/multiple-choice-linalg-independence.json'), 'utf8'));
const SEEDED = { 'independent-sets-r2': 'intro', 'independent-sets-r3': 'stretch' };
const STATIC_CASES = { 'independence-statements': 'core', 'rank-nullity-combined': 'challenge' };
const DIMS = { 'independent-sets-r2': 2, 'independent-sets-r3': 3 };
const TRAPS = ['collinear', 'combo', 'overn', 'zero'];
const gen = (seed, caseId, difficulty = SEEDED[caseId]) => generateMcIndependenceFamily({ seed, caseId, difficulty });
const fingerprint = (g) => JSON.stringify({ choices: g.choices, correct: g.expected.correctIds });

test('contract: JSON contract is null; JS contract carries authored fields verbatim', () => {
  assert.equal(doc.contract, null);
  assert.equal(MC_INDEPENDENCE_CONTRACT.familyId, 'multiple-choice-linalg-independence');
  assert.equal(MC_INDEPENDENCE_CONTRACT.activityType, 'multiple-choice');
  assert.equal(MC_INDEPENDENCE_CONTRACT.graderId, 'deterministic');
  assert.equal(MC_INDEPENDENCE_CONTRACT.masteryEligible, true);
  assert.deepEqual(MC_INDEPENDENCE_CONTRACT.competencyIds, ['c-linalg-independence']);
  assert.deepEqual(
    MC_INDEPENDENCE_CONTRACT.caseTypes.map((entry) => entry.caseId),
    ['independent-sets-r2', 'independence-statements', 'independent-sets-r3', 'rank-nullity-combined'],
  );
  assert.equal(MC_INDEPENDENCE_CONTRACT.caseTypes.find((e) => e.caseId === 'independence-statements').propertyTest, true);
});

test('profile pins: seeded cases serve only their authored profile, others throw', () => {
  for (const [caseId, pinned] of Object.entries(SEEDED)) {
    const g = gen(3, caseId);
    assert.equal(g.parameters.caseId, caseId);
    assert.equal(g.parameters.difficulty, pinned);
    for (const difficulty of ['intro', 'core', 'stretch', 'challenge'].filter((d) => d !== pinned)) {
      assert.throws(() => gen(3, caseId, difficulty), /Unbekanntes Profil/, `${caseId}@${difficulty}`);
    }
  }
  for (const [caseId, pinned] of Object.entries(STATIC_CASES)) {
    assert.throws(() => gen(3, caseId, 'intro'), /Unbekanntes Profil/, `${caseId}@intro`);
  }
});

test('contract constraints over 200 seeds: five unique choice texts, >=2 correct ids, all ids valid', () => {
  for (const caseId of Object.keys(SEEDED)) {
    for (let seed = 0; seed < 200; seed += 1) {
      const g = gen(seed, caseId);
      assert.equal(g.activityType, 'multiple-choice', `${caseId}:${seed}`);
      assert.equal(g.graderId, 'deterministic', `${caseId}:${seed}`);
      assert.equal(g.masteryEligible, true, `${caseId}:${seed}`);
      assert.equal(g.expected.kind, 'choice-indices', `${caseId}:${seed}`);
      assert.equal(g.expected.scoring, 'per-correct', `${caseId}:${seed}`);
      assert.equal(g.choices.length, 5, `${caseId}:${seed}`);
      assert.deepEqual(g.choices.map((c) => c.id), ['a', 'b', 'c', 'd', 'e'], `${caseId}:${seed}: stabile ids`);
      const texts = g.choices.map((c) => c.text);
      assert.equal(new Set(texts).size, 5, `${caseId}:${seed}: eindeutige Optionstexte`);
      const ids = new Set(g.choices.map((c) => c.id));
      const correct = g.expected.correctIds;
      assert.ok(new Set(correct).size >= 2, `${caseId}:${seed}: mindestens zwei korrekte ids`);
      assert.ok(correct.every((id) => ids.has(id)), `${caseId}:${seed}: korrekte ids existieren`);
    }
  }
});

test('solver recomputes independence via rank() for every drawn set', () => {
  for (const caseId of Object.keys(SEEDED)) {
    for (let seed = 0; seed < 200; seed += 1) {
      const g = gen(seed, caseId);
      const byRank = g.parameters.sets.filter((set) => rank(set.vectors) === set.vectors.length).map((set) => set.id);
      assert.deepEqual(byRank.sort(), [...g.expected.correctIds].sort(), `${caseId}:${seed}: rank-Parität`);
      assert.deepEqual(solveMcIndependence(g.parameters).correctIds, g.expected.correctIds, `${caseId}:${seed}: Solver`);
    }
  }
});

test('trap coverage over 200 seeds: every wrong-option class appears; traps are distinct per instance', () => {
  for (const caseId of Object.keys(SEEDED)) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      const g = gen(seed, caseId);
      const wrongKinds = g.parameters.sets.filter((set) => !g.expected.correctIds.includes(set.id)).map((set) => set.kind);
      assert.equal(new Set(wrongKinds).size, wrongKinds.length, `${caseId}:${seed}: Traps ohne Duplikat`);
      wrongKinds.forEach((kind) => seen.add(kind));
      const correctKinds = g.parameters.sets.filter((set) => g.expected.correctIds.includes(set.id)).map((set) => set.kind);
      assert.ok(correctKinds.every((kind) => kind === 'independent' || kind === 'independent-short'), `${caseId}:${seed}: korrekte Art`);
    }
    for (const kind of TRAPS) assert.ok(seen.has(kind), `${caseId}: Trap-Klasse ${kind} fehlt`);
    if (caseId === 'independent-sets-r3') {
      // Kurze unabhängige Sets kommen nur im R3-Draw zusätzlich vor.
      let short = 0;
      for (let seed = 0; seed < 200; seed += 1) {
        short += gen(seed, caseId).parameters.sets.filter((set) => set.kind === 'independent-short').length;
      }
      assert.ok(short > 0, 'independent-short nie gezogen');
    }
  }
});

test('distinct floor: at least 40 distinct option sets over 200 seeds', () => {
  for (const caseId of Object.keys(SEEDED)) {
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) seen.add(fingerprint(gen(seed, caseId)));
    assert.ok(seen.size >= 40, `${caseId}: nur ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces the identical instance, negative seeds valid', () => {
  for (const caseId of Object.keys(SEEDED)) {
    for (let seed = -10; seed < 10; seed += 1) {
      assert.deepEqual(gen(seed, caseId), gen(seed, caseId), `${caseId}:${seed}`);
    }
  }
});

test('feedback emission: supported selected.includes grammar, honest per-draw ids and witness text', () => {
  const RULE = /^!?selected\.includes\('[a-e]'\)$/;
  for (const caseId of Object.keys(SEEDED)) {
    for (let seed = 0; seed < 120; seed += 1) {
      const g = gen(seed, caseId);
      assert.equal(g.feedbackRules.length, 5, `${caseId}:${seed}: eine Regel je Option`);
      for (const rule of g.feedbackRules) {
        assert.match(rule.if, RULE, `${caseId}:${seed}: Grammatik ${rule.if}`);
        const id = /'([a-e])'/.exec(rule.if)[1];
        const correct = g.expected.correctIds.includes(id);
        assert.equal(rule.if.startsWith('!'), correct, `${caseId}:${seed}: Negation korrekt für ${id}`);
        assert.ok(rule.then.length > 30, `${caseId}:${seed}: then-Text`);
      }
      assert.ok(g.hints.length >= 1, `${caseId}:${seed}: hint fallback not needed`);
      assert.ok(g.typicalErrors.length >= 1, `${caseId}:${seed}: typicalErrors`);
      assert.ok(g.fullSolution.includes('(a)') && g.fullSolution.includes('(e)'), `${caseId}:${seed}: fullSolution deckt Optionen ab`);
      // Konkrete Witness-Texte für die gezogenen Traps:
      const comboSlots = g.parameters.sets.filter((set) => set.kind === 'combo');
      for (const slot of comboSlots) {
        const rule = g.feedbackRules.find((entry) => entry.if === `selected.includes('${slot.id}')`);
        assert.match(rule.then, /= -?(\d+\\,)?\(/, `${caseId}:${seed}: Combo-Witness nennt die Relation`);
      }
      const factorSlots = g.parameters.sets.filter((set) => set.kind === 'collinear');
      for (const slot of factorSlots) {
        const rule = g.feedbackRules.find((entry) => entry.if === `selected.includes('${slot.id}')`);
        assert.match(rule.then, /kollinear/, `${caseId}:${seed}: Kollinear-Witness`);
      }
    }
  }
});

test('registry end-to-end: instantiate, grade exact set equality and per-correct scoring', async () => {
  for (const [caseId, profile] of Object.entries(SEEDED)) {
    const instance = EXERCISE_FAMILIES.instantiate('multiple-choice-linalg-independence', 7, profile, caseId);
    assert.equal(instance.masteryEligible, true, `${caseId}: Mastery`);
    const right = await EXERCISE_FAMILIES.grade(instance, instance.expectedAnswer.correctIds);
    assert.equal(right.correct, true, `${caseId}: exakte Menge richtig`);
    assert.equal(right.score, 1, `${caseId}: volle Punktzahl`);
    const wrongId = instance.choices.find((choice) => !instance.expectedAnswer.correctIds.includes(choice.id)).id;
    const mutant = await EXERCISE_FAMILIES.grade(instance, [...instance.expectedAnswer.correctIds.slice(0, -1), wrongId]);
    assert.equal(mutant.correct, false, `${caseId}: Mutante falsch`);
    const partial = await EXERCISE_FAMILIES.grade(instance, instance.expectedAnswer.correctIds.slice(0, 1));
    assert.equal(partial.correct, false, `${caseId}: Teilmenge falsch`);
    assert.ok(partial.score > 0 && partial.score < 1, `${caseId}: per-correct-Teilpunkt`);
    const empty = await EXERCISE_FAMILIES.grade(instance, []);
    assert.equal(empty.errorType, 'invalid-input', `${caseId}: leere Auswahl invalid`);
  }
});

test('authored static members keep serving (seed-shuffled authored options, authored correctIds)', () => {
  for (const [caseId, profile] of Object.entries(STATIC_CASES)) {
    const authored = doc.cases.find((entry) => entry.caseId === caseId);
    for (let seed = 0; seed < 4; seed += 1) {
      const g = generateMcIndependenceFamily({ seed, caseId, difficulty: profile });
      // parameters.variant = Index in [body, ...variants]; 0 = Basisfall.
      const authoredBody = g.parameters.variant ? authored.variants[g.parameters.variant - 1] : authored;
      assert.deepEqual(
        [...g.choices].map((choice) => choice.text).sort(),
        [...authoredBody.choices].map((choice) => choice.text).sort(),
        `${caseId}:${seed}: authored Optionstexte (Shuffle ist Id-gebunden)`,
      );
      assert.deepEqual(g.expected.correctIds, authoredBody.expected.correctIds, `${caseId}:${seed}: authored correctIds`);
      assert.deepEqual(solveMcIndependence(g.parameters).correctIds, g.expected.correctIds, `${caseId}:${seed}: statischer Solver`);
    }
  }
  // Varianten der statements-Familie bleiben über den Seed erreichbar.
  const seen = new Set();
  for (let seed = 0; seed < 4; seed += 1) {
    seen.add(generateMcIndependenceFamily({ seed, caseId: 'independence-statements', difficulty: 'core' }).parameters.variant);
  }
  assert.deepEqual([...seen].sort(), [0, 1], 'Variantenauflösung läuft nicht mehr über staticVariantInstance');
  assert.throws(() => generateMcIndependenceFamily({ seed: 0, caseId: 'independence-statements', difficulty: 'intro' }), /Unbekanntes Profil/);
});

test('unknown dispatch paths still throw', () => {
  assert.throws(() => generateMcIndependenceFamily({ seed: 0, caseId: 'nope', difficulty: 'intro' }), /Unbekannter Fall/);
  assert.throws(() => solveMcIndependence({ caseId: 'nope' }), /Unbekannter Fall/);
});
