// Procedural case shards of formula-ratio-percent-metric: capsule gates for
// the three seeded cases (one pyodide + two predict-output). Authored bodies
// stay the oracle; outputs must match Python semantics (round-half-even,
// float repr) byte-exactly.
// Run: node --test tests/procedural_ratio_percent_capsules.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import './helpers/register_static_cases.mjs';
import { EXERCISE_FAMILIES } from '../assets/js/domain/exercise_registry.mjs';
import {
  generateFormulaRatioPercentMetricFamily as generate,
  solveFormulaRatioPercentMetric as solve,
} from '../assets/js/core/data_ml_families.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = JSON.parse(readFileSync(join(root, 'content/families/formula-ratio-percent-metric.json'), 'utf8'));
const body = (caseId) => doc.cases.find((entry) => entry.caseId === caseId);

// Independent mirrors (do not import the generator-side helpers).
const roundHalfEven = (value, digits) => {
  const scaled = value * 10 ** digits;
  const floor = Math.floor(scaled);
  const frac = scaled - floor;
  // Exact tie only (IEEE .5 stays exact); a 63.7499999 draw must floor,
  // not round up — matches Python round() bit-for-bit here.
  const rounded = frac > 0.5 ? floor + 1 : frac < 0.5 ? floor : (floor % 2 === 0 ? floor : floor + 1);
  return rounded / 10 ** digits;
};
const pyFloat = (v) => (Number.isInteger(v) ? `${v}.0` : String(v));

const ledgerMirror = (faelle) => {
  const treffer = faelle.filter((row) => row[1]);
  const korrekt = treffer.filter((row) => row[2]);
  return `${treffer.length}\n${pyFloat(roundHalfEven(korrekt.length / treffer.length, 3))}\n${pyFloat(roundHalfEven(korrekt.length / faelle.length, 3))}`;
};

const recallMirror = (gruppen, printPair) => {
  const werte = Object.fromEntries(Object.entries(gruppen).map(([name, [g, t]]) => [name, g ? t / g : 0.0]));
  const mean = 100 * Object.values(werte).reduce((sum, v) => sum + v, 0) / Object.keys(werte).length;
  return `${pyFloat(werte[printPair[0]])} ${pyFloat(werte[printPair[1]])}\n${pyFloat(roundHalfEven(mean, 1))}`;
};

test('anchor: contract null, authored bodies and base snippets preserved', () => {
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  for (const caseId of ['ledger-rates-output-trace', 'subgroup-recall-output-trace']) {
    const b = body(caseId);
    assert.equal(b.activityType, 'predict-output');
    assert.equal(b.expected.kind, 'output-lines');
    assert.ok(b.parameters.snippet.length > 100, `${caseId}: snippet anchor`);
  }
  const cmp = body('compare-systems-metric');
  assert.equal(cmp.expected.kind, 'reference-solver');
  assert.ok(cmp.parameters.tests.includes('glue-Zahlen stimmen'), 'compare: base tests intact');
  assert.equal(cmp.parameters.starterCode.length > 40, true);
});

test('ledger-rates-output-trace: three output lines, ZeroDivision guarded', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = generate({ seed, caseId: 'ledger-rates-output-trace', difficulty: 'core' });
    const { faelle, snippet } = generated.parameters;
    assert.ok(faelle.some((row) => row[1]), `${seed}: at least one treffer (ZeroDivision guard)`);
    for (const [, treffer, korrekt] of faelle) assert.ok(!korrekt || treffer, `${seed}: korrekt implies treffer`);
    assert.ok(snippet.startsWith('faelle = ['), `${seed}: snippet shape`);
    assert.ok(snippet.includes('print(round(len(korrekt) / len(treffer), 3))'), `${seed}: print line`);
    const expected = ledgerMirror(faelle);
    assert.equal(generated.expected.output, expected, `${seed}: mirror`);
    assert.deepEqual(solve(generated.parameters), { output: expected }, `${seed}: solver`);
    seen.add(JSON.stringify(faelle));
  }
  assert.ok(seen.size >= 40, `only ${seen.size} distinct draws`);
});

