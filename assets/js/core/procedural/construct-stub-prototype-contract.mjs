// Procedural family construct-stub-prototype-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh fixture configs
// (docs/queries/k plus probe queries) that get appended to the curated base
// test block as literal __check lines. Every drawn answer/metrics expectation
// is evaluated against a renamed __ref_ copy of the reference solver, so the
// grading contract cannot drift. Mirrors reproduce-canonical-hash-verify.mjs.

import { refCopy } from './py_test_kit.mjs';

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

const PACKAGES = [];

const STUB_STARTER = `import re

NO_HIT = "kein treffer"


def _norm(text):
    """Kleinbuchstaben, Umlaute bleiben, Satzzeichen raus, Whitespace zusammenziehen."""
    ...

def _terms(text):
    """Inhaltsbegriffe: normierte Woerter mit Laenge >= 4, keine Ziffern."""
    ...

def _rank_docs(query, docs):
    """(order, scores): Score = Anzahl gemeinsamer Begriffe; Gleichstand -> kleiner Index."""
    ...

def build_prototype(config):
    """{'answer': funktion, 'metrics': funktion} Stub-Generator plus Fixtur-Metrik."""
    ...

`;

const STUB_BASE_TESTS = `CONFIG4 = {
    "docs": [
        "Die Lieferzeit beträgt drei Werktage. Der Versand erfolgt mit DHL.",
        "Das Widerrufsrecht endet nach vierzehn Tagen. Danach ist keine Rückgabe mehr möglich.",
        "Rabattcodes gelten nur im Sommer. Eine Kombination mit anderen Aktionen ist ausgeschlossen.",
        "Die Garantie deckt Herstellungsfehler. Sturzschäden sind ausgenommen.",
    ],
    "queries": [
        {"query": "Wie lange beträgt die Lieferzeit?", "relevant": [0]},
        {"query": "Was deckt die Garantie?", "relevant": [3]},
        {"query": "Wann endet das Widerrufsrecht?", "relevant": [1]},
        {"query": "Bis wann läuft der Rabatt?", "relevant": [2]},
    ],
    "k": 1,
}
proto4 = build_prototype(CONFIG4)
__check('stub-antwort lieferzeit', proto4["answer"]("Wie lange beträgt die Lieferzeit?") == "Die Lieferzeit beträgt drei Werktage")
__check('stub-antwort garantie', proto4["answer"]("Was deckt die Garantie?") == "Die Garantie deckt Herstellungsfehler")
__check('stub-antwort zweiter satz', proto4["answer"]("Wie erfolgt der Versand?") == "Der Versand erfolgt mit DHL")
__check('kein treffer ehrlich', proto4["answer"]("Bis wann läuft der Rabatt?") == NO_HIT)
__check('kein treffer bei wirrwarr', proto4["answer"]("xyzzy plugh") == NO_HIT)
m4 = proto4["metrics"]()
__check('recall_at_k wert', abs(m4["recall_at_k"] - 0.75) < 1e-12)
__check('answered zaehlung', m4["answered"] == 3)
__check('antwort deterministisch', proto4["answer"]("Wie lange beträgt die Lieferzeit?") == proto4["answer"]("Wie lange beträgt die Lieferzeit?"))`;

const STUB_REFERENCE = `import re

NO_HIT = "kein treffer"

def _norm(text):
    stripped = re.sub(r"[!\\"$%&'()*+,\\-./:;<=>?@\\[\\\\\\]^_\`{|}~„“”‚‘’]", " ", text.lower())
    return " ".join(stripped.split())

def _terms(text):
    return {w for w in _norm(text).split() if len(w) >= 4 and not w.isdigit()}

def _rank_docs(query, docs):
    q_terms = _terms(query)
    scores = [len(q_terms & _terms(doc)) for doc in docs]
    order = sorted(range(len(docs)), key=lambda i: (-scores[i], i))
    return order, scores

def build_prototype(config):
    docs = config["docs"]
    k = config["k"]
    queries = config["queries"]

    def answer(query):
        order, scores = _rank_docs(query, docs)
        if not order or scores[order[0]] == 0:
            return NO_HIT
        best = order[0]
        sentences = [s.strip() for s in docs[best].split(".") if s.strip()]
        q_terms = _terms(query)
        for sentence in sentences:
            if q_terms & _terms(sentence):
                return sentence
        return sentences[0]

    def metrics():
        recalls = []
        answered = 0
        for item in queries:
            order, scores = _rank_docs(item["query"], docs)
            if order and scores[order[0]] > 0:
                answered += 1
            relevant = set(item["relevant"])
            recalls.append(len(set(order[:k]) & relevant) / len(relevant))
        return {"recall_at_k": sum(recalls) / len(recalls), "answered": answered}

    return {"answer": answer, "metrics": metrics}

# metrics() -> {'recall_at_k': 0.75, 'answered': 3}; 'Bis wann läuft der Rabatt?' -> kein treffer (Rabatt vs. Rabattcodes)`;

