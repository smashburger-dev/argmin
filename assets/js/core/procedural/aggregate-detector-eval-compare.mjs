// Procedural family aggregate-detector-eval-compare: the task text, starter
// code, curated test block and reference solver stay fixed; the seed appends
// fresh record sets (ruleset eval) or fresh corpora/rule sets (detector
// table) as literal __check lines. Expected values are computed by a JS
// mirror of the documented rule semantics and baked in as literals, or
// emitted as the same round()/division expressions the reference solver
// evaluates, so the grading contract cannot drift. Mirrors
// formula-descriptive-stats-numpy.mjs.

import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, until } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/aggregate-detector-eval-compare.json' with { type: 'json' };

const PACKAGES = [];

// --- JS mirror of the classify/run_eval contract (kept in lockstep with the
// reference solver baked into the checks) --------------------------------

// SOURCES / RULES_* live in the base test block; the mirror needs the same
// allow-list and the same rule order to reproduce classify() outcomes.
const SOURCES = ['faq-3', 'faq-7', 'vertrag-1'];
const FULL_KINDS = ['empty-answer', 'no-citations', 'no-shared-terms', 'unknown-citation', 'foreign-number', 'missing-gold-number', 'default'];
const NO_NUMBERS_KINDS = ['empty-answer', 'no-citations', 'no-shared-terms', 'unknown-citation', 'missing-gold-number', 'default'];
const KIND_LABEL = {
  'empty-answer': 'formatfehler',
  'no-citations': 'quellos',
  'no-shared-terms': 'off-topic',
  'unknown-citation': 'halluziniert',
  'foreign-number': 'falsch-faktisch',
  'missing-gold-number': 'unvollständig',
  default: 'unvollständig',
};
const ALL_LABELS = ['formatfehler', 'quellos', 'off-topic', 'halluziniert', 'falsch-faktisch', 'unvollständig'];

const PUNCT_RE = /[!"$%&'()*+,\-./:;<=>?@[\]^_`{|}~„“”‚‘’]/g;
const evalWords = (text) => text.toLowerCase().replace(PUNCT_RE, ' ').split(/\s+/).filter(Boolean);
const evalContentWords = (text) => new Set(evalWords(text).filter((w) => w.length >= 4 && !/^\d+$/.test(w)));
const evalNumbers = (text) => new Set(text.match(/\d+/g) || []);
const setMinus = (a, b) => [...a].filter((x) => !b.has(x));

/** Mirrors classify(record, rules) from the reference solver: first matching
 *  rule wins, `default` always matches. */
function classifyMirror(rec, kinds) {
  const answer = rec.answer;
  const gold = rec.gold;
  for (const kind of kinds) {
    if (kind === 'default') return KIND_LABEL.default;
    if (kind === 'empty-answer' && answer.trim() === '') return KIND_LABEL[kind];
    if (kind === 'no-citations' && rec.citations.length === 0) return KIND_LABEL[kind];
    if (kind === 'no-shared-terms') {
      const shared = [...evalContentWords(answer)].some((w) => evalContentWords(gold).has(w));
      if (!shared) return KIND_LABEL[kind];
    }
    if (kind === 'unknown-citation' && rec.citations.some((c) => !SOURCES.includes(c))) return KIND_LABEL[kind];
    if (kind === 'foreign-number' && setMinus(evalNumbers(answer), evalNumbers(gold)).length > 0) return KIND_LABEL[kind];
    if (kind === 'missing-gold-number' && setMinus(evalNumbers(gold), evalNumbers(answer)).length > 0) return KIND_LABEL[kind];
  }
  return KIND_LABEL.default;
}

/** Mirrors run_eval: count predicted labels and compare with rec.label. */
const evalCorrect = (records, kinds) => (
  records.reduce((acc, rec) => acc + (classifyMirror(rec, kinds) === rec.label ? 1 : 0), 0)
);

// --- JS mirror of contains_injection/detector_table ------------------------

/** Mirrors contains_injection: substring match on the lowercased text. */
const containsInjection = (text, rules) => rules.some((rule) => text.toLowerCase().includes(rule));

/** Mirrors the detector_table inner loop; f1 stays unrounded here (rounding
 *  is emitted as Python round() expressions inside the checks). */
function detectorCounts(corpus, rules) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  for (const item of corpus) {
    const flagged = containsInjection(item.text, rules);
    if (item.label && flagged) tp += 1;
    else if (!item.label && flagged) fp += 1;
    else if (item.label && !flagged) fn += 1;
    else tn += 1;
  }
  return { tp, fp, fn, tn };
}

