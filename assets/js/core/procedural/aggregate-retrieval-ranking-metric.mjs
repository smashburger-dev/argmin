// Procedural family aggregate-retrieval-ranking-metric: the task text,
// starter code and reference solver stay fixed; the seed draws fresh document
// sets, probe queries and relevant-id sets that get appended to the curated
// base test block as literal __check lines. Every drawn ranking/recall
// expectation is evaluated against a renamed __ref_ copy of the reference
// solver, so the grading contract cannot drift; __raised covers the empty-
// relevant ValueError path. Mirrors reproduce-seeded-split.mjs.

import { pyLit, RAISED_HELPER, refCopy } from './py_test_kit.mjs';
import { makeCaseFamily } from './case_family_kit.mjs';

import { pick, randInt, shuffle } from '../generator_draw_kit.mjs';
import doc from '../../../../content/families/aggregate-retrieval-ranking-metric.json' with { type: 'json' };

// Verbatim case payloads extracted from content/families/aggregate-retrieval-ranking-metric.json.
const CASE_PAYLOADS = {
  "retrieval-ranking-recall": { "difficulty": "stretch", "competencyIds": ["c-genai-rag","c-numpy-basics"] },
  "retrieval-evaluate-queries": { "difficulty": "challenge", "competencyIds": ["c-genai-rag","c-numpy-basics"] },
};

// JS mirror of the reference _tokens (lowercase, punctuation class removed,
// whitespace-split) — used only to draw probe queries that share a term with
// a chosen document. The emitted checks never read this helper.
const RETRIEVAL_PUNCT = new Set([...'!"$%&\'()*+,-./:;<=>?@[\\]^_`{|}~„“”‚‘’']);
const retrievalTerms = (text) => (
  [...text.toLowerCase()]
    .map((ch) => (RETRIEVAL_PUNCT.has(ch) ? ' ' : ch))
    .join('')
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !/^\d+$/.test(word))
);

// Draw pool: the German fixture sentences of both base cases plus query
// templates; the probes keep the w27 register and stay quote-free.
const DOC_POOL = [
  'Die Lieferzeit beträgt drei Werktage.',
  'Die Lieferzeit im Ausland beträgt zwei Wochen.',
  'Der Vertrag läuft zwölf Monate.',
  'Die Kündigung des Vertrags ist schriftlich möglich.',
  'Rabattcodes gelten im Sommer.',
  'Das Widerrufsrecht endet nach vierzehn Tagen.',
  'Achte auf die Frist: Widerspruch ist innerhalb von vierzehn Tagen möglich.',
  'Die Frist für die Rückgabe liegt bei dreißig Tagen ab Kauf.',
  'Rückgaben ohne Kassenbon werden nicht erstattet.',
  'Die Garantie deckt Herstellungsfehler, aber keine Sturzschäden.',
  'Fristen verlängern sich nicht automatisch; ein neuer Antrag ist nötig.',
  'Sturzschäden am Display sind von der Garantie ausgeschlossen.',
  'Ein Garantiefall benötigt die Seriennummer und das Kaufdatum.',
  'Ohne Kaufdatum gibt es keinen Garantiefall.',
];

const QUERY_TEMPLATES = [
  (term) => `Wie lange gilt ${term}?`,
  (term) => `Was gilt für ${term}?`,
  (term) => `Wann endet ${term}?`,
  (term) => `Gibt es Regeln zu ${term}?`,
];

const NOISE_QUERIES = ['xyzzy plugh', 'qwertz asdf', 'blubb bla foo'];

const drawRelevant = (r, docCount) => (
  shuffle(r, Array.from({ length: docCount }, (_, i) => i)).slice(0, randInt(r, 1, 2))
);

const drawQuery = (r, docs) => {
  if (r() < 0.15) return pick(r, NOISE_QUERIES);
  const docIndex = randInt(r, 0, docs.length - 1);
  const terms = retrievalTerms(docs[docIndex]);
  const term = terms[randInt(r, 0, terms.length - 1)];
  return pick(r, QUERY_TEMPLATES)(term);
};

