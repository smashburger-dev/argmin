// Procedural case shards of aggregate-confusion-metric: capsule gates for the
// six seeded cases (single-choice + predict-output + four python-code). The
// authored bodies in the JSON stay the oracle — starter/tests/referenceSolver
// must reach generated instances byte-identically, with only the seeded
// oracle block appended. Run: node --test tests/procedural_confusion_metric_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './helpers/register_static_cases.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import {
  generateAggregateConfusionMetricFamily as generate,
  solveAggregateConfusionMetric as solve,
} from '../assets/js/core/data_ml_families.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/aggregate-confusion-metric.json'), 'utf8'));
const body = (caseId) => doc.cases.find((entry) => entry.caseId === caseId);

const PY_CASES = ['sigmoid-predict-numpy', 'confusion-cost-report', 'confusion-from-rows', 'fairness-metric-compare'];
const PROFILE = {
  'threshold-under-asymmetric-cost': 'core',
  'sigmoid-predict-numpy': 'core',
  'metric-code-output-trace': 'core',
  'confusion-cost-report': 'stretch',
  'confusion-from-rows': 'stretch',
  'fairness-metric-compare': 'core',
};

// Independent JS mirror of the snippet's token_f1 (lowercase whitespace split,
// multiset overlap, round-half-even to 2 decimals like Python's round).
const roundHalfEven = (value, digits) => {
  const scaled = value * 10 ** digits;
  const floor = Math.floor(scaled);
  const frac = scaled - floor;
  const rounded = frac > 0.5 ? floor + 1 : frac < 0.5 ? floor : (floor % 2 === 0 ? floor : floor + 1);
  return rounded / 10 ** digits;
};
const pyFloat = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));
const tokenF1 = (answer, gold) => {
  const a = answer.toLowerCase().split(/\s+/).filter(Boolean);
  const g = gold.toLowerCase().split(/\s+/).filter(Boolean);
  const multiset = (list) => list.reduce((m, t) => m.set(t, (m.get(t) ?? 0) + 1), new Map());
  const ca = multiset(a);
  const cg = multiset(g);
  let common = 0;
  for (const [t, n] of ca) common += Math.min(n, cg.get(t) ?? 0);
  if (common === 0) return '0.0';
  const p = common / a.length;
  const r = common / g.length;
  return pyFloat(roundHalfEven((2 * p * r) / (p + r), 2));
};

test('anchor: contract null, authored bodies preserved for all seven cases', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 7);
  for (const caseId of PY_CASES.concat('contains-injection-rules')) {
    const b = body(caseId);
    assert.equal(b.expected.kind, 'reference-solver', `${caseId}: reference kind`);
    assert.ok(b.parameters.starterCode.length > 40, `${caseId}: starter preserved`);
    assert.ok(b.parameters.tests.length > 200, `${caseId}: base tests preserved`);
    assert.ok(b.expected.referenceSolver.length > 50, `${caseId}: solver preserved`);
  }
  assert.equal(body('threshold-under-asymmetric-cost').activityType, 'single-choice');
  assert.equal(body('metric-code-output-trace').expected.output.includes('\n'), true, 'trace: real newline anchor');
});

test('threshold choice: exactly one correct, solver parity, asymmetric ratio', () => {
  const positions = new Map();
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = generate({ seed, caseId: 'threshold-under-asymmetric-cost', difficulty: 'core' });
    const { choices } = generated;
    assert.equal(choices.length, 4);
    assert.equal(new Set(choices.map((c) => c.text)).size, 4, `${seed}: distinct options`);
    const correct = choices.filter((c) => c.correct);
    assert.equal(correct.length, 1, `${seed}: one correct`);
    assert.equal(solve(generated.parameters).correctText, correct[0].text, `${seed}: solver parity`);
    const { fpCost, fnCost, ratio } = generated.parameters;
    assert.ok(fpCost / fnCost >= 200, `${seed}: authored asymmetry ${fpCost}/${fnCost}`);
    assert.equal(ratio, Math.round(fpCost / fnCost));
    assert.ok(generated.prompt.includes(String(fpCost).replace('.', ',')), `${seed}: fp cost in prompt`);
    assert.ok(correct[0].text.includes('anheben'), `${seed}: correct arm names raise`);
    assert.ok(correct[0].text.includes(`${ratio}-mal`), `${seed}: ratio slot in correct text`);
    positions.set(correct[0].id, (positions.get(correct[0].id) ?? 0) + 1);
    seen.add(JSON.stringify(generated.parameters));
  }
  for (const id of 'abcd') assert.ok((positions.get(id) ?? 0) > 20, `position ${id}: ${positions.get(id)}`);
  assert.ok(seen.size >= 40, `only ${seen.size} distinct draws`);
});

