// Procedural family trace-library-api-output: capsule gates.
// Run: node --test tests/procedural_library_api_capsules.test.mjs
// Registry wiring is done centrally by the parent — this test only checks the
// module surface plus the JSON anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_SPEC,
  LIBRARY_API_CASES,
  LIBRARY_API_CONTRACT,
  genLibraryApiCase,
  generateLibraryApiFamily,
  libraryApiCaseOk,
  numpySummaryOutput,
  pandasDedupIsnaOutput,
  sklearnSplitOutput,
  solveLibraryApiFamily,
} from '../assets/js/core/procedural/trace-library-api-output.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const CASE_IDS = ['pandas-dedup-isna-lines', 'numpy-median-histogram-corrcoef', 'sklearn-split-no-shuffle'];

// Independent JS mirrors of the documented library semantics: the expected
// output and the solver must both agree with these recomputations for every
// drawn instance.
const refPandas = (ids, ziels) => {
  const seen = new Set();
  let missing = 0;
  for (let i = 0; i < ids.length; i += 1) {
    seen.add(`${ids[i]}|${ziels[i]}`);
    if (ziels[i] === null) missing += 1;
  }
  return `${seen.size}\n${missing}`;
};

const refMedian = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[Math.floor(mid)];
};

// np.histogram edge rule: [e_k, e_{k+1}), last bin right-inclusive.
const refHist = (values, edges) => {
  const counts = edges.slice(0, -1).map(() => 0);
  for (const v of values) {
    for (let i = 0; i < counts.length; i += 1) {
      if (v >= edges[i] && (v < edges[i + 1] || (i === counts.length - 1 && v <= edges[i + 1]))) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
};

const refCorr = (x, y) => {
  const mean = (vs) => vs.reduce((a, b) => a + b, 0) / vs.length;
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i += 1) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
};

// Python round(): round-half-even on the decimal-scaled double; pyFloat adds
// the trailing ".0" that CPython prints for whole floats.
const refRound = (value, digits) => {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  if (Math.abs(scaled - floor - 0.5) < 1e-9) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(scaled) / factor;
};
const refFloat = (v) => (Object.is(v, -0) ? '-0.0' : Number.isInteger(v) ? `${v}.0` : String(v));

const refNumpy = (x, y, bins) =>
  `${refFloat(refRound(refMedian(x), 1))}\n[${refHist(x, bins).join(' ')}]\n${refFloat(refRound(refCorr(x, y), 2))}`;

// sklearn: n_test = ceil(test_size * n); shuffle=False keeps order, so the
// LAST n_test rows form the test block.
const refSklearn = (n, start, testSize) => {
  const nTest = Math.ceil(testSize * n);
  const values = [];
  for (let i = n - nTest; i < n; i += 1) values.push(start + i);
  return `[${values.join(', ')}]`;
};

const REF_OUTPUT = {
  'pandas-dedup-isna-lines': (p) => refPandas(p.ids, p.ziels),
  'numpy-median-histogram-corrcoef': (p) => refNumpy(p.x, p.y, p.bins),
  'sklearn-split-no-shuffle': (p) => refSklearn(p.n, p.start, p.testSize),
};

test('anchor: contract null, cases fully preserved as oracle', () => {
  const doc = JSON.parse(readFileSync(join(root, 'content/families/trace-library-api-output.json'), 'utf8'));
  assert.equal(doc.contract, null);
  assert.equal(doc.cases.length, 3);
  for (const caseId of CASE_IDS) {
    const body = doc.cases.find((item) => item.caseId === caseId);
    assert.ok(body, `${caseId}: anchor missing`);
    const def = LIBRARY_API_CASES[caseId];
    assert.equal(body.parameters.snippet, def.baseSnippet, `${caseId}: base snippet verbatim`);
    assert.deepEqual(body.expected, { kind: 'output-lines', output: def.baseOutput }, `${caseId}: expected form`);
    assert.equal(body.prompt, def.prompt, `${caseId}: prompt verbatim`);
    assert.ok(typeof body.fullSolution === 'string' && body.fullSolution.length > 40, `${caseId}: solution preserved`);
    if ('competencyIds' in body) {
      assert.deepEqual(body.competencyIds, def.competencyIds, `${caseId}: competencies verbatim`);
    }
  }
  // base oracle self-consistency: the JS solvers reproduce the pinned outputs
  assert.equal(pandasDedupIsnaOutput([1, 2, 2, 3], [10, 20, 20, null]), '3\n1');
  assert.equal(numpySummaryOutput([2, 4, 4, 4, 5, 5, 7, 9], [0, 4, 9], [1, 2, 3, 3, 4, 5, 6, 8]), '4.5\n[1 7]\n0.97');
  assert.equal(sklearnSplitOutput(10, 0, 0.25), '[7, 8, 9]');
});

test('capsule shape: generated parameters satisfy libraryApiCaseOk over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LIBRARY_API_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genLibraryApiCase(seed, def);
      assert.ok(libraryApiCaseOk(generated.parameters, def), `${caseId}:${seed}: shape`);
      assert.equal(generated.parameters.caseId, caseId);
      assert.equal(generated.parameters.difficulty, def.difficulty);
      assert.equal(generated.expected.kind, 'output-lines', 'expected form like base case');
      assert.equal(generated.prompt, def.prompt);
      assert.ok(typeof generated.fullSolution === 'string' && generated.fullSolution.length > 40, 'solution text');
    }
  }
  // snippet carries the drawn literals
  const pandas = genLibraryApiCase(0, LIBRARY_API_CASES['pandas-dedup-isna-lines']);
  assert.ok(pandas.parameters.snippet.includes(`"id": [${pandas.parameters.ids.join(', ')}]`), 'pandas snippet carries ids');
  const numpy = genLibraryApiCase(0, LIBRARY_API_CASES['numpy-median-histogram-corrcoef']);
  assert.ok(numpy.parameters.snippet.includes(`x = np.array([${numpy.parameters.x.join(', ')}])`), 'numpy snippet carries x');
  assert.ok(numpy.parameters.snippet.includes(`bins=[${numpy.parameters.bins.join(', ')}]`), 'numpy snippet carries bins');
  const sklearn = genLibraryApiCase(0, LIBRARY_API_CASES['sklearn-split-no-shuffle']);
  assert.ok(sklearn.parameters.snippet.includes(`test_size=${sklearn.parameters.testSize}`), 'sklearn snippet carries test_size');
});

