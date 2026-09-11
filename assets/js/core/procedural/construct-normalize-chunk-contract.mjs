// Procedural family construct-normalize-chunk-contract: the task text, starter
// code and reference solver stay fixed; the seed draws fresh normalize probes
// (mixed German text with umlauts/digits/punctuation), valid window draws and
// invalid (size, overlap) pairs that get appended to the curated base test
// block as literal __check lines. Expected values are asserted against a
// renamed __ref_ copy of the reference functions (normalize + chunk), so the
// grading contract cannot drift. Mirrors reproduce-canonical-hash-verify.mjs.

import { refCopy } from './py_test_kit.mjs';

import { pick, randInt, rng } from '../generator_draw_kit.mjs';

const PACKAGES = [];

const CHUNK_STARTER = `def normalize(text):
    """Kleinbuchstaben, Umlaute bleiben, Satzzeichen weg, Whitespace zusammen."""
    PUNCT = "!\\"$%&'()*+,-./:;<=>?@[\\\\]^_\`{|}~„“”‚‘’"
    out = []
    for ch in text.lower():
        if ch in PUNCT:
            continue
        out.append(ch)
    return " ".join("".join(out).split())


def chunk(text, size, overlap):
    """Fenster text[start:start+size], start += size - overlap, solange start < len(text)."""
    ...

`;

const CHUNK_BASE_TESTS = `__check('normalize kleinbuchstaben', normalize("Der Bäcker sagte: „Halt!“") == "der bäcker sagte halt")
__check('normalize umlaute bleiben', normalize("Größenmaßstäbe") == "größenmaßstäbe")
__check('normalize zahlen bleiben', normalize("Artikel 12, Absatz 3!") == "artikel 12 absatz 3")
__check('chunk fensterfolge', chunk("abcdefghij", 4, 2) == ["abcd", "cdef", "efgh", "ghij", "ij"])
__check('chunk startreihe', chunk("abcdef", 4, 1) == ["abcd", "def"])
__check('chunk kurzer text', chunk("ab", 5, 2) == ["ab"])
__check('chunk ohne overlap', chunk("abcdefgh", 4, 0) == ["abcd", "efgh"])
__check('chunk fensterlaenge', all(len(p) <= 4 for p in chunk("abcdefghij", 4, 2)))
try:
    chunk("abc", 0, 0)
    __check('size 0 -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('size 0 -> ValueError', True)
try:
    chunk("abc", 4, 4)
    __check('overlap >= size -> ValueError', False, 'kein ValueError')
except ValueError:
    __check('overlap >= size -> ValueError', True)`;

const CHUNK_REFERENCE = `def normalize(text):
    PUNCT = "!\\"$%&'()*+,-./:;<=>?@[\\\\]^_\`{|}~„“”‚‘’"
    out = []
    for ch in text.lower():
        if ch in PUNCT:
            continue
        out.append(ch)
    return " ".join("".join(out).split())

def chunk(text, size, overlap):
    if not isinstance(size, int) or not isinstance(overlap, int):
        raise ValueError("size und overlap muessen ganze Zahlen sein")
    if size <= 0:
        raise ValueError("size muss positiv sein")
    if overlap < 0 or overlap >= size:
        raise ValueError("overlap muss zwischen 0 und size-1 liegen")
    step = size - overlap
    parts = []
    start = 0
    while start < len(text):
        parts.append(text[start:start + size])
        start += step
    return parts

# chunk("abcdefghij", 4, 2) -> ["abcd", "cdef", "efgh", "ghij", "ij"]
# normalize("Der Bäcker sagte: „Halt!“") -> "der bäcker sagte halt"`;

