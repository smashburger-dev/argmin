// Procedural case journal-entry-order (construct-error-journal-order): the
// family moved from authored contract (authorityMode 'static', four authored
// initialOrders) onto the construct path — the seed now draws the start order
// honestly over the 7-element pool. Run: node --test tests/procedural_journal_entry_order.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ERROR_JOURNAL_ORDER_CONTRACT,
  generateErrorJournalOrderFamily,
  solveErrorJournalOrder,
} from '../assets/js/core/foundations_construct_families.mjs';
import { FOUNDATIONS_CONSTRUCT_FAMILIES } from '../assets/js/domain/foundations_construct_registry.mjs';
import './helpers/register_static_cases.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/construct-error-journal-order.json'), 'utf8'));
const CASE_ID = 'journal-entry-order';
const body = doc.cases.find((entry) => entry.caseId === CASE_ID);
const FRAGMENT_IDS = body.parameters.fragments.map((fragment) => fragment.id);
const POOL = [...body.expected.solutionOrder, ...body.expected.distractors];

// The four authored start orders before the variants were removed: the base
// body keeps its own, the three removed variants live here as reachability
// pins so authored parity stays testable inside the new draw space.
const AUTHORED_ORDERS = [
  ['p-hypothese', 'd-label', 'p-symptom', 'p-test', 'p-repro', 'd-abkuerzung', 'p-abruf'],
  ['p-test', 'p-symptom', 'd-abkuerzung', 'p-abruf', 'p-hypothese', 'd-label', 'p-repro'],
  ['d-abkuerzung', 'p-repro', 'p-abruf', 'p-symptom', 'd-label', 'p-test', 'p-hypothese'],
  ['p-abruf', 'd-label', 'p-repro', 'p-test', 'd-abkuerzung', 'p-symptom', 'p-hypothese'],
];

const gen = (seed, difficulty = 'core') => generateErrorJournalOrderFamily({ seed, caseId: CASE_ID, difficulty });
const isPermutation = (order) => (
  order.length === FRAGMENT_IDS.length && new Set(order).size === FRAGMENT_IDS.length
  && order.every((id) => FRAGMENT_IDS.includes(id))
);

test('anchor: authored case body kept, contract and variants gone', () => {
  assert.equal(doc.contract, null);
  assert.deepEqual(doc.cases.map((entry) => entry.caseId), [CASE_ID]);
  assert.equal(body.variants, undefined, 'variants entfernt');
  assert.equal(body.difficultyProfile, 'core');
  assert.equal(body.masteryEligible, true);
  assert.equal(body.activityType, 'parsons');
  assert.equal(body.graderId, 'deterministic');
  assert.equal(FRAGMENT_IDS.length, 7, 'sieben Fragmente');
  assert.equal(body.expected.solutionOrder.length, 5, 'fünf Lösungszeilen');
  assert.deepEqual(body.expected.distractors, ['d-label', 'd-abkuerzung'], 'zwei authored Distraktoren');
  assert.ok(Array.isArray(body.hints) && body.hints.length >= 2, 'authored hints erhalten');
  assert.deepEqual(body.feedbackRules?.map((rule) => rule.if), ['order-length-mismatch'], 'authored feedback rule erhalten');
});

