// Procedural family construct-stub-prototype-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh fixture configs
// (docs/queries/k plus probe queries) that get appended to the curated base
// test block as literal __check lines. Every drawn answer/metrics expectation
// is evaluated against a renamed __ref_ copy of the reference solver, so the
// grading contract cannot drift. Mirrors reproduce-canonical-hash-verify.mjs.

import { refCopy, pyLit as py } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/construct-stub-prototype-contract.json' with { type: 'json' };

const PACKAGES = [];

// fullSolution equals the reference solver byte-for-byte (the JSON case
// carries the same string in both fields, trailing comments included).

// Serializes drawn data as Python literals (the pools stay quote- and
// backslash-free, so the generated test block has no escaping hazards).

// JS mirror of the reference _terms (lowercase, punctuation class removed,
// length >= 4, no digits) — used only to draw probe queries that share a term
// with a chosen document. The emitted checks never read this helper.
const STUB_PUNCT = new Set([...'!"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~„“”‚‘’']);
const stubTerms = (text) => new Set(
  [...text.toLowerCase()]
    .map((ch) => (STUB_PUNCT.has(ch) ? ' ' : ch))
    .join('')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word)),
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

export const STUB_CASES = {
  'stub-prototype-contract': {
    difficulty: 'core',
    refNames: ['build_prototype', '_norm', '_terms', '_rank_docs', 'NO_HIT'],
    extraCount: 3,
    // Seed entries keep their { config } wrapper shape.
    draw(r) {
      return { config: drawConfig(r) };
    },
  },
};

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
};

export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: STUB_CONTRACT,
  cases: STUB_CASES,
  shapeError: 'Stub-Prototyp-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
  },
  defaultPackages: PACKAGES,
});