test('expected output: solver recomputes the prediction deterministically', () => {
  for (const caseId of CASE_IDS) {
    const def = LIBRARY_API_CASES[caseId];
    for (let seed = 0; seed < 200; seed += 1) {
      const generated = genLibraryApiCase(seed, def);
      const want = REF_OUTPUT[caseId](generated.parameters);
      assert.equal(generated.expected.output, want, `${caseId}:${seed}: expected output`);
      assert.deepEqual(solveLibraryApiFamily(generated.parameters), { output: want }, `${caseId}:${seed}: solve output`);
    }
  }
  // exported solvers agree with the independent mirrors
  for (let seed = 0; seed < 50; seed += 1) {
    const p = genLibraryApiCase(seed, LIBRARY_API_CASES['pandas-dedup-isna-lines']).parameters;
    assert.equal(pandasDedupIsnaOutput(p.ids, p.ziels), refPandas(p.ids, p.ziels));
    const n = genLibraryApiCase(seed, LIBRARY_API_CASES['numpy-median-histogram-corrcoef']).parameters;
    assert.equal(numpySummaryOutput(n.x, n.bins, n.y), refNumpy(n.x, n.y, n.bins));
    const s = genLibraryApiCase(seed, LIBRARY_API_CASES['sklearn-split-no-shuffle']).parameters;
    assert.equal(sklearnSplitOutput(s.n, s.start, s.testSize), refSklearn(s.n, s.start, s.testSize));
  }
});

test('seeded draws stay inside the declared domains', () => {
  for (let seed = 0; seed < 200; seed += 1) {
    const pandas = genLibraryApiCase(seed, LIBRARY_API_CASES['pandas-dedup-isna-lines']).parameters;
    assert.ok(pandas.ids.length >= 4 && pandas.ids.length <= 6, `pandas rows: ${pandas.ids.length}`);
    assert.equal(pandas.ids.length, pandas.ziels.length, 'ids/ziels same length');
    assert.ok(pandas.ids.every((v) => Number.isInteger(v) && v >= 1 && v <= 4), 'ids in 1..4');
    assert.ok(pandas.ziels.every((v) => v === null || [10, 20, 30, 40].includes(v)), 'ziel domain');
    const distinctRows = new Set(pandas.ids.map((v, i) => `${v}|${pandas.ziels[i]}`)).size;
    assert.ok(distinctRows >= 2 && distinctRows < pandas.ids.length, 'at least one exact duplicate');
    assert.ok(pandas.ziels.some((v) => v === null), 'at least one missing ziel');

    const numpy = genLibraryApiCase(seed, LIBRARY_API_CASES['numpy-median-histogram-corrcoef']).parameters;
    assert.ok(numpy.x.length >= 6 && numpy.x.length <= 9 && numpy.x.length === numpy.y.length, 'numpy lengths');
    assert.ok(numpy.x.every((v) => Number.isInteger(v) && v >= 1 && v <= 12), 'x range');
    assert.ok(numpy.y.every((v) => Number.isInteger(v) && v >= 1 && v <= 12), 'y range');
    assert.ok(new Set(numpy.x).size > 1 && new Set(numpy.y).size > 1, 'non-constant (corrcoef finite)');
    const [e0, e1, e2] = numpy.bins;
    assert.ok(e0 <= Math.min(...numpy.x) && e0 < e1 && e1 < e2 && e2 >= Math.max(...numpy.x), `bins ${numpy.bins}`);
    assert.ok(numpy.x.some((v) => v < e1) && numpy.x.some((v) => v >= e1), 'both bins populated');

    const sklearn = genLibraryApiCase(seed, LIBRARY_API_CASES['sklearn-split-no-shuffle']).parameters;
    assert.ok(sklearn.n >= 8 && sklearn.n <= 14, `sklearn n: ${sklearn.n}`);
    assert.ok(sklearn.start >= 0 && sklearn.start <= 4, `sklearn start: ${sklearn.start}`);
    assert.ok([0.25, 0.5, 0.75].includes(sklearn.testSize), `testSize: ${sklearn.testSize}`);
  }
});

