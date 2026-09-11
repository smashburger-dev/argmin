// Procedural family trace-library-api-output: the snippet shape, prompts and
// base oracles stay fixed; the seed draws the documented input domains.
//   - pandas-dedup-isna-lines: 4-6 (id, ziel) rows, ids 1-4, ziel in
//     {10,20,30,40} or missing — at least one exact duplicate row and at
//     least one missing ziel, so both drop_duplicates() and isna() visibly
//     do work (like the base case).
//   - numpy-median-histogram-corrcoef: x and y of equal length 6-9 with int
//     values 1-12 (both non-constant, so corrcoef is finite) and three bin
//     edges e0 <= min(x) < e1 < max(x) < e2 ... e2 >= max(x), so every value
//     lands inside the histogram range (same as base).
//   - sklearn-split-no-shuffle: consecutive first-column values start..start+n-1
//     with n in 8-14 and test_size in {0.25, 0.5, 0.75} (dyadic — n*test_size
//     is exact binary arithmetic, matching sklearn's ceil() in both engines).
// Every solver mirrors the documented library semantics one-to-one in JS —
// pandas row-dedup/isna counting, np.median, np.histogram edge rules (last
// bin right-inclusive), Pearson r with Python round-half-even, and sklearn's
// ceil(test_size * n) last-block split. Expected keeps the base form
// { kind: 'output-lines', output }.

import { randInt, until } from '../generator_draw_kit.mjs';
import { makePredictFamily } from './case_family_kit.mjs';

const DRAW_SCOPE = 'trace-library-api-output';

// --- shared Python-print helpers --------------------------------------------

// Python prints a float with at least one decimal ("4.0"); a negative zero
// survives as "-0.0". Only used for values that are floats in the snippet.
const pyFloat = (value) => {
  if (Object.is(value, -0)) return '-0.0';
  return Number.isInteger(value) ? `${value}.0` : String(value);
};

// Python round(): round-half-even on the decimal-scaled double. Ties are
// recognised with a small epsilon (exact decimal .5 is rare for irrationals
// but reachable for e.g. r === 0.5).
function pyRound(value, digits) {
  const factor = 10 ** digits;
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  if (Math.abs(diff - 0.5) < 1e-9) {
    return (floor % 2 === 0 ? floor : floor + 1) / factor;
  }
  return Math.round(scaled) / factor;
}

// --- case 1: pandas-dedup-isna-lines -----------------------------------------

const PANDAS_BASE_SNIPPET = `import pandas as pd
df = pd.DataFrame({"id": [1, 2, 2, 3], "ziel": [10, 20, 20, None]})
print(len(df.drop_duplicates()))
print(int(df["ziel"].isna().sum()))`;

const PANDAS_BASE_OUTPUT = '3\n1';

const PANDAS_ZIEL_VALUES = [10, 20, 30, 40];

function drawPandasRows(r) {
  return until(r, () => {
    const n = randInt(r, 4, 6);
    const rows = Array.from({ length: n }, () => ({
      id: randInt(r, 1, 4),
      ziel: r() < 0.28 ? null : PANDAS_ZIEL_VALUES[randInt(r, 0, PANDAS_ZIEL_VALUES.length - 1)],
    }));
    return rows;
  }, (rows) => {
    const distinct = new Set(rows.map((row) => `${row.id}|${row.ziel}`)).size;
    const missing = rows.filter((row) => row.ziel === null).length;
    return distinct >= 2 && distinct < rows.length && missing >= 1;
  }, { scope: DRAW_SCOPE });
}

// Mirrors pandas: drop_duplicates() keeps the first row of each identical
// (id, ziel) tuple; isna() counts the None entries of the ziel column.
export function pandasDedupIsnaOutput(ids, ziels) {
  const seen = new Set();
  let missing = 0;
  for (let i = 0; i < ids.length; i += 1) {
    seen.add(`${ids[i]}|${ziels[i]}`);
    if (ziels[i] === null) missing += 1;
  }
  return `${seen.size}\n${missing}`;
}

function pandasSnippet(ids, ziels) {
  const zielList = ziels.map((v) => (v === null ? 'None' : String(v))).join(', ');
  return `import pandas as pd
df = pd.DataFrame({"id": [${ids.join(', ')}], "ziel": [${zielList}]})
print(len(df.drop_duplicates()))
print(int(df["ziel"].isna().sum()))`;
}

