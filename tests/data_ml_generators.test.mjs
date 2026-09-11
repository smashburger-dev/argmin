import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genCompleteRows, genDedupRows, genConditionalCount, genMseGradient,
  genBaselineCorrect, genMseFromResiduals, genR2Share, genConfusionCount,
  genCvSpread, genSeedSpread, genSubgroupGapPp, genShrinkagePercent,
  genEnsembleAccuracy, genPcaVariancePercent,
} from '../assets/js/core/data_ml_generators.mjs';
import {
  genLinearParamCount, genBackpropChain, genSgdSteps, genDropoutCount,
} from '../assets/js/core/deep_learning_generators.mjs';

// Property tests for the W6-W21 seeded generators (ADR-0012, ADR-0013),
// mirroring the house rules enforced for the capstone generators:
//   1. determinism: same seed -> identical instance
//   2. answer space: >= 20 distinct expected values over 2000 seeds
//   3. semantic variation: >= 3 distinct prompt shapes per family
//   4. honesty: prompt never shows the answer as a standalone number,
//      fullSolution always contains it, expected is an exact integer
//   5. independent solvers re-derive `expected` from `parameters` alone
const DATA_ML_DEEP_GENERATORS = {
  genCompleteRows,
  genDedupRows,
  genConditionalCount,
  genMseGradient,
  genBaselineCorrect,
  genMseFromResiduals,
  genR2Share,
  genConfusionCount,
  genCvSpread,
  genSeedSpread,
  genSubgroupGapPp,
  genShrinkagePercent,
  genEnsembleAccuracy,
  genPcaVariancePercent,
  genLinearParamCount,
  genBackpropChain,
  genSgdSteps,
  genDropoutCount,
};

const SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genCompleteRows: (p) => p.rows - (p.rows * p.rate) / 100,
  genDedupRows: (p) => (p.dropKey ? p.rows - p.exactDups - p.keyConflicts : p.rows - p.exactDups),
  genConditionalCount: (p) => (p.direction === 'count' ? (p.nA * p.p) / p.q : (100 * p.c) / p.n),
  genMseGradient: (p) => {
    const weighted = p.points.reduce((acc, [x, y]) => acc + x * (p.w * x + p.b - y), 0);
    return (2 * weighted) / p.n;
  },
  genBaselineCorrect: (p) => p.counts[0] + p.counts[1] + p.counts[2] - Math.max(...p.counts),
  genMseFromResiduals: (p) => p.residuals.reduce((acc, x) => acc + x * x, 0) / p.n,
  genR2Share: (p) => 100 - (100 * p.ssRes) / p.ssTot,
  genConfusionCount: (p) => {
    if (p.metric === 'actual-neg') return p.tn + p.fp;
    if (p.metric === 'predicted-pos') return p.tp + p.fp;
    return p.tp + p.fn;
  },
  genCvSpread: (p) => Math.max(...p.scores) - Math.min(...p.scores),
  genSeedSpread: (p) => Math.max(...p.scores) - Math.min(...p.scores),
  genSubgroupGapPp: (p) => (Math.abs(p.e1 - p.e2) * 100) / p.n,
  genShrinkagePercent: (p) => {
    const share = (100 * p.sxx) / (p.sxx + p.lam);
    return p.phrasing === 'shrink' ? 100 - share : share;
  },
  genEnsembleAccuracy: (p) => {
    let ones = 0;
    for (let j = 0; j < p.n; j += 1) {
      if (p.votes[0][j] + p.votes[1][j] + p.votes[2][j] >= 2) ones += 1;
    }
    return p.direction === 'count' ? ones : ones * 5;
  },
  genPcaVariancePercent: (p) => (100 * p.lambda1) / p.total,
  genLinearParamCount: (p) => {
    if (p.variant === 'single') return p.d * p.h + p.h;
    if (p.variant === 'mlp') return p.d * p.h1 + p.h1 + p.h1 * p.h2 + p.h2;
    const params = (h) => p.d * h + h + h * p.out + p.out;
    return params(p.hWide) - params(p.hNarrow);
  },
  genBackpropChain: (p) => {
    if (p.variant === 'path') return p.locals.reduce((acc, g) => acc * g, 1);
    if (p.variant === 'repeat') return p.a ** p.n;
    return p.branchA[0] * p.branchA[1] + p.branchB[0] * p.branchB[1];
  },
  genSgdSteps: (p) => {
    if (p.variant === 'plain') return p.descending ? p.w0 - p.n * p.step : p.w0 + p.n * p.step;
    if (p.variant === 'epochs') return p.epochs * Math.ceil(p.n / p.batch);
    if (p.variant === 'until') return Math.ceil((p.w0 - p.target) / p.step);
    return 2 * p.g - p.g / 2 ** (p.n - 1);
  },
  genDropoutCount: (p) => {
    if (p.variant === 'both') {
      return p.mask1.reduce((acc, v, i) => acc + (v && p.mask2[i] ? 1 : 0), 0);
    }
    const kept = p.mask.filter(Boolean).length;
    return p.variant === 'kept' ? kept : p.n - kept;
  },
};

// Documented lower bound from both generator modules: every family spans
// >= 20 distinct expected values over 2000 seeds so re-seeds stay fresh.
const MIN_DISTINCT = 20;

for (const [name, generator] of Object.entries(DATA_ML_DEEP_GENERATORS)) {
  test(`data-ml/deep ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 3111, 20260831]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`data-ml/deep ${name}: >= ${MIN_DISTINCT} distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= MIN_DISTINCT, `${name} has only ${distinct.size} distinct answers`);
  });

  test(`data-ml/deep ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    // Digit-masked prompts isolate the semantic frame from the drawn numbers
    // (same technique as the capstone generator tests).
    const shapes = new Set(SEEDS.slice(0, 400).map((seed) => {
      const { prompt } = generator(seed);
      return prompt.replace(/-?\d+/g, '#');
    }));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`data-ml/deep ${name}: prompt never shows the answer, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`data-ml/deep ${name}: independent solver agrees on every seed (incl. 20-seed spot check)`, () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
    for (let seed = 1; seed <= 20; seed += 1) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} spot seed ${seed}: solver disagrees`);
    }
  });

  test(`data-ml/deep ${name}: instances carry the full generator contract`, () => {
    for (const seed of SEEDS.slice(0, 50)) {
      const instance = generator(seed);
      assert.ok(instance.parameters && typeof instance.parameters === 'object', `${name} seed ${seed}: parameters missing`);
      assert.ok(typeof instance.prompt === 'string' && instance.prompt.length > 0, `${name} seed ${seed}: prompt missing`);
      assert.ok(typeof instance.fullSolution === 'string' && instance.fullSolution.length > 0, `${name} seed ${seed}: solution missing`);
    }
  });
}
