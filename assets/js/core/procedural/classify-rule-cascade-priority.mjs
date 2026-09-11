// Procedural family classify-rule-cascade-priority: the task text, starter
// code and reference solver stay fixed; the seed draws fresh rule cascades
// (shuffled kinds with drawn labels) plus record/policy fixtures that get
// appended to the curated base test block as literal __check lines. Every
// drawn expectation is evaluated against a renamed __ref_ copy of the
// reference solver, so the grading contract cannot drift. Mirrors
// reproduce-seeded-split.mjs.

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/classify-rule-cascade-priority.json.
const CASE_PAYLOADS = {
  "error-taxonomy-classify": { "difficulty": "core", "packages": [], "starterCode": "import re\n\n\ndef classify(record, rules):\n    \"\"\"Wendet das Regelwerk (Liste mit 'kind'/'label', letzte Regel 'default') in fester Reihenfolge an.\"\"\"\n    ...\n\ndef citation_precision(cited, gold_sources):\n    \"\"\"Anteil zulaessiger Zitate an allen Zitaten; leere Liste -> 0.0.\"\"\"\n    ...\n\n", "baseTests": "RULES_FULL = [\n    {\"label\": \"formatfehler\", \"kind\": \"empty-answer\"},\n    {\"label\": \"quellos\", \"kind\": \"no-citations\"},\n    {\"label\": \"off-topic\", \"kind\": \"no-shared-terms\"},\n    {\"label\": \"halluziniert\", \"kind\": \"unknown-citation\"},\n    {\"label\": \"falsch-faktisch\", \"kind\": \"foreign-number\"},\n    {\"label\": \"unvollständig\", \"kind\": \"missing-gold-number\"},\n    {\"label\": \"unvollständig\", \"kind\": \"default\"},\n]\nSOURCES = [\"faq-3\", \"faq-7\", \"vertrag-1\"]\nR = [\n    {\"answer\": \"Die Lieferzeit beträgt 3 Werktage.\", \"gold\": \"Die Lieferzeit beträgt 3 Werktage ab Versand.\", \"citations\": [\"faq-3\"], \"sources\": SOURCES},\n    {\"answer\": \"   \", \"gold\": \"Die Frist beträgt 14 Tage.\", \"citations\": [\"faq-7\"], \"sources\": SOURCES},\n    {\"answer\": \"Die Lieferzeit beträgt 3 Werktage.\", \"gold\": \"Die Lieferzeit beträgt 3 Werktage.\", \"citations\": [], \"sources\": SOURCES},\n    {\"answer\": \"Der Kuchen schmeckt nach Zitrone.\", \"gold\": \"Die Lieferzeit beträgt 3 Werktage.\", \"citations\": [\"faq-3\"], \"sources\": SOURCES},\n    {\"answer\": \"Die Lieferzeit beträgt 3 Werktage.\", \"gold\": \"Die Lieferzeit beträgt 3 Werktage.\", \"citations\": [\"faq-3\", \"blog-x\"], \"sources\": SOURCES},\n    {\"answer\": \"Die Lieferzeit beträgt 9 Werktage.\", \"gold\": \"Die Lieferzeit beträgt 3 Werktage.\", \"citations\": [\"faq-3\"], \"sources\": SOURCES},\n    {\"answer\": \"Die Frist endet nach 14 Tagen.\", \"gold\": \"Die Frist endet nach 30 Tagen.\", \"citations\": [\"faq-3\"], \"sources\": SOURCES},\n    {\"answer\": \"Die Frist endet nach 30 Tagen.\", \"gold\": \"Die Frist endet nach 30 Tagen.\", \"citations\": [\"faq-3\"], \"sources\": SOURCES},\n]\n__check('leer -> formatfehler', classify(R[1], RULES_FULL) == \"formatfehler\")\n__check('ohne beleg -> quellos', classify(R[2], RULES_FULL) == \"quellos\")\n__check('am thema vorbei -> off-topic', classify(R[3], RULES_FULL) == \"off-topic\")\n__check('erfundener beleg -> halluziniert', classify(R[4], RULES_FULL) == \"halluziniert\")\n__check('fremde zahl -> falsch-faktisch', classify(R[5], RULES_FULL) == \"falsch-faktisch\")\n__check('widersprechende zahl -> falsch-faktisch', classify(R[6], RULES_FULL) == \"falsch-faktisch\")\n__check('alles belegt -> unvollstaendig als default', classify(R[7], RULES_FULL) == \"unvollständig\")\n__check('gold-zahl fehlt -> unvollstaendig', classify(R[0], RULES_FULL) == \"unvollständig\")\n__check('regelreihenfolge: leer schlaegt alles', classify({\"answer\": \"   \", \"gold\": \"x\", \"citations\": [], \"sources\": SOURCES}, RULES_FULL) == \"formatfehler\")\n__check('citation precision voll', citation_precision([\"faq-3\", \"faq-7\"], SOURCES) == 1.0)\n__check('citation precision halb', citation_precision([\"faq-3\", \"blog-x\"], SOURCES) == 0.5)\n__check('citation precision leer', citation_precision([], SOURCES) == 0.0)", "referenceSolver": "import re\n\ndef _words(text):\n    stripped = re.sub(r\"[!\\\"$%&'()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~„“”‚‘’]\", \" \", text.lower())\n    return stripped.split()\n\ndef _content_words(text):\n    return {w for w in _words(text) if len(w) >= 4 and not w.isdigit()}\n\ndef _numbers(text):\n    return set(re.findall(r\"\\d+\", text))\n\ndef classify(record, rules):\n    answer = record.get(\"answer\", \"\")\n    gold = record.get(\"gold\", \"\")\n    citations = record.get(\"citations\", [])\n    sources = record.get(\"sources\", [])\n    for rule in rules:\n        kind = rule.get(\"kind\")\n        label = rule[\"label\"]\n        if kind == \"default\":\n            return label\n        if kind == \"empty-answer\" and answer.strip() == \"\":\n            return label\n        if kind == \"no-citations\" and len(citations) == 0:\n            return label\n        if kind == \"no-shared-terms\" and not (_content_words(answer) & _content_words(gold)):\n            return label\n        if kind == \"unknown-citation\" and any(c not in sources for c in citations):\n            return label\n        if kind == \"foreign-number\" and (_numbers(answer) - _numbers(gold)):\n            return label\n        if kind == \"missing-gold-number\" and (_numbers(gold) - _numbers(answer)):\n            return label\n    return rules[-1][\"label\"]\n\ndef citation_precision(cited, gold_sources):\n    if not cited:\n        return 0.0\n    return sum(1 for c in cited if c in gold_sources) / len(cited)", "prompt": "Implementiere die Regelklassifikation der Fehlertaxonomie. <code>classify(record, rules)</code> erhält ein Record-Dictionary mit <code>answer</code>, <code>gold</code>, <code>citations</code>, <code>sources</code> und ein Regelwerk: geordnete Liste von <code>{\"label\": ..., \"kind\": ...}</code>, dessen letzte Regel <code>\"default\"</code> ist. Erste passende Regel gewinnt. Regel-Kind semantics: <code>empty-answer</code> (Antwort nur Whitespace), <code>no-citations</code> (leere Belegliste), <code>no-shared-terms</code> (kein gemeinsamer Inhaltsbegriff — Wörter mit Länge ≥ 4, keine Ziffern, nach Kleinbuchstaben-/Satzzeichen-Normalisierung), <code>unknown-citation</code> (Beleg außerhalb von sources), <code>foreign-number</code> (Zahl in der Antwort, die nicht unter den Gold-Zahlen), <code>missing-gold-number</code> (Gold-Zahl fehlt in der Antwort), <code>default</code> (trifft immer zu). <code>citation_precision(cited, gold_sources)</code> = Anteil zulässiger Zitate (leere Liste → 0.0). Der Testcode bringt eigene Regelwerke und gelabelte Fixtures mit.", "fullSolution": "import re\n\ndef _words(text):\n    stripped = re.sub(r\"[!\\\"$%&'()*+,\\-./:;<=>?@\\[\\\\\\]^_`{|}~„“”‚‘’]\", \" \", text.lower())\n    return stripped.split()\n\ndef _content_words(text):\n    return {w for w in _words(text) if len(w) >= 4 and not w.isdigit()}\n\ndef _numbers(text):\n    return set(re.findall(r\"\\d+\", text))\n\ndef classify(record, rules):\n    answer = record.get(\"answer\", \"\")\n    gold = record.get(\"gold\", \"\")\n    citations = record.get(\"citations\", [])\n    sources = record.get(\"sources\", [])\n    for rule in rules:\n        kind = rule.get(\"kind\")\n        label = rule[\"label\"]\n        if kind == \"default\":\n            return label\n        if kind == \"empty-answer\" and answer.strip() == \"\":\n            return label\n        if kind == \"no-citations\" and len(citations) == 0:\n            return label\n        if kind == \"no-shared-terms\" and not (_content_words(answer) & _content_words(gold)):\n            return label\n        if kind == \"unknown-citation\" and any(c not in sources for c in citations):\n            return label\n        if kind == \"foreign-number\" and (_numbers(answer) - _numbers(gold)):\n            return label\n        if kind == \"missing-gold-number\" and (_numbers(gold) - _numbers(answer)):\n            return label\n    return rules[-1][\"label\"]\n\ndef citation_precision(cited, gold_sources):\n    if not cited:\n        return 0.0\n    return sum(1 for c in cited if c in gold_sources) / len(cited)\n\n# alle Fixtur-Labels der Tests werden reproduziert (lokal python3-verifiziert)", "competencyIds": ["c-genai-eval","c-python-functions"] },
  "permission-policy-check": { "difficulty": "stretch", "packages": [], "starterCode": "def check_permissions(tool_calls, policy):\n    \"\"\"Liste von {'index', 'tool', 'verdict', 'reason'} in Aufrufreihenfolge; reason None bei erlaubt.\"\"\"\n    ...\n\n", "baseTests": "POLICY = {\n    \"allowed\": [\"suche\", \"lese\"],\n    \"restricted\": {\"schreibe\": [\"notizen\"]},\n    \"forbidden\": [\"mail\", \"loesche\"],\n}\nCALLS = [\n    {\"tool\": \"suche\", \"arg\": \"lieferzeit\"},\n    {\"tool\": \"schreibe\", \"arg\": \"notizen\"},\n    {\"tool\": \"schreibe\", \"arg\": \"system\"},\n    {\"tool\": \"mail\", \"arg\": \"example.invalid\"},\n    {\"tool\": \"hook\", \"arg\": \"irgendwas\"},\n    {\"tool\": \"lese\", \"arg\": \"faq-3\"},\n]\nres = check_permissions(CALLS, POLICY)\n__check('erlaubte garantie', res[0] == {\"index\": 0, \"tool\": \"suche\", \"verdict\": \"allowed\", \"reason\": None})\n__check('eingeschraenktes argument ok', res[1][\"verdict\"] == \"allowed\" and res[1][\"reason\"] is None)\n__check('eingeschraenktes argument abgelehnt', res[2] == {\"index\": 2, \"tool\": \"schreibe\", \"verdict\": \"denied\", \"reason\": \"arg-not-allowed\"})\n__check('verboten bleibt verboten', res[3] == {\"index\": 3, \"tool\": \"mail\", \"verdict\": \"denied\", \"reason\": \"tool-forbidden\"})\n__check('unbekannt abgelehnt', res[4] == {\"index\": 4, \"tool\": \"hook\", \"verdict\": \"denied\", \"reason\": \"tool-unknown\"})\n__check('reihenfolge erhalten', [r[\"index\"] for r in res] == list(range(6)))\n__check('least privilege zaehlung', sum(1 for r in res if r[\"verdict\"] == \"allowed\") == 3)\n__check('leere aufrufe', check_permissions([], POLICY) == [])\n__check('alles verboten policy', all(r[\"verdict\"] == \"denied\" for r in check_permissions([{\"tool\": \"lese\", \"arg\": \"x\"}], {\"allowed\": [], \"restricted\": {}, \"forbidden\": [\"lese\"]})))", "referenceSolver": "def check_permissions(tool_calls, policy):\n    results = []\n    for i, call in enumerate(tool_calls):\n        tool = call[\"tool\"]\n        arg = call.get(\"arg\")\n        if tool in policy[\"forbidden\"]:\n            results.append({\"index\": i, \"tool\": tool, \"verdict\": \"denied\", \"reason\": \"tool-forbidden\"})\n        elif tool in policy.get(\"restricted\", {}):\n            if arg in policy[\"restricted\"][tool]:\n                results.append({\"index\": i, \"tool\": tool, \"verdict\": \"allowed\", \"reason\": None})\n            else:\n                results.append({\"index\": i, \"tool\": tool, \"verdict\": \"denied\", \"reason\": \"arg-not-allowed\"})\n        elif tool in policy[\"allowed\"]:\n            results.append({\"index\": i, \"tool\": tool, \"verdict\": \"allowed\", \"reason\": None})\n        else:\n            results.append({\"index\": i, \"tool\": tool, \"verdict\": \"denied\", \"reason\": \"tool-unknown\"})\n    return results\n\n# CALLS/POLICY aus dem Test: 3x allowed, arg-not-allowed, tool-forbidden, tool-unknown", "prompt": "Least Privilege als Code: Implementiere <code>check_permissions(tool_calls, policy)</code>. tool_calls: Liste von <code>{\"tool\": str, \"arg\": ...}</code>. policy: <code>{\"allowed\": [..], \"restricted\": {tool: [erlaubte Argumente]}, \"forbidden\": [..]}</code>. Rückgabe in Aufrufreihenfolge: <code>{\"index\": i, \"tool\": .., \"verdict\": \"allowed\"|\"denied\", \"reason\": None|\"tool-forbidden\"|\"arg-not-allowed\"|\"tool-unknown\"}</code>. Entscheidungsreihenfolge: forbidden schlägt alles; restricted prüft das Argument gegen seine Allowlist; allowed erlaubt; alles andere ist tool-unknown und abgelehnt. Der Testcode prüft jede Entscheidungsart, die Reihenfolge und Grenzfälle.", "fullSolution": "def check_permissions(tool_calls, policy):\n    results = []\n    for i, call in enumerate(tool_calls):\n        tool = call[\"tool\"]\n        arg = call.get(\"arg\")\n        if tool in policy[\"forbidden\"]:\n            results.append({\"index\": i, \"tool\": tool, \"verdict\": \"denied\", \"reason\": \"tool-forbidden\"})\n        elif tool in policy.get(\"restricted\", {}):\n            if arg in policy[\"restricted\"][tool]:\n                results.append({\"index\": i, \"tool\": tool, \"verdict\": \"allowed\", \"reason\": None})\n            else:\n                results.append({\"index\": i, \"tool\": tool, \"verdict\": \"denied\", \"reason\": \"arg-not-allowed\"})\n        elif tool in policy[\"allowed\"]:\n            results.append({\"index\": i, \"tool\": tool, \"verdict\": \"allowed\", \"reason\": None})\n        else:\n            results.append({\"index\": i, \"tool\": tool, \"verdict\": \"denied\", \"reason\": \"tool-unknown\"})\n    return results\n\n# CALLS/POLICY aus dem Test: 3x allowed, arg-not-allowed, tool-forbidden, tool-unknown", "competencyIds": ["c-genai-security","c-testing-debugging"] },
};

