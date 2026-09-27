// Unit tests for the P4a "statement" infrastructure: distractors as
// statement objects in scenario banks (bound feedback + misconception) and
// statementPool draws for multiple-choice cases. Both fixtures live in
// tests/fixtures/ — no content/ changes in this phase.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeChoiceFamily } from '../assets/js/core/generator_draw_kit.mjs';
import { graders, assertFamilyActivityContracts } from '../assets/js/core/graders.js';
import {
  createFamilyRegistry,
  registerStaticCases,
  staticFamilySpec,
} from '../assets/js/domain/family_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixture = (name) => JSON.parse(readFileSync(join(root, 'tests/fixtures', name), 'utf8'));

// --- statement objects in scenario banks -------------------------------------

const bank = fixture('statement-bank.json');
const bankSpec = makeChoiceFamily({
  contract: bank.contract,
  capsules: bank.capsules,
  shapeError: bank.shapeError,
});
const bankRegistry = createFamilyRegistry([bankSpec]);

const drawsByScenario = (count = 64) => {
  const byKey = new Map();
  for (let seed = 0; seed < count; seed += 1) {
    const generated = bankSpec.generate({ seed, caseId: 'fixture-statements', difficulty: 'core' });
    const key = generated.parameters.scenario;
    if (!byKey.has(key)) byKey.set(key, generated);
  }
  return byKey;
};

const statementEntry = (key) => bank.capsules.core.bank.find((entry) => entry.key === key);
const textOf = (item) => (typeof item === 'string' ? item : item.text);

test('statement bank: drawn ids expose statement objects as plain option texts', () => {
  const generated = drawsByScenario().get('feedback-eintrag');
  const authored = statementEntry('feedback-eintrag').wrong.map(textOf);
  const wrongTexts = generated.choices.filter((choice) => !choice.correct).map((choice) => choice.text);
  assert.deepEqual(wrongTexts.sort(), [...authored].sort());
  assert.ok(generated.choices.every((choice) => typeof choice.text === 'string'));
});

test('statement bank: distractor feedback emits rules bound to the rotated ids', () => {
  const generated = drawsByScenario().get('feedback-eintrag');
  const wrong = statementEntry('feedback-eintrag').wrong;
  assert.equal(generated.feedbackRules.length, wrong.length);
  generated.feedbackRules.forEach((rule, index) => {
    const match = /^choice === '([^']+)'$/.exec(rule.if);
    assert.ok(match, `rule ${rule.if} ist keine choice-Regel`);
    const shown = generated.choices.find((choice) => choice.id === match[1]);
    assert.equal(shown.text, textOf(wrong[index]), 'Regel zeigt auf den falschen Optionstext');
    assert.equal(rule.then, wrong[index].feedback);
    assert.equal(shown.correct ? true : false, false, 'Distraktor-Regel darf nicht auf die korrekte Option zeigen');
  });
  assert.equal(generated.feedbackRules[0].misconception, 'robustheit-mittelwert');
  assert.equal(generated.feedbackRules[1].misconception, 'wertebereich-mittelwert');
  assert.equal('misconception' in generated.feedbackRules[2], false);
});

test('statement bank: entries without statement feedback emit no rules', () => {
  const drawn = drawsByScenario();
  for (const key of ['base', 'nur-text']) {
    assert.equal(drawn.get(key).feedbackRules, undefined, `${key} sollte keine Regeln emittieren`);
  }
  const mixed = drawn.get('szenario-vier');
  // Nur Distraktoren mit eigenem feedback emittieren eine Regel.
  assert.equal(mixed.feedbackRules.length, 1);
  assert.equal(mixed.feedbackRules[0].misconception, 'ausreisser-median');
});

test('statement bank: emitted rules reach the instance end-to-end', () => {
  let instance = null;
  for (let seed = 0; seed < 64 && !instance; seed += 1) {
    const candidate = bankRegistry.instantiate('fixture-statement-bank', seed, 'core', 'fixture-statements');
    if (candidate.parameters.scenario === 'feedback-eintrag') instance = candidate;
  }
  assert.ok(instance, 'kein Seed zieht feedback-eintrag');
  assert.equal(instance.feedbackRules.length, 3);
  const shown = instance.choices.find((choice) => choice.id === 'a');
  const rule = instance.feedbackRules.find((item) => item.if === `choice === '${shown.id}'`);
  assert.equal(rule.then, statementEntry('feedback-eintrag').wrong.find((wrong) => wrong.text === shown.text).feedback);
});

// --- statementPool for multiple-choice ----------------------------------------

const poolDoc = fixture('statement-pool-family.json');
registerStaticCases(poolDoc.familyId, poolDoc.cases);
const poolSpec = staticFamilySpec(poolDoc);
const poolRegistry = createFamilyRegistry([poolSpec]);
const poolBody = poolDoc.cases[0];
const pool = poolBody.statementPool;

