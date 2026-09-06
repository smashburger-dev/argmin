import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { W31_W39_SEED_GENERATORS } from '../assets/js/core/w31_w39_generators.mjs';
import { legacyOracle } from './helpers/legacy_oracle.mjs';

// Property tests for the W31-W39 seeded generators (ADR-0014), mirroring the
// house rules enforced for the other generator modules:
//   1. determinism: same seed -> identical instance
//   2. answer space: every family reaches its documented minimum of distinct
//      expected values over 2000 seeds (counting families are naturally
//      bounded; their bounds are documented per generator)
//   3. semantic variation: >= 3 distinct shapes per family
//   4. honesty: prompt never shows the answer as a standalone number,
//      fullSolution always contains it, expected is an exact integer
//   5. independent solvers re-derive `expected` from `parameters` alone
//   6. no seed drift: the documented prompt of every shipped e2 task is the
//      generator output at its default seed, and defaultExpected matches
//   7. topic honesty: no family claims an executed LLM

const SEEDS = Array.from({ length: 2000 }, (_, i) => 1 + i * 37);

function standaloneNumberPresent(text, value) {
  const escaped = String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.,])${escaped}(?![\\d.,%])`).test(text);
}

// Independent reference solvers: they only read `parameters`, never the
// generator internals, so agreement is a real cross-check.
const SOLVERS = {
  genProtocolShifts: (p) => {
    const { a, b } = p.versionen;
    let count = 0;
    if (a.metrik !== b.metrik) count += 1;
    if (a.schwelle !== b.schwelle) count += 1;
    if (b.sekundaer.includes(a.primaer)) count += 1;
    if (b.subgruppen.some((s) => !a.subgruppen.includes(s))) count += 1;
    return count;
  },
  genCardAudit: (p) => {
    let total = 0;
    for (const card of p.karten) {
      for (const feld of p.pflichtfelder[card.art]) {
        const wert = card.werte[feld];
        if (wert === undefined || String(wert).trim() === '') total += 1;
      }
    }
    return total;
  },
  genSubgroupCost: (p) => {
    const rate = (g) => (p.kind === 'fpr'
      ? g.fp / (g.fp + g.tn)
      : (g.tp + g.fp) / (g.tp + g.fp + g.fn + g.tn));
    return Math.round(Math.abs(rate(p.a) - rate(p.b)) * 1000);
  },
  genBaselineLedger: (p) => {
    const treffer = p.n - p.retrieval_fehler;
    const korrekt = treffer - p.antwort_fehler;
    if (p.shape === 'sep-percent') return (100 * korrekt) / treffer;
    if (p.shape === 'naive-percent') return (100 * korrekt) / p.n;
    return Math.round((korrekt / treffer - korrekt / p.n) * 1000);
  },
  genPipelineStages: (p) => {
    const index = new Map(p.stages.map((s, i) => [s.id, i]));
    if (p.shape === 'missing-hashes') return p.stages.filter((s) => !s.hash).length;
    return p.stages.filter((s) => s.hash && (s.input === 'quelle' || (s.input && index.get(s.input) < index.get(s.id)))).length;
  },
  genEvalRates: (p) => {
    const n = p.batches.reduce((s, b) => s + b.n, 0);
    const retrieval = p.batches.reduce((s, b) => s + b.retrieval_fehler, 0);
    const antwort = p.batches.reduce((s, b) => s + b.antwort_fehler, 0);
    const treffer = n - retrieval;
    const korrekt = treffer - antwort;
    if (p.shape === 'retrieval-error-count') return retrieval;
    if (p.shape === 'answer-error-count') return antwort;
    if (p.shape === 'answer-rate-percent') return (100 * korrekt) / treffer;
    return (100 * treffer) / n;
  },
};

// Documented lower bounds for distinct expected values over 2000 seeds.
// Counting families (flags 1-4, stage counts) are bounded by design; the
// numeric families span per-mille and percent ranges.
const MIN_DISTINCT = {
  genProtocolShifts: 3,
  genCardAudit: 6,
  genSubgroupCost: 20,
  genBaselineLedger: 20,
  genPipelineStages: 5,
  genEvalRates: 10,
};

// Family-specific invariants over >= 200 seeds (ADR-0014 contracts).
const INVARIANTS = {
  genProtocolShifts: (i) => i.expected >= 1 && i.expected <= 4
    && i.parameters.flags.length === i.expected
    && i.parameters.versionen.a.datum_prereg < i.parameters.versionen.a.datum_hauptlauf,
  genCardAudit: (i) => i.expected >= 1 && i.expected <= 12
    && i.parameters.karten.every((k) => ['datacard', 'modelcard'].includes(k.art)),
  genSubgroupCost: (i) => i.expected >= 10 && i.expected <= 250
    && ['a', 'b'].every((g) => Object.values(i.parameters[g]).every((v) => Number.isInteger(v) && v > 0)),
  genBaselineLedger: (i) => {
    const p = i.parameters;
    const treffer = p.n - p.retrieval_fehler;
    return treffer - p.antwort_fehler >= 4 && treffer > p.antwort_fehler;
  },
  genPipelineStages: (i) => i.parameters.stages.length >= 5 && i.parameters.stages.length <= 8
    && i.expected >= 0 && i.expected <= 8,
  genEvalRates: (i) => i.parameters.batches.length >= 2 && i.parameters.batches.length <= 3
    && i.parameters.batches.every((b) => b.n - b.retrieval_fehler - b.antwort_fehler >= 1),
};

for (const [name, generator] of Object.entries(W31_W39_SEED_GENERATORS)) {
  test(`w31-w39 ${name}: same seed produces identical instances`, () => {
    for (const seed of [1, 42, 577, 3111, 20260831]) {
      assert.deepEqual(generator(seed), generator(seed));
    }
  });

  test(`w31-w39 ${name}: >= ${MIN_DISTINCT[name]} distinct expected values over ${SEEDS.length} seeds`, () => {
    const distinct = new Set(SEEDS.map((seed) => generator(seed).expected));
    assert.ok(distinct.size >= MIN_DISTINCT[name], `${name} has only ${distinct.size} distinct answers`);
  });

  test(`w31-w39 ${name}: semantic prompt variation (>= 3 distinct shapes)`, () => {
    // Digit-masked prompts isolate the semantic frame from the drawn numbers
    // (same technique as the w27-w30 generator tests).
    const shapes = new Set(SEEDS.slice(0, 400).map((seed) => {
      const { prompt } = generator(seed);
      return prompt.replace(/-?\d+/g, '#');
    }));
    assert.ok(shapes.size >= 3, `${name} has only ${shapes.size} prompt shapes`);
  });

  test(`w31-w39 ${name}: prompt never shows the answer, solution always does`, () => {
    for (const seed of SEEDS.slice(0, 300)) {
      const instance = generator(seed);
      assert.ok(Number.isInteger(instance.expected), `${name} seed ${seed}: non-integer expected`);
      assert.equal(standaloneNumberPresent(instance.prompt, instance.expected), false,
        `${name} seed ${seed}: prompt leaks answer ${instance.expected}`);
      assert.ok(instance.fullSolution.includes(String(instance.expected)),
        `${name} seed ${seed}: solution misses answer`);
    }
  });

  test(`w31-w39 ${name}: independent solver agrees on every seed (incl. 20-seed spot check)`, () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} seed ${seed}: solver disagrees`);
    }
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) {
      const instance = generator(seed);
      assert.equal(SOLVERS[name](instance.parameters), instance.expected,
        `${name} spot seed ${seed}: solver disagrees`);
    }
  });

  test(`w31-w39 ${name}: family invariants hold (>= 200 seeds)`, () => {
    for (const seed of SEEDS.slice(0, 200)) {
      const instance = generator(seed);
      assert.ok(INVARIANTS[name](instance), `${name} seed ${seed}: invariant broken`);
    }
  });
}

