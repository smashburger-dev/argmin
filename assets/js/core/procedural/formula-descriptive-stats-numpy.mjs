// Procedural family formula-descriptive-stats-numpy: the task text, starter
// code and reference solver stay fixed; the seed draws fresh sample datasets
// and bin edges that get appended to the curated base test block as literal
// __check lines. Expected values are asserted inline against np.* reference
// functions with the same shape and tolerances as the base checks, so the
// grading contract cannot drift. Mirrors palindromExtraCases in
// foundations_construct_families.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt } from '../generator_draw_kit.mjs';

const PACKAGES = ['numpy'];

const CORE_STARTER = `import numpy as np


def describe(values):
    """Return {'n', 'mean', 'median', 'std'} with population std (ddof=0)."""
    ...


def bin_counts(values, edges):
    """Return counts per bin with np.histogram edge rules (last edge inclusive)."""
    ...
`;

const CHALLENGE_STARTER = `import numpy as np

def describe(values):
    ...

def bin_counts(values, edges):
    ...
`;

const CORE_BASE_TESTS = `d = describe([2, 4, 4, 4, 5, 5, 7, 9])
__check('n', d["n"] == 8)
__check('mean', abs(d["mean"] - 5.0) < 1e-9)
__check('median', abs(d["median"] - 4.5) < 1e-9)
__check('std ddof=0', abs(d["std"] - float(np.std([2, 4, 4, 4, 5, 5, 7, 9]))) < 1e-12)
__check('histogramm bins', np.array_equal(bin_counts([2, 4, 4, 4, 5, 5, 7, 9], [0, 4, 9]), np.array([1, 7])))
__check('letzte Kante inklusiv', np.array_equal(bin_counts([5.0, 9.0, 9.0], [0, 5, 9]), np.array([0, 3])))
__check('leerer Bin', np.array_equal(bin_counts([1.0, 8.0], [0, 2, 4, 9]), np.array([1, 0, 1])))`;

const CHALLENGE_BASE_TESTS = `d = describe([1, 2, 2, 4, 8])
__check("n", d["n"] == 5)
__check("mean", abs(d["mean"] - 3.4) < 1e-9)
__check("median", abs(d["median"] - 2.0) < 1e-9)
__check("std", abs(d["std"] - float(np.std([1, 2, 2, 4, 8]))) < 1e-12)
__check("bins", np.array_equal(bin_counts([1, 2, 2, 4, 8], [0, 2, 4, 8]), np.array([1, 2, 2])))
__check("last edge", np.array_equal(bin_counts([4.0, 8.0], [0, 4, 8]), np.array([0, 2])))`;

const CORE_REFERENCE = `import numpy as np

def describe(values):
    values = np.asarray(values, dtype=float)
    return {
        "n": int(values.size),
        "mean": float(np.mean(values)),
        "median": float(np.median(values)),
        "std": float(np.std(values)),
    }


def bin_counts(values, edges):
    return np.histogram(np.asarray(values), bins=np.asarray(edges, dtype=float))[0]`;

const CHALLENGE_REFERENCE = `import numpy as np

def describe(values):
    values = np.asarray(values, dtype=float)
    return {"n": int(values.size), "mean": float(np.mean(values)), "median": float(np.median(values)), "std": float(np.std(values))}

def bin_counts(values, edges):
    return np.histogram(np.asarray(values), bins=np.asarray(edges, dtype=float))[0]`;

const CORE_PROMPT = 'Implementiere zwei Zusammenfassungs-Funktionen mit NumPy. <code>describe(values)</code> bekommt eine Liste oder ein Array von Zahlen und gibt ein Dictionary mit <code>"n"</code> (Anzahl der Werte, int), <code>"mean"</code>, <code>"median"</code> und <code>"std"</code> zurück (floats; Standardabweichung als Bevölkerungswert, also <code>ddof=0</code> wie im NumPy-Standard). <code>bin_counts(values, edges)</code> bekommt Werte und Bin-Kanten und gibt die Anzahlen pro Bin zurück — mit den Kantenregeln von <code>np.histogram</code>: halboffene Bins $[e_k, e_{k+1})$, nur der letzte Bin schließt die rechte Kante ein. Der Testcode prüft beide Funktionen getrennt von deiner Eingabe.';

const CHALLENGE_PROMPT = 'Implementiere `describe(values)` und `bin_counts(values, edges)` wie im bestehenden Vertrag, aber prüfe deine Lösung an einer asymmetrischen kleinen Stichprobe mit einem Ausreißer und drei Histogramm-Bins.';