function pandasSolution(ids, ziels) {
  const seen = new Map();
  const dropped = [];
  let missing = 0;
  for (let i = 0; i < ids.length; i += 1) {
    const key = `${ids[i]}|${ziels[i]}`;
    if (seen.has(key)) dropped.push(i + 1);
    seen.set(key, true);
    if (ziels[i] === null) missing += 1;
  }
  return `Von ${ids.length} Zeilen ${dropped.length ? `sind Zeile(n) ${dropped.join(', ')} exakte Duplikate — drop_duplicates() behält die erste` : 'ist keine exakt doppelt'}; es bleiben ${seen.size}. In ziel fehlt${missing === 1 ? '' : 'en'} ${missing} Wert(e) (None → NaN): isna().sum() ist ${missing}. Ausgabe: <code>${seen.size}</code> und <code>${missing}</code>.`;
}

// --- case 2: numpy-median-histogram-corrcoef ---------------------------------

const NUMPY_BASE_SNIPPET = `import numpy as np
x = np.array([2, 4, 4, 4, 5, 5, 7, 9])
y = np.array([1, 2, 3, 3, 4, 5, 6, 8])
print(round(float(np.median(x)), 1))
print(np.histogram(x, bins=[0, 4, 9])[0])
print(round(float(np.corrcoef(x, y)[0, 1]), 2))`;

const NUMPY_BASE_OUTPUT = '4.5\n[1 7]\n0.97';

function drawNumpySample(r) {
  return until(r, () => {
    const len = randInt(r, 6, 9);
    const x = Array.from({ length: len }, () => randInt(r, 1, 12));
    const y = Array.from({ length: len }, () => randInt(r, 1, 12));
    const e0 = randInt(r, 0, Math.min(...x));
    const e2 = randInt(r, Math.max(...x), Math.max(...x) + 3);
    const mids = [];
    for (let m = e0 + 1; m < e2; m += 1) mids.push(m);
    const e1 = mids.length ? mids[randInt(r, 0, mids.length - 1)] : null;
    return { x, y, bins: [e0, e1, e2] };
  }, ({ x, y, bins }) => bins[1] !== null
    && new Set(x).size > 1 && new Set(y).size > 1
    && x.some((v) => v < bins[1]) && x.some((v) => v >= bins[1]),
  { scope: DRAW_SCOPE });
}

// np.median: mean of the two middle values for even length.
function npMedian(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = sorted.length / 2;
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[Math.floor(mid)];
}

// np.histogram bin rule: [e_k, e_{k+1}), last bin right-inclusive.
function npHistogram(values, edges) {
  const counts = edges.slice(0, -1).map(() => 0);
  for (const v of values) {
    for (let i = 0; i < counts.length; i += 1) {
      const lo = edges[i];
      const hi = edges[i + 1];
      if (v >= lo && (v < hi || (i === counts.length - 1 && v <= hi))) {
        counts[i] += 1;
        break;
      }
    }
  }
  return counts;
}

// np.corrcoef(x, y)[0, 1]: Pearson r of the two samples.
function npCorrcoef(x, y) {
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
}

// The three print lines exactly as CPython/NumPy render them.
export function numpySummaryOutput(x, bins, y) {
  const median = pyRound(npMedian(x), 1);
  const counts = npHistogram(x, bins);
  const corr = pyRound(npCorrcoef(x, y), 2);
  return `${pyFloat(median)}\n[${counts.join(' ')}]\n${pyFloat(corr)}`;
}

function numpySnippet(x, y, bins) {
  return `import numpy as np
x = np.array([${x.join(', ')}])
y = np.array([${y.join(', ')}])
print(round(float(np.median(x)), 1))
print(np.histogram(x, bins=[${bins.join(', ')}])[0])
print(round(float(np.corrcoef(x, y)[0, 1]), 2))`;
}

function numpySolution(x, y, bins) {
  const sorted = [...x].sort((a, b) => a - b);
  const median = pyRound(npMedian(x), 1);
  const counts = npHistogram(x, bins);
  const corr = pyRound(npCorrcoef(x, y), 2);
  return `Sortiert ist x = (${sorted.join(', ')}); der Median ist ${pyFloat(median)}. Histogramm-Kanten [${bins.join(', ')}]: Bin [${bins[0]}, ${bins[1]}) enthält ${counts[0]} Wert(e), Bin [${bins[1]}, ${bins[2]}] den Rest → [${counts.join(' ')}]. np.corrcoef(x, y)[0, 1] ≈ ${npCorrcoef(x, y).toFixed(4)}, gerundet auf 2 Stellen ${pyFloat(corr)}. Ausgabe: <code>${pyFloat(median)}</code>, <code>[${counts.join(' ')}]</code>, <code>${pyFloat(corr)}</code>.`;
}

