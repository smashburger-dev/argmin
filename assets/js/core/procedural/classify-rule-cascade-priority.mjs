// Procedural family classify-rule-cascade-priority: the task text, starter
// code and reference solver stay fixed; the seed draws fresh rule cascades
// (shuffled kinds with drawn labels) plus record/policy fixtures that get
// appended to the curated base test block as literal __check lines. Every
// drawn expectation is evaluated against a renamed __ref_ copy of the
// reference solver, so the grading contract cannot drift. Mirrors
// reproduce-seeded-split.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/classify-rule-cascade-priority.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/classify-rule-cascade-priority.json.
const CASE_PAYLOADS = {
  "error-taxonomy-classify": { "difficulty": "core", "competencyIds": ["c-genai-eval","c-python-functions"] },
  "permission-policy-check": { "difficulty": "stretch", "competencyIds": ["c-genai-security","c-testing-debugging"] },
};

// Returns ("ok", result) or (exception type, message): kept in the emitted
// prelude so every family block shares the same shape even though this
// family's contract has no error path to compare.

// Draw pools for the taxonomy cascade: label variants per rule kind, doc-id
// sources and German gold/answer sentences with and without digits. All
// pools stay quote- and backslash-free.
const KIND_LABELS = {
  'empty-answer': ['formatfehler', 'leer', 'keine-antwort'],
  'no-citations': ['quellos', 'beleglos'],
  'no-shared-terms': ['off-topic', 'themenfremd'],
  'unknown-citation': ['halluziniert', 'beleg-fremd'],
  'foreign-number': ['falsch-faktisch', 'zahl-fremd'],
  'missing-gold-number': ['unvollständig', 'luecke'],
  default: ['unvollständig', 'passt'],
};
const RULE_KINDS = ['empty-answer', 'no-citations', 'no-shared-terms', 'unknown-citation', 'foreign-number', 'missing-gold-number'];
const SOURCE_POOL = ['faq-3', 'faq-7', 'vertrag-1', 'handbuch-2', 'blog-x'];
const UNKNOWN_SOURCES = ['wiki-9', 'forum-4', 'mail-1'];
const GOLD_POOL = [
  'Die Lieferzeit beträgt 3 Werktage.',
  'Die Frist endet nach 30 Tagen.',
  'Die Garantie deckt Herstellungsfehler.',
  'Der Rabatt gilt nur im Sommer.',
  'Die Rückgabe ist 14 Tage möglich.',
];
const OFFTOPIC_POOL = [
  'Der Kuchen schmeckt nach Zitrone.',
  'Heute scheint die Sonne über der Stadt.',
  'Der Zug fährt um neun Uhr ab.',
];

// Policy-cascade pools for the permission case: tool names and arg names in
// the w29 register.
const ALLOWED_POOL = ['suche', 'lese', 'filter'];
const RESTRICTED_POOL = ['export', 'speichern', 'senden', 'schreibe'];
const RESTRICTED_ARG_POOL = ['bericht', 'protokoll', 'auszug', 'notizen'];
const FORBIDDEN_POOL = ['mail', 'hook', 'exec'];
const UNKNOWN_TOOL_POOL = ['admin', 'root', 'deploy'];

// Shuffled cascade: all six concrete kinds in drawn order, the default rule
// always last (the contract requires a trailing default).
const drawRules = (r) => [
  ...shuffle(r, [...RULE_KINDS]).map((kind) => ({ label: pick(r, KIND_LABELS[kind]), kind })),
  { label: pick(r, KIND_LABELS.default), kind: 'default' },
];

// Record fixture: gold sentence plus a drawn answer style (same / empty /
// off-topic / number-swapped) and a citation list that sometimes reaches
// outside the drawn sources.
const drawRecord = (r, sources) => {
  const gold = pick(r, GOLD_POOL);
  const style = pick(r, ['same', 'same', 'empty', 'offtopic', 'numbers']);
  let answer = gold;
  if (style === 'empty') answer = '   ';
  if (style === 'offtopic') answer = pick(r, OFFTOPIC_POOL);
  if (style === 'numbers' && /\d/.test(gold)) answer = gold.replace(/\d+/, String(randInt(r, 40, 99)));
  const cited = shuffle(r, [...sources]).slice(0, randInt(r, 1, Math.min(2, sources.length)));
  if (r() < 0.3) cited.push(pick(r, UNKNOWN_SOURCES));
  const citations = r() < 0.25 ? [] : cited;
  return { answer, gold, citations, sources };
};

