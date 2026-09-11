// Procedural family aggregate-retrieval-ranking-metric: the task text,
// starter code and reference solver stay fixed; the seed draws fresh document
// sets, probe queries and relevant-id sets that get appended to the curated
// base test block as literal __check lines. Every drawn ranking/recall
// expectation is evaluated against a renamed __ref_ copy of the reference
// solver, so the grading contract cannot drift; __raised covers the empty-
// relevant ValueError path. Mirrors reproduce-seeded-split.mjs.

import { RAISED_HELPER, refCopy } from './py_test_kit.mjs';

import { pick, randInt, rng, shuffle } from '../generator_draw_kit.mjs';

// Verbatim case payloads extracted from content/families/aggregate-retrieval-ranking-metric.json.
const CASE_PAYLOADS = {
  "retrieval-ranking-recall": { "difficulty": "stretch", "packages": ["numpy"], "starterCode": "import numpy as np\n\n\ndef build_vectors(docs):\n    \"\"\"TF-IDF-Matrix (n_docs x |vocab|) mit idf = log((n+1)/(df+1)) + 1, tf normiert auf Dokumentlänge.\"\"\"\n    ...\n\ndef rank(query, docs, k):\n    \"\"\"Top-k Indizes nach Kosinus-Aehnlichkeit, Gleichstand -> kleinster Index zuerst.\"\"\"\n    ...\n\ndef recall_at_k(relevant, ranked, k):\n    \"\"\"|top-k ∩ relevant| / |relevant|; leere relevant-Liste -> ValueError.\"\"\"\n    ...\n\n", "baseTests": "DOCS = [\n    \"Die Lieferzeit beträgt drei Werktage.\",\n    \"Die Lieferzeit im Ausland beträgt zwei Wochen.\",\n    \"Der Vertrag läuft zwölf Monate.\",\n    \"Die Kündigung des Vertrags ist schriftlich möglich.\",\n    \"Rabattcodes gelten im Sommer.\",\n    \"Das Widerrufsrecht endet nach vierzehn Tagen.\",\n]\n__check('lieferzeit top1', rank(\"Wie lange beträgt die Lieferzeit?\", DOCS, 3)[0] == 0)\n__check('lieferzeit top2 sortierung', rank(\"Wie lange beträgt die Lieferzeit?\", DOCS, 2) == [0, 1])\n__check('vertrag top1', rank(\"Wie lange läuft der Vertrag?\", DOCS, 1) == [2])\n__check('widerruf top1', rank(\"Wann endet das Widerrufsrecht?\", DOCS, 1) == [5])\n__check('recall voll', abs(recall_at_k([0, 1], rank(\"Wie lange beträgt die Lieferzeit?\", DOCS, 2), 2) - 1.0) < 1e-12)\n__check('recall halb', abs(recall_at_k([0, 1], rank(\"Wie lange beträgt die Lieferzeit?\", DOCS, 1), 1) - 0.5) < 1e-12)\n__check('recall null', recall_at_k([5], rank(\"Wie lange läuft der Vertrag?\", DOCS, 2), 2) == 0.0)\ntry:\n    recall_at_k([], [0, 1], 2)\n    __check('leere relevante -> ValueError', False, 'kein ValueError')\nexcept ValueError:\n    __check('leere relevante -> ValueError', True)", "referenceSolver": "import numpy as np\n\ndef _tokens(text):\n    PUNCT = \"!\\\"$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~„“”‚‘’\"\n    stripped = \"\".join(ch for ch in text.lower() if ch not in PUNCT)\n    return \" \".join(stripped.split()).split()\n\ndef build_vectors(docs):\n    doc_tokens = [_tokens(d) for d in docs]\n    vocab = sorted({t for toks in doc_tokens for t in toks})\n    pos = {t: i for i, t in enumerate(vocab)}\n    n = len(docs)\n    df = np.zeros(len(vocab))\n    for toks in doc_tokens:\n        for t in set(toks):\n            df[pos[t]] += 1.0\n    idf = np.log((n + 1.0) / (df + 1.0)) + 1.0\n    m = np.zeros((n, len(vocab)))\n    for i, toks in enumerate(doc_tokens):\n        for t in toks:\n            m[i, pos[t]] += 1.0\n        nz = m[i] > 0\n        m[i, nz] = (m[i, nz] / len(toks)) * idf[nz]\n    return vocab, pos, m\n\ndef _query_vec(vocab, pos, m, query):\n    n = m.shape[0]\n    v = np.zeros(len(vocab))\n    for t in _tokens(query):\n        if t in pos:\n            v[pos[t]] += 1.0\n    total = v.sum()\n    if total > 0:\n        nz = v > 0\n        df = (m[:, nz] > 0).sum(axis=0)\n        v[nz] = (v[nz] / total) * (np.log((n + 1.0) / (df + 1.0)) + 1.0)\n    return v\n\ndef rank(query, docs, k):\n    vocab, pos, m = build_vectors(docs)\n    v = _query_vec(vocab, pos, m, query)\n    norms = np.linalg.norm(m, axis=1) * np.linalg.norm(v)\n    norms[norms == 0.0] = 1.0\n    scores = (m @ v) / norms\n    order = sorted(range(len(docs)), key=lambda i: (-scores[i], i))\n    return order[:k]\n\ndef recall_at_k(relevant, ranked, k):\n    rel = set(relevant)\n    if not rel:\n        raise ValueError(\"relevant darf nicht leer sein\")\n    return len(set(ranked[:k]) & rel) / len(rel)\n\n# rank(\"Wie lange läuft der Vertrag?\", DOCS, 1) -> [2]", "prompt": "Implementiere die deterministische Retrieval-Baseline mit NumPy. <code>build_vectors(docs)</code> liefert (vocab, pos, matrix) mit TF-IDF: $\\mathrm{tf}(t,d)/|d| \\cdot (\\log\\frac{n+1}{\\mathrm{df}(t)+1} + 1)$, Vokabular sortiert, Normalisierung wie in w27-e4 (Kleinbuchstaben, Umlaute bleiben, Satzzeichen weg). <code>rank(query, docs, k)</code> sortiert nach Kosinus-Ähnlichkeit zwischen Anfragevektor (gleiche Gewichtung) und Dokumentzeilen, Gleichstand entscheidet der kleinste Index; Rückgabe die Top-k-Indizes. <code>recall_at_k(relevant, ranked, k)</code> = |Top-k ∩ relevant| / |relevant|, leere relevant-Liste → <code>ValueError</code>. Der Testcode nutzt die feste Dokumentmenge DOCS und prüft Rankings sowie Recall-Werte.", "fullSolution": "import numpy as np\n\ndef _tokens(text):\n    PUNCT = \"!\\\"$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~„“”‚‘’\"\n    stripped = \"\".join(ch for ch in text.lower() if ch not in PUNCT)\n    return \" \".join(stripped.split()).split()\n\ndef build_vectors(docs):\n    doc_tokens = [_tokens(d) for d in docs]\n    vocab = sorted({t for toks in doc_tokens for t in toks})\n    pos = {t: i for i, t in enumerate(vocab)}\n    n = len(docs)\n    df = np.zeros(len(vocab))\n    for toks in doc_tokens:\n        for t in set(toks):\n            df[pos[t]] += 1.0\n    idf = np.log((n + 1.0) / (df + 1.0)) + 1.0\n    m = np.zeros((n, len(vocab)))\n    for i, toks in enumerate(doc_tokens):\n        for t in toks:\n            m[i, pos[t]] += 1.0\n        nz = m[i] > 0\n        m[i, nz] = (m[i, nz] / len(toks)) * idf[nz]\n    return vocab, pos, m\n\ndef _query_vec(vocab, pos, m, query):\n    n = m.shape[0]\n    v = np.zeros(len(vocab))\n    for t in _tokens(query):\n        if t in pos:\n            v[pos[t]] += 1.0\n    total = v.sum()\n    if total > 0:\n        nz = v > 0\n        df = (m[:, nz] > 0).sum(axis=0)\n        v[nz] = (v[nz] / total) * (np.log((n + 1.0) / (df + 1.0)) + 1.0)\n    return v\n\ndef rank(query, docs, k):\n    vocab, pos, m = build_vectors(docs)\n    v = _query_vec(vocab, pos, m, query)\n    norms = np.linalg.norm(m, axis=1) * np.linalg.norm(v)\n    norms[norms == 0.0] = 1.0\n    scores = (m @ v) / norms\n    order = sorted(range(len(docs)), key=lambda i: (-scores[i], i))\n    return order[:k]\n\ndef recall_at_k(relevant, ranked, k):\n    rel = set(relevant)\n    if not rel:\n        raise ValueError(\"relevant darf nicht leer sein\")\n    return len(set(ranked[:k]) & rel) / len(rel)\n\n# rank(\"Wie lange läuft der Vertrag?\", DOCS, 1) -> [2]\n\n# rank('Wie lange läuft der Vertrag?', DOCS, 1) -> [2]; recall-Tests exakt grün", "competencyIds": ["c-genai-rag","c-numpy-basics"] },
  "retrieval-evaluate-queries": { "difficulty": "challenge", "packages": ["numpy"], "starterCode": "import numpy as np\n\n\ndef build_index(docs):\n    \"\"\"Index aus Vokabular und TF-IDF-Matrix (gleiche Formeln wie in w27-e5).\"\"\"\n    ...\n\ndef rank_query(index, query):\n    \"\"\"Komplettes Ranking (alle Dokumente) nach Kosinus, Gleichstand -> kleinster Index.\"\"\"\n    ...\n\ndef evaluate(index, queries, relevant_sets, k):\n    \"\"\"{'recall_at_k': mittelwert, 'mrr': mittelwert der 1/rank des ersten relevanten Dokuments}.\"\"\"\n    ...\n\n", "baseTests": "B_DOCS = [\n    \"Achte auf die Frist: Widerspruch ist innerhalb von vierzehn Tagen möglich.\",\n    \"Die Frist für die Rückgabe liegt bei dreißig Tagen ab Kauf.\",\n    \"Rückgaben ohne Kassenbon werden nicht erstattet.\",\n    \"Die Garantie deckt Herstellungsfehler, aber keine Sturzschäden.\",\n    \"Fristen verlängern sich nicht automatisch; ein neuer Antrag ist nötig.\",\n    \"Sturzschäden am Display sind von der Garantie ausgeschlossen.\",\n    \"Ein Garantiefall benötigt die Seriennummer und das Kaufdatum.\",\n    \"Ohne Kaufdatum gibt es keinen Garantiefall.\",\n]\nB_QUERIES = [\"Bis wann ist Widerspruch möglich?\", \"Was deckt die Garantie?\", \"Wie lange gilt die Rückgabefrist?\", \"Was braucht ein Garantiefall?\"]\nB_RELEVANT = [[0], [5], [1], [6, 7]]\nb_index = build_index(B_DOCS)\n__check('index matrix form', b_index[\"matrix\"].shape == (8, len(b_index[\"vocab\"])))\n__check('widerspruch top1', rank_query(b_index, B_QUERIES[0])[0] == 0)\n__check('garantie ordnung', rank_query(b_index, B_QUERIES[1])[:2] == [3, 5])\nres1 = evaluate(b_index, B_QUERIES, B_RELEVANT, 1)\nres3 = evaluate(b_index, B_QUERIES, B_RELEVANT, 3)\n__check('recall@1 exakt', abs(res1[\"recall_at_k\"] - 0.625) < 1e-9)\n__check('mrr@1 exakt', abs(res1[\"mrr\"] - 0.875) < 1e-9)\n__check('recall@3 exakt', abs(res3[\"recall_at_k\"] - 1.0) < 1e-9)\n__check('metriken in [0,1]', 0.0 <= res3[\"mrr\"] <= 1.0 and 0.0 <= res3[\"recall_at_k\"] <= 1.0)", "referenceSolver": "import numpy as np\n\ndef _tokens(text):\n    PUNCT = \"!\\\"$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~„“”‚‘’\"\n    stripped = \"\".join(ch for ch in text.lower() if ch not in PUNCT)\n    return \" \".join(stripped.split()).split()\n\ndef build_index(docs):\n    doc_tokens = [_tokens(d) for d in docs]\n    vocab = sorted({t for toks in doc_tokens for t in toks})\n    pos = {t: i for i, t in enumerate(vocab)}\n    n = len(docs)\n    df = np.zeros(len(vocab))\n    for toks in doc_tokens:\n        for t in set(toks):\n            df[pos[t]] += 1.0\n    idf = np.log((n + 1.0) / (df + 1.0)) + 1.0\n    m = np.zeros((n, len(vocab)))\n    for i, toks in enumerate(doc_tokens):\n        for t in toks:\n            m[i, pos[t]] += 1.0\n        nz = m[i] > 0\n        m[i, nz] = (m[i, nz] / len(toks)) * idf[nz]\n    return {\"vocab\": vocab, \"pos\": pos, \"matrix\": m}\n\ndef rank_query(index, query):\n    m = index[\"matrix\"]\n    n = m.shape[0]\n    v = np.zeros(m.shape[1])\n    for t in _tokens(query):\n        if t in index[\"pos\"]:\n            v[index[\"pos\"][t]] += 1.0\n    total = v.sum()\n    if total > 0:\n        nz = v > 0\n        df = (m[:, nz] > 0).sum(axis=0)\n        v[nz] = (v[nz] / total) * (np.log((n + 1.0) / (df + 1.0)) + 1.0)\n    norms = np.linalg.norm(m, axis=1) * np.linalg.norm(v)\n    norms[norms == 0.0] = 1.0\n    scores = (m @ v) / norms\n    return sorted(range(n), key=lambda i: (-scores[i], i))\n\ndef evaluate(index, queries, relevant_sets, k):\n    recalls = []\n    rrs = []\n    for query, relevant in zip(queries, relevant_sets):\n        rel = set(relevant)\n        order = rank_query(index, query)\n        recalls.append(len(set(order[:k]) & rel) / len(rel))\n        rr = 0.0\n        for position, doc in enumerate(order, start=1):\n            if doc in rel:\n                rr = 1.0 / position\n                break\n        rrs.append(rr)\n    return {\"recall_at_k\": sum(recalls) / len(recalls), \"mrr\": sum(rrs) / len(rrs)}\n\n# evaluate(build_index(B_DOCS), B_QUERIES, B_RELEVANT, 1) -> {'recall_at_k': 0.625, 'mrr': 0.875}", "prompt": "Final Boss Retrieval-System: Baue einen bewertbaren Mini-Suchindex über den Fixtur-Korpus B_DOCS. <code>build_index(docs)</code> → Dictionary mit <code>\"vocab\"</code>, <code>\"pos\"</code> und <code>\"matrix\"</code> (TF-IDF wie in w27-e5). <code>rank_query(index, query)</code> → komplettes Ranking aller Dokumente nach Kosinus, Gleichstand → kleinster Index. <code>evaluate(index, queries, relevant_sets, k)</code> → <code>{\"recall_at_k\": mittelwert, \"mrr\": mittelwert}</code>, wobei MRR den Kehrwert $1/\\mathrm{rank}$ des ersten relevanten Dokuments je Anfrage mittelt. Der Testcode prüft Matrixform, Ranking-Reihenfolge und die Metriken gegen exakte Referenzwerte (recall@1 = 0{,}625, MRR = 0{,}875, recall@3 = 1).", "fullSolution": "import numpy as np\n\ndef _tokens(text):\n    PUNCT = \"!\\\"$%&'()*+,-./:;<=>?@[\\\\]^_`{|}~„“”‚‘’\"\n    stripped = \"\".join(ch for ch in text.lower() if ch not in PUNCT)\n    return \" \".join(stripped.split()).split()\n\ndef build_index(docs):\n    doc_tokens = [_tokens(d) for d in docs]\n    vocab = sorted({t for toks in doc_tokens for t in toks})\n    pos = {t: i for i, t in enumerate(vocab)}\n    n = len(docs)\n    df = np.zeros(len(vocab))\n    for toks in doc_tokens:\n        for t in set(toks):\n            df[pos[t]] += 1.0\n    idf = np.log((n + 1.0) / (df + 1.0)) + 1.0\n    m = np.zeros((n, len(vocab)))\n    for i, toks in enumerate(doc_tokens):\n        for t in toks:\n            m[i, pos[t]] += 1.0\n        nz = m[i] > 0\n        m[i, nz] = (m[i, nz] / len(toks)) * idf[nz]\n    return {\"vocab\": vocab, \"pos\": pos, \"matrix\": m}\n\ndef rank_query(index, query):\n    m = index[\"matrix\"]\n    n = m.shape[0]\n    v = np.zeros(m.shape[1])\n    for t in _tokens(query):\n        if t in index[\"pos\"]:\n            v[index[\"pos\"][t]] += 1.0\n    total = v.sum()\n    if total > 0:\n        nz = v > 0\n        df = (m[:, nz] > 0).sum(axis=0)\n        v[nz] = (v[nz] / total) * (np.log((n + 1.0) / (df + 1.0)) + 1.0)\n    norms = np.linalg.norm(m, axis=1) * np.linalg.norm(v)\n    norms[norms == 0.0] = 1.0\n    scores = (m @ v) / norms\n    return sorted(range(n), key=lambda i: (-scores[i], i))\n\ndef evaluate(index, queries, relevant_sets, k):\n    recalls = []\n    rrs = []\n    for query, relevant in zip(queries, relevant_sets):\n        rel = set(relevant)\n        order = rank_query(index, query)\n        recalls.append(len(set(order[:k]) & rel) / len(rel))\n        rr = 0.0\n        for position, doc in enumerate(order, start=1):\n            if doc in rel:\n                rr = 1.0 / position\n                break\n        rrs.append(rr)\n    return {\"recall_at_k\": sum(recalls) / len(recalls), \"mrr\": sum(rrs) / len(rrs)}\n\n# evaluate(build_index(B_DOCS), B_QUERIES, B_RELEVANT, 1) -> {'recall_at_k': 0.625, 'mrr': 0.875}\n\n# evaluate(...) k=1 -> recall 0.625, mrr 0.875; k=3 -> recall 1.0", "competencyIds": ["c-genai-rag","c-numpy-basics"] },
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

// Returns ("ok", result) or (exception type, message): lets one comparison
// cover both value returns and the contracted ValueError paths.


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

// The __raised helper plus the renamed reference copy are emitted once at the
// top of the seeded block; all per-draw checks call into it.
function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => caseDef.emit(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${RAISED_HELPER}\n\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n\n${checks}`;
}

const testsFor = (caseDef, seedCases) => `${caseDef.baseTests}\n\n${seededBlock(caseDef, seedCases)}`;

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function rankingCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === testsFor(caseDef, parameters.seedCases);
  } catch { return false; }
}

export function genRankingCase(seed, caseDef) {
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

export function solveRankingFamily(parameters) {
  const caseDef = Object.values(RANKING_CASES).find((item) => rankingCaseOk(parameters, item));
  if (!caseDef) throw new Error('Retrieval-Ranking-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

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
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateRankingFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = RANKING_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genRankingCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...RANKING_CONTRACT, generate: generateRankingFamily, solve: solveRankingFamily };