const CHUNK_PROMPT = 'Implementiere <code>normalize(text)</code> und <code>chunk(text, size, overlap)</code> exakt nach dem gepinnten Vertrag. normalize: Kleinbuchstaben, Umlaute bleiben erhalten, Satzzeichen entfernen, Whitespace zusammenziehen (Ergebnis ein String mit je einem Leerzeichen zwischen Wörtern). chunk: Fenster <code>text[start:start+size]</code>, Start bei 0, dann um <code>size − overlap</code> weiter, solange <code>start &lt; len(text)</code>; Rückgabe Liste von Strings. Ungültige Parameter (size ≤ 0, overlap &lt; 0, overlap ≥ size oder nicht-ganzzahlig) werfen <code>ValueError</code>. Der Testcode prüft Normalisierung und Fensterfolgen getrennt von deinem Code.';

const CHUNK_SOLUTION = `${CHUNK_REFERENCE}

# alle __check-Tests bestanden (lokal python3-verifiziert)`;


// Serializes drawn data as Python literals (the pools stay quote- and
// backslash-free, so the generated test block has no escaping hazards).
const py = (value) => {
  if (typeof value === 'string') return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  if (typeof value === 'number') return `${value}`;
  if (Array.isArray(value)) return `[${value.map(py).join(', ')}]`;
  return `{${Object.entries(value).map(([key, v]) => `${py(key)}: ${py(v)}`).join(', ')}}`;
};

// Draw pools for normalize probes: umlaut-bearing words, digits and a
// punctuation set that stays inside the PUNCT contract (no quotes/backslash).
const WORD_POOL = [
  'Äpfel', 'Bäcker', 'Größen', 'fußball', 'Lieferung', 'Widerruf', 'Rabatt',
  'Garantie', 'straße', 'Müller', 'Jürgen', 'Köln', 'heißt', 'grün', 'öfter',
  'Artikel', 'Absatz', 'Werkzeuge', 'käse', 'Lösung', 'Übung',
];

const PUNCT_POOL = ['.', ',', ';', ':', '!', '?', '-', '(', ')', '/', '„', '“'];

const CHUNK_ALPHABET = 'abcdefghijklmnopqrstuvwxyzäöü ';

// Probe text: 2-5 word tokens, punctuation marks may trail a word or stand
// alone, occasional double spaces exercise the whitespace collapse.
function drawNormalizeText(r) {
  const count = randInt(r, 2, 5);
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    let token = pick(r, WORD_POOL);
    if (r() < 0.3) token = `${randInt(r, 1, 99)}`;
    if (r() < 0.5) token += pick(r, PUNCT_POOL);
    parts.push(token);
  }
  const joiner = r() < 0.3 ? '  ' : ' ';
  let text = parts.join(joiner);
  if (r() < 0.2) text = ` ${text} `;
  return text;
}

function drawChunkText(r) {
  const len = randInt(r, 4, 24);
  return Array.from({ length: len }, () => CHUNK_ALPHABET[randInt(r, 0, CHUNK_ALPHABET.length - 1)]).join('');
}

// Invalid (size, overlap) pairs: every arm of the contract's ValueError gate
// (non-int, size <= 0, overlap < 0, overlap >= size) must appear over seeds.
function drawBadPair(r, size) {
  switch (randInt(r, 0, 6)) {
    case 0: return [0, 0];
    case 1: return [-randInt(r, 1, 5), 0];
    case 2: return [size, size];
    case 3: return [size, size + randInt(r, 1, 3)];
    case 4: return [size, -randInt(r, 1, 3)];
    case 5: return [size + 0.5, 0];
    default: return [size, 0.5];
  }
}

// Seeded block: renamed reference copy once, then per draw one normalize
// probe, one valid window probe and one invalid-parameter probe (ValueError
// path, same try/except shape as the base block).
function seededChecks(entry, index) {
  return [
    `__nt${index} = ${py(entry.normalizeText)}`,
    `__check('seeded normalize ${index}', normalize(__nt${index}) == __ref_normalize(__nt${index}))`,
    `__ct${index} = ${py(entry.chunkText)}`,
    `__check('seeded chunk ${index}', chunk(__ct${index}, ${entry.size}, ${entry.overlap}) == __ref_chunk(__ct${index}, ${entry.size}, ${entry.overlap}))`,
    'try:',
    `    chunk(__ct${index}, ${entry.badSize}, ${entry.badOverlap})`,
    `    __check('seeded chunk-vertrag ${index}', False, 'kein ValueError')`,
    'except ValueError:',
    `    __check('seeded chunk-vertrag ${index}', True)`,
  ].join('\n');
}

