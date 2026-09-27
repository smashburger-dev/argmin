// Procedural family trace-training-loop-count: the seed draws the loop
// constants inside the documented domains and the JS mirrors below recompute
// the printed values one-to-one (integer ceil/floor batching, float weight
// updates, cent-exact early stopping).
//   - training-loop-count: n in 60-120 (step 10), B in {20..60 step 10},
//     epochs 2-4, three float gradients in {2.0,4.0,6.0,8.0}.
//   - training-loop-drop-last: n in 8-16, bs in {2..5} with bs < n, epochs 2-3.
//   - training-loop-early-stop-counter: losses in cent integers — a first
//     improvement then stagnant draws until patience triggers a stop before
//     the list ends (like the base case).
// Base fields pin the curated oracle cases verbatim (anchor tests compare
// them against the JSON); draw domains are documented here.

import { pick, randInt, until } from '../generator_draw_kit.mjs';
import { makePredictFamily } from './case_family_kit.mjs';
import doc from '../../../../content/families/trace-training-loop-count.json' with { type: 'json' };

const DRAW_SCOPE = 'trace-training-loop-count';

// Python prints a float with at least one decimal ("4.0").
const pyFloat = (value) => (Number.isInteger(value) ? `${value}.0` : String(value));

// --- case 1: training-loop-count ----------------------------------------------

const GRAD_BANK = [2.0, 4.0, 6.0, 8.0];

function drawCountCase(r) {
  return {
    n: randInt(r, 6, 12) * 10,
    B: randInt(r, 2, 6) * 10,
    epochs: randInt(r, 2, 4),
    grads: [0, 1, 2].map(() => GRAD_BANK[randInt(r, 0, GRAD_BANK.length - 1)]),
  };
}

// -(-n // B) is ceil(n / B) per epoch; the weight applies lr 0.5 per gradient.
export function countLoopOutput({ n, B, epochs, grads }) {
  const steps = epochs * Math.ceil(n / B);
  const w = 10.0 - grads.reduce((acc, g) => acc + 0.5 * g, 0);
  return `${steps}\n${pyFloat(w)}`;
}

function countSnippet({ n, B, epochs, grads }) {
  return `n, B, epochs = ${n}, ${B}, ${epochs}
steps = 0
for _ in range(epochs):
    steps += -(-n // B)
print(steps)
w = 10.0
for g in [${grads.map(pyFloat).join(', ')}]:
    w = w - 0.5 * g
print(w)`;
}

function countSolution({ n, B, epochs, grads }) {
  const per = Math.ceil(n / B);
  const w = 10.0 - grads.reduce((acc, g) => acc + 0.5 * g, 0);
  const gradSum = grads.reduce((a, g) => a + g, 0);
  return `Batches: $\\lceil ${n}/${B} \\rceil = ${per}$ pro Epoche, über ${epochs} Epochen $${per} \\cdot ${epochs} = ${epochs * per}$ Updates. Parameter: $w = 10{,}0 - 0{,}5 \\cdot (${grads.map((g) => pyFloat(g).replace('.', ',')).join(' + ')}) = 10{,}0 - ${pyFloat(0.5 * gradSum).replace('.', ',')} = ${pyFloat(w).replace('.', ',')}$. Ausgabe: <code>${epochs * per}</code> und <code>${pyFloat(w)}</code>.`;
}

// --- case 2: training-loop-drop-last -------------------------------------------

function drawDropCase(r) {
  return until(r, () => ({
    n: randInt(r, 8, 16),
    bs: randInt(r, 2, 5),
    epochs: randInt(r, 2, 3),
  }), ({ n, bs }) => bs < n && n % bs !== 0, { scope: DRAW_SCOPE });
}

export function dropLastOutput({ n, bs, epochs }) {
  const starts = [];
  for (let s = 0; s < n; s += bs) starts.push(s);
  const kept = starts.filter((s) => s + bs <= n).length;
  return `[${starts.join(', ')}]\n${epochs * kept}`;
}

function dropSnippet({ n, bs, epochs }) {
  return `n, bs, epochs = ${n}, ${bs}, ${epochs}
starts = list(range(0, n, bs))
steps = sum(1 for _ in range(epochs) for start in starts if start + bs <= n)
print(starts)
print(steps)`;
}

function dropSolution({ n, bs, epochs }) {
  const starts = [];
  for (let s = 0; s < n; s += bs) starts.push(s);
  const kept = starts.filter((s) => s + bs <= n);
  const dropped = starts.filter((s) => s + bs > n);
  return `range erzeugt die Starts [${starts.join(', ')}]. ${dropped.length ? `Der letzte Start ${dropped[0]} hätte nur ${n - dropped[0]} Elemente und wird durch <code>start + bs &lt;= n</code> verworfen; ` : ''}pro Epoche bleiben ${kept.length} Batches, also ${epochs * kept.length} über ${epochs} Epochen.`;
}