// --- case 3: sklearn-split-no-shuffle -----------------------------------------

const SKLEARN_BASE_SNIPPET = `from sklearn.model_selection import train_test_split
X = [[0], [1], [2], [3], [4], [5], [6], [7], [8], [9]]
X_train, X_test = train_test_split(X, test_size=0.25,
                                   random_state=0, shuffle=False)
print([x[0] for x in X_test])`;

const SKLEARN_BASE_OUTPUT = '[7, 8, 9]';

const SKLEARN_TEST_SIZES = [0.25, 0.5, 0.75];

function drawSklearnSplit(r) {
  const n = randInt(r, 8, 14);
  const start = randInt(r, 0, 4);
  const testSize = SKLEARN_TEST_SIZES[randInt(r, 0, SKLEARN_TEST_SIZES.length - 1)];
  return { n, start, testSize };
}

// sklearn: n_test = ceil(test_size * n_samples) with IEEE doubles; with
// shuffle=False the LAST n_test rows form X_test. The snippet prints the
// first column of the test rows as a Python int list.
export function sklearnSplitOutput(n, start, testSize) {
  const nTest = Math.ceil(testSize * n);
  const values = [];
  for (let i = n - nTest; i < n; i += 1) values.push(start + i);
  return `[${values.join(', ')}]`;
}

function sklearnSnippet(n, start, testSize) {
  const rows = Array.from({ length: n }, (_, i) => `[${start + i}]`).join(', ');
  return `from sklearn.model_selection import train_test_split
X = [${rows}]
X_train, X_test = train_test_split(X, test_size=${testSize},
                                   random_state=0, shuffle=False)
print([x[0] for x in X_test])`;
}

function sklearnSolution(n, start, testSize) {
  const nTest = Math.ceil(testSize * n);
  const values = Array.from({ length: nTest }, (_, i) => start + (n - nTest) + i);
  return `n = ${n}, Testanteil ceil(${testSize} · ${n}) = ${nTest}. Mit <code>shuffle=False</code> wird nicht gemischt: die letzten ${nTest} Zeilen bilden <code>X_test</code>. Der Listenausdruck gibt die erste Spalte jeder Testzeile aus: <code>[${values.join(', ')}]</code>.`;
}

// --- case definitions --------------------------------------------------------
// Base fields pin the curated oracle cases verbatim (anchor tests compare
// them against the JSON); draw* domains are documented in the header.

