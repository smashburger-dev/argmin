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

const EVIDENCE_PACKAGES = ["numpy"];
const EVIDENCE_STARTER = `def evidence_table(papers):
    """Rows per paper: absolute delta, relative percent (rounded), direction-aware
    verdict; sorted by relative gain desc, ties by paperId ascending."""
    # per paper: absolute = system - baseline
    # relative_pct = int(round(100 * absolute / baseline)) or 0 if baseline == 0
    # verdict follows paper["direction"]: "improved" if system > baseline and
    #   direction == "higher", or system < baseline and direction == "lower";
    #   "flat" if system == baseline; else "regressed"
    # sort by (-relative_pct, paperId) -- numeric, direction only in verdict
    ...
`;
const EVIDENCE_BASE_TESTS = `PAPERS = [
    {"paperId": "attn-2017", "metric": "BLEU EN-DE", "direction": "higher", "baseline": 26.4, "system": 28.4},
    {"paperId": "bert-2018", "metric": "GLUE", "direction": "higher", "baseline": 72.8, "system": 80.5},
    {"paperId": "lora-2021", "metric": "trainierbare Parameter (Mio.)", "direction": "lower", "baseline": 175000.0, "system": 17.5},
    {"paperId": "gpt3-2020", "metric": "F1 Demo", "direction": "higher", "baseline": 60.0, "system": 60.0},
]
table = evidence_table(PAPERS)
__check('vier Zeilen', len(table) == 4)
__check('Sortierung nach relativ absteigend', [r["paperId"] for r in table] == ["bert-2018", "attn-2017", "gpt3-2020", "lora-2021"])
__check('bert absolut', abs(table[0]["absolute"] - 7.7) < 1e-9)
__check('bert relativ 11', table[0]["relative_pct"] == 11)
__check('attn absolut 2', abs(table[1]["absolute"] - 2.0) < 1e-9)
__check('attn gerundet 8', table[1]["relative_pct"] == 8)
__check('flat verdict', table[2]["verdict"] == "flat")
__check('Parameter gesunken bei direction lower', table[3]["verdict"] == "improved")
__check('lora relativ negativ gerundet', table[3]["relative_pct"] == -100)
TIE = [
    {"paperId": "b-paper", "metric": "m", "direction": "higher", "baseline": 40.0, "system": 50.0},
    {"paperId": "a-paper", "metric": "m", "direction": "higher", "baseline": 80.0, "system": 100.0},
]
__check('Tie-Break nach paperId', [r["paperId"] for r in evidence_table(TIE)] == ["a-paper", "b-paper"])
__check('leere Liste', evidence_table([]) == [])
FEHLER = [{"paperId": "f-1", "metric": "Fehlerrate", "direction": "lower", "baseline": 10.0, "system": 8.0}]
row = evidence_table(FEHLER)[0]
__check('Fehlerrate gesunken ist improved', row["absolute"] == -2.0 and row["verdict"] == "improved")
FEHLER_UP = [{"paperId": "f-2", "metric": "Fehlerrate", "direction": "lower", "baseline": 10.0, "system": 12.0}]
row_up = evidence_table(FEHLER_UP)[0]
__check('Fehlerrate gestiegen ist regressed', row_up["relative_pct"] == 20 and row_up["verdict"] == "regressed")
ACC = [{"paperId": "a-1", "metric": "Accuracy", "direction": "higher", "baseline": 90.0, "system": 85.0}]
__check('Accuracy gesunken ist regressed', evidence_table(ACC)[0]["verdict"] == "regressed")
__check('Zeilenstruktur', set(row.keys()) == {"paperId", "metric", "absolute", "relative_pct", "verdict"})`;
const EVIDENCE_REFERENCE = `def evidence_table(papers):
    """Rows per paper: absolute delta, relative percent (rounded), direction-aware
    verdict; sorted by relative gain desc, ties by paperId ascending."""
    rows = []
    for paper in papers:
        baseline = float(paper["baseline"])
        system = float(paper["system"])
        absolute = system - baseline
        relative = 0 if baseline == 0 else int(round(100.0 * absolute / baseline))
        if system == baseline:
            verdict = "flat"
        elif (system > baseline and paper["direction"] == "higher") or (system < baseline and paper["direction"] == "lower"):
            verdict = "improved"
        else:
            verdict = "regressed"
        rows.append({"paperId": paper["paperId"], "metric": paper["metric"],
                     "absolute": absolute, "relative_pct": relative, "verdict": verdict})
    rows.sort(key=lambda r: (-r["relative_pct"], r["paperId"]))
    return rows
`;
const EVIDENCE_PROMPT = `Final Boss Evidenztabelle: Implementiere <code>evidence_table(papers)</code>. Eingabe: Liste von Dictionaries <code>{"paperId": str, "metric": str, "direction": "higher"|"lower", "baseline": Zahl, "system": Zahl}</code> — <code>direction</code> sagt, ob bei dieser Metrik höhere Werte besser sind. Rückgabe: je Paper eine Zeile <code>{"paperId", "metric", "absolute", "relative_pct", "verdict"}</code> mit <code>absolute = system − baseline</code> und <code>relative_pct = int(round(100·absolute/baseline))</code> (0, falls <code>baseline</code> gleich 0); beide Felder bleiben Zahlensache. Das <code>verdict</code> dagegen folgt der Metrikrichtung: <code>"improved"</code>, wenn <code>system &gt; baseline</code> bei <code>direction == "higher"</code> oder <code>system &lt; baseline</code> bei <code>direction == "lower"</code>; <code>"flat"</code> bei Gleichheit; sonst <code>"regressed"</code>. Sortiert wird nach <code>relative_pct</code> absteigend, bei Gleichstand nach <code>paperId</code> aufsteigend — die Sortierung bleibt numerisch, nur das Urteil kennt die Richtung: eine gesunkene Fehlerrate (<code>direction "lower"</code>) gilt als <code>"improved"</code>, auch wenn ihr <code>relative_pct</code> negativ ist und die Zeile weit unten steht. Der Testcode umfasst Paper-artige Zahlenpaare (BLEU- und GLUE-artig, LoRA-Parameterzahlen, Fehlerrate), Tie-Break, Grenzfälle und die Zeilenstruktur.`;
const EVIDENCE_SOLUTION = `def evidence_table(papers):
    """Rows per paper: absolute delta, relative percent (rounded), direction-aware
    verdict; sorted by relative gain desc, ties by paperId ascending."""
    rows = []
    for paper in papers:
        baseline = float(paper["baseline"])
        system = float(paper["system"])
        absolute = system - baseline
        relative = 0 if baseline == 0 else int(round(100.0 * absolute / baseline))
        if system == baseline:
            verdict = "flat"
        elif (system > baseline and paper["direction"] == "higher") or (system < baseline and paper["direction"] == "lower"):
            verdict = "improved"
        else:
            verdict = "regressed"
        rows.append({"paperId": paper["paperId"], "metric": paper["metric"],
                     "absolute": absolute, "relative_pct": relative, "verdict": verdict})
    rows.sort(key=lambda r: (-r["relative_pct"], r["paperId"]))
    return rows

# evidence_table(PAPERS) sortiert zunaechst bert-2018 (+7.7 Punkte, relativ 11 %),
# dann attn-2017 (+2.0, relativ 8 %), dann gpt3-2020 (flat), zuletzt lora-2021
# (Parameter gesunken, direction "lower" -> "improved", obwohl relativ -100 %).`;

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
    packages: EVIDENCE_PACKAGES,
    starterCode: EVIDENCE_STARTER,
    baseTests: EVIDENCE_BASE_TESTS,
    referenceSolver: EVIDENCE_REFERENCE,
    prompt: EVIDENCE_PROMPT,
    fullSolution: EVIDENCE_SOLUTION,
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
const FAMILY = makeCaseFamily({
  contract: EVIDENCE_TABLE_CONTRACT,
  cases: EVIDENCE_TABLE_CASES,
  shapeError: 'Evidenztabelle-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
});

export const evidenceTableCaseOk = FAMILY.caseOk;
export const genEvidenceTableCase = FAMILY.genCase;
export const solveEvidenceTableFamily = FAMILY.solve;
export const generateEvidenceTableFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