// --- case 3: training-loop-early-stop-counter ----------------------------------

// Draw losses in integer thousandths so every comparison is exact and
// 3-decimal values (like the base case 0.595) stay expressible.
// ~55 % of draws stay on the eighths grid (losses and min_delta in multiples
// of 125 = 0.125): dyadic values subtract exactly in JS and CPython floats,
// so a step of exactly min_delta is unambiguous — the strict '>' keeps wait
// counting while an inclusive '>=' reader resets. min_delta 250 draws add a
// strict-only improvement (gap - 125): it resets the strict wait but stays
// below the inclusive reader's best, so both misconceptions stay apart.
// The remaining draws keep the thousandths shape: l0, one real improvement
// l1, then stagnant draws — ~80 % insert a second real improvement after one
// stagnant epoch so a reader who never resets patience stops earlier.
// Stagnant draws never sit exactly on the min_delta boundary (there the
// float comparison could differ between JS and CPython).
function drawEarlyCase(r) {
  return until(r, () => {
    const patience = randInt(r, 2, 3);
    if (r() < 0.7) {
      const minDelta = pick(r, [125, 250]);
      const l0 = pick(r, minDelta === 125 ? [625, 750, 875, 1000, 1125] : [875, 1000, 1125]);
      const l1 = l0 - (minDelta === 125 ? pick(r, [250, 375]) : 375);
      const gap = l1 - minDelta; // exactly on the threshold: no strict reset
      if (minDelta === 250) {
        const strictOnly = gap - 125; // improves strict best, not the inclusive one
        const tail = Array.from({ length: patience }, () => strictOnly + randInt(r, 0, 3) * 125);
        return { losses: [l0, l1, gap, strictOnly, ...tail], minDelta, patience };
      }
      const tail = Array.from({ length: patience + 1 }, () => gap + randInt(r, 0, Math.floor((l0 - gap) / 125)) * 125);
      return { losses: [l0, l1, gap, ...tail], minDelta, patience };
    }
    const l0 = randInt(r, 700, 950);
    const l1 = l0 - randInt(r, 50, 200);
    const minDelta = randInt(r, 5, 30);
    if (r() < 0.8) {
      const gap = l1 + randInt(r, -minDelta + 1, 20); // never clears min_delta
      const l2 = l1 - randInt(r, minDelta + 1, 60); // real improvement: wait resets
      const tail = Array.from({ length: patience }, () => l2 + randInt(r, -minDelta + 1, 20));
      return { losses: [l0, l1, gap, l2, ...tail], minDelta, patience };
    }
    const tail = patience + randInt(r, 0, 1);
    const stagnant = Array.from({ length: tail }, () => l1 + randInt(r, -minDelta + 1, 20));
    return { losses: [l0, l1, ...stagnant], minDelta, patience };
  }, ({ losses, minDelta, patience }) => {
    const { stopped } = earlyStopSim(losses, minDelta, patience);
    return stopped !== null;
  }, { scope: DRAW_SCOPE });
}

// Mirrors the snippet loop exactly (all values in integer thousandths).
export function earlyStopSim(losses, minDelta, patience) {
  let best = Infinity;
  let wait = 0;
  let stopped = null;
  for (let i = 0; i < losses.length; i += 1) {
    if (best - losses[i] > minDelta) {
      best = losses[i];
      wait = 0;
    } else {
      wait += 1;
    }
    if (wait >= patience) {
      stopped = i + 1;
      break;
    }
  }
  return { stopped, best };
}

// Python float repr of a thousandths integer: 600 -> "0.6", 595 -> "0.595".
const pyLoss = (m) => String(m / 1000);
// Source-literal formatting like the base snippet: 2 decimals when the value
// is cent-granular, 3 otherwise.
const litLoss = (m) => (m % 10 === 0 ? (m / 1000).toFixed(2) : (m / 1000).toFixed(3));

export function earlyStopOutput({ losses, minDelta, patience }) {
  const { stopped, best } = earlyStopSim(losses, minDelta, patience);
  return `${stopped === null ? 'None' : stopped}\n${pyLoss(best)}`;
}

function earlySnippet({ losses, minDelta, patience }) {
  return `losses = [${losses.map(litLoss).join(', ')}]
min_delta = ${litLoss(minDelta)}
patience = ${patience}
best = float('inf')
wait = 0
stopped = None
for epoch, loss in enumerate(losses, 1):
    if best - loss > min_delta:
        best = loss
        wait = 0
    else:
        wait += 1
    if wait >= patience:
        stopped = epoch
        break
print(stopped)
print(best)`;
}

