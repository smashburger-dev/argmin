// Procedural family trace-stub-doc-sentence-select: the traced stub function
// stays fixed; the seed draws a document pair from DOC_BANK plus a hitting
// query (entry-local) and a missing query (MISS_QUERIES, filtered per pair so
// only entries that score zero everywhere qualify — like the base case the
// first print returns a copied sentence, the second the constant "kein
// treffer"). The solver mirrors the Python semantics one-to-one: terms are
// whitespace-split lowercase words of length >= 4 with punctuation kept
// attached (so sentence-final words carry their "." inside the doc-level
// index but not inside a single sentence), the best document is the FIRST
// argmax of the overlap scores, and the returned sentence is the first one
// sharing a term — strip() equals JS trim() for this content. Expected keeps
// the base form { kind: 'output-lines', output }.

import { randInt } from '../generator_draw_kit.mjs';
import { makePredictFamily } from './case_family_kit.mjs';

const STUB_DEF = `def antwort(anfrage, docs):
    def terme(s):
        return {w for w in s.lower().split() if len(w) >= 4}
    q = terme(anfrage)
    punkte = [len(q & terme(d)) for d in docs]
    if max(punkte) == 0:
        return "kein treffer"
    best = punkte.index(max(punkte))
    saetze = docs[best].split(".")
    for satz in saetze:
        if q & terme(satz):
            return satz.strip()
    return saetze[0].strip()`;

const BASE_SNIPPET = `${STUB_DEF}

DOCS = [
    "Die Lieferzeit betraegt drei Werktage. Der Versand erfolgt mit DHL.",
    "Die Garantie deckt Herstellungsfehler. Sturzschäden sind ausgenommen.",
]
print(antwort("Wie erfolgt der Versand?", DOCS))
print(antwort("Gibt es einen Parkplatz?", DOCS))`;

const BASE_OUTPUT = 'Der Versand erfolgt mit DHL\nkein treffer';

const PROMPT = 'Stub-Generator lesen und vorhersagen: Was gibt dieses Programm aus? Sage beide <code>print</code>-Zeilen vorher, ohne den Code auszuführen. Der Stub wählt das Dokument mit den meisten gemeinsamen Begriffen (Länge ≥ 4) und daraus den ersten Satz mit Anfragetreffer.';

const BASE_SOLUTION = 'Dokument 0 punktet mit {erfolgt, versand}; der erste Satz trifft nicht, der zweite („Der Versand erfolgt mit DHL“) schon → <code>Der Versand erfolgt mit DHL</code>. Zweite Anfrage: kein gemeinsamer Begriff → <code>kein treffer</code>. Der Stub formuliert nichts neu — er kopiert belegt.';

// Document bank: two two-sentence docs per entry, each hit query is authored
// so its shared term sits mid-sentence in exactly one document (a query's
// last word carries "?" and can never match a doc term). Entry 0 is the
// curated base scenario verbatim.
export const DOC_BANK = [
  {
    docs: [
      'Die Lieferzeit betraegt drei Werktage. Der Versand erfolgt mit DHL.',
      'Die Garantie deckt Herstellungsfehler. Sturzschäden sind ausgenommen.',
    ],
    hits: ['Wie erfolgt der Versand?', 'Was deckt die Garantie?'],
  },
  {
    docs: [
      'Das Teammeeting findet montags um zehn Uhr statt. Einwahl geht ueber den Kalenderlink.',
      'Die Protokolle liegen im internen Wiki. Nachtragen kann sie jede Teilnehmerin.',
    ],
    hits: ['Wann findet das Teammeeting?', 'Wo liegen die Protokolle?'],
  },
  {
    docs: [
      'Die Rechnung wird monatlich per E-Mail verschickt. Der Zahlungslink bleibt vierzehn Tage aktiv.',
      'Die Umsatzsteuer ist auf der Rechnung ausgewiesen. Korrekturen erstellt der Support manuell.',
    ],
    hits: ['Wann bleibt der Zahlungslink aktiv?', 'Wer erstellt die Korrekturen?'],
  },
  {
    docs: [
      'Das Passwort laesst sich ueber den Loginlink zuruecksetzen. Die Anmeldung bleibt danach bestehen.',
      'Ein Backup laeuft jede Nacht um zwei Uhr. Die Wiederherstellung dauert wenige Minuten.',
    ],
    hits: ['Wie setze ich das Passwort zurueck?', 'Wann laeuft das naechtliche Backup?'],
  },
  {
    docs: [
      'Die Versandkosten haengen vom Gesamtgewicht ab. Eine Sendungsverfolgung gibt es per Link.',
      'Retouren sind innerhalb eines Monats kostenlos. Das Etikett kommt als Download.',
    ],
    hits: ['Wovon haengen die Versandkosten ab?', 'Sind Retouren wirklich kostenlos?'],
  },
  {
    docs: [
      'Die Demoversion laeuft dreissig Tage ohne Karte. Danach wird ein Abo noetig.',
      'Der Support antwortet werktags innerhalb von Stunden. Anfragen am Wochenende dauern laenger.',
    ],
    hits: ['Wie lange laeuft die Demoversion?', 'Wann antwortet der Support?'],
  },
];