test('metric-code-output-trace: output-lines mirror independent token_f1', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = generate({ seed, caseId: 'metric-code-output-trace', difficulty: 'core' });
    const { a1, g1, a2, g2, snippet } = generated.parameters;
    assert.ok(snippet.includes(`token_f1("${a1}", "${g1}")`), `${seed}: pair 1 baked in`);
    assert.ok(snippet.includes(`token_f1("${a2}", "${g2}")`), `${seed}: pair 2 baked in`);
    const expected = `${tokenF1(a1, g1)}\n${tokenF1(a2, g2)}`;
    assert.equal(generated.expected.kind, 'output-lines', `${seed}: kind`);
    assert.equal(generated.expected.output, expected, `${seed}: mirror`);
    assert.ok(!generated.expected.output.includes('\\n'), `${seed}: real newline`);
    assert.deepEqual(solve(generated.parameters), { output: expected }, `${seed}: solver`);
    assert.ok(!generated.prompt.includes(expected), `${seed}: no leak`);
    seen.add(`${a1}|${g1}|${a2}|${g2}`);
  }
  assert.ok(seen.size >= 40, `only ${seen.size} distinct draws`);
});

for (const caseId of PY_CASES) {
  test(`${caseId}: authored python block verbatim + seeded __ref oracle`, () => {
    const b = body(caseId);
    const seen = new Set();
    for (let seed = 0; seed < 80; seed += 1) {
      const generated = generate({ seed, caseId, difficulty: PROFILE[caseId] });
      const p = generated.parameters;
      assert.ok(p.tests.startsWith(b.parameters.tests), `${caseId}:${seed}: base tests verbatim prefix`);
      assert.ok(p.tests.includes('# seeded extra cases'), `${caseId}:${seed}: seeded marker`);
      assert.ok(p.tests.includes('def __ref_'), `${caseId}:${seed}: oracle copies`);
      assert.equal(p.starterCode, b.parameters.starterCode, `${caseId}:${seed}: starter pinned`);
      assert.deepEqual(generated.expected, { kind: 'reference-solver', referenceSolver: b.expected.referenceSolver }, `${caseId}:${seed}: expected`);
      assert.deepEqual(solve(p), { referenceCode: b.expected.referenceSolver }, `${caseId}:${seed}: solver`);
      assert.equal(generated.activityType, 'python-code');
      assert.equal(generated.graderId, 'pyodide');
      seen.add(JSON.stringify({ ...p, tests: p.tests.slice(p.tests.indexOf('# seeded extra cases')) }));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct draws`);
  });
}

test('registry: per-instance activityType/graderId and authored fallback material', () => {
  const table = {
    'threshold-under-asymmetric-cost': ['single-choice', 'deterministic'],
    'metric-code-output-trace': ['predict-output', 'deterministic'],
    'sigmoid-predict-numpy': ['python-code', 'pyodide'],
    'confusion-cost-report': ['python-code', 'pyodide'],
    'confusion-from-rows': ['python-code', 'pyodide'],
    'fairness-metric-compare': ['python-code', 'pyodide'],
    'contains-injection-rules': ['python-code', 'pyodide'],
  };
  for (const [caseId, [activity, grader]] of Object.entries(table)) {
    const difficulty = PROFILE[caseId] ?? 'core';
    const inst = EXERCISE_FAMILIES.instantiate('aggregate-confusion-metric', 11, difficulty, caseId);
    assert.equal(inst.activityType, activity, `${caseId}: activityType`);
    assert.equal(inst.graderId, grader, `${caseId}: graderId`);
    assert.equal(inst.familyId, 'aggregate-confusion-metric');
    const b = body(caseId);
    if (b.hints?.length) assert.deepEqual(inst.hints, b.hints, `${caseId}: authored hints reach instance`);
  }
});

test('profiles fail closed and determinism holds', () => {
  for (const caseId of ['confusion-cost-report', 'confusion-from-rows']) {
    for (const difficulty of ['core', 'intro']) {
      assert.throws(
        () => EXERCISE_FAMILIES.instantiate('aggregate-confusion-metric', 3, difficulty, caseId),
        /Unbekanntes Profil/, `${caseId}@${difficulty}`,
      );
    }
  }
  assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: 'core' }), /unbekannter Fall/);
  assert.throws(() => generate({ seed: 0.5, caseId: 'metric-code-output-trace', difficulty: 'core' }), /Seed/);
  for (const caseId of Object.keys(PROFILE)) {
    const a = generate({ seed: -17, caseId, difficulty: PROFILE[caseId] });
    const b = generate({ seed: -17, caseId, difficulty: PROFILE[caseId] });
    assert.deepEqual(a, b, `${caseId}: negative seed deterministic`);
  }
});