const STUB_PROMPT = 'Baue den Prototyp-Kern: <code>build_prototype(config)</code> liefert <code>{"answer": f, "metrics": f}</code>. config: <code>docs</code> (Liste deutscher Sätze), <code>queries</code> (Liste <code>{"query", "relevant"}</code>), <code>k</code>. Retrieval-Vertrag: Begriffe = kleingeschriebene Wörter mit Länge ≥ 4 ohne Ziffern (Satzzeichen entfernt, Umlaute bleiben); Score = Anzahl gemeinsamer Begriffe, Gleichstand → kleinerer Index. <code>answer(query)</code> (Stub-Generator, kein LLM): bestes Dokument, daraus der erste Satz (Punkt-getrennt, ohne Satzzeichen), der einen Anfragebegriff enthält; kein Treffer → der konstante String <code>"kein treffer"</code>. <code>metrics()</code>: <code>{"recall_at_k": mittelwert über queries, "answered": anzahl mit Treffer}</code>, recall = |top-k ∩ relevant| / |relevant|. Alles deterministisch. Der Testcode bringt die Fixtur-Config mit.';

// fullSolution equals the reference solver byte-for-byte (the JSON case
// carries the same string in both fields, trailing comments included).
const STUB_SOLUTION = STUB_REFERENCE;

// Renames the module-level reference names inside an emitted copy so the
// seeded block cannot collide with the learner's own definitions (and a
// redefined NO_HIT constant cannot poison the oracle).

// Serializes drawn data as Python literals (the pools stay quote- and
// backslash-free, so the generated test block has no escaping hazards).
const py = (value) => {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'number') return `${value}`;
  if (Array.isArray(value)) return `[${value.map(py).join(', ')}]`;
  return `{${Object.entries(value).map(([key, v]) => `${py(key)}: ${py(v)}`).join(', ')}}`;
};

// JS mirror of the reference _terms (lowercase, punctuation class removed,
// length >= 4, no digits) — used only to draw probe queries that share a term
// with a chosen document. The emitted checks never read this helper.
const STUB_PUNCT = new Set([...'!"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~„“”‚‘’']);
const stubTerms = (text) => new Set(
  [...text.toLowerCase()]
    .map((ch) => (STUB_PUNCT.has(ch) ? ' ' : ch))
    .join('')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !/^\\d+$/.test(word)),
);

// Draw pools: German two-sentence docs in the w30-e4 register plus query
// templates and gibberish probes for the honest no-hit path.
const DOC_POOL = [
  'Die Lieferzeit beträgt drei Werktage. Der Versand erfolgt mit DHL.',
  'Das Widerrufsrecht endet nach vierzehn Tagen. Danach ist keine Rückgabe mehr möglich.',
  'Rabattcodes gelten nur im Sommer. Eine Kombination mit anderen Aktionen ist ausgeschlossen.',
  'Die Garantie deckt Herstellungsfehler. Sturzschäden sind ausgenommen.',
  'Die Rechnung wird nach dem Versand erstellt. Der Betrag ist innerhalb von zehn Tagen fällig.',
  'Der Support antwortet werktags innerhalb eines Tages. An Wochenenden bleibt der Chat geschlossen.',
  'Die Aktivierung erfolgt nach der Anmeldung. Danach bleibt das Konto dauerhaft freigeschaltet.',
  'Eine Stornierung ist bis zum Versand möglich. Danach greift das Rückgaberecht.',
  'Der Newsletter erscheint jeden Freitag. Eine Abmeldung ist jederzeit möglich.',
  'Die Wartung dauert zwei Stunden. In dieser Zeit bleibt das Portal offline.',
  'Die Erstattung erfolgt auf das gleiche Konto. Eine Barablöse ist nicht vorgesehen.',
  'Der Kurs beginnt immer am Montag. Eine Anmeldung ist bis Freitag möglich.',
];