// genSubgroupCost special: the per-mille difference must be EXACTLY
// representable with 3 decimals (denominators only carry factors 2 and 5).
test('w31-w39 genSubgroupCost: differences are exact in per-mille, no rounding debt', () => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  for (const seed of SEEDS.slice(0, 200)) {
    const { parameters: p } = genSubgroupCostInstance(seed);
    const parts = p.kind === 'fpr'
      ? [[p.a.fp, p.a.fp + p.a.tn], [p.b.fp, p.b.fp + p.b.tn]]
      : [[p.a.tp + p.a.fp, p.a.tp + p.a.fp + p.a.fn + p.a.tn], [p.b.tp + p.b.fp, p.b.tp + p.b.fp + p.b.fn + p.b.tn]];
    for (const [num, den] of parts) {
      const reduced = den / gcd(num, den);
      assert.equal(1000 % reduced, 0, `seed ${seed}: denominator ${den} leaves per-mille remainder`);
    }
  }
});

function genSubgroupCostInstance(seed) {
  return W31_W39_SEED_GENERATORS.genSubgroupCost(seed);
}

// Negative seed-drift test: the shipped e2 prompts must be the generator
// output at the documented default seed (authoring guide §8).
const SHIPPED_E2 = [
  ['w31', 'genProtocolShifts'],
  ['w32', 'genCardAudit'],
  ['w33', 'genSubgroupCost'],
  ['w34', 'genBaselineLedger'],
  ['w35', 'genPipelineStages'],
  ['w37', 'genEvalRates'],
];

for (const [week, name] of SHIPPED_E2) {
  test(`w31-w39 ${name}: no seed drift against content/exercises/${week}.json`, () => {
    const pkg = legacyOracle.weeks[week];
    const exercise = pkg.exercises.find((e) => e.exerciseId === `${week}-e2`);
    assert.ok(exercise, `${week}-e2 missing`);
    assert.equal(exercise.parameters.seedGenerator, name);
    const { defaultSeed, defaultExpected } = exercise.expectedAnswer;
    const instance = W31_W39_SEED_GENERATORS[name](defaultSeed);
    assert.equal(instance.prompt, exercise.prompt, `${week}-e2 prompt drifted from generator output`);
    assert.equal(instance.expected, defaultExpected, `${week}-e2 defaultExpected drifted`);
  });
}

test('w31-w39 families stay in their documented topic lanes', () => {
  // Research-artefact audits on synthetic fixtures: no family may claim LLM
  // execution or grading (ADR-0014 honesty rules).
  for (const seed of SEEDS.slice(0, 100)) {
    for (const generator of Object.values(W31_W39_SEED_GENERATORS)) {
      const { prompt, fullSolution } = generator(seed);
      for (const text of [prompt, fullSolution]) {
        assert.equal(/llm|sprachmodell/gi.test(text), false, `LLM claimed in: ${text}`);
      }
    }
  }
});