// Minimal JS -> Python literal serializer for the JSON-safe draw structures
// (dicts, lists, strings, numbers, booleans, null). Double-quoted strings are
// valid Python; True/False/None cover bool and null.
const pyLit = (value) => {
  if (value === null || value === undefined) return 'None';
  if (value === true) return 'True';
  if (value === false) return 'False';
  if (typeof value === 'number') return String(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(pyLit).join(', ')}]`;
  return `{${Object.entries(value).map(([k, v]) => `${JSON.stringify(k)}: ${pyLit(v)}`).join(', ')}}`;
};

// Returns ("ok", result) or (exception type, message): kept in the emitted
// prelude so every family block shares the same shape even though this
// family's contract has no error path to compare.
const RAISED_HELPER = `def __raised(fn, *args):
    try:
        return ("ok", fn(*args))
    except Exception as exc:
        return (type(exc).__name__, str(exc))`;

// Renames the module-level names of the reference solver so the test block
// can keep an inline oracle copy next to the seeded literals. All
// occurrences are rewritten so internal calls stay consistent.
const refCopy = (source, names) => (
  names.reduce((text, name) => text.split(name).join(`__ref_${name}`), source)
);

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
    // Drawn policy (allowed/restricted/forbidden) plus calls that cover every
    // cascade arm: allowed, restricted-ok, restricted-bad, forbidden, unknown.
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

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${checks}`;
}

const testsFor = (caseDef, seedCases) => `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`;

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function cascadeCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === testsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genCascadeCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, (_, i) => caseDef.draw(r, i));
  return {
    parameters: {
      packages: caseDef.packages,
      starterCode: caseDef.starterCode,
      tests: testsFor(caseDef, seedCases),
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
    competencyIds: caseDef.competencyIds,
  };
}

export function solveCascadeFamily(parameters) {
  const caseDef = Object.values(CASCADE_CASES).find((item) => cascadeCaseOk(parameters, item));
  if (!caseDef) throw new Error('Regel-Kaskaden-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

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
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateCascadeFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = CASCADE_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genCascadeCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...CASCADE_CONTRACT, generate: generateCascadeFamily, solve: solveCascadeFamily };
