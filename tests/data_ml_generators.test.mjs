import test from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_ML_SEED_GENERATORS } from '../assets/js/core/data_ml_generators.mjs';
import { graders } from '../assets/js/core/graders.js';
import { hasLegacyGenerator } from '../assets/js/core/legacy_exercise_adapter.mjs';

// Property tests for the W6-W17 seeded generators (ADR-0012 Option A).
// Gates re-seed these families, so variation must be meaningful:
//   1. determinism: same seed -> identical instance
//   2. wide answer space: >= 20 distinct expected values over 2000 seeds
//   3. semantic variation: >= 3 distinct prompt shapes per family
//   4. honesty: prompt never shows the answer as a standalone number
//   5. independent solvers re-derive `expected` from `parameters` alone
//   6. the real deterministic grader accepts correct and rejects wrong answers

const SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genCompleteRows: (p) => p.rows - p.missing,
  genDedupRows: (p) => (p.dropKey ? p.rows - p.exactDups - p.keyConflicts : p.rows - p.exactDups),
  genConditionalCount: (p) => (p.direction === 'count'
    ? (p.nA / p.q) * p.p
    : (100 * p.c) / p.n),
  genMseGradient: (p) => {
    const s = p.points.reduce((acc, [x, y]) => acc + x * (p.w * x + p.b - y), 0);
    return (2 * s) / p.n;
  },
  genBaselineCorrect: (p) => p.counts.reduce((acc, c) => acc + c, 0) - Math.max(...p.counts),
  genMseFromResiduals: (p) => p.residuals.reduce((acc, r) => acc + r * r, 0) / p.n,
  genR2Share: (p) => 100 - (100 * p.ssRes) / p.ssTot,
  genConfusionCount: (p) => (p.metric === 'actual-neg'
    ? p.tn + p.fp
    : p.metric === 'predicted-pos' ? p.tp + p.fp : p.tp + p.fn),
  genCvSpread: (p) => Math.max(...p.scores) - Math.min(...p.scores),
  genSubgroupGapPp: (p) => (Math.abs(p.e1 - p.e2) * 100) / p.n,
  genShrinkagePercent: (p) => {
    const share = (100 * p.sxx) / (p.sxx + p.lam);
    return p.phrasing === 'shrink' ? 100 - share : share;
  },
  genEnsembleAccuracy: (p) => {
    let ones = 0;
    for (let j = 0; j < p.n; j += 1) {
      const votesForOne = p.votes.reduce((acc, row) => acc + row[j], 0);
      if (votesForOne >= 2) ones += 1;
    }
    return p.direction === 'count' ? ones : ones * (100 / p.n);
  },
  genPcaVariancePercent: (p) => (100 * p.lambda1) / (p.lambda1 + p.lambda2 + p.lambda3),
};

for (const [name, generator] of Object.entries(DATA_ML_SEED_GENERATORS)) {
  test(`data-ml ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 20260830]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`data-ml ${name}: >= 20 distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= 20, `${name} has only ${distinct.size} distinct answers`);
  });

  test(`data-ml ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    const shapes = new Set(SEEDS.slice(0, 400).map((seed) => {
      const { prompt } = generator(seed);
      return prompt.replace(/-?\d+/g, '#');
    }));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`data-ml ${name}: prompt never shows the answer, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`data-ml ${name}: independent solver agrees on every seed`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
  });

  test(`data-ml ${name}: real deterministic grader accepts correct, rejects wrong`, async () => {
    for (let i = 0; i < 20; i += 1) {
      const seed = 1 + i * 137;
      const instance = generator(seed);
      const exercise = {
        exerciseId: `probe-${name}`, type: 'numeric', grader: 'deterministic',
        deterministicSeed: seed, parameters: { seedGenerator: name },
      };
      const right = await graders.deterministic.grade(exercise, String(instance.expected));
      assert.equal(right.correct, true, `${name} seed ${seed}: correct answer graded wrong`);
      const wrong = await graders.deterministic.grade(exercise, String(instance.expected + 1));
      assert.equal(wrong.correct, false, `${name} seed ${seed}: wrong answer graded correct`);
    }
  });
}

test('data-ml generator registry is wired into the legacy adapter', () => {
  for (const name of Object.keys(DATA_ML_SEED_GENERATORS)) {
    assert.equal(hasLegacyGenerator(name), true, `${name} missing in adapter registry`);
  }
  assert.equal(hasLegacyGenerator('genDoesNotExist'), false);
});