function earlySolution({ losses, minDelta, patience }) {
  const { stopped, best } = earlyStopSim(losses, minDelta, patience);
  const improves = [];
  let bestSoFar = Infinity;
  losses.forEach((m, index) => {
    if (bestSoFar - m > minDelta) {
      improves.push(`Epoche ${index + 1} auf ${litLoss(m).replace('.', ',')}`);
      bestSoFar = m;
    }
  });
  return `Verbesserungen um mehr als ${litLoss(minDelta).replace('.', ',')}: ${improves.join('; ')} — jede setzt wait auf 0. Danach steigt wait; bei ${stopped === null ? 'keinem Durchlauf' : `Durchlauf ${stopped}`} erreicht er ${patience}. Der Abbruch erfolgt ${stopped === null ? 'nicht' : `in Epoche ${stopped}`}, der beste Verlust bleibt ${pyLoss(best)}.`;
}

// --- case definitions ----------------------------------------------------------

export const LOOP_CASES = {
  'training-loop-count': {
    caseId: 'training-loop-count',
    difficulty: 'core',
    baseParams: { n: 90, B: 40, epochs: 3, grads: [4.0, 4.0, 4.0] },
    competencyIds: ['c-dl-training', 'c-python-reading'],
    draw: drawCountCase,
    toParams: (d) => ({ n: d.n, B: d.B, epochs: d.epochs, grads: d.grads }),
    buildSnippet: (p) => countSnippet(p),
    buildOutput: (p) => countLoopOutput(p),
    buildSolution: (p) => countSolution(p),
    checkParams(p) {
      if (!Number.isInteger(p.n) || p.n < 60 || p.n > 120 || p.n % 10 !== 0) return false;
      if (!Number.isInteger(p.B) || p.B < 20 || p.B > 60 || p.B % 10 !== 0) return false;
      if (!Number.isInteger(p.epochs) || p.epochs < 2 || p.epochs > 4) return false;
      return Array.isArray(p.grads) && p.grads.length === 3 && p.grads.every((g) => GRAD_BANK.includes(g));
    },
  },
  'training-loop-drop-last': {
    caseId: 'training-loop-drop-last',
    difficulty: 'core',
    baseParams: { n: 10, bs: 4, epochs: 2 },
    competencyIds: ['c-dl-training', 'c-python-reading'],
    draw: drawDropCase,
    toParams: (d) => ({ n: d.n, bs: d.bs, epochs: d.epochs }),
    buildSnippet: (p) => dropSnippet(p),
    buildOutput: (p) => dropLastOutput(p),
    buildSolution: (p) => dropSolution(p),
    checkParams(p) {
      if (!Number.isInteger(p.n) || p.n < 8 || p.n > 16) return false;
      if (!Number.isInteger(p.bs) || p.bs < 2 || p.bs > 5 || p.bs >= p.n) return false;
      if (p.n % p.bs === 0) return false;
      return Number.isInteger(p.epochs) && p.epochs >= 2 && p.epochs <= 3;
    },
  },
  'training-loop-early-stop-counter': {
    caseId: 'training-loop-early-stop-counter',
    difficulty: 'stretch',
    baseParams: { losses: [800, 600, 600, 595, 594], minDelta: 10, patience: 2 },
    buildPrompt: (p) => `Ein Early-Stopping-Zähler verwendet <code>min_delta=${litLoss(p.minDelta).replace('.', ',')}</code> und <code>patience=${p.patience}</code>. Welche zwei Werte werden ausgegeben?`,
    competencyIds: ['c-dl-training', 'c-python-reading'],
    draw: drawEarlyCase,
    toParams: (d) => ({ losses: d.losses, minDelta: d.minDelta, patience: d.patience }),
    buildSnippet: (p) => earlySnippet(p),
    buildOutput: (p) => earlyStopOutput(p),
    buildSolution: (p) => earlySolution(p),
    checkParams(p) {
      if (!Array.isArray(p.losses) || p.losses.length < 4 || p.losses.length > 7) return false;
      if (!p.losses.every((v) => Number.isInteger(v) && v >= 100 && v <= 1200)) return false;
      const dyadic = p.minDelta === 125 || p.minDelta === 250;
      if (!Number.isInteger(p.minDelta) || !(dyadic || (p.minDelta >= 5 && p.minDelta <= 30))) return false;
      if (!Number.isInteger(p.patience) || p.patience < 2 || p.patience > 3) return false;
      const { stopped } = earlyStopSim(p.losses, p.minDelta, p.patience);
      return stopped !== null;
    },
  },
};

export const LOOP_CONTRACT = {
  familyId: 'trace-training-loop-count',
  familyGroup: 'trace-state',
  summary: 'Liest Trainingsschleifen (Batch-Zählung, Drop-last, Early Stopping) und sagt die exakten Ausgaben voraus.',
  taskArchetype: 'predict-output',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'training-loop-count', propertyTest: false },
    { caseId: 'training-loop-drop-last', propertyTest: false },
    { caseId: 'training-loop-early-stop-counter', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-dl-training', 'c-python-reading'],
};

export const FAMILY_SPEC = makePredictFamily({
  doc,
  contract: LOOP_CONTRACT,
  cases: LOOP_CASES,
  shapeError: 'trace-training-loop-count: Parameter verletzen die Kapselform',
});