export const LIBRARY_API_CASES = {
  'pandas-dedup-isna-lines': {
    caseId: 'pandas-dedup-isna-lines',
    difficulty: 'core',
    baseSnippet: PANDAS_BASE_SNIPPET,
    baseOutput: PANDAS_BASE_OUTPUT,
    baseParams: { ids: [1, 2, 2, 3], ziels: [10, 20, 20, null] },
    prompt: 'pandas lesen und vorhersagen: Was gibt dieses Programm aus? Sage die Ausgabe der beiden <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Hinweis zur Laufzeitumgebung: pandas läuft im Browser nicht — hier zählt api-reading, die dokumentierten Bedeutungen von <code>drop_duplicates()</code> (erster Vorkommen bleibt) und <code>isna()</code>.',
    competencyIds: ['c-pandas-cleaning', 'c-python-reading'],
    draw: drawPandasRows,
    buildSnippet: (d) => pandasSnippet(d.ids, d.ziels),
    buildOutput: (d) => pandasDedupIsnaOutput(d.ids, d.ziels),
    buildSolution: (d) => pandasSolution(d.ids, d.ziels),
    toParams: (rows) => ({
      ids: rows.map((row) => row.id),
      ziels: rows.map((row) => row.ziel),
    }),
    checkParams(p) {
      const { ids, ziels } = p;
      if (!Array.isArray(ids) || !Array.isArray(ziels) || ids.length !== ziels.length) return false;
      if (ids.length < 4 || ids.length > 6) return false;
      if (!ids.every((v) => Number.isInteger(v) && v >= 1 && v <= 4)) return false;
      if (!ziels.every((v) => v === null || PANDAS_ZIEL_VALUES.includes(v))) return false;
      const distinct = new Set(ziels.map((z, i) => `${ids[i]}|${z}`)).size;
      if (distinct < 2 || distinct === ids.length) return false;
      return ziels.some((v) => v === null);
    },
  },
  'numpy-median-histogram-corrcoef': {
    caseId: 'numpy-median-histogram-corrcoef',
    difficulty: 'core',
    baseSnippet: NUMPY_BASE_SNIPPET,
    baseOutput: NUMPY_BASE_OUTPUT,
    baseParams: { x: [2, 4, 4, 4, 5, 5, 7, 9], y: [1, 2, 3, 3, 4, 5, 6, 8], bins: [0, 4, 9] },
    prompt: 'NumPy-Zusammenfassungen lesen: Was gibt dieses Programm aus? Sage die Ausgabe der drei <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Achte auf die Kanten-Regel von <code>np.histogram</code> und auf das Runden.',
    competencyIds: ['c-eda-viz', 'c-numpy-basics'],
    draw: drawNumpySample,
    buildSnippet: (d) => numpySnippet(d.x, d.y, d.bins),
    buildOutput: (d) => numpySummaryOutput(d.x, d.bins, d.y),
    buildSolution: (d) => numpySolution(d.x, d.y, d.bins),
    toParams: (d) => ({ x: d.x, y: d.y, bins: d.bins }),
    checkParams(p) {
      const { x, y, bins } = p;
      if (!Array.isArray(x) || !Array.isArray(y) || !Array.isArray(bins)) return false;
      if (x.length < 6 || x.length > 9 || x.length !== y.length) return false;
      if (!x.every((v) => Number.isInteger(v) && v >= 1 && v <= 12)) return false;
      if (!y.every((v) => Number.isInteger(v) && v >= 1 && v <= 12)) return false;
      if (new Set(x).size < 2 || new Set(y).size < 2) return false;
      if (bins.length !== 3 || !bins.every((v) => Number.isInteger(v))) return false;
      if (!(bins[0] <= Math.min(...x) && bins[0] < bins[1] && bins[1] < bins[2] && bins[2] >= Math.max(...x))) return false;
      return x.some((v) => v < bins[1]) && x.some((v) => v >= bins[1]);
    },
  },
  'sklearn-split-no-shuffle': {
    caseId: 'sklearn-split-no-shuffle',
    difficulty: 'core',
    baseSnippet: SKLEARN_BASE_SNIPPET,
    baseOutput: SKLEARN_BASE_OUTPUT,
    baseParams: { n: 10, start: 0, testSize: 0.25 },
    prompt: 'sklearn lesen und vorhersagen: Was gibt dieses Programm aus? Sage die Ausgabe von <code>print(...)</code> vorher, ohne den Code auszuführen. Hinweis zur Laufzeitumgebung: scikit-learn läuft im Browser nicht — hier zählt API-Reading für <code>train_test_split</code>.',
    competencyIds: ['c-ml-baseline', 'c-python-reading'],
    draw: drawSklearnSplit,
    buildSnippet: (d) => sklearnSnippet(d.n, d.start, d.testSize),
    buildOutput: (d) => sklearnSplitOutput(d.n, d.start, d.testSize),
    buildSolution: (d) => sklearnSolution(d.n, d.start, d.testSize),
    toParams: (d) => ({ n: d.n, start: d.start, testSize: d.testSize }),
    checkParams(p) {
      if (!Number.isInteger(p.n) || p.n < 8 || p.n > 14) return false;
      if (!Number.isInteger(p.start) || p.start < 0 || p.start > 4) return false;
      return SKLEARN_TEST_SIZES.includes(p.testSize);
    },
  },
};

export const LIBRARY_API_CONTRACT = {
  familyId: 'trace-library-api-output',
  familyGroup: 'trace-state',
  summary: 'Sagt die exakte Ausgabe eines dokumentierten Bibliotheks-Snippets (pandas, NumPy, scikit-learn) voraus.',
  taskArchetype: 'predict-output',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'pandas-dedup-isna-lines', propertyTest: false },
    { caseId: 'numpy-median-histogram-corrcoef', propertyTest: false },
    { caseId: 'sklearn-split-no-shuffle', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-pandas-cleaning', 'c-python-reading'],
  graderId: 'deterministic',
  activityType: 'predict-output',
};

const FAMILY = makePredictFamily({
  contract: LIBRARY_API_CONTRACT,
  cases: LIBRARY_API_CASES,
  shapeError: 'trace-library-api-output: Parameter verletzen die Kapselform',
});

export const libraryApiCaseOk = FAMILY.caseOk;
export const genLibraryApiCase = FAMILY.genCase;
export const solveLibraryApiFamily = FAMILY.solve;
export const generateLibraryApiFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