const round4 = (x) => Math.round(x * 1e4) / 1e4;

/** Rounded f1 exactly like the reference (from unrounded p and r). */
const f1Of = ({ tp, fp, fn }) => {
  const p = tp + fp > 0 ? tp / (tp + fp) : 0;
  const r = tp + fn > 0 ? tp / (tp + fn) : 0;
  return p + r > 0 ? (2 * p * r) / (p + r) : 0;
};

// --- draw domains ----------------------------------------------------------
// German fixture-style sentences with one number slot; each seeded record is
// crafted to land on a chosen rule outcome under RULES_FULL.

const GOLD_TEMPLATES = [
  (n) => `Die Lieferzeit beträgt ${n} Werktage.`,
  (n) => `Die Frist endet nach ${n} Tagen.`,
  (n) => `Der Vertrag läuft ${n} Monate.`,
  (n) => `Die Garantie gilt ${n} Jahre.`,
  (n) => `Rückgaben sind ${n} Tage möglich.`,
  (n) => `Die Kündigung erfolgt nach ${n} Wochen.`,
];

const GOLD_NLESS = [
  'Die Lieferzeit beträgt wenige Werktage.',
  'Die Frist endet nach Vorschrift.',
  'Der Vertrag läuft einige Monate.',
  'Die Garantie gilt mehrere Jahre.',
  'Rückgaben sind zeitnah möglich.',
  'Die Kündigung erfolgt fristgerecht.',
];

// Off-topic answers share no content word (>= 4 chars, non-digit) with any
// gold template; the mirror still computes the true outcome, so a rare
// overlap would only change the scenario, never the oracle.
const OFFTOPIC_ANSWERS = [
  'Herrlicher Sonnenschein heute Vormittag.',
  'Fröhliche Musik spielt laut.',
  'Ein Vogel fliegt über Wiesen.',
  'Kaffee schmeckt bitter heute.',
];

const UNKNOWN_SOURCES = ['blog-x', 'faq-99', 'wiki-z', 'intern-7'];
const EMPTY_ANSWERS = ['', '   ', '\t '];

/** Draws one record whose RULES_FULL classification is the picked kind.
 *  The human label is biased towards the true label (60 %) so accuracy
 *  values stay interesting but non-trivial. */
function drawEvalRecord(r) {
  const gi = randInt(r, 0, GOLD_TEMPLATES.length - 1);
  const n = randInt(r, 2, 30);
  const gold = GOLD_TEMPLATES[gi](n);
  const kind = pick(r, ['formatfehler', 'quellos', 'off-topic', 'halluziniert', 'falsch-faktisch', 'unvollständig']);
  let answer;
  let citations;
  if (kind === 'formatfehler') {
    answer = pick(r, EMPTY_ANSWERS);
    citations = [pick(r, SOURCES)];
  } else if (kind === 'quellos') {
    answer = gold;
    citations = [];
  } else if (kind === 'off-topic') {
    answer = pick(r, OFFTOPIC_ANSWERS);
    citations = [pick(r, SOURCES)];
  } else if (kind === 'halluziniert') {
    answer = gold;
    citations = [pick(r, SOURCES), pick(r, UNKNOWN_SOURCES)];
  } else if (kind === 'falsch-faktisch') {
    const other = randInt(r, 31, 90);
    answer = GOLD_TEMPLATES[gi](other);
    citations = [pick(r, SOURCES)];
  } else {
    answer = r() < 0.5 ? gold : GOLD_NLESS[gi];
    citations = [pick(r, SOURCES)];
  }
  const truth = classifyMirror({ answer, gold, citations }, FULL_KINDS);
  const label = r() < 0.6 ? truth : pick(r, ALL_LABELS);
  return { answer, gold, citations, label };
}

