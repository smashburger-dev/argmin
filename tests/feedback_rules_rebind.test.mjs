// Authored feedbackRules describe the anchor instance. On seeded instances
// the registry rebinds `choice === 'x'` rules through the option text (bank
// rows rotate ids) and gates `value ===` literals to anchor-identical
// parameters — stale literals must never fire with a foreign draw's numbers.
// Run: node --test tests/feedback_rules_rebind.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './helpers/register_static_cases.mjs';
import {
  EXERCISE_FAMILIES,
  configureExerciseFamilies,
  familyHint,
} from '../assets/js/domain/exercise_registry.mjs';
import { staticCaseBody } from '../assets/js/domain/family_registry.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = (familyId) => JSON.parse(readFileSync(join(root, 'content/families', `${familyId}.json`), 'utf8'));
// Static-contract families (multiple-choice) join the registry only through
// configureExerciseFamilies with their authored doc.
configureExerciseFamilies([doc('multiple-choice-linalg-independence')]);

const CHOICE_RULE = /^choice (===|!==) '([^']+)'$/;
const choiceRules = (rules) => (rules || []).filter((rule) => CHOICE_RULE.test(rule.if));

const textsEqual = (a, b) => a.length === b.length && b.every((entry) => a.includes(entry.text ?? entry));

test('choice rules rebind to the rotated id of the same option text', () => {
  const authoredBody = staticCaseBody('classify-attention-roles', 'attention-role-values');
  const authoredTexts = authoredBody.choices.map((choice) => choice.text);
  let reboundSeen = 0;
  let droppedSeen = 0;
  for (let seed = 0; seed < 120; seed += 1) {
    const instance = EXERCISE_FAMILIES.instantiate('classify-attention-roles', seed, 'intro', 'attention-role-values');
    const drawnTexts = (instance.choices || []).map((choice) => choice.text);
    const rules = choiceRules(instance.feedbackRules);
    const onAnchorSet = textsEqual(drawnTexts, authoredTexts.map((text) => ({ text })))
      && authoredTexts.every((text) => drawnTexts.includes(text));
    for (const rule of rules) {
      const match = CHOICE_RULE.exec(rule.if);
      const drawn = instance.choices.find((choice) => choice.id === match[2]);
      assert.ok(drawn, `Regel zeigt auf fehlende Option ${match[2]} (seed ${seed})`);
      // Rebinding is honest only while it names authored option text — a rule
      // may never latch onto a foreign scenario's wording.
      assert.ok(
        authoredTexts.includes(drawn.text) || !match[2],
        `Rebound-Regel bindet Fremdtext (seed ${seed})`,
      );
    }
    if (onAnchorSet && rules.length) reboundSeen += 1;
    if (!onAnchorSet) {
      assert.equal(rules.length, 0, `Fremdes Szenario behält choice-Regeln (seed ${seed})`);
      droppedSeen += 1;
    }
  }
  assert.ok(reboundSeen > 0, 'Base-Row-Regeln müssen mindestens einmal rebindet werden');
  assert.ok(droppedSeen > 0, 'Fremde Szenarien müssen auftreten (Regeln gedroppt)');
});

test('stale value === literals never leak into seeded numeric instances', () => {
  for (let seed = 0; seed < 40; seed += 1) {
    const instance = EXERCISE_FAMILIES.instantiate(
      'formula-count-from-construction', seed, 'intro', 'linear-param-count',
    );
    const stale = (instance.feedbackRules || []).filter((rule) => /^value === /.test(rule.if));
    assert.equal(stale.length, 0, `Anker-Literale auf gezogener Instanz (seed ${seed})`);
  }
});

test('static numeric anchors keep their authored value === rules', () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'formula-stat-from-table', 0, 'core', 'stage-timeout-count',
  );
  const rules = (instance.feedbackRules || []).filter((rule) => /^value === /.test(rule.if));
  assert.ok(rules.length > 0, 'statischer Anker verliert seine value-Regeln');
});

test('generic rule forms pass through untouched', () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'trace-training-loop-count', 3, 'core', 'training-loop-count',
  );
  assert.ok(
    (instance.feedbackRules || []).some((rule) => rule.if === 'element-count-mismatch'),
    'generische Regel fehlt auf generierter Instanz',
  );
});

test('multiple-choice hint never eliminates a member of the correct set', () => {
  const instance = EXERCISE_FAMILIES.instantiate(
    'multiple-choice-linalg-independence', 5, 'intro', 'independent-sets-r2',
  );
  const correctIds = new Set(instance.expectedAnswer.correctIds);
  const hint = familyHint(
    { activityType: 'multiple-choice', choices: instance.choices, expectedAnswer: instance.expectedAnswer },
    { level: 2 },
  );
  const eliminated = instance.choices.find((choice) => hint && hint.includes(choice.text));
  if (eliminated) assert.ok(!correctIds.has(eliminated.id), 'Hint eliminiert korrekte Option');
  // Without correctIds the fallback must not guess — generic hint instead.
  const neutral = familyHint(
    { activityType: 'multiple-choice', choices: instance.choices, expectedAnswer: {} },
    { level: 2 },
  );
  assert.ok(neutral && !instance.choices.some((choice) => neutral.includes(choice.text)));
});
