// Procedural family aggregate-parity-threshold-selection: the task text,
// starter code, curated base test block and reference solver stay fixed; the
// seed appends fresh candidate tables plus cost examples as literal __check
// lines. The sweep expectation is computed by a JS mirror of the documented
// band-first/f1/tie-break rule (all operands are drawn literals, so the
// comparisons are bit-identical); the cost expectation is emitted as the same
// round()/division expressions the reference solver evaluates, so the grading
// contract cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/aggregate-parity-threshold-selection.json' with { type: 'json' };

// --- parity-threshold-selection (stretch) ---

// --- JS mirror of threshold_sweep -------------------------------------------
// Band filter first (|a-b| <= band on the drawn literals), then best f1 with
// the smaller schwelle on ties — iterated in list order like the solver.

function mirrorSweep(kandidaten, band) {
  const inBand = kandidaten.filter((k) => Math.abs(k.selrate.a - k.selrate.b) <= band);
  if (!inBand.length) return null;
  let best = inBand[0];
  for (const k of inBand) {
    if (k.f1 > best.f1 || (k.f1 === best.f1 && k.schwelle < best.schwelle)) best = k;
  }
  return { schwelle: best.schwelle, f1: best.f1 };
}

// --- draw domain -------------------------------------------------------------
// Candidates: distinct ascending thresholds on a 0.05 grid, selection rates and
// f1 on a 0.01 grid; two bands per scenario (wide/narrow mix covers both the
// dict and the None outcome). Costs: round token counts and per-million prices.

function drawParityEntry(r) {
  const count = randInt(r, 3, 5);
  const schwellen = shuffle(r, Array.from({ length: 13 }, (_, i) => (30 + i * 5) / 100)).slice(0, count).sort((a, b) => a - b);
  const kandidaten = schwellen.map((schwelle) => ({
    schwelle,
    selrate: { a: randInt(r, 50, 95) / 100, b: randInt(r, 50, 95) / 100 },
    f1: randInt(r, 60, 92) / 100,
  }));
  const bands = [randInt(r, 2, 25) / 100, randInt(r, 2, 25) / 100];
  const cost = {
    tokenIn: randInt(r, 10, 500) * 1000,
    tokenOut: randInt(r, 10, 500) * 1000,
    preisIn: randInt(r, 5, 60) / 10,
    preisOut: randInt(r, 5, 60) / 10,
  };
  return { kandidaten, bands, cost };
}

// --- seeded check emitter -----------------------------------------------------

const pyNum = (v) => String(v);

function sweepExpect(kandidaten, band) {
  const best = mirrorSweep(kandidaten, band);
  if (!best) return 'is None';
  return `== {"schwelle": ${pyNum(best.schwelle)}, "f1": ${pyNum(best.f1)}, "paritaet_ok": True}`;
}

function paritySeededChecks(entry, index) {
  const kandLit = entry.kandidaten
    .map((k) => `    {"schwelle": ${pyNum(k.schwelle)}, "selrate": {"a": ${pyNum(k.selrate.a)}, "b": ${pyNum(k.selrate.b)}}, "f1": ${pyNum(k.f1)}},`)
    .join('\n');
  const { tokenIn, tokenOut, preisIn, preisOut } = entry.cost;
  const inExpr = `${tokenIn} / 1000000 * ${pyNum(preisIn)}`;
  const outExpr = `${tokenOut} / 1000000 * ${pyNum(preisOut)}`;
  return [
    `__k${index} = [`,
    kandLit,
    ']',
    `__check('seeded sweep a ${index}', threshold_sweep(__k${index}, ${pyNum(entry.bands[0])}) ${sweepExpect(entry.kandidaten, entry.bands[0])})`,
    `__check('seeded sweep b ${index}', threshold_sweep(__k${index}, ${pyNum(entry.bands[1])}) ${sweepExpect(entry.kandidaten, entry.bands[1])})`,
    `__check('seeded kosten ${index}', cost_table(${tokenIn}, ${tokenOut}, ${pyNum(preisIn)}, ${pyNum(preisOut)}) == {"input_eur": round(${inExpr}, 4), "output_eur": round(${outExpr}, 4), "gesamt_eur": round(${inExpr} + ${outExpr}, 4)})`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn tables differ, not just
// a seed literal).
export const PARITY_THRESHOLD_CASES = {
  'parity-threshold-selection': {
    difficulty: 'stretch',
    draw: drawParityEntry,
    seededChecks: paritySeededChecks,
    extraCount: 3,
  },
};

export const PARITY_THRESHOLD_CONTRACT = {
  familyId: 'aggregate-parity-threshold-selection',
  familyGroup: 'aggregate-count',
  summary: 'Waehlt aus einer Kandidatentabelle unter harter Nebenbedingung (Paritaetsband) den besten Metrikwert mit deterministischem Tie-Break und beziffert Kosten.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'parity-threshold-selection', propertyTest: false },
  ],
  difficultyProfiles: ['stretch'],
  competencyIds: ['c-research-responsible', 'c-genai-eval'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: PARITY_THRESHOLD_CONTRACT,
  cases: PARITY_THRESHOLD_CASES,
  shapeError: 'Paritaets-Schwellen-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
});