const PHRASE_POOL = ['ignoriere vorherige', 'sende die datei', 'api-schluessel', 'example.invalid', 'zugangsdaten posten', 'lösch alle dateien'];
const BROAD_POOL = ['datei', 'api', 'ignoriere', 'sende', 'schluessel', 'lösch'];
const POS_WRAPPERS = [
  'Bitte {p} und melde nichts.',
  'Neu: {p} in dieser Nachricht.',
  'Systemhinweis: {p} sofort.',
  'Anweisung: {p}, danach stoppen.',
];
const NEG_TEXTS = [
  'Wie lange gilt der Rabatt im Sommer?',
  'Die Garantie deckt Sturzschäden nicht.',
  'Bitte um Rückmeldung zum Entwurf.',
  'Der Support antwortet nur werktags.',
  'Wo finde ich das Handbuch?',
  'Die Rechnung vom März fehlt noch.',
];

/** Draws a fresh detector scenario: a small labelled corpus plus two named
 *  rule sets ("streng" full phrases, "locker" broad fragments). */
function drawTableScenario(r) {
  const size = randInt(r, 5, 7);
  const corpus = [];
  for (let i = 0; i < size; i += 1) {
    if (r() < 0.55) {
      const phrase = pick(r, PHRASE_POOL);
      corpus.push({ text: pick(r, POS_WRAPPERS).replace('{p}', phrase), label: true });
    } else {
      corpus.push({ text: pick(r, NEG_TEXTS), label: false });
    }
  }
  const phrases = new Set();
  while (phrases.size < 2) phrases.add(pick(r, PHRASE_POOL));
  if (r() < 0.5) phrases.add(pick(r, PHRASE_POOL));
  const broad = new Set();
  while (broad.size < 2) broad.add(pick(r, BROAD_POOL));
  return { corpus, ruleSets: { streng: [...phrases], locker: [...broad] } };
}

/** Guard: no rule set may land its raw f1 on a round-half boundary, so the
 *  JS-computed best_by_f1 winner matches Python's round() exactly, and at
 *  least one rule set must flag something (keeps the scenario didactic). */
const tableScenarioOk = (entry) => {
  const rows = Object.values(entry.ruleSets).map((rules) => detectorCounts(entry.corpus, rules));
  if (!rows.some((c) => c.tp + c.fp > 0)) return false;
  return rows.every((c) => {
    const f1 = f1Of(c);
    const frac = (f1 * 1e4) % 1;
    return Math.abs(frac - 0.5) > 1e-6;
  });
};

// --- seeded check emitters --------------------------------------------------
// pyStr emits a double-quoted literal that is valid Python and JS-JSON alike.

const pyStr = (s) => JSON.stringify(s);
const pyList = (items) => `[${items.join(', ')}]`;

function evalSeededChecks(entry, index) {
  const recs = entry.records
    .map((rec) => `    rec(${pyStr(rec.answer)}, ${pyStr(rec.gold)}, ${pyList(rec.citations.map(pyStr))}, ${pyStr(rec.label)}),`)
    .join('\n');
  const n = entry.records.length;
  const cA = evalCorrect(entry.records, FULL_KINDS);
  const cB = evalCorrect(entry.records, NO_NUMBERS_KINDS);
  const better = cA > cB ? 'a' : cB > cA ? 'b' : 'tie';
  return [
    `__r${index} = [`,
    recs,
    ']',
    `__a${index} = run_eval(__r${index}, RULES_FULL)`,
    `__b${index} = run_eval(__r${index}, RULES_NO_NUMBERS)`,
    `__check('seeded zaehlung a ${index}', sum(__a${index}["counts"].values()) == ${n})`,
    `__check('seeded correct a ${index}', __a${index}["correct"] == ${cA})`,
    `__check('seeded accuracy a ${index}', abs(__a${index}["accuracy"] - (${cA} / ${n})) < 1e-12)`,
    `__check('seeded correct b ${index}', __b${index}["correct"] == ${cB})`,
    `__check('seeded accuracy b ${index}', abs(__b${index}["accuracy"] - (${cB} / ${n})) < 1e-12)`,
    `__check('seeded better ${index}', compare_rulesets(__r${index}, RULES_FULL, RULES_NO_NUMBERS)["better"] == ${pyStr(better)})`,
  ].join('\n');
}