test('contract: seeded parsons family keeps the non-choice mastery fix', () => {
  assert.equal(ERROR_JOURNAL_ORDER_CONTRACT.familyId, 'construct-error-journal-order');
  assert.equal(ERROR_JOURNAL_ORDER_CONTRACT.authorityMode, 'seeded');
  assert.equal(ERROR_JOURNAL_ORDER_CONTRACT.masteryEligible, true);
  assert.equal(ERROR_JOURNAL_ORDER_CONTRACT.activityType, 'parsons');
  assert.equal(ERROR_JOURNAL_ORDER_CONTRACT.graderId, 'deterministic');
  assert.deepEqual(ERROR_JOURNAL_ORDER_CONTRACT.competencyIds, ['c-meta-learning']);
  assert.deepEqual(ERROR_JOURNAL_ORDER_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(ERROR_JOURNAL_ORDER_CONTRACT.caseTypes.map((entry) => entry.caseId), [CASE_ID]);
  // practice-space placement (lm-foundations-learning) requires a
  // propertyTest-eligible case — the flag must not be pinned false.
  assert.notEqual(ERROR_JOURNAL_ORDER_CONTRACT.caseTypes[0].propertyTest, false, 'propertyTest bleibt offen');
});

test('integer guard and closed profiles fail closed', () => {
  for (const bad of [0.5, Number.NaN, 'x', undefined, Infinity]) {
    assert.throws(() => gen(bad), /ganze Zahl/, `seed ${String(bad)}`);
  }
  for (const difficulty of ['intro', 'stretch', 'challenge', '__unknown__']) {
    assert.throws(() => gen(0, difficulty), /Unbekanntes Profil/, `Profil ${difficulty}`);
  }
  assert.throws(() => generateErrorJournalOrderFamily({ seed: 0, caseId: 'no-such-case', difficulty: 'core' }), /Unbekannter Fall/);
});

test('determinism: same seed reproduces identical instance, negative seeds valid', () => {
  for (let seed = -10; seed < 20; seed += 1) {
    assert.deepEqual(gen(seed), gen(seed), `seed ${seed}`);
  }
});

test('drawn initialOrder is an honest permutation of all seven fragments', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const g = gen(seed);
    const { initialOrder, fragments } = g.parameters;
    assert.ok(isPermutation(initialOrder), `seed ${seed}: Permutation aller sieben IDs`);
    assert.ok(!initialOrder.every((id, index) => id === POOL[index]), `seed ${seed}: nicht die Poolreihenfolge`);
    assert.deepEqual(fragments.map((fragment) => fragment.id).sort(), [...FRAGMENT_IDS].sort(), `seed ${seed}: authored Fragmente`);
    assert.deepEqual(g.expected, { kind: 'ordered-lines', solutionOrder: body.expected.solutionOrder, distractors: body.expected.distractors }, `seed ${seed}: expected authored`);
    assert.equal(g.prompt, body.prompt, `seed ${seed}: prompt authored`);
    assert.equal(g.fullSolution, body.fullSolution, `seed ${seed}: fullSolution authored`);
  }
});

test('solver returns the authored solutionOrder', () => {
  for (let seed = 0; seed < 32; seed += 1) {
    const g = gen(seed);
    assert.deepEqual(solveErrorJournalOrder(g.parameters).solutionOrder, body.expected.solutionOrder, `seed ${seed}`);
  }
});

test('authored parity: all four authored orders stay reachable in the draw space', () => {
  const poolSet = (order) => isPermutation(order) && !order.every((id, index) => id === POOL[index]);
  const wanted = new Map(AUTHORED_ORDERS.map((order) => [order.join(','), order]));
  for (const order of wanted.values()) {
    assert.ok(poolSet(order), `authored Ordnung ist gültiges Draw-Raum-Element: ${order.join(',')}`);
  }
  const hits = new Map();
  for (let seed = 0; seed < 15000 && hits.size < wanted.size; seed += 1) {
    const key = gen(seed).parameters.initialOrder.join(',');
    if (wanted.has(key) && !hits.has(key)) hits.set(key, seed);
  }
  for (const [key] of wanted) {
    assert.ok(hits.has(key), `authored Ordnung nicht im Draw-Raum getroffen: ${key}`);
  }
});

test('seed variance: many distinct start orders over seeds', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) seen.add(gen(seed).parameters.initialOrder.join(','));
  assert.ok(seen.size >= 40, `nur ${seen.size} distinct orders`);
});

test('registry instantiate: mastery, authored hints and feedback reach the instance', () => {
  const instance = FOUNDATIONS_CONSTRUCT_FAMILIES.instantiate('construct-error-journal-order', 0, 'core', CASE_ID);
  assert.equal(instance.masteryEligible, true);
  assert.equal(instance.activityType, 'parsons');
  assert.equal(instance.graderId, 'deterministic');
  assert.deepEqual(instance.competencyIds, ['c-meta-learning']);
  assert.deepEqual(instance.hints, body.hints);
  assert.deepEqual(instance.feedbackRules, body.feedbackRules);
  assert.deepEqual(instance.expectedAnswer.solutionOrder, body.expected.solutionOrder);
  assert.ok(isPermutation(instance.parameters.initialOrder));
  assert.throws(
    () => FOUNDATIONS_CONSTRUCT_FAMILIES.instantiate('construct-error-journal-order', 0, 'stretch', CASE_ID),
    /Unbekanntes Profil/,
  );
});
