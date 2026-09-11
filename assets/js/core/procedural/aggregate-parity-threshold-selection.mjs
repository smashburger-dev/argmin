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

// --- parity-threshold-selection (stretch) ---
const PARITY_PACKAGES = [];
const PARITY_STARTER = `def threshold_sweep(kandidaten, band):
    ""'Paritaetsband zuerst, dann bestes f1, Gleichstand -> kleinere schwelle'; None ohne Kandidat im Band."""
    ...

def cost_table(token_in, token_out, preis_in_mio, preis_out_mio):
    """Kosten in EUR je 1.000.000 Token-Skala, auf 4 Dezimalstellen gerundet."""
    ...

`;
const PARITY_BASE_TESTS = `KAND = [
    {"schwelle": 0.4, "selrate": {"a": 0.9, "b": 0.5}, "f1": 0.84},
    {"schwelle": 0.5, "selrate": {"a": 0.8, "b": 0.6}, "f1": 0.81},
    {"schwelle": 0.6, "selrate": {"a": 0.7, "b": 0.65}, "f1": 0.78},
    {"schwelle": 0.7, "selrate": {"a": 0.66, "b": 0.64}, "f1": 0.78},
]
__check('weites band waehlt bestes f1', threshold_sweep(KAND, 0.2) == {"schwelle": 0.6, "f1": 0.78, "paritaet_ok": True})
__check('enges band mit gleichstand -> kleinere schwelle', threshold_sweep(KAND, 0.05) == {"schwelle": 0.6, "f1": 0.78, "paritaet_ok": True})
__check('sehr enges band -> nur ein kandidat', threshold_sweep(KAND, 0.03) == {"schwelle": 0.7, "f1": 0.78, "paritaet_ok": True})
__check('kein kandidat im band -> None', threshold_sweep(KAND, 0.02) is None)
__check('paritaet schlaegt besseres f1', threshold_sweep([
    {"schwelle": 0.5, "selrate": {"a": 0.8, "b": 0.6}, "f1": 0.81},
    {"schwelle": 0.6, "selrate": {"a": 0.7, "b": 0.65}, "f1": 0.78},
], 0.06) == {"schwelle": 0.6, "f1": 0.78, "paritaet_ok": True})
k = cost_table(120000, 30000, 0.5, 2.0)
__check('input-kosten', k["input_eur"] == 0.06)
__check('output-kosten', k["output_eur"] == 0.06)
__check('gesamt-kosten', k["gesamt_eur"] == 0.12)
__check('halbe last', cost_table(60000, 15000, 0.5, 2.0) == {"input_eur": 0.03, "output_eur": 0.03, "gesamt_eur": 0.06})
print("ok w33-e5")`;
const PARITY_REFERENCE = `def threshold_sweep(kandidaten, band):
    im_band = [k for k in kandidaten if abs(k["selrate"]["a"] - k["selrate"]["b"]) <= band]
    if not im_band:
        return None
    best = im_band[0]
    for k in im_band:
        if k["f1"] > best["f1"] or (k["f1"] == best["f1"] and k["schwelle"] < best["schwelle"]):
            best = k
    return {"schwelle": best["schwelle"], "f1": best["f1"], "paritaet_ok": True}


def cost_table(token_in, token_out, preis_in_mio, preis_out_mio):
    input_eur = token_in / 1_000_000 * preis_in_mio
    output_eur = token_out / 1_000_000 * preis_out_mio
    return {"input_eur": round(input_eur, 4), "output_eur": round(output_eur, 4), "gesamt_eur": round(input_eur + output_eur, 4)}`;
const PARITY_PROMPT = `Implementiere Schwellenwahl und Kostenrechnung. <code>threshold_sweep(kandidaten, band)</code>: kandidaten ist eine Liste von <code>{"schwelle": .., "selrate": {"a": .., "b": ..}, "f1": ..}</code>. Zuerst alle Kandidaten behalten, deren Auswahlraten-Differenz höchstens das Band ist; gibt es keine, <code>None</code>. Unter diesen den mit dem besten f1 wählen; bei Gleichstand den mit der kleineren schwelle. Rückgabe <code>{"schwelle": .., "f1": .., "paritaet_ok": True}</code>. <code>cost_table(token_in, token_out, preis_in_mio, preis_out_mio)</code>: Kosten in EUR für token_in Input- und token_out Output-Token zu preis_in_mio beziehungsweise preis_out_mio EUR je 1.000.000 Token; Rückgabe <code>{"input_eur": .., "output_eur": .., "gesamt_eur": ..}</code>, jeweils auf 4 Dezimalstellen gerundet. Der Testcode bringt Kandidatenlisten und Preisbeispiele mit.`;
const PARITY_SOLUTION = `def threshold_sweep(kandidaten, band):
    im_band = [k for k in kandidaten if abs(k["selrate"]["a"] - k["selrate"]["b"]) <= band]
    if not im_band:
        return None
    best = im_band[0]
    for k in im_band:
        if k["f1"] > best["f1"] or (k["f1"] == best["f1"] and k["schwelle"] < best["schwelle"]):
            best = k
    return {"schwelle": best["schwelle"], "f1": best["f1"], "paritaet_ok": True}


def cost_table(token_in, token_out, preis_in_mio, preis_out_mio):
    input_eur = token_in / 1_000_000 * preis_in_mio
    output_eur = token_out / 1_000_000 * preis_out_mio
    return {"input_eur": round(input_eur, 4), "output_eur": round(output_eur, 4), "gesamt_eur": round(input_eur + output_eur, 4)}

# 120000/30000 Token zu 0.5/2.0 EUR je Mio -> 0.06 + 0.06 = 0.12 EUR (lokal python3-verifiziert)`;

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
    packages: PARITY_PACKAGES,
    starterCode: PARITY_STARTER,
    baseTests: PARITY_BASE_TESTS,
    referenceSolver: PARITY_REFERENCE,
    prompt: PARITY_PROMPT,
    fullSolution: PARITY_SOLUTION,
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
const FAMILY = makeCaseFamily({
  contract: PARITY_THRESHOLD_CONTRACT,
  cases: PARITY_THRESHOLD_CASES,
  shapeError: 'Paritaets-Schwellen-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
});

export const parityThresholdCaseOk = FAMILY.caseOk;
export const genParityThresholdCase = FAMILY.genCase;
export const solveParityThresholdFamily = FAMILY.solve;
export const generateParityThresholdFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