const poolInstance = (seed) => poolRegistry.instantiate(poolDoc.familyId, seed, 'core', 'pool-demo');

test('statementPool: the family declares the case as property-testable', () => {
  assert.equal(poolSpec.caseTypes[0].propertyTest, true);
});

test('statementPool: seed 0 keeps the authored anchor instance', () => {
  const instance = poolInstance(0);
  assert.equal(instance.parameters.statements, undefined);
  assert.deepEqual(
    instance.choices.map((choice) => choice.text).sort(),
    poolBody.choices.map((choice) => choice.text).sort(),
  );
  assert.deepEqual(instance.expectedAnswer.correctIds, ['a', 'd']);
  assert.equal(instance.prompt, poolBody.prompt);
});

test('statementPool: drawn instances are deterministic and internally consistent', () => {
  const first = poolInstance(7);
  const second = poolInstance(7);
  assert.deepEqual(first.choices, second.choices);
  assert.deepEqual(first.expectedAnswer, second.expectedAnswer);
  assert.deepEqual(first.feedbackRules, second.feedbackRules);

  assert.equal(first.choices.length, pool.count);
  assert.equal(first.parameters.statements.length, pool.count);
  first.parameters.statements.forEach((poolIndex, position) => {
    assert.equal(first.choices[position].text, pool.statements[poolIndex].text);
  });
  const expectedCorrect = first.parameters.statements
    .map((poolIndex, position) => (pool.statements[poolIndex].correct ? first.choices[position].id : null))
    .filter(Boolean)
    .sort();
  assert.deepEqual(first.expectedAnswer.correctIds, expectedCorrect);
  assert.deepEqual(poolSpec.solve(first.parameters), { correctIds: expectedCorrect });
});

test('statementPool: rules bind each feedback text to its own statement', () => {
  const instance = poolInstance(11);
  for (const rule of instance.feedbackRules) {
    const match = /^(!?)selected\.includes\('([^']+)'\)$/.exec(rule.if);
    assert.ok(match, `unerwartete Regelform: ${rule.if}`);
    const shown = instance.choices.find((choice) => choice.id === match[2]);
    const statement = pool.statements.find((entry) => entry.text === shown.text);
    assert.equal(statement.feedback, rule.then);
    assert.equal(statement.correct, match[1] === '!', 'Regel polarisiert falsch');
    assert.equal(rule.misconception, statement.misconception);
  }
  assert.deepEqual(instance.hints, pool.hints);
  for (const line of instance.fullSolution.split('\n')) {
    assert.match(line, /^[a-e]\) (zutreffend|nicht zutreffend)\. /);
  }
});

test('statementPool: kTrue covers the whole correctRange over 200 seeds', () => {
  const counts = new Set();
  for (let seed = 1; seed <= 200; seed += 1) {
    counts.add(poolInstance(seed).expectedAnswer.correctIds.length);
  }
  const [minTrue, maxTrue] = pool.correctRange;
  assert.deepEqual([...counts].sort(), Array.from(
    { length: maxTrue - minTrue + 1 },
    (_, index) => minTrue + index,
  ));
});

test('statementPool: grader marks the correct set and diagnoses a wrong pick', async () => {
  const instance = poolInstance(5);
  const right = await graders.deterministic.grade(instance, instance.expectedAnswer.correctIds);
  assert.equal(right.correct, true);

  const wrongId = instance.choices.find((choice) => !instance.expectedAnswer.correctIds.includes(choice.id)).id;
  const wrongStatement = pool.statements.find((entry) => entry.text === instance.choices.find((choice) => choice.id === wrongId).text);
  const graded = await graders.deterministic.grade(instance, [wrongId]);
  assert.equal(graded.correct, false);
  assert.match(graded.diagnosis, new RegExp(wrongStatement.feedback.slice(0, 24)));
  if (wrongStatement.misconception) {
    assert.ok(graded.misconceptions.includes(wrongStatement.misconception));
  }
});

test('statementPool: contract validation accepts the fixture and rejects infeasible pools', () => {
  assert.doesNotThrow(() => assertFamilyActivityContracts(poolDoc));
  const broken = JSON.parse(JSON.stringify(poolDoc));
  broken.cases[0].statementPool.correctRange = [5, 5]; // needs 5 true, only 4 exist
  assert.throws(() => assertFamilyActivityContracts(broken), /correctRange/);
  const quiet = JSON.parse(JSON.stringify(poolDoc));
  quiet.cases[0].statementPool.statements[0].feedback = '';
  assert.throws(() => assertFamilyActivityContracts(quiet), /feedback/);
});