export const CASCADE_CASES = {
  'error-taxonomy-classify': {
    ...CASE_PAYLOADS['error-taxonomy-classify'],
    competencyIds: ['c-genai-eval', 'c-python-functions'],
    refNames: ['classify', 'citation_precision', '_words', '_content_words', '_numbers'],
    // One record fixture plus a shuffled rule cascade and a citation probe;
    // the renamed oracle decides which arm each record lands on.
    draw(r) {
      const sources = shuffle(r, [...SOURCE_POOL]).slice(0, randInt(r, 2, 4));
      const record = drawRecord(r, sources);
      const rules = drawRules(r);
      const cited = shuffle(r, [...sources, pick(r, UNKNOWN_SOURCES)]).slice(0, randInt(r, 0, 3));
      return { record, rules, cited, sources };
    },
    emit(entry, index) {
      const p = `__tx${index}`;
      return [
        `${p}_rules = ${pyLit(entry.rules)}`,
        `${p}_rec = ${pyLit(entry.record)}`,
        `__check('seeded classify ${index}', classify(${p}_rec, ${p}_rules) == __ref_classify(${p}_rec, ${p}_rules))`,
        `__check('seeded zitat ${index}', citation_precision(${pyLit(entry.cited)}, ${pyLit(entry.sources)}) == __ref_citation_precision(${pyLit(entry.cited)}, ${pyLit(entry.sources)}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'permission-policy-check': {
    ...CASE_PAYLOADS['permission-policy-check'],
    competencyIds: ['c-genai-security', 'c-testing-debugging'],
    refNames: ['check_permissions'],
    // Drawn policy (allowed/restricted/forbidden) plus calls drawn from the
    // cascade arms: allowed, restricted-ok, restricted-bad, forbidden, unknown.
    draw(r) {
      const allowed = shuffle(r, [...ALLOWED_POOL]).slice(0, randInt(r, 1, 2));
      const restrictedTool = pick(r, RESTRICTED_POOL);
      const restrictedArgs = shuffle(r, [...RESTRICTED_ARG_POOL]).slice(0, randInt(r, 1, 2));
      const forbidden = shuffle(r, [...FORBIDDEN_POOL]).slice(0, randInt(r, 1, 2));
      const policy = { allowed, restricted: { [restrictedTool]: restrictedArgs }, forbidden };
      const calls = [];
      const count = randInt(r, 3, 6);
      for (let j = 0; j < count; j += 1) {
        const roll = r();
        if (roll < 0.3) calls.push({ tool: pick(r, allowed), arg: pick(r, RESTRICTED_ARG_POOL) });
        else if (roll < 0.55) calls.push({ tool: restrictedTool, arg: pick(r, restrictedArgs) });
        else if (roll < 0.7) calls.push({ tool: restrictedTool, arg: `rohdaten-${randInt(r, 1, 9)}` });
        else if (roll < 0.85) calls.push({ tool: pick(r, forbidden), arg: 'x' });
        else calls.push({ tool: pick(r, UNKNOWN_TOOL_POOL), arg: 'x' });
      }
      return { calls, policy };
    },
    emit(entry, index) {
      const p = `__pm${index}`;
      return [
        `${p}_policy = ${pyLit(entry.policy)}`,
        `${p}_calls = ${pyLit(entry.calls)}`,
        `__check('seeded policy ${index}', check_permissions(${p}_calls, ${p}_policy) == __ref_check_permissions(${p}_calls, ${p}_policy))`,
      ].join('\n');
    },
    extraCount: 3,
  },
};

export const CASCADE_CONTRACT = {
  familyId: 'classify-rule-cascade-priority',
  familyGroup: 'classify-concept',
  summary: 'Wendet eine geordnete Regel- oder Policy-Kaskade an, in der die erste passende Regel gewinnt und der Default- beziehungsweise Unbekannt-Fall konservativ am Ende greift.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'error-taxonomy-classify', propertyTest: false },
    { caseId: 'permission-policy-check', propertyTest: false },
  ],
  difficultyProfiles: ['core', 'stretch'],
  competencyIds: ['c-genai-eval', 'c-python-functions', 'c-genai-security', 'c-testing-debugging'],
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: CASCADE_CONTRACT,
  cases: CASCADE_CASES,
  shapeError: 'Regel-Kaskaden-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${checks}`;
  },
});