const QUERY_TEMPLATES = [
  (term) => `Was gilt für ${term}?`,
  (term) => `Wie ist ${term} geregelt?`,
  (term) => `Gibt es Regeln zu ${term}?`,
  (term) => `Wie lange dauert ${term}?`,
  (term) => `Wann endet ${term}?`,
];

const NOISE_QUERIES = ['xyzzy plugh', 'qwertz asdf', 'blubb bla foo', 'zqx wvkp'];

// Draws one fixture config: 3-5 docs, 2-4 queries (term-sharing hits derived
// from a chosen doc plus gibberish misses), k in {1,2}. The emitted checks
// re-evaluate every query through the renamed reference prototype.
function drawConfig(r) {
  const docCount = randInt(r, 3, 5);
  const docs = shuffle(r, [...DOC_POOL]).slice(0, docCount);
  const queryCount = randInt(r, 2, 4);
  const queries = [];
  for (let i = 0; i < queryCount; i += 1) {
    if (r() < 0.25) {
      queries.push({ query: pick(r, NOISE_QUERIES), relevant: [randInt(r, 0, docCount - 1)] });
      continue;
    }
    const docIndex = randInt(r, 0, docCount - 1);
    const terms = [...stubTerms(docs[docIndex])];
    const term = terms[randInt(r, 0, terms.length - 1)];
    queries.push({ query: pick(r, QUERY_TEMPLATES)(term), relevant: [docIndex] });
  }
  return { docs, queries, k: randInt(r, 1, 2) };
}

// Seeded block: renamed reference copy once, then per draw the literal config,
// both prototype instances, one answer check per fixture query and one metrics
// comparison (dict equality — both sides compute the same floats).
function seededChecks(entry, index) {
  const lines = [
    `__cfg${index} = ${py(entry.config)}`,
    `__p${index} = build_prototype(__cfg${index})`,
    `__rp${index} = __ref_build_prototype(__cfg${index})`,
  ];
  entry.config.queries.forEach((item, j) => {
    lines.push(`__check('seeded antwort ${index}.${j + 1}', __p${index}["answer"](${py(item.query)}) == __rp${index}["answer"](${py(item.query)}))`);
  });
  lines.push(`__check('seeded metriken ${index}', __p${index}["metrics"]() == __rp${index}["metrics"]())`);
  return lines.join('\n');
}

function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
}

export const STUB_CASES = {
  'stub-prototype-contract': {
    difficulty: 'core',
    starterCode: STUB_STARTER,
    baseTests: STUB_BASE_TESTS,
    referenceSolver: STUB_REFERENCE,
    refNames: ['build_prototype', '_norm', '_terms', '_rank_docs', 'NO_HIT'],
    prompt: STUB_PROMPT,
    fullSolution: STUB_SOLUTION,
    extraCount: 3,
    draw: drawConfig,
  },
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function stubCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genStubCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => ({ config: caseDef.draw(r) }));
  return {
    parameters: {
      packages: PACKAGES,
      starterCode: caseDef.starterCode,
      tests: `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`,
      seedCases,
    },
    expected: { kind: 'reference-solver', referenceSolver: caseDef.referenceSolver },
    prompt: caseDef.prompt,
    fullSolution: caseDef.fullSolution,
  };
}

export function solveStubFamily(parameters) {
  const caseDef = Object.values(STUB_CASES).find((item) => stubCaseOk(parameters, item));
  if (!caseDef) throw new Error('Stub-Prototyp-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const STUB_CONTRACT = {
  familyId: 'construct-stub-prototype-contract',
  familyGroup: 'construct-program',
  summary: 'Implementiert den Stub-Prototyp-Kern ohne LLM: Term-Normalisierung, Dokument- und Satzwahl mit Index-Tie-Break, ehrlicher Fehlstring plus Fixtur-Metriken.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'stub-prototype-contract', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-genai-prototype', 'c-python-functions'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateStubFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = STUB_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genStubCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...STUB_CONTRACT, generate: generateStubFamily, solve: solveStubFamily };