/** Python dict literal for one detector row; float fields are the same
 *  round() expressions the reference solver computes, so == is exact. */
function pyDetectorRow({ tp, fp, fn, tn }) {
  const prec = tp + fp > 0 ? `round(${tp} / ${tp + fp}, 4)` : '0.0';
  const rec = tp + fn > 0 ? `round(${tp} / ${tp + fn}, 4)` : '0.0';
  const f1 = tp > 0 ? `round(2 * (${tp} / ${tp + fp}) * (${tp} / ${tp + fn}) / ((${tp} / ${tp + fp}) + (${tp} / ${tp + fn})), 4)` : '0.0';
  return `{"tp": ${tp}, "fp": ${fp}, "fn": ${fn}, "tn": ${tn}, "precision": ${prec}, "recall": ${rec}, "f1": ${f1}, "flagged": ${tp + fp}}`;
}

function tableSeededChecks(entry, index) {
  const rows = Object.entries(entry.ruleSets).map(([name, rules]) => {
    const counts = detectorCounts(entry.corpus, rules);
    return { name, counts, f1: round4(f1Of(counts)) };
  });
  const best = rows.reduce((top, row) => (row.f1 > top.f1 || (row.f1 === top.f1 && row.name < top.name) ? row : top));
  const corpusLit = entry.corpus
    .map((item) => `    {"text": ${pyStr(item.text)}, "label": ${item.label ? 'True' : 'False'}},`)
    .join('\n');
  const setsLit = `{${Object.entries(entry.ruleSets)
    .map(([name, rules]) => `${pyStr(name)}: ${pyList(rules.map(pyStr))}`)
    .join(', ')}}`;
  return [
    `__c${index} = [`,
    corpusLit,
    ']',
    `__s${index} = ${setsLit}`,
    `__t${index} = detector_table(__c${index}, __s${index})`,
    ...rows.map((row) => `__check('seeded zeile ${row.name} ${index}', __t${index}[${pyStr(row.name)}] == ${pyDetectorRow(row.counts)})`),
    `__check('seeded summe ${index}', all(row["tp"] + row["fp"] + row["fn"] + row["tn"] == ${entry.corpus.length} for row in __t${index}.values()))`,
    `__check('seeded best ${index}', best_by_f1(__t${index}) == ${pyStr(best.name)})`,
  ].join('\n');
}

// Case definitions: the draw domains produce concrete literals that get baked
// into the test block (honest distinctness — the drawn scenarios differ, not
// just a seed literal). Expected values come from the JS mirror; float fields
// are emitted as the reference solver's own round()/division expressions.
export const DETECTOR_EVAL_CASES = {
  'run-eval-compare-rulesets': {
    difficulty: 'challenge',
    draw(r) {
      const size = randInt(r, 4, 6);
      return { records: Array.from({ length: size }, () => drawEvalRecord(r)) };
    },
    seededChecks: evalSeededChecks,
    extraCount: 3,
  },
  'detector-table-best-f1': {
    difficulty: 'challenge',
    draw(r) {
      return until(r, () => drawTableScenario(r), tableScenarioOk, { scope: 'detector-table-best-f1' });
    },
    seededChecks: tableSeededChecks,
    extraCount: 3,
  },
};

export const DETECTOR_EVAL_CONTRACT = {
  familyId: 'aggregate-detector-eval-compare',
  familyGroup: 'aggregate-count',
  summary: 'Wertet mehrere deterministische Regelwerke oder Detektoren auf einem gelabelten Korpus aus, führt eine Metriktabelle und kürt den Sieger über deterministische Rundung und Namens-Tie-Break.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'run-eval-compare-rulesets', propertyTest: false },
    { caseId: 'detector-table-best-f1', propertyTest: false },
  ],
  difficultyProfiles: ['challenge'],
  competencyIds: ['c-genai-eval', 'c-ml-erroranalysis', 'c-genai-security', 'c-testing-debugging'],
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: DETECTOR_EVAL_CONTRACT,
  cases: DETECTOR_EVAL_CASES,
  shapeError: 'Detektor-Eval-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) =>
    `# seeded extra cases\n${seedCases.map((entry, i) => caseDef.seededChecks(entry, i + 1)).join('\n')}`,
  defaultPackages: PACKAGES,
});