const CORE_SOLUTION = `${CORE_REFERENCE}

# describe([2, 4, 4, 4, 5, 5, 7, 9]) -> {'n': 8, 'mean': 5.0, 'median': 4.5, 'std': 2.0}
# bin_counts([2, 4, 4, 4, 5, 5, 7, 9], [0, 4, 9]) -> array([1, 7])`;

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn inputs differ, not just
// a seed literal). The challenge domain always carries one outlier 5x+ outside
// the bulk range, matching the case didactics.
export const STATS_CASES = {
  'describe-and-bins': {
    difficulty: 'core',
    starterCode: CORE_STARTER,
    baseTests: CORE_BASE_TESTS,
    referenceSolver: CORE_REFERENCE,
    prompt: CORE_PROMPT,
    fullSolution: CORE_SOLUTION,
    drawSample(r) {
      const len = randInt(r, 5, 10);
      return Array.from({ length: len }, () => randInt(r, -20, 40));
    },
    drawEdges(r) {
      const count = randInt(r, 2, 4);
      const set = new Set();
      while (set.size < count) set.add(randInt(r, -20, 45));
      return [...set].sort((a, b) => a - b);
    },
    // Seed entries keep their { sample, edges } pair shape.
    draw(r) {
      return { sample: this.drawSample(r), edges: this.drawEdges(r) };
    },
    extraCount: 3,
  },
  'describe-outlier-bins': {
    difficulty: 'challenge',
    starterCode: CHALLENGE_STARTER,
    baseTests: CHALLENGE_BASE_TESTS,
    referenceSolver: CHALLENGE_REFERENCE,
    prompt: CHALLENGE_PROMPT,
    fullSolution: CHALLENGE_REFERENCE,
    drawSample(r) {
      const len = randInt(r, 4, 7);
      const bulk = Array.from({ length: len }, () => randInt(r, -10, 15));
      const outlier = r() < 0.5 ? randInt(r, 60, 200) : randInt(r, -200, -60);
      bulk.splice(randInt(r, 0, bulk.length), 0, outlier);
      return bulk;
    },
    drawEdges(r) {
      const count = randInt(r, 3, 4);
      const set = new Set();
      while (set.size < count) set.add(randInt(r, -15, 220));
      return [...set].sort((a, b) => a - b);
    },
    // Seed entries keep their { sample, edges } pair shape.
    draw(r) {
      return { sample: this.drawSample(r), edges: this.drawEdges(r) };
    },
    extraCount: 3,
  },
};

const pyList = (values) => `[${values.join(', ')}]`;

// Appends the seeded literal checks: every draw is concrete in the test
// string, expected values via np.* reference calls (same tolerances as the
// base block).
function seededChecks(sample, edges, index) {
  const v = pyList(sample);
  const e = pyList(edges);
  return [
    `__v${index} = ${v}`,
    `__d${index} = describe(__v${index})`,
    `__check('seeded n ${index}', __d${index}["n"] == ${sample.length})`,
    `__check('seeded mean ${index}', abs(__d${index}["mean"] - float(np.mean(__v${index}))) < 1e-9)`,
    `__check('seeded median ${index}', abs(__d${index}["median"] - float(np.median(__v${index}))) < 1e-9)`,
    `__check('seeded std ${index}', abs(__d${index}["std"] - float(np.std(__v${index}))) < 1e-12)`,
    `__e${index} = ${e}`,
    `__check('seeded bins ${index}', np.array_equal(bin_counts(__v${index}, __e${index}), np.histogram(np.asarray(__v${index}), bins=np.asarray(__e${index}, dtype=float))[0]))`,
  ].join('\n');
}

export const STATS_CONTRACT = {
  familyId: 'formula-descriptive-stats-numpy',
  familyGroup: 'formula-apply',
  summary: 'Implementiert deskriptive Kennzahlen und Histogramm-Bins mit NumPy.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'describe-and-bins', propertyTest: false },
    { caseId: 'describe-outlier-bins', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'challenge'],
  competencyIds: ['c-eda-viz', 'c-numpy-basics'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
const FAMILY = makeCaseFamily({
  contract: STATS_CONTRACT,
  cases: STATS_CASES,
  shapeError: 'Deskriptive-Stats-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => seededChecks(entry.sample, entry.edges, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

export const statsCaseOk = FAMILY.caseOk;
export const genStatsCase = FAMILY.genCase;
export const solveStatsFamily = FAMILY.solve;
export const generateStatsFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