test('subgroup-recall-output-trace: pair print + percent mean, gesamt >= 1', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed += 1) {
    const generated = generate({ seed, caseId: 'subgroup-recall-output-trace', difficulty: 'core' });
    const { gruppen, printPair, snippet } = generated.parameters;
    const names = Object.keys(gruppen);
    assert.ok(names.length >= 2 && names.length <= 4, `${seed}: group count`);
    for (const [g, t] of Object.values(gruppen)) {
      assert.ok(g >= 1 && t >= 0 && t <= g, `${seed}: bounds (${g},${t})`);
    }
    assert.equal(new Set(printPair).size, 2, `${seed}: distinct print pair`);
    for (const name of printPair) assert.ok(names.includes(name), `${seed}: printed name exists`);
    assert.ok(snippet.includes(`print(werte["${printPair[0]}"], werte["${printPair[1]}"])`), `${seed}: print line carries pair`);
    const expected = recallMirror(gruppen, printPair);
    assert.equal(generated.expected.output, expected, `${seed}: mirror`);
    assert.deepEqual(solve(generated.parameters), { output: expected }, `${seed}: solver`);
    seen.add(`${JSON.stringify(gruppen)}|${printPair}`);
  }
  assert.ok(seen.size >= 40, `only ${seen.size} distinct draws`);
});

test('compare-systems-metric: base tests verbatim + __ref oracle per seed', () => {
  const b = body('compare-systems-metric');
  const seen = new Set();
  let baselineNullArm = 0;
  for (let seed = 0; seed < 80; seed += 1) {
    const generated = generate({ seed, caseId: 'compare-systems-metric', difficulty: 'core' });
    const p = generated.parameters;
    assert.ok(p.tests.startsWith(b.parameters.tests), `${seed}: base tests verbatim prefix`);
    assert.ok(p.tests.includes('# seeded extra cases'), `${seed}: marker`);
    assert.ok(p.tests.includes('def __ref_compare_systems('), `${seed}: oracle copy`);
    assert.equal(p.starterCode, b.parameters.starterCode, `${seed}: starter pinned`);
    assert.deepEqual(generated.expected, { kind: 'reference-solver', referenceSolver: b.expected.referenceSolver }, `${seed}: expected`);
    assert.deepEqual(solve(p), { referenceCode: b.expected.referenceSolver }, `${seed}: solver`);
    for (const rows of p.seedCases) {
      if (rows.every((row) => !row[0])) baselineNullArm += 1;
      for (const row of rows) assert.equal(row.length, 2, `${seed}: row width`);
      const lit = `[${rows.map((row) => `[${row.map((v) => (v ? 'True' : 'False')).join(', ')}]`).join(', ')}]`;
      assert.ok(p.tests.includes(lit), `${seed}: rows baked into checks`);
    }
    seen.add(JSON.stringify(p.seedCases));
  }
  assert.ok(seen.size >= 40, `only ${seen.size} distinct draws`);
  assert.ok(baselineNullArm >= 10, `baseline-null arm exercised ${baselineNullArm}x`);
});

test('registry: activityType/graderId/competencyIds per instance', () => {
  const table = {
    'compare-systems-metric': ['python-code', 'pyodide', ['c-dl-papers', 'c-ml-cv']],
    'ledger-rates-output-trace': ['predict-output', 'deterministic', ['c-research-capstone', 'c-python-reading']],
    'subgroup-recall-output-trace': ['predict-output', 'deterministic', ['c-capstone-pipeline', 'c-python-reading']],
  };
  for (const [caseId, [activity, grader, comp]] of Object.entries(table)) {
    const inst = EXERCISE_FAMILIES.instantiate('formula-ratio-percent-metric', 5, 'core', caseId);
    assert.equal(inst.activityType, activity, `${caseId}: activityType`);
    assert.equal(inst.graderId, grader, `${caseId}: graderId`);
    assert.deepEqual(inst.competencyIds, comp, `${caseId}: competencyIds`);
  }
});

test('determinism and error paths', () => {
  for (const caseId of ['compare-systems-metric', 'ledger-rates-output-trace', 'subgroup-recall-output-trace']) {
    const a = generate({ seed: -9, caseId, difficulty: 'core' });
    const b = generate({ seed: -9, caseId, difficulty: 'core' });
    assert.deepEqual(a, b, `${caseId}: deterministic`);
    assert.throws(() => generate({ seed: 1.5, caseId, difficulty: 'core' }), /Seed/, `${caseId}: float seed`);
  }
  assert.throws(() => generate({ seed: 0, caseId: 'nope', difficulty: 'core' }), /unbekannter Fall/);
  // propertyTest false pins: intro/stretch draws for these cases throw.
  for (const difficulty of ['intro', 'stretch']) {
    for (const caseId of ['ledger-rates-output-trace', 'subgroup-recall-output-trace', 'compare-systems-metric']) {
      assert.throws(
        () => EXERCISE_FAMILIES.instantiate('formula-ratio-percent-metric', 3, difficulty, caseId),
        /Unbekanntes Profil|Unbekannter Fall/, `${caseId}@${difficulty}`,
      );
    }
  }
});