test('distinct floor: at least 40 distinct parameter sets per case over 200 seeds', () => {
  for (const caseId of CASE_IDS) {
    const def = LIBRARY_API_CASES[caseId];
    const seen = new Set();
    for (let seed = 0; seed < 200; seed += 1) {
      seen.add(JSON.stringify(generateLibraryApiFamily({ seed, caseId, difficulty: def.difficulty }).parameters));
    }
    assert.ok(seen.size >= 40, `${caseId}: only ${seen.size} distinct`);
  }
});

test('determinism: same seed reproduces identical output, negative seeds valid', () => {
  for (const caseId of CASE_IDS) {
    const def = LIBRARY_API_CASES[caseId];
    for (let seed = -20; seed < 20; seed += 1) {
      assert.deepEqual(genLibraryApiCase(seed, def), genLibraryApiCase(seed, def), `${caseId}:${seed}`);
    }
  }
});

test('solver consistency: solve reproduces the generated expected output', () => {
  for (const caseId of CASE_IDS) {
    const def = LIBRARY_API_CASES[caseId];
    for (let seed = 0; seed < 50; seed += 1) {
      const generated = generateLibraryApiFamily({ seed, caseId, difficulty: def.difficulty });
      assert.equal(solveLibraryApiFamily(generated.parameters).output, generated.expected.output);
    }
  }
});

test('family block: dispatch, contract, errors', () => {
  assert.equal(LIBRARY_API_CONTRACT.familyId, 'trace-library-api-output');
  assert.equal(LIBRARY_API_CONTRACT.authorityMode, 'seeded');
  assert.equal(LIBRARY_API_CONTRACT.taskArchetype, 'predict-output');
  assert.equal(LIBRARY_API_CONTRACT.activityType, 'predict-output');
  assert.equal(LIBRARY_API_CONTRACT.graderId, 'deterministic');
  assert.equal(LIBRARY_API_CONTRACT.masteryEligible, true);
  assert.deepEqual(LIBRARY_API_CONTRACT.difficultyProfiles, ['core']);
  assert.deepEqual(LIBRARY_API_CONTRACT.competencyIds, ['c-pandas-cleaning', 'c-python-reading']);
  assert.deepEqual(LIBRARY_API_CONTRACT.caseTypes, [
    { caseId: 'pandas-dedup-isna-lines', propertyTest: false },
    { caseId: 'numpy-median-histogram-corrcoef', propertyTest: false },
    { caseId: 'sklearn-split-no-shuffle', propertyTest: false },
  ]);
  assert.equal(FAMILY_SPEC.generate, generateLibraryApiFamily);
  assert.equal(FAMILY_SPEC.solve, solveLibraryApiFamily);
  assert.throws(() => generateLibraryApiFamily({ seed: 0, caseId: 'pandas-dedup-isna-lines', difficulty: 'stretch' }), /Unbekannter Fall/);
  assert.throws(() => generateLibraryApiFamily({ seed: 0, caseId: 'nope', difficulty: 'core' }), /Unbekannter Fall/);
  assert.throws(() => generateLibraryApiFamily({ seed: 0.5, caseId: 'pandas-dedup-isna-lines', difficulty: 'core' }), /Seed/);
  assert.throws(() => solveLibraryApiFamily({}), /Kapselform/);
  const good = genLibraryApiCase(0, LIBRARY_API_CASES['sklearn-split-no-shuffle']).parameters;
  assert.throws(() => solveLibraryApiFamily({ ...good, snippet: 'x' }), /Kapselform/);
});