export const RANKING_CASES = {
  'retrieval-ranking-recall': {
    ...CASE_PAYLOADS['retrieval-ranking-recall'],
    competencyIds: ['c-genai-rag', 'c-numpy-basics'],
    refNames: ['build_vectors', 'rank', 'recall_at_k', '_tokens', '_query_vec'],
    // 4-6 docs, one probe query (term-sharing or noise), k and a relevant-id
    // subset; the learner ranking feeds both recall checks.
    draw(r) {
      const docCount = randInt(r, 4, 6);
      const docs = shuffle(r, [...DOC_POOL]).slice(0, docCount);
      const query = drawQuery(r, docs);
      const k = randInt(r, 1, 3);
      const relevant = drawRelevant(r, docCount);
      return { docs, query, k, relevant };
    },
    emit(entry, index) {
      const p = `__rk${index}`;
      return [
        `${p}_docs = ${pyLit(entry.docs)}`,
        `${p}_ranked = rank(${pyLit(entry.query)}, ${p}_docs, ${entry.k})`,
        `__check('seeded rank ${index}', ${p}_ranked == __ref_rank(${pyLit(entry.query)}, ${p}_docs, ${entry.k}))`,
        `__check('seeded recall ${index}', recall_at_k(${pyLit(entry.relevant)}, ${p}_ranked, ${entry.k}) == __ref_recall_at_k(${pyLit(entry.relevant)}, ${p}_ranked, ${entry.k}))`,
        `__check('seeded recall leer ${index}', __raised(recall_at_k, [], ${p}_ranked, ${entry.k}) == __raised(__ref_recall_at_k, [], ${p}_ranked, ${entry.k}))`,
      ].join('\n');
    },
    extraCount: 3,
  },
  'retrieval-evaluate-queries': {
    ...CASE_PAYLOADS['retrieval-evaluate-queries'],
    competencyIds: ['c-genai-rag', 'c-numpy-basics'],
    refNames: ['build_index', 'rank_query', 'evaluate', '_tokens'],
    // 5-8 docs, 2-4 queries each with a relevant subset, k in 1..3; learner
    // and reference each build their own index and stay on their own side.
    draw(r) {
      const docCount = randInt(r, 5, 8);
      const docs = shuffle(r, [...DOC_POOL]).slice(0, docCount);
      const qCount = randInt(r, 2, 4);
      const queries = [];
      const rels = [];
      for (let j = 0; j < qCount; j += 1) {
        queries.push(drawQuery(r, docs));
        rels.push(drawRelevant(r, docCount));
      }
      return { docs, queries, rels, k: randInt(r, 1, 3) };
    },
    emit(entry, index) {
      const p = `__ev${index}`;
      const lines = [
        `${p}_docs = ${pyLit(entry.docs)}`,
        `${p}_idx = build_index(${p}_docs)`,
        `${p}_ridx = __ref_build_index(${p}_docs)`,
      ];
      entry.queries.forEach((query, j) => {
        lines.push(`__check('seeded ranking ${index}.${j + 1}', rank_query(${p}_idx, ${pyLit(query)}) == __ref_rank_query(${p}_ridx, ${pyLit(query)}))`);
      });
      lines.push(`${p}_qs = ${pyLit(entry.queries)}`);
      lines.push(`${p}_rels = ${pyLit(entry.rels)}`);
      lines.push(`__check('seeded eval ${index}', evaluate(${p}_idx, ${p}_qs, ${p}_rels, ${entry.k}) == __ref_evaluate(${p}_ridx, ${p}_qs, ${p}_rels, ${entry.k}))`);
      lines.push(`__check('seeded eval leer ${index}', __raised(evaluate, ${p}_idx, [], [], ${entry.k}) == __raised(__ref_evaluate, ${p}_ridx, [], [], ${entry.k}))`);
      return lines.join('\n');
    },
    extraCount: 3,
  },
};

export const RANKING_CONTRACT = {
  familyId: 'aggregate-retrieval-ranking-metric',
  familyGroup: 'aggregate-count',
  summary: 'Berechnet TF-IDF- und Kosinusähnlichkeit als Ranking-Metrik, leitet das Ranking ab und evaluiert es mit Recall@k und MRR.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'retrieval-ranking-recall', propertyTest: false },
    { caseId: 'retrieval-evaluate-queries', propertyTest: false },
  ],
  difficultyProfiles: ['stretch', 'challenge'],
  competencyIds: ['c-genai-rag', 'c-numpy-basics'],
};

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
export const FAMILY_SPEC = makeCaseFamily({
  doc,
  contract: RANKING_CONTRACT,
  cases: RANKING_CASES,
  shapeError: 'Retrieval-Ranking-Parameter verletzen die Kapselform',
  seededBlock: (caseDef, _caseId, seedCases) => {
    const checks = seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n');
    return `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${checks}`;
  },
});

