import test from 'node:test';
import assert from 'node:assert/strict';
import {
  genAttentionShape, genVocabAfterMerges, genGreedyToken, genLoraParamCount, genRelativeGain,
} from '../assets/js/core/transformer_generators.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

const W22_W26_SEED_GENERATORS = {
  genAttentionShape, genVocabAfterMerges, genGreedyToken, genLoraParamCount, genRelativeGain,
};

// Property tests for the W22-W26 seeded generators (ADR-0013), mirroring the
// house rules enforced for the other generator modules:
//   1. determinism: same seed -> identical instance
//   2. answer space: every family reaches >= 20 distinct expected values
//      over 600 seeds
//   3. semantic variation: >= 3 distinct shapes per family
//   4. honesty: prompt never shows the answer as a standalone number,
//      fullSolution always contains it, expected is an exact integer
//   5. independent solvers re-derive `expected` from `parameters` alone
//   6. no seed drift: the shipped e2 prompt is the generator output at its
//      default seed, and defaultExpected matches
//   7. topic honesty: no family claims an executed LLM

const SEEDS = Array.from({ length: 600 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genAttentionShape: (p) => {
    if (p.variant === 'score-cells') return p.n * p.m;
    if (p.variant === 'output-cells') return p.n * p.dv;
    if (p.variant === 'mask-cells') return (p.n * (p.n - 1)) / 2;
    return Math.sqrt(p.dk);
  },
  genVocabAfterMerges: (p) => {
    if (p.variant === 'total') return p.chars + p.merges + p.specials;
    if (p.variant === 'merges-needed') return p.target - p.chars - p.specials;
    return p.target - p.chars - p.merges;
  },
  genGreedyToken: (p) => {
    if (p.variant === 'argmax-position') return 1 + p.logits.indexOf(Math.max(...p.logits));
    if (p.variant === 'margin') {
      const sorted = [...p.logits].sort((a, b) => b - a);
      return sorted[0] - sorted[1];
    }
    return p.init + p.steps;
  },
  genLoraParamCount: (p) => {
    if (p.variant === 'lora') return p.rank * (p.dIn + p.dOut);
    if (p.variant === 'full') return p.dIn * p.dOut;
    return p.dIn * p.dOut - p.rank * (p.dIn + p.dOut);
  },
  genRelativeGain: (p) => {
    if (p.variant === 'pp-accuracy') return p.newer - p.base;
    // `newer`/`eNew` carry binary float dust (e.g. 20.6); the generator
    // pins whole percents, so round back to the exact integer answer.
    if (p.variant === 'relative-percent') return Math.round((100 * (p.newer - p.base)) / p.base);
    if (p.variant === 'error-reduction') return Math.round((100 * (p.eBase - p.eNew)) / p.eBase);
    return p.c2 - p.c1;
  },
};

// Documented minimum: >= 20 distinct expected values over 600 seeds.
const MIN_DISTINCT = {
  genAttentionShape: 20, genVocabAfterMerges: 20, genGreedyToken: 20, genLoraParamCount: 20, genRelativeGain: 20,
};

// Family-specific invariants over >= 200 seeds (ADR-0013 contracts).
const INVARIANTS = {
  genAttentionShape: (i) => i.expected >= 2 && i.expected <= 196
    && (i.parameters.variant !== 'scale-divisor' || i.expected * i.expected === i.parameters.dk),
  genVocabAfterMerges: (i) => i.expected >= 3 && i.expected <= 146,
  genGreedyToken: (i) => i.expected >= 2
    && (i.parameters.variant !== 'decode-length' || i.parameters.maxLen > i.expected),
  genLoraParamCount: (i) => i.expected > 0 && i.parameters.dIn % 16 === 0
    && i.parameters.dOut % 16 === 0 && [2, 4, 8, 16].includes(i.parameters.rank),
  genRelativeGain: (i) => i.expected >= 1,
};

for (const [name, generator] of Object.entries(W22_W26_SEED_GENERATORS)) {
  test(`w22-w26 ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 3111, 20260831]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`w22-w26 ${name}: >= ${MIN_DISTINCT[name]} distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= MIN_DISTINCT[name], `${name} has only ${distinct.size} distinct answers`);
  });

  test(`w22-w26 ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    // Digit-masked prompts isolate the semantic frame from the drawn numbers.
    const shapes = new Set(SEEDS.slice(0, 150).map((seed) => generator(seed).prompt.replace(/-?\d+/g, '#')));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`w22-w26 ${name}: prompt never shows the answer, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 150)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`w22-w26 ${name}: independent solver agrees on every seed`, () => {
    for (const seed of SEEDS.slice(0, 100)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
  });

  test(`w22-w26 ${name}: family invariants hold (>= 200 seeds)`, () => {
    for (const seed of SEEDS.slice(0, 100)) {
      assert.ok(INVARIANTS[name](generator(seed)), `${name} seed ${seed}: invariant broken`);
    }
  });
}

// Negative seed-drift test: the shipped e2 prompts must be the generator
// output at the documented default seed (authoring guide §8).
const SHIPPED_E2 = [
  ['w22', 'genAttentionShape'],
  ['w23', 'genVocabAfterMerges'],
  ['w24', 'genGreedyToken'],
  ['w25', 'genLoraParamCount'],
  ['w26', 'genRelativeGain'],
];

for (const [week, name] of SHIPPED_E2) {
  test(`w22-w26 ${name}: no seed drift against legacy-oracle ${week}-e2`, () => {
    const pkg = legacyOracle.weeks[week];
    const exercise = pkg.exercises.find((e) => e.exerciseId === `${week}-e2`);
    assert.ok(exercise, `${week}-e2 missing`);
    assert.equal(exercise.parameters.seedGenerator, name);
    const { defaultSeed, defaultExpected } = exercise.expectedAnswer;
    const instance = W22_W26_SEED_GENERATORS[name](defaultSeed);
    assert.equal(instance.prompt, exercise.prompt, `${week}-e2 prompt drifted from generator output`);
    assert.equal(instance.expected, defaultExpected, `${week}-e2 defaultExpected drifted`);
  });
}

test('w22-w26 families stay in their documented topic lanes', () => {
  // No family may claim LLM execution or grading (ADR-0013 honesty rules).
  for (const seed of SEEDS.slice(0, 50)) {
    for (const generator of Object.values(W22_W26_SEED_GENERATORS)) {
      const { prompt, fullSolution } = generator(seed);
      for (const text of [prompt, fullSolution]) {
        assert.equal(/llm|sprachmodell/gi.test(text), false, `LLM claimed in: ${text}`);
      }
    }
  }
});