function seededBlock(caseDef, seedCases) {
  const checks = seedCases.map((entry, i) => seededChecks(entry, i + 1)).join('\n');
  return `# seeded extra cases\n${refCopy(caseDef.referenceSolver, caseDef.refNames)}\n${checks}`;
}

export const CHUNK_CASES = {
  'normalize-chunk-contract': {
    difficulty: 'core',
    starterCode: CHUNK_STARTER,
    baseTests: CHUNK_BASE_TESTS,
    referenceSolver: CHUNK_REFERENCE,
    refNames: ['normalize', 'chunk'],
    prompt: CHUNK_PROMPT,
    fullSolution: CHUNK_SOLUTION,
    extraCount: 3,
    draw(r) {
      const size = randInt(r, 1, 8);
      const [badSize, badOverlap] = drawBadPair(r, size);
      return {
        normalizeText: drawNormalizeText(r),
        chunkText: drawChunkText(r),
        size,
        overlap: randInt(r, 0, size - 1),
        badSize,
        badOverlap,
      };
    },
  },
};

// Capsule shape: parameters carry starterCode/tests/seedCases; tests must be
// the verbatim base block plus the seeded extras derived from seedCases.
export function chunkCaseOk(parameters, caseDef) {
  try {
    if (!parameters || typeof parameters !== 'object') return false;
    if (parameters.starterCode !== caseDef.starterCode) return false;
    if (!Array.isArray(parameters.seedCases) || parameters.seedCases.length !== caseDef.extraCount) return false;
    return parameters.tests === `${caseDef.baseTests}\n\n${seededBlock(caseDef, parameters.seedCases)}`;
  } catch { return false; }
}

export function genChunkCase(seed, caseDef) {
  const r = rng(seed);
  const seedCases = Array.from({ length: caseDef.extraCount }, () => caseDef.draw(r));
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

export function solveChunkFamily(parameters) {
  const caseDef = Object.values(CHUNK_CASES).find((item) => chunkCaseOk(parameters, item));
  if (!caseDef) throw new Error('Normalize-Chunk-Parameter verletzen die Kapselform');
  return { referenceCode: caseDef.referenceSolver };
}

export const CHUNK_CONTRACT = {
  familyId: 'construct-normalize-chunk-contract',
  familyGroup: 'construct-program',
  summary: 'Implementiert den RAG-Vorverarbeitungs-Vertrag aus Textnormalisierung mit Umlautschutz und bewachter Fenster-Schleife inklusive ValueError-Parametervalidierung.',
  taskArchetype: 'code-tests',
  authorityMode: 'seeded',
  masteryEligible: true,
  caseTypes: [
    { caseId: 'normalize-chunk-contract', propertyTest: false },
  ],
  difficultyProfiles: ['core'],
  competencyIds: ['c-genai-rag', 'c-python-functions'],
  graderId: 'pyodide',
  activityType: 'python-code',
};

export function generateChunkFamily({ seed, caseId, difficulty }) {
  if (!Number.isSafeInteger(seed)) throw new Error('Seed muss eine ganze Zahl sein');
  const caseDef = CHUNK_CASES[caseId];
  if (!caseDef || caseDef.difficulty !== difficulty) {
    throw new Error(`Unbekannter Fall ${caseId} für Profil ${difficulty}`);
  }
  return genChunkCase(seed, caseDef);
}

export const FAMILY_SPEC = { ...CHUNK_CONTRACT, generate: generateChunkFamily, solve: solveChunkFamily };