// Miss pool: only queries whose >=4-letter words appear in no bank document
// are eligible; missCandidates filters per drawn pair, so a query that hits
// some pair (like the base query hitting entry 4 via "gibt") stays usable
// for the pairs where it genuinely scores zero.
export const MISS_QUERIES = [
  'Gibt es einen Parkplatz?',
  'Wie ist das Wetter morgen?',
  'Wo steht das naechste Konzert?',
  'Wann beginnt der Kinofilm?',
  'Welches Rezept passt zum Abendessen?',
  'Wie lautet die Flugnummer?',
  'Wo parkt der Mietwagen?',
];

// Mirrors Python: whitespace split keeps punctuation attached to words.
const terme = (text) => new Set(
  String(text).toLowerCase().split(/\s+/).filter((w) => w.length >= 4),
);

// Independent solver for the stub: same scoring, first-argmax doc pick,
// first matching sentence, constant miss string.
export function runStub(query, docs) {
  const q = terme(query);
  const scores = docs.map((doc) => [...terme(doc)].filter((w) => q.has(w)).length);
  const best = scores.indexOf(Math.max(...scores));
  if (scores[best] === 0) return 'kein treffer';
  for (const satz of docs[best].split('.')) {
    const hit = [...terme(satz)].some((w) => q.has(w));
    if (hit) return satz.trim();
  }
  return docs[best].split('.')[0].trim();
}

// Pool queries that genuinely score zero for the drawn pair.
export function missCandidates(docs) {
  return MISS_QUERIES.filter((query) => runStub(query, docs) === 'kein treffer');
}

function buildSnippet({ docs, queryHit, queryMiss }) {
  const docLines = docs.map((doc) => `    "${doc}",`).join('\n');
  return `${STUB_DEF}

DOCS = [
${docLines}
]
print(antwort("${queryHit}", DOCS))
print(antwort("${queryMiss}", DOCS))`;
}

function buildSolution({ docs, queryHit }) {
  const q = terme(queryHit);
  const scores = docs.map((doc) => [...terme(doc)].filter((w) => q.has(w)).length);
  const best = scores.indexOf(Math.max(...scores));
  const shared = [...terme(docs[best])].filter((w) => q.has(w));
  const answer = runStub(queryHit, docs);
  return `Die Anfrage teilt {${shared.join(', ')}} mit Dokument ${best} (Score ${scores.join(' vs. ')}); der erste Satz mit Anfragebegriff ist „${answer}“ → <code>${answer}</code>. Zweite Anfrage: kein gemeinsamer Begriff (max(punkte) == 0) → <code>kein treffer</code>. Der Stub formuliert nichts neu — er kopiert belegt.`;
}

// Case definition: the bank IS the documented draw domain; the base fields
// pin the curated oracle case verbatim (anchor tests compare the JSON).
export const STUB_DOC_CASES = {
  'stub-doc-sentence-select': {
    caseId: 'stub-doc-sentence-select',
    difficulty: 'core',
    baseSnippet: BASE_SNIPPET,
    baseOutput: BASE_OUTPUT,
    baseParams: {
      docs: DOC_BANK[0].docs,
      queryHit: 'Wie erfolgt der Versand?',
      queryMiss: 'Gibt es einen Parkplatz?',
    },
    prompt: PROMPT,
    baseSolution: BASE_SOLUTION,
    competencyIds: ['c-genai-prototype', 'c-python-reading'],
    draw: drawStubScenario,
    buildSnippet: (p) => buildSnippet(p),
    buildOutput: (p) => `${runStub(p.queryHit, p.docs)}\n${runStub(p.queryMiss, p.docs)}`,
    buildSolution: (p) => buildSolution(p),
    checkParams(p) {
      const { docs, queryHit, queryMiss } = p;
      const entry = DOC_BANK.find((item) => item.docs.length === docs?.length
        && item.docs.every((doc, i) => doc === docs[i]));
      if (!entry || !entry.hits.includes(queryHit)) return false;
      return missCandidates(entry.docs).includes(queryMiss);
    },
  },
};

function drawStubScenario(r) {
  const entry = DOC_BANK[randInt(r, 0, DOC_BANK.length - 1)];
  const queryHit = entry.hits[randInt(r, 0, entry.hits.length - 1)];
  const misses = missCandidates(entry.docs);
  const queryMiss = misses[randInt(r, 0, misses.length - 1)];
  return { docs: entry.docs, queryHit, queryMiss };
}

export const STUB_DOC_CONTRACT = {
  familyId: 'trace-stub-doc-sentence-select',
  familyGroup: 'trace-state',
  summary: 'Verfolgt die Dokument- und Satzauswahl eines ehrlichen Stub-Generators über Begriffsschnitte und sagt die Antwortsätze oder den konstanten Fehlstring voraus.',
  taskArchetype: 'output-predict-lines',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'stub-doc-sentence-select', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-genai-prototype', 'c-python-reading'],
};

const FAMILY = makePredictFamily({
  contract: STUB_DOC_CONTRACT,
  cases: STUB_DOC_CASES,
  shapeError: 'trace-stub-doc-sentence-select: Parameter verletzen die Kapselform',
});

export const stubDocCaseOk = FAMILY.caseOk;
export const genStubDocCase = FAMILY.genCase;
export const solveStubDocFamily = FAMILY.solve;
export const generateStubDocFamily = FAMILY.generate;
export const FAMILY_SPEC = FAMILY.spec;
