// Procedural family rank-evidence-table: the task text, starter code, curated
// base test block and reference solver stay fixed; the seed appends fresh
// paper lists as literal __check lines. The expected table is rebuilt inside
// the check with the same Python expressions the reference solver evaluates
// (float() casts, int(round(...)) with Python's banker's rounding, the
// direction-aware verdict, (-rel, id) sort key), so the grading contract
// cannot drift. Mirrors formula-descriptive-stats-numpy.mjs.

import { pyNum } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/rank-evidence-table.json' with { type: 'json' };

// --- draw domain -------------------------------------------------------------
// Paper-like rows: realistic id/metric strings plus numeric baseline/system
// pairs covering all three verdicts (improved/flat/regressed) and the
// baseline == 0 edge, so seeded tables exercise the full contract. Every
// paper carries an explicit "direction" field — the verdict contract is
// data-driven, the metric string only labels the row.

const PAPER_TOPICS = ['attn', 'bert', 'lora', 'gpt', 'vit', 'resnet', 'clip', 'unet', 'diff', 'moe'];
const PAPER_YEARS = [2016, 2017, 2018, 2019, 2020, 2021, 2022];
const EVIDENCE_METRICS = ['BLEU', 'GLUE', 'F1', 'Accuracy', 'Fehlerrate', 'Parameter (Mio.)'];
// Metrics where smaller values are better; direction is derived at draw time
// and then baked onto each paper dict as an explicit contract field.
const LOWER_IS_BETTER = new Set(['Fehlerrate', 'Parameter (Mio.)']);
// Contrast pairs: same metric family (quality score vs. error rate), opposite
// directions — drawn sometimes so seeded tables split verdicts on direction
// alone while the numeric move matches.
const CONTRAST_PAIRS = [['Accuracy', 'Fehlerrate'], ['F1', 'Fehlerrate'], ['GLUE', 'Fehlerrate']];
const directionFor = (metric) => (LOWER_IS_BETTER.has(metric) ? 'lower' : 'higher');

/** One decimal (or plain integer for large scales) — literals stay clean. */
function drawMetricValue(r, bigScale) {
  if (bigScale) return randInt(r, 500, 200000);
  return randInt(r, 20, 950) / 10;
}

function drawPaperIds(r, count) {
  const combos = shuffle(r, PAPER_TOPICS.flatMap((t) => PAPER_YEARS.map((y) => `${t}-${y}`)));
  return combos.slice(0, count);
}

function drawPaperEntry(r) {
  const count = randInt(r, 3, 6);
  const ids = drawPaperIds(r, count);
  // Sometimes pin a contrast pair on the first two rows: same metric family,
  // opposite directions, matching numeric move (both up or both down) — the
  // two verdicts then split on direction alone.
  const contrast = r() < 0.4 ? { metrics: pick(r, CONTRAST_PAIRS), up: r() < 0.5 } : null;
  const papers = ids.map((paperId, i) => {
    const metric = contrast && i < 2 ? contrast.metrics[i] : pick(r, EVIDENCE_METRICS);
    const bigScale = r() < 0.15;
    const baseline = r() < 0.08 ? 0 : drawMetricValue(r, bigScale);
    const roll = r();
    let system = roll < 0.2 ? baseline
      : roll < 0.6 ? Math.round(baseline * randInt(r, 40, 90)) / 100
      : roll < 0.9 ? Math.round(baseline * randInt(r, 110, 220)) / 100
      : drawMetricValue(r, bigScale);
    if (contrast && i < 2 && baseline > 0) {
      system = Math.round(baseline * randInt(r, contrast.up ? 110 : 40, contrast.up ? 220 : 90)) / 100;
    }
    return { paperId, metric, direction: directionFor(metric), baseline, system };
  });
  return { papers };
}

// --- seeded check emitter -----------------------------------------------------
// The expected table is emitted as Python: the same float()/round()/verdict/
// sort expressions the reference solver evaluates, applied to the drawn
// literals. The verdict arm reproduces the direction rule verbatim so the
// grading contract cannot drift.

const pyStr = (s) => JSON.stringify(s);

function evidenceSeededChecks(entry, index) {
  const rowsLit = entry.papers
    .map((p) => `    {"paperId": ${pyStr(p.paperId)}, "metric": ${pyStr(p.metric)}, "direction": ${pyStr(p.direction)}, "baseline": ${pyNum(p.baseline)}, "system": ${pyNum(p.system)}},`)
    .join('\n');
  return [
    `__p${index} = [`,
    rowsLit,
    ']',
    `__t${index} = evidence_table(__p${index})`,
    `__rows${index} = [{"paperId": p["paperId"], "metric": p["metric"], "absolute": float(p["system"]) - float(p["baseline"]), "relative_pct": (0 if float(p["baseline"]) == 0 else int(round(100.0 * (float(p["system"]) - float(p["baseline"])) / float(p["baseline"])))), "verdict": ("flat" if float(p["system"]) == float(p["baseline"]) else "improved" if (float(p["system"]) > float(p["baseline"]) and p["direction"] == "higher") or (float(p["system"]) < float(p["baseline"]) and p["direction"] == "lower") else "regressed")} for p in __p${index}]`,
    `__check('seeded laenge ${index}', len(__t${index}) == ${entry.papers.length})`,
    `__check('seeded tabelle ${index}', __t${index} == sorted(__rows${index}, key=lambda r: (-r["relative_pct"], r["paperId"])))`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn paper lists differ, not
// just a seed literal). Expected values are recomputed in-check by the solver's
// own expressions.
export const EVIDENCE_TABLE_CASES = {
  'evidence-table-ranking': {
    difficulty: 'challenge',
    draw: drawPaperEntry,
    seededChecks: evidenceSeededChecks,
    extraCount: 3,
  },
};

export const EVIDENCE_TABLE_CONTRACT = {
  familyId: 'rank-evidence-table',
  familyGroup: 'aggregate-count',
  summary: 'Baut eine Evidenztabelle mit absolutem und relativem Gewinn samt Verdikt und sortiert sie nach fester Regel.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'evidence-table-ranking', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-dl-papers', 'c-ml-cv'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: EVIDENCE_TABLE_CONTRACT,
  cases: EVIDENCE_TABLE_CASES,
  shapeError: 'Evidenztabelle-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
});

