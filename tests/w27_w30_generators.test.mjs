import test from 'node:test';
import assert from 'node:assert/strict';
import { W27_W30_SEED_GENERATORS } from '../assets/js/core/w27_w30_generators.mjs';
import { hasLegacyGenerator } from '../assets/js/core/legacy_exercise_adapter.mjs';

// Property tests for the W27-W30 seeded generators (ADR-0013), mirroring the
// house rules enforced for the other generator modules:
//   1. determinism: same seed -> identical instance
//   2. wide answer space: >= 20 distinct expected values over 2000 seeds
//   3. semantic variation: >= 3 distinct prompt shapes per family
//   4. honesty: prompt never shows the answer as a standalone number,
//      fullSolution always contains it, expected is an exact integer
//   5. independent solvers re-derive `expected` from `parameters` alone
//   6. the legacy adapter knows every family (registry wiring)

const SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genRecallAtK: (p) => {
    const hits = p.ranked.slice(0, p.k).filter((doc) => p.relevant.includes(doc)).length;
    if (p.shape === 'hits') return hits;
    if (p.shape === 'percent') return (100 * hits) / p.relevantTotal;
    if (p.shape === 'missing') return p.relevantTotal - hits;
    return p.k - hits;
  },
  genChunkCount: (p) => {
    const step = p.size - p.overlap;
    const count = Math.ceil(p.length / step);
    return p.shape === 'last-start' ? (count - 1) * step : count;
  },
  genF1orPrecision: (p) => {
    if (p.shape === 'precision') return (100 * p.tp) / (p.tp + p.fp);
    if (p.shape === 'recall') return (100 * p.tp) / (p.tp + p.fn);
    return (200 * p.tp) / (2 * p.tp + p.fp + p.fn);
  },
  genInjectionFlagCount: (p) => {
    if (p.shape === 'missed') return p.fn;
    if (p.shape === 'false-alarms') return p.fp;
    if (p.shape === 'caught-percent') return (100 * p.tp) / (p.tp + p.fn);
    return p.tn;
  },
  genAllowedActionCount: (p) => {
    if (p.shape === 'allowed') return p.allowed;
    if (p.shape === 'denied') return p.denied;
    return (100 * p.allowed) / p.total;
  },
};

for (const [name, generator] of Object.entries(W27_W30_SEED_GENERATORS)) {
  test(`w27-w30 ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 20260831]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`w27-w30 ${name}: >= 20 distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= 20, `${name} has only ${distinct.size} distinct answers`);
  });

  test(`w27-w30 ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    const shapes = new Set(SEEDS.slice(0, 400).map((seed) => {
      const { prompt } = generator(seed);
      return prompt.replace(/-?\d+/g, '#');
    }));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`w27-w30 ${name}: prompt never shows the answer, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`w27-w30 ${name}: independent solver agrees on every seed`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
  });
}

test('w27-w30 generator registry is wired into the legacy adapter', () => {
  for (const name of Object.keys(W27_W30_SEED_GENERATORS)) {
    assert.equal(hasLegacyGenerator(name), true, `${name} missing in adapter registry`);
  }
  assert.equal(hasLegacyGenerator('genDoesNotExist'), false);
});

test('w27-w30 families stay in their documented topic lanes', () => {
  // Retrieval / evaluation / security / least privilege: no family may claim
  // LLM execution or grading (ADR-0013 honesty rules).
  for (const seed of SEEDS.slice(0, 100)) {
    for (const generator of Object.values(W27_W30_SEED_GENERATORS)) {
      const { prompt, fullSolution } = generator(seed);
      for (const text of [prompt, fullSolution]) {
        assert.equal(/llm|sprachmodell/gi.test(text), false, `LLM claimed in: ${text}`);
      }
    }
  }
});
